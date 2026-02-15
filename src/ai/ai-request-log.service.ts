import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AiRequestLog } from '../entities/ai-request-log.entity';
import { UsageAction } from '../subscription/enums/usage-action.enum';
import { AiResult, AiTokenUsage } from './ai-client.service';

@Injectable()
export class AiRequestLogService {
  constructor(
    @InjectPinoLogger(AiRequestLogService.name)
    private readonly logger: PinoLogger,
    @InjectRepository(AiRequestLog)
    private readonly repo: Repository<AiRequestLog>,
  ) {}

  /**
   * Wraps an AI operation, automatically logging the request and result.
   * Expects operation to return AiResult<T>, extracts usage for logging,
   * and returns only the data (T) to callers.
   */
  async logRequest<T>(params: {
    userId: string;
    action: UsageAction;
    input: string;
    operation: () => Promise<AiResult<T>>;
  }): Promise<T> {
    const start = Date.now();
    let success = true;
    let errorMessage: string | null = null;
    let output: Record<string, unknown> | null = null;
    let usage: AiTokenUsage | null = null;

    try {
      const result = await params.operation();
      output = result.data as Record<string, unknown>;
      usage = result.usage;
      return result.data;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      const durationMs = Date.now() - start;

      try {
        const log = this.repo.create({
          userId: params.userId,
          action: params.action,
          input: params.input.slice(0, 5000),
          output,
          success,
          errorMessage: errorMessage?.slice(0, 500) ?? null,
          durationMs,
          promptTokens: usage?.promptTokens ?? null,
          completionTokens: usage?.completionTokens ?? null,
          totalTokens: usage?.totalTokens ?? null,
        });
        await this.repo.save(log);
      } catch (saveError) {
        this.logger.error(
          { err: saveError, action: params.action },
          'Failed to save AI request log',
        );
      }
    }
  }
}
