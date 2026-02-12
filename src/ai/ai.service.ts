import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { REDIS_CLIENT } from '../cache/cache.module';
import { generateCacheKey } from '../cache/cache-key.util';

export interface Ingredient {
  name: string;
  quantity: number | null;
  unit: {
    canonical: string;
    localized: string;
  } | null;
  note: string | null;
  categorySlug: string | null;
}

export interface Unit {
  canonical: string;
  localized: string;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: Unit;
}

export interface Recipe {
  dishName: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: InstructionStep[];
  cookingTime: number;
}

export interface ParsedRequest {
  numberOfPeople: number;
  numberOfDays: number;
  dietaryRestrictions: string[];
  mealType: string | null;
}

export interface MealPlanAiResponse {
  parsedRequest: ParsedRequest;
  recipes: Recipe[];
}

export interface InstructionStep {
  step: number;
  text: string;
}

export interface SuggestedRecipe {
  dishName: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: InstructionStep[];
  cookingTime: number;
  matchedIngredients: string[];
  additionalIngredients: string[];
}

export interface SuggestRecipesResponse {
  suggestedRecipes: SuggestedRecipe[];
}

export interface ItemCategoryMapping {
  itemId: string;
  categoryId: string | null;
  confidence: number;
}

const PROMPT_VERSIONS = {
  parse: 'v1',
  generate: 'v1',
  suggest: 'v1',
  categorize: 'v1',
} as const;

const UNIT_SCHEMA = {
  type: 'object',
  properties: {
    canonical: { type: 'string' },
    localized: { type: 'string' },
  },
  required: ['canonical', 'localized'],
  additionalProperties: false,
} as const;

const INSTRUCTION_STEP_SCHEMA = {
  type: 'object',
  properties: {
    step: { type: 'number' },
    text: { type: 'string' },
  },
  required: ['step', 'text'],
  additionalProperties: false,
} as const;

const RECIPE_INGREDIENT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    quantity: { type: 'number' },
    unit: UNIT_SCHEMA,
  },
  required: ['name', 'quantity', 'unit'],
  additionalProperties: false,
} as const;

