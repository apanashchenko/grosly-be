import { Inject, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { REDIS_CLIENT } from '../cache/cache.module';

export interface AiCallConfig {
  cacheKey: string;
  cacheTtlKey: string;
  cacheTtlDefault: number;
  model: string;
  temperature?: number;
  systemMessage: string;
  prompt: string;
  imageBase64?: string;
  responseFormat?: OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format'];
}

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiResult<T> {
  data: T;
  usage: AiTokenUsage | null;
}

@Injectable()
export class AiClientService {
  private readonly openai: OpenAI;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    @InjectPinoLogger(AiClientService.name) private readonly logger: PinoLogger,
    private configService: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // ==================== DEDUPLICATION ====================

  /**
   * Deduplicates concurrent calls with the same cache key.
   * If a call is already in-flight for the same key, returns the existing promise
   * instead of starting a duplicate OpenAI request.
   */
  async deduplicated<T>(cacheKey: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      this.logger.info({ cacheKey }, 'In-flight dedup HIT');
      return existing as Promise<T>;
    }

    const promise = Promise.resolve().then(fn);
    this.inFlight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  // ==================== CACHE ====================

  async cacheGet<T>(cacheKey: string, label: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(cacheKey);
      if (raw) {
        this.logger.info({ cacheKey }, `AI cache HIT: ${label}`);
        return JSON.parse(raw) as T;
      }
    } catch (error: unknown) {
      this.logger.warn(
        { error, cacheKey },
        'Cache GET failed, proceeding without cache',
      );
    }
    return null;
  }

  async cacheSet(
    cacheKey: string,
    data: unknown,
    ttlKey: string,
    ttlDefault: number,
  ): Promise<void> {
    const ttl = this.configService.get<number>(ttlKey, ttlDefault);
    try {
      await this.redis.set(cacheKey, JSON.stringify(data), 'EX', ttl);
    } catch (error: unknown) {
      this.logger.warn({ error, cacheKey }, 'Cache SET failed');
    }
  }

  // ==================== OPENAI CALLS ====================

  /**
   * Makes an OpenAI API call via config, parses the JSON response,
   * and retries the full call once on JSON parse failure.
   */
  async callAndParseJson<T>(
    config: AiCallConfig,
    operationName: string,
  ): Promise<AiResult<T>> {
    const makeCall = async (): Promise<{
      text: string;
      completion: OpenAI.Chat.Completions.ChatCompletion;
      duration: number;
    }> => {
      const startTime = Date.now();
      const completion = await this.createCompletion(config);
      const duration = Date.now() - startTime;

      this.logger.info(
        {
          model: completion.model,
          duration,
          tokensUsed: completion.usage?.total_tokens,
        },
        `OpenAI API call completed: ${operationName}`,
      );

      const responseText = completion.choices[0].message.content?.trim();
      if (!responseText) {
        this.logger.error('Empty response from OpenAI API');
        throw new Error('Empty response from OpenAI');
      }

      return { text: responseText, completion, duration };
    };

    const parseJson = (text: string): T => {
      const jsonText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(jsonText) as T;
    };

    let completion: OpenAI.Chat.Completions.ChatCompletion;
    let parsed: T;

    const first = await makeCall();
    completion = first.completion;
    try {
      parsed = parseJson(first.text);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.warn(
          {
            rawResponse: first.text.substring(0, 500),
            operationName,
          },
          'JSON parse failed, retrying OpenAI call once',
        );
        const retry = await makeCall();
        completion = retry.completion;
        parsed = parseJson(retry.text);
      } else {
        throw error;
      }
    }

    return {
      data: parsed,
      usage: this.extractUsage(completion.usage),
    };
  }

  /**
   * Streams an OpenAI chat completion via .stream(), forwarding each text
   * delta via onChunk and returning the final parsed JSON result.
   */
  async callStreamedJson<T>(
    config: AiCallConfig,
    onChunk: (delta: string) => void,
    operationName: string,
  ): Promise<AiResult<T>> {
    const startTime = Date.now();
    const stream = this.createStream(config);

    stream.on('content.delta', ({ delta }) => {
      onChunk(delta);
    });

    const completion = await stream.finalChatCompletion();
    const duration = Date.now() - startTime;

    this.logger.info(
      {
        duration,
        operationName,
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens,
      },
      'Streamed OpenAI call done',
    );

    const responseText = completion.choices[0].message.content?.trim();
    if (!responseText) {
      throw new Error('Empty response from OpenAI stream');
    }

    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return {
      data: JSON.parse(jsonText) as T,
      usage: this.extractUsage(completion.usage),
    };
  }

  /**
   * Raw OpenAI completion call (for cases that don't use AiCallConfig,
   * e.g. categorizeItems with inline schema).
   */
  async rawCompletion(
    params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    return this.openai.chat.completions.create(params);
  }

  // ==================== PRIVATE ====================

  private extractUsage(
    usage: OpenAI.Completions.CompletionUsage | undefined,
  ): AiTokenUsage | null {
    if (!usage) return null;
    return {
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    };
  }

  private buildUserMessage(
    config: AiCallConfig,
  ): string | OpenAI.Chat.Completions.ChatCompletionContentPart[] {
    if (!config.imageBase64) {
      return config.prompt;
    }

    return [
      {
        type: 'image_url' as const,
        image_url: { url: config.imageBase64, detail: 'high' as const },
      },
      { type: 'text' as const, text: config.prompt },
    ];
  }

  private createCompletion(config: AiCallConfig) {
    return this.openai.chat.completions.create({
      model: config.model,
      ...(config.temperature !== undefined && {
        temperature: config.temperature,
      }),
      ...(config.responseFormat && {
        response_format: config.responseFormat,
      }),
      messages: [
        { role: 'system' as const, content: config.systemMessage },
        { role: 'user' as const, content: this.buildUserMessage(config) },
      ],
    });
  }

  private createStream(config: AiCallConfig) {
    return this.openai.chat.completions.stream({
      model: config.model,
      stream_options: { include_usage: true },
      ...(config.temperature !== undefined && {
        temperature: config.temperature,
      }),
      ...(config.responseFormat && {
        response_format: config.responseFormat,
      }),
      messages: [
        { role: 'system' as const, content: config.systemMessage },
        { role: 'user' as const, content: this.buildUserMessage(config) },
      ],
    });
  }
}