const RECIPE_SCHEMA = {
  type: 'object',
  properties: {
    dishName: { type: 'string' },
    description: { type: 'string' },
    ingredients: { type: 'array', items: RECIPE_INGREDIENT_SCHEMA },
    instructions: { type: 'array', items: INSTRUCTION_STEP_SCHEMA },
    cookingTime: { type: 'number' },
  },
  required: [
    'dishName',
    'description',
    'ingredients',
    'instructions',
    'cookingTime',
  ],
  additionalProperties: false,
} as const;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private configService: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Deduplicates concurrent calls with the same cache key.
   * If a call is already in-flight for the same key, returns the existing promise
   * instead of starting a duplicate OpenAI request.
   */
  private async deduplicated<T>(
    cacheKey: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const existing = this.inFlight.get(cacheKey);
    if (existing) {
      this.logger.log({ cacheKey }, 'In-flight dedup HIT');
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

  /**
   * Makes an OpenAI API call via the provided factory, parses the JSON response,
   * and retries the full call once on JSON parse failure.
   */
  private async callAndParseJson<T>(
    createCompletion: () => Promise<OpenAI.Chat.Completions.ChatCompletion>,
    operationName: string,
  ): Promise<T> {
    const makeCall = async (): Promise<{
      text: string;
      completion: OpenAI.Chat.Completions.ChatCompletion;
      duration: number;
    }> => {
      const startTime = Date.now();
      const completion = await createCompletion();
      const duration = Date.now() - startTime;

      this.logger.log(
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

    const { text: responseText } = await makeCall();
    try {
      return parseJson(responseText);
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.warn(
          {
            rawResponse: responseText.substring(0, 500),
            operationName,
          },
          'JSON parse failed, retrying OpenAI call once',
        );
        const { text: retryText } = await makeCall();
        return parseJson(retryText);
      }
      throw error;
    }
  }

  async extractIngredientsFromRecipe(
    recipeText: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
  ): Promise<Ingredient[]> {
    const cacheKey = generateCacheKey('parse', {
      v: PROMPT_VERSIONS.parse,
      model: 'gpt-4.1-mini',
      temp: 0.3,
      text: recipeText,
      lang: responseLanguage,
      categories,
    });

    try {
      const raw = await this.redis.get(cacheKey);
      if (raw) {
        this.logger.log({ cacheKey }, 'AI cache HIT: extractIngredients');
        return JSON.parse(raw) as Ingredient[];
      }
    } catch (error: unknown) {
      this.logger.warn(
        { error, cacheKey },
        'Cache GET failed, proceeding without cache',
      );
    }

    return this.deduplicated(cacheKey, async () => {
      this.logger.log(
        {
          cacheKey,
          recipeTextLength: recipeText.length,
          responseLanguage,
          categoriesCount: categories.length,
        },
        'AI cache MISS: extractIngredientsFromRecipe',
      );

      const categoryBlock =
        categories.length > 0
          ? `\nAvailable product categories:\n${categories.map((c) => `- "${c.slug}" (${c.name})`).join('\n')}\n`
          : '';

      const prompt = `
Recipe text (can be in any language):
"""
${recipeText}
"""
${categoryBlock}
Your task:
1. Understand the recipe text regardless of language
2. Extract ALL mentioned ingredients exactly as written
3. Normalize units where possible
${categories.length > 0 ? '4. Assign the most appropriate category to each ingredient from the provided list' : ''}

Return ONLY valid JSON in the following format:

{
  "ingredients": [
    {
      "name": string,
      "quantity": number | null,
      "unit": {
        "canonical": string,
        "localized": string
      } | null,
      "note": string | null,
      "categorySlug": string | null
    }
  ]
}

Rules:
- Ingredient names MUST be in language: "${responseLanguage}"
- localized unit MUST be in language: "${responseLanguage}"
- canonical unit MUST be a neutral identifier (e.g. "g", "ml", "pcs", "tbsp", "tsp")
- If quantity is not specified or ingredient is "to taste":
  - set quantity = null
  - set unit = null
  - set note = "to taste" (localized in "${responseLanguage}")
- Do NOT invent quantities
- Do NOT use ranges (1-2, a few, some)
- Use metric system where possible
${categories.length > 0 ? '- categorySlug MUST be one of the provided category slugs, or null if no category fits\n- Pick the most semantically appropriate category for each ingredient' : '- categorySlug MUST be null (no categories provided)'}
- Return JSON ONLY, no markdown, no explanations
`;

      const parsed = await this.callAndParseJson<{
        ingredients: Ingredient[];
      }>(
        () =>
          this.openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content:
                  'You are a culinary text analyst. You strictly follow schemas and return valid JSON only.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        'extractIngredients',
      );

      this.logger.log(
        { ingredientsCount: parsed.ingredients.length },
        'Ingredients extracted successfully',
      );

      const ttl = this.configService.get<number>('AI_CACHE_TTL_PARSE', 21600);
      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(parsed.ingredients),
          'EX',
          ttl,
        );
      } catch (error: unknown) {
        this.logger.warn({ error, cacheKey }, 'Cache SET failed');
      }

      return parsed.ingredients;
    });
  }

  async generateMealPlanFromUserQuery(
    userQuery: string,
    responseLanguage: string = 'uk',
  ): Promise<MealPlanAiResponse> {
    const cacheKey = generateCacheKey('generate', {
      v: PROMPT_VERSIONS.generate,
      model: 'gpt-5-mini',
      query: userQuery,
      lang: responseLanguage,
    });

    try {
      const raw = await this.redis.get(cacheKey);
      if (raw) {
        this.logger.log({ cacheKey }, 'AI cache HIT: generateMealPlan');
        return JSON.parse(raw) as MealPlanAiResponse;
      }
    } catch (error: unknown) {
      this.logger.warn(
        { error, cacheKey },
        'Cache GET failed, proceeding without cache',
      );
    }

    return this.deduplicated(cacheKey, async () => {
      this.logger.log(
        { cacheKey, queryLength: userQuery.length, responseLanguage },
        'AI cache MISS: generateMealPlanFromUserQuery',
      );

      const prompt = `
User query (can be in any language):
"${userQuery}"

Your task:
1. Understand the user's intent regardless of query language
2. Determine:
   - number of people
   - number of days
   - dietary restrictions
   - meal type (if specified)
3. Generate classic, realistic recipes
4. Calculate ingredient quantities per recipe

Rules:
- All human-readable text MUST be in language: "${responseLanguage}"
- canonical units MUST be consistent across all recipes
- localized units MUST match the response language and culinary norms
- quantity MUST be numbers only
- cookingTime MUST be a number (minutes)
- instructions MUST be an array of ordered steps starting from 1 (3-10 steps)
- Each step.text MUST be a concise, clear sentence
- Do NOT repeat ingredient quantities in instructions
- Instructions MUST be suitable for home cooking, no professional techniques
- Instructions MUST describe concrete actions (e.g., cut, fry, boil, mix)
- Do not use ranges, approximations, or "to taste"
- Use metric system
`;

      const result = await this.callAndParseJson<MealPlanAiResponse>(
        () =>
          this.openai.chat.completions.create({
            model: 'gpt-5-mini',
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'meal_plan',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    parsedRequest: {
                      type: 'object',
                      properties: {
                        numberOfPeople: { type: 'number' },
                        numberOfDays: { type: 'number' },
                        dietaryRestrictions: {
                          type: 'array',
                          items: { type: 'string' },
                        },
                        mealType: { type: ['string', 'null'] },
                      },
                      required: [
                        'numberOfPeople',
                        'numberOfDays',
                        'dietaryRestrictions',
                        'mealType',
                      ],
                      additionalProperties: false,
                    },
                    recipes: {
                      type: 'array',
                      items: RECIPE_SCHEMA,
                    },
                  },
                  required: ['parsedRequest', 'recipes'],
                  additionalProperties: false,
                },
              },
            },
            messages: [
              {
                role: 'system',
                content:
                  'You are a multilingual culinary planner and data analyst. You strictly follow schemas and return valid JSON only.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        'generateMealPlan',
      );

      this.logger.log(
        {
          numberOfPeople: result.parsedRequest.numberOfPeople,
          numberOfDays: result.parsedRequest.numberOfDays,
          recipesCount: result.recipes.length,
        },
        'Meal plan generated successfully',
      );

      const ttl = this.configService.get<number>('AI_CACHE_TTL_GENERATE', 3600);
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);
      } catch (error: unknown) {
        this.logger.warn({ error, cacheKey }, 'Cache SET failed');
      }

      return result;
    });
  }

  async suggestRecipesFromIngredients(
    ingredients: string[],
    responseLanguage: string = 'uk',
    strictMode: boolean = false,
  ): Promise<SuggestRecipesResponse> {
    const cacheKey = generateCacheKey('suggest', {
      v: PROMPT_VERSIONS.suggest,
      model: 'gpt-5-mini',
      ingredients,
      lang: responseLanguage,
      strict: strictMode,
    });

    try {
      const raw = await this.redis.get(cacheKey);
      if (raw) {
        this.logger.log({ cacheKey }, 'AI cache HIT: suggestRecipes');
        return JSON.parse(raw) as SuggestRecipesResponse;
      }
    } catch (error: unknown) {
      this.logger.warn(
        { error, cacheKey },
        'Cache GET failed, proceeding without cache',
      );
    }

    return this.deduplicated(cacheKey, async () => {
      this.logger.log(
        {
          cacheKey,
          ingredientsCount: ingredients.length,
          responseLanguage,
          strictMode,
        },
        'AI cache MISS: suggestRecipesFromIngredients',
      );

      const ingredientsList = ingredients.join(', ');

      const strictModeBlock = strictMode
        ? `
Ingredient mode: STRICT
- You MUST use ONLY the provided ingredients.
- Allowed basic staples (even if not in the list): salt, pepper, water, oil, butter.
- Do NOT add any other ingredients beyond the list and basic staples.
- All basic staples used MUST still appear in additionalIngredients.
- additionalIngredients MUST be empty if only provided ingredients are used.
- If no realistic recipe can be made, return an empty suggestedRecipes array.`
        : `
Ingredient mode: FLEXIBLE
- The recipe MUST be primarily based on the available ingredients.
- You MAY add additional ingredients if needed for a complete recipe.
- Prioritize recipes that require FEWER additional ingredients.`;

      const prompt = `
Available ingredients (can be in any language):
${ingredientsList}
${strictModeBlock}

Your task:
1. Understand the ingredients list regardless of language
2. Suggest 1-3 realistic, achievable recipes that can be made using these ingredients
3. Prioritize recipes that use MORE of the available ingredients
4. For each recipe, specify:
   - Which available ingredients are used
   - What additional ingredients are needed
   - Complete ingredient list with quantities
   - Step-by-step cooking instructions
5. Prefer classic, well-known dishes over exotic recipes

Rules:
- All human-readable text MUST be in language: "${responseLanguage}"
- Return 1-3 recipes. If no realistic recipe can be made, return an empty suggestedRecipes array.
- matchedIngredients MUST include ONLY ingredients from the user's provided list
- additionalIngredients: ingredient names NOT in user's list but needed for recipe
- additionalIngredients MUST be empty if only provided ingredients are used
  AND no basic staples (salt, pepper, water, oil, butter) are used
- canonical units MUST be consistent (e.g., "g", "ml", "pcs", "tbsp", "tsp")
- localized units MUST match the response language
- quantity MUST be numbers only
- instructions MUST be an array of ordered steps starting from 1 (3-10 steps)
- Each step.text MUST be a concise, clear sentence
- Do NOT repeat ingredient quantities in instructions
- Every ingredient mentioned in instructions MUST exist in the ingredients list or be listed in additionalIngredients
- Instructions MUST be suitable for home cooking, no professional techniques
- Instructions MUST describe concrete actions (e.g., cut, fry, boil, mix)
- cookingTime MUST be a number (minutes)
- Use metric system
- Realistic quantities for home cooking
- Avoid leaving out obvious usable ingredients without a reason
- Before returning the JSON, internally verify that all rules above are satisfied
`;

      const result = await this.callAndParseJson<SuggestRecipesResponse>(
        () =>
          this.openai.chat.completions.create({
            model: 'gpt-5-mini',
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'suggest_recipes',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    suggestedRecipes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          dishName: { type: 'string' },
                          description: { type: 'string' },
                          ingredients: {
                            type: 'array',
                            items: RECIPE_INGREDIENT_SCHEMA,
                          },
                          instructions: {
                            type: 'array',
                            items: INSTRUCTION_STEP_SCHEMA,
                          },
                          cookingTime: { type: 'number' },
                          matchedIngredients: {
                            type: 'array',
                            items: { type: 'string' },
                          },
                          additionalIngredients: {
                            type: 'array',
                            items: { type: 'string' },
                          },
                        },
                        required: [
                          'dishName',
                          'description',
                          'ingredients',
                          'instructions',
                          'cookingTime',
                          'matchedIngredients',
                          'additionalIngredients',
                        ],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ['suggestedRecipes'],
                  additionalProperties: false,
                },
              },
            },
            messages: [
              {
                role: 'system',
                content:
                  'You are a creative culinary assistant and recipe analyzer. You suggest realistic recipes based on available ingredients. You strictly follow schemas and return valid JSON only.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        'suggestRecipes',
      );

      result.suggestedRecipes.forEach((recipe) => {
        recipe.ingredients.forEach((ing) => {
          if (typeof ing.quantity !== 'number' || ing.quantity <= 0) {
            this.logger.warn(
              {
                ingredient: ing.name,
                quantity: ing.quantity,
                recipe: recipe.dishName,
              },
              'Invalid ingredient quantity from LLM',
            );
            throw new Error(
              `Invalid ingredient quantity for "${ing.name}" in recipe "${recipe.dishName}"`,
            );
          }
        });
      });

      this.logger.log(
        {
          recipesCount: result.suggestedRecipes.length,
        },
        'Recipes suggested successfully',
      );

      const ttl = this.configService.get<number>('AI_CACHE_TTL_SUGGEST', 3600);
      try {
        await this.redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);
      } catch (error: unknown) {
        this.logger.warn({ error, cacheKey }, 'Cache SET failed');
      }

      return result;
    });
  }

  async categorizeItems(
    items: { id: string; name: string }[],
    categories: { id: string; slug: string; name: string }[],
  ): Promise<ItemCategoryMapping[]> {
    const cacheKey = generateCacheKey('categorize', {
      v: PROMPT_VERSIONS.categorize,
      model: 'gpt-4.1-mini',
      temp: 0.1,
      items,
      categories,
    });

    try {
      const raw = await this.redis.get(cacheKey);
      if (raw) {
        this.logger.log({ cacheKey }, 'AI cache HIT: categorizeItems');
        return JSON.parse(raw) as ItemCategoryMapping[];
      }
    } catch (error: unknown) {
      this.logger.warn(
        { error, cacheKey },
        'Cache GET failed, proceeding without cache',
      );
    }

    return this.deduplicated(cacheKey, async () => {
      this.logger.log(
        {
          cacheKey,
          itemsCount: items.length,
          categoriesCount: categories.length,
        },
        'AI cache MISS: categorizeItems',
      );

      const prompt = `Task: Assign the most appropriate category to each item.

Items (JSON):
${JSON.stringify(items)}

Categories (JSON):
${JSON.stringify(categories)}

Rules:
- Every item MUST appear exactly once
- categoryId MUST be one of the provided category IDs or null
- Choose the most semantically accurate category
- If multiple categories match, choose the most specific one
- confidence: a number between 0 and 1 representing certainty of the category assignment
  - 0.8–1.0: category is clearly correct
  - 0.5–0.8: minor ambiguity between categories
  - <0.5: uncertain or no good match`;

      const parsed = await this.callAndParseJson<{
        mappings: ItemCategoryMapping[];
      }>(
        () =>
          this.openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            temperature: 0.1,
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'item_category_mapping',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    mappings: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          itemId: { type: 'string' },
                          categoryId: { type: ['string', 'null'] },
                          confidence: {
                            type: 'number',
                            minimum: 0,
                            maximum: 1,
                          },
                        },
                        required: ['itemId', 'categoryId', 'confidence'],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ['mappings'],
                  additionalProperties: false,
                },
              },
            },
            messages: [
              {
                role: 'system',
                content:
                  'You are a grocery product categorization engine. Return valid JSON only.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        'categorizeItems',
      );

      if (parsed.mappings.length !== items.length) {
        this.logger.error(
          { expected: items.length, received: parsed.mappings.length },
          'AI returned wrong number of mappings',
        );
        throw new Error(
          `Expected ${items.length} mappings, got ${parsed.mappings.length}`,
        );
      }

      const itemIds = new Set(items.map((i) => i.id));
      const returnedIds = new Set(parsed.mappings.map((m) => m.itemId));
      const categoryIds = new Set(categories.map((c) => c.id));

      if (returnedIds.size !== items.length) {
        this.logger.error(
          { expected: items.length, unique: returnedIds.size },
          'Duplicate itemIds in AI response',
        );
        throw new Error(
          `Expected ${items.length} unique itemIds, got ${returnedIds.size}`,
        );
      }

      for (const mapping of parsed.mappings) {
        if (!itemIds.has(mapping.itemId)) {
          throw new Error(`AI returned unknown itemId: ${mapping.itemId}`);
        }
        if (
          mapping.categoryId !== null &&
          !categoryIds.has(mapping.categoryId)
        ) {
          this.logger.warn(
            { categoryId: mapping.categoryId, itemId: mapping.itemId },
            'AI returned unknown categoryId, resetting to null',
          );
          mapping.categoryId = null;
          mapping.confidence = 0;
        }
      }

      const lowConfidence = parsed.mappings.filter((m) => m.confidence < 0.6);
      const avgConfidence =
        parsed.mappings.reduce((sum, m) => sum + m.confidence, 0) /
        parsed.mappings.length;

      this.logger.log(
        {
          mappingsCount: parsed.mappings.length,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          lowConfidenceCount: lowConfidence.length,
        },
        'Items categorized successfully',
      );

      const ttl = this.configService.get<number>(
        'AI_CACHE_TTL_CATEGORIZE',
        604800,
      );
      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(parsed.mappings),
          'EX',
          ttl,
        );
      } catch (error: unknown) {
        this.logger.warn({ error, cacheKey }, 'Cache SET failed');
      }

      return parsed.mappings;
    });
  }
}
