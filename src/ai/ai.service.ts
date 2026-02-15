import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { createHash } from 'crypto';
import { generateCacheKey } from '../cache/cache-key.util';
import { AiClientService, AiCallConfig } from './ai-client.service';
import {
  SINGLE_RECIPE_RESPONSE_FORMAT,
  MEAL_PLAN_RESPONSE_FORMAT,
  SUGGEST_RECIPES_RESPONSE_FORMAT,
} from './ai.schemas';

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
  categorySlug: string | null;
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
  description: string;
  recipes: Recipe[];
}

export interface SingleRecipeAiResponse {
  numberOfPeople: number;
  recipe: Recipe;
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

export interface ParseRecipeAiResponse {
  recipeText: string;
  ingredients: Ingredient[];
  error?: string;
}

export interface ItemCategoryMapping {
  itemId: string;
  categoryId: string | null;
  confidence: number;
}

const PROMPT_VERSIONS = {
  parse: 'v6',
  parseImage: 'v6',
  generate: 'v1',
  suggest: 'v1',
  categorize: 'v1',
} as const;

@Injectable()
export class AiService {
  constructor(
    @InjectPinoLogger(AiService.name) private readonly logger: PinoLogger,
    private readonly client: AiClientService,
  ) {}

  // ==================== PROMPT / CONFIG BUILDERS ====================

  private buildCategoryBlock(
    categories: { slug: string; name: string }[],
  ): string {
    if (categories.length === 0) return '';
    return `\nAvailable product categories:\n${categories.map((c) => `- "${c.slug}" (${c.name})`).join('\n')}\n`;
  }

  private buildCategoryRule(
    categories: { slug: string; name: string }[],
  ): string {
    return categories.length > 0
      ? '- categorySlug MUST be one of the provided category slugs, or null if no category fits'
      : '- categorySlug MUST be null (no categories provided)';
  }

  private buildExtractIngredientsConfig(
    recipeText: string,
    responseLanguage: string,
    categories: { slug: string; name: string }[],
  ): AiCallConfig {
    return {
      cacheKey: generateCacheKey('parse', {
        v: PROMPT_VERSIONS.parse,
        model: 'gpt-4.1-mini',
        temp: 0.3,
        text: recipeText,
        lang: responseLanguage,
        categories,
      }),
      cacheTtlKey: 'AI_CACHE_TTL_PARSE',
      cacheTtlDefault: 21600,
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      systemMessage:
        'You are a culinary text analyst. You strictly follow schemas and return valid JSON only.',
      prompt: `
Recipe text (can be in any language):
"""
${recipeText}
"""
${this.buildCategoryBlock(categories)}
Your task:
1. First, determine if the text is a recipe or contains a list of ingredients
2. If the text is NOT a recipe and does NOT contain ingredients, return an error response (see below)
3. If the text IS a recipe or contains ingredients:
   a. Extract ALL mentioned ingredients exactly as written
   b. Normalize units where possible
${categories.length > 0 ? '   c. Assign the most appropriate category to each ingredient from the provided list' : ''}
   ${categories.length > 0 ? 'd' : 'c'}. Create a clean, well-formatted version of the recipe text

If the text is NOT a recipe and does NOT contain ingredients, return:
{
  "recipeText": "",
  "ingredients": [],
  "error": string (a short user-friendly message in language "${responseLanguage}" explaining that the provided text does not appear to be a recipe and ingredients could not be extracted)
}

If the text IS a recipe or contains ingredients, return:
{
  "recipeText": string,
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
- recipeText MUST be a clean, well-formatted version of the original recipe in language: "${responseLanguage}"
- recipeText MUST include the dish name, ingredient list with quantities, and step-by-step cooking instructions
- recipeText MUST use plain text with line breaks for readability (no markdown, no HTML)
- Ingredient "name" MUST contain ONLY the pure product name (e.g. "cheese", "onion", "pepper")
- Do NOT include qualifiers, clarifications, or serving notes in "name"
- Move ALL extra info into "note": purpose ("for serving", "for marinade"), optionality ("optional"), size/type ("large", "red"), preparation ("diced", "grated")
- Examples:
  - "cheese for serving, optional" → name: "cheese", note: "for serving, optional"
  - "large onion sliced into rings" → name: "onion", note: "large, sliced into rings"
  - "red pepper" → name: "pepper", note: "red"
  - "olive oil" → name: "olive oil", note: null (it is a single product name)
- If the qualifier is part of the product identity (e.g. "olive oil", "soy sauce", "butter"), keep it in "name"
- Ingredient names MUST be in language: "${responseLanguage}"
- note MUST be in language: "${responseLanguage}" (e.g. "optional", "for serving", "large", "diced" — translated to "${responseLanguage}")
- localized unit MUST be in language: "${responseLanguage}"
- canonical unit MUST be a neutral identifier (e.g. "g", "ml", "pcs", "tbsp", "tsp")
- If quantity is not specified or ingredient is "to taste" / "by taste" / similar:
  - set quantity = null
  - set unit = null
  - set note = the equivalent phrase in language "${responseLanguage}" (do NOT use English)
- Do NOT invent quantities
- Do NOT use ranges (1-2, a few, some)
- Use metric system where possible
${categories.length > 0 ? '- categorySlug MUST be one of the provided category slugs, or null if no category fits\n- Pick the most semantically appropriate category for each ingredient' : '- categorySlug MUST be null (no categories provided)'}
- Return JSON ONLY, no markdown, no explanations
`,
    };
  }

  private buildExtractIngredientsFromImageConfig(
    imageBase64: string,
    imageHash: string,
    responseLanguage: string,
    categories: { slug: string; name: string }[],
  ): AiCallConfig {
    return {
      cacheKey: generateCacheKey('parse-image', {
        v: PROMPT_VERSIONS.parseImage,
        model: 'gpt-4.1-mini',
        temp: 0.3,
        imageHash,
        lang: responseLanguage,
        categories,
      }),
      cacheTtlKey: 'AI_CACHE_TTL_PARSE',
      cacheTtlDefault: 21600,
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      systemMessage:
        'You are a culinary image analyst. You extract ingredients from recipe images/screenshots. You strictly follow schemas and return valid JSON only.',
      imageBase64,
      prompt: `
Analyze the image above.
${this.buildCategoryBlock(categories)}
Your task:
1. First, determine if the image contains a recipe or a list of ingredients
2. If the image does NOT contain a recipe or ingredients, return an error response (see below)
3. If the image DOES contain a recipe or ingredients:
   a. Extract ALL mentioned ingredients exactly as written
   b. Normalize units where possible
${categories.length > 0 ? '   c. Assign the most appropriate category to each ingredient from the provided list' : ''}
   ${categories.length > 0 ? 'd' : 'c'}. Create a clean, well-formatted version of the recipe text from the image

If the image does NOT contain a recipe or ingredients, return:
{
  "recipeText": "",
  "ingredients": [],
  "error": string (a short user-friendly message in language "${responseLanguage}" explaining that the image does not appear to contain a recipe and ingredients could not be extracted)
}

If the image DOES contain a recipe or ingredients, return:
{
  "recipeText": string,
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
- recipeText MUST be a clean, well-formatted version of the recipe from the image in language: "${responseLanguage}"
- recipeText MUST include the dish name, ingredient list with quantities, and step-by-step cooking instructions
- recipeText MUST use plain text with line breaks for readability (no markdown, no HTML)
- Ingredient "name" MUST contain ONLY the pure product name (e.g. "cheese", "onion", "pepper")
- Do NOT include qualifiers, clarifications, or serving notes in "name"
- Move ALL extra info into "note": purpose ("for serving", "for marinade"), optionality ("optional"), size/type ("large", "red"), preparation ("diced", "grated")
- Examples:
  - "cheese for serving, optional" → name: "cheese", note: "for serving, optional"
  - "large onion sliced into rings" → name: "onion", note: "large, sliced into rings"
  - "red pepper" → name: "pepper", note: "red"
  - "olive oil" → name: "olive oil", note: null (it is a single product name)
- If the qualifier is part of the product identity (e.g. "olive oil", "soy sauce", "butter"), keep it in "name"
- Ingredient names MUST be in language: "${responseLanguage}"
- note MUST be in language: "${responseLanguage}" (e.g. "optional", "for serving", "large", "diced" — translated to "${responseLanguage}")
- localized unit MUST be in language: "${responseLanguage}"
- canonical unit MUST be a neutral identifier (e.g. "g", "ml", "pcs", "tbsp", "tsp")
- If quantity is not specified or ingredient is "to taste" / "by taste" / similar:
  - set quantity = null
  - set unit = null
  - set note = the equivalent phrase in language "${responseLanguage}" (do NOT use English)
- Do NOT invent quantities
- Do NOT use ranges (1-2, a few, some)
- Use metric system where possible
${categories.length > 0 ? '- categorySlug MUST be one of the provided category slugs, or null if no category fits\n- Pick the most semantically appropriate category for each ingredient' : '- categorySlug MUST be null (no categories provided)'}
- Return JSON ONLY, no markdown, no explanations
`,
    };
  }

  private buildSingleRecipeConfig(
    dishQuery: string,
    responseLanguage: string,
    categories: { slug: string; name: string }[],
  ): AiCallConfig {
    return {
      cacheKey: generateCacheKey('generate-single', {
        v: PROMPT_VERSIONS.generate,
        model: 'gpt-5-mini',
        query: dishQuery,
        lang: responseLanguage,
        categories,
      }),
      cacheTtlKey: 'AI_CACHE_TTL_GENERATE',
      cacheTtlDefault: 3600,
      model: 'gpt-5-mini',
      systemMessage:
        'You are a multilingual culinary expert. You generate detailed, realistic recipes. You strictly follow schemas and return valid JSON only.',
      responseFormat: SINGLE_RECIPE_RESPONSE_FORMAT,
      prompt: `
User query (can be in any language):
"${dishQuery}"
${this.buildCategoryBlock(categories)}
Your task:
1. Understand the user's intent regardless of query language
2. Determine how many people the dish is for (default: 2 if not specified)
3. Generate one classic, realistic recipe for the requested dish
4. Calculate ingredient quantities for the determined number of people
${categories.length > 0 ? '5. Assign the most appropriate category to each ingredient from the provided list' : ''}

Rules:
- All human-readable text MUST be in language: "${responseLanguage}"
- canonical units MUST be consistent (e.g. "g", "ml", "pcs", "tbsp", "tsp")
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
${this.buildCategoryRule(categories)}
`,
    };
  }

  private buildMealPlanConfig(
    userQuery: string,
    responseLanguage: string,
    categories: { slug: string; name: string }[],
  ): AiCallConfig {
    return {
      cacheKey: generateCacheKey('generate', {
        v: PROMPT_VERSIONS.generate,
        model: 'gpt-5-mini',
        query: userQuery,
        lang: responseLanguage,
        categories,
      }),
      cacheTtlKey: 'AI_CACHE_TTL_GENERATE',
      cacheTtlDefault: 3600,
      model: 'gpt-5-mini',
      systemMessage:
        'You are a multilingual culinary planner and data analyst. You strictly follow schemas and return valid JSON only.',
      responseFormat: MEAL_PLAN_RESPONSE_FORMAT,
      prompt: `
User query (can be in any language):
"${userQuery}"
${this.buildCategoryBlock(categories)}
Your task:
1. Understand the user's intent regardless of query language
2. Determine:
   - number of people
   - number of days
   - dietary restrictions
   - meal type (if specified)
3. Write a short description (1-2 sentences) summarizing the meal plan theme/goal
4. Generate classic, realistic recipes
5. Calculate ingredient quantities per recipe
${categories.length > 0 ? '6. Assign the most appropriate category to each ingredient from the provided list' : ''}

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
${this.buildCategoryRule(categories)}
`,
    };
  }

  private buildSuggestRecipesConfig(
    ingredients: string[],
    responseLanguage: string,
    strictMode: boolean,
  ): AiCallConfig {
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

    return {
      cacheKey: generateCacheKey('suggest', {
        v: PROMPT_VERSIONS.suggest,
        model: 'gpt-5-mini',
        ingredients,
        lang: responseLanguage,
        strict: strictMode,
      }),
      cacheTtlKey: 'AI_CACHE_TTL_SUGGEST',
      cacheTtlDefault: 3600,
      model: 'gpt-5-mini',
      systemMessage:
        'You are a creative culinary assistant and recipe analyzer. You suggest realistic recipes based on available ingredients. You strictly follow schemas and return valid JSON only.',
      responseFormat: SUGGEST_RECIPES_RESPONSE_FORMAT,
      prompt: `
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
`,
    };
  }

  // ==================== PUBLIC METHODS (non-streamed) ====================

  async extractIngredientsFromRecipe(
    recipeText: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
  ): Promise<ParseRecipeAiResponse> {
    const config = this.buildExtractIngredientsConfig(
      recipeText,
      responseLanguage,
      categories,
    );

    const cached = await this.client.cacheGet<ParseRecipeAiResponse>(
      config.cacheKey,
      'extractIngredients',
    );
    if (cached) return cached;

    return this.client.deduplicated(config.cacheKey, async () => {
      this.logger.info(
        {
          cacheKey: config.cacheKey,
          recipeTextLength: recipeText.length,
          responseLanguage,
          categoriesCount: categories.length,
        },
        'AI cache MISS: extractIngredientsFromRecipe',
      );

      const parsed = await this.client.callAndParseJson<ParseRecipeAiResponse>(
        config,
        'extractIngredients',
      );

      this.logger.info(
        { ingredientsCount: parsed.ingredients.length, error: parsed.error },
        'Ingredients extracted successfully',
      );

      const result: ParseRecipeAiResponse = {
        recipeText: parsed.recipeText,
        ingredients: parsed.ingredients,
        ...(parsed.error && { error: parsed.error }),
      };

      await this.client.cacheSet(
        config.cacheKey,
        result,
        config.cacheTtlKey,
        config.cacheTtlDefault,
      );

      return result;
    });
  }

  async extractIngredientsFromImage(
    imageBuffer: Buffer,
    mimeType: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
  ): Promise<ParseRecipeAiResponse> {
    const imageBase64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    const imageHash = createHash('sha256').update(imageBuffer).digest('hex');

    const config = this.buildExtractIngredientsFromImageConfig(
      imageBase64,
      imageHash,
      responseLanguage,
      categories,
    );

    const cached = await this.client.cacheGet<ParseRecipeAiResponse>(
      config.cacheKey,
      'extractIngredientsFromImage',
    );
    if (cached) return cached;

    return this.client.deduplicated(config.cacheKey, async () => {
      this.logger.info(
        {
          cacheKey: config.cacheKey,
          imageHash,
          imageSizeKb: Math.round(imageBuffer.length / 1024),
          responseLanguage,
          categoriesCount: categories.length,
        },
        'AI cache MISS: extractIngredientsFromImage',
      );

      const parsed = await this.client.callAndParseJson<ParseRecipeAiResponse>(
        config,
        'extractIngredientsFromImage',
      );

      this.logger.info(
        { ingredientsCount: parsed.ingredients.length, error: parsed.error },
        'Ingredients extracted from image successfully',
      );

      const result: ParseRecipeAiResponse = {
        recipeText: parsed.recipeText,
        ingredients: parsed.ingredients,
        ...(parsed.error && { error: parsed.error }),
      };

      await this.client.cacheSet(
        config.cacheKey,
        result,
        config.cacheTtlKey,
        config.cacheTtlDefault,
      );

      return result;
    });
  }

  async generateMealPlanFromUserQuery(
    userQuery: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
  ): Promise<MealPlanAiResponse> {
    const config = this.buildMealPlanConfig(
      userQuery,
      responseLanguage,
      categories,
    );

    const cached = await this.client.cacheGet<MealPlanAiResponse>(
      config.cacheKey,
      'generateMealPlan',
    );
    if (cached) return cached;

    return this.client.deduplicated(config.cacheKey, async () => {
      this.logger.info(
        {
          cacheKey: config.cacheKey,
          queryLength: userQuery.length,
          responseLanguage,
        },
        'AI cache MISS: generateMealPlanFromUserQuery',
      );

      const result = await this.client.callAndParseJson<MealPlanAiResponse>(
        config,
        'generateMealPlan',
      );

      this.logger.info(
        {
          numberOfPeople: result.parsedRequest.numberOfPeople,
          numberOfDays: result.parsedRequest.numberOfDays,
          recipesCount: result.recipes.length,
        },
        'Meal plan generated successfully',
      );

      await this.client.cacheSet(
        config.cacheKey,
        result,
        config.cacheTtlKey,
        config.cacheTtlDefault,
      );

      return result;
    });
  }

  async generateSingleRecipe(
    dishQuery: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
  ): Promise<SingleRecipeAiResponse> {
    const config = this.buildSingleRecipeConfig(
      dishQuery,
      responseLanguage,
      categories,
    );

    const cached = await this.client.cacheGet<SingleRecipeAiResponse>(
      config.cacheKey,
      'generateSingleRecipe',
    );
    if (cached) return cached;

    return this.client.deduplicated(config.cacheKey, async () => {
      this.logger.info(
        {
          cacheKey: config.cacheKey,
          queryLength: dishQuery.length,
          responseLanguage,
        },
        'AI cache MISS: generateSingleRecipe',
      );

      const result = await this.client.callAndParseJson<SingleRecipeAiResponse>(
        config,
        'generateSingleRecipe',
      );

      this.logger.info(
        {
          numberOfPeople: result.numberOfPeople,
          dishName: result.recipe.dishName,
          ingredientsCount: result.recipe.ingredients.length,
        },
        'Single recipe generated successfully',
      );

      await this.client.cacheSet(
        config.cacheKey,
        result,
        config.cacheTtlKey,
        config.cacheTtlDefault,
      );

      return result;
    });
  }

  async suggestRecipesFromIngredients(
    ingredients: string[],
    responseLanguage: string = 'uk',
    strictMode: boolean = false,
  ): Promise<SuggestRecipesResponse> {
    const config = this.buildSuggestRecipesConfig(
      ingredients,
      responseLanguage,
      strictMode,
    );

    const cached = await this.client.cacheGet<SuggestRecipesResponse>(
      config.cacheKey,
      'suggestRecipes',
    );
    if (cached) return cached;

    return this.client.deduplicated(config.cacheKey, async () => {
      this.logger.info(
        {
          cacheKey: config.cacheKey,
          ingredientsCount: ingredients.length,
          responseLanguage,
          strictMode,
        },
        'AI cache MISS: suggestRecipesFromIngredients',
      );

      const result = await this.client.callAndParseJson<SuggestRecipesResponse>(
        config,
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

      this.logger.info(
        { recipesCount: result.suggestedRecipes.length },
        'Recipes suggested successfully',
      );

      await this.client.cacheSet(
        config.cacheKey,
        result,
        config.cacheTtlKey,
        config.cacheTtlDefault,
      );

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

    const cached = await this.client.cacheGet<ItemCategoryMapping[]>(
      cacheKey,
      'categorizeItems',
    );
    if (cached) return cached;

    return this.client.deduplicated(cacheKey, async () => {
      this.logger.info(
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

      const parsed = await this.client.callAndParseJson<{
        mappings: ItemCategoryMapping[];
      }>(
        {
          cacheKey,
          cacheTtlKey: 'AI_CACHE_TTL_CATEGORIZE',
          cacheTtlDefault: 604800,
          model: 'gpt-4.1-mini',
          temperature: 0.1,
          systemMessage:
            'You are a grocery product categorization engine. Return valid JSON only.',
          prompt,
          responseFormat: {
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
        },
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

      this.logger.info(
        {
          mappingsCount: parsed.mappings.length,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          lowConfidenceCount: lowConfidence.length,
        },
        'Items categorized successfully',
      );

      await this.client.cacheSet(
        cacheKey,
        parsed.mappings,
        'AI_CACHE_TTL_CATEGORIZE',
        604800,
      );

      return parsed.mappings;
    });
  }

  // ==================== STREAMED VERSIONS ====================

  async extractIngredientsFromRecipeStreamed(
    recipeText: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
    onChunk: (delta: string) => void,
  ): Promise<ParseRecipeAiResponse> {
    const config = this.buildExtractIngredientsConfig(
      recipeText,
      responseLanguage,
      categories,
    );

    const cached = await this.client.cacheGet<ParseRecipeAiResponse>(
      config.cacheKey,
      'extractIngredientsStreamed',
    );
    if (cached) return cached;

    this.logger.info(
      {
        cacheKey: config.cacheKey,
        recipeTextLength: recipeText.length,
        responseLanguage,
        categoriesCount: categories.length,
      },
      'AI cache MISS: extractIngredientsFromRecipeStreamed',
    );

    const parsed = await this.client.callStreamedJson<ParseRecipeAiResponse>(
      config,
      onChunk,
      'extractIngredientsStreamed',
    );

    const result: ParseRecipeAiResponse = {
      recipeText: parsed.recipeText,
      ingredients: parsed.ingredients,
      ...(parsed.error && { error: parsed.error }),
    };

    await this.client.cacheSet(
      config.cacheKey,
      result,
      config.cacheTtlKey,
      config.cacheTtlDefault,
    );

    return result;
  }

  async generateSingleRecipeStreamed(
    dishQuery: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
    onChunk: (delta: string) => void,
  ): Promise<SingleRecipeAiResponse> {
    const config = this.buildSingleRecipeConfig(
      dishQuery,
      responseLanguage,
      categories,
    );

    const cached = await this.client.cacheGet<SingleRecipeAiResponse>(
      config.cacheKey,
      'generateSingleRecipeStreamed',
    );
    if (cached) return cached;

    this.logger.info(
      {
        cacheKey: config.cacheKey,
        queryLength: dishQuery.length,
        responseLanguage,
      },
      'AI cache MISS: generateSingleRecipeStreamed',
    );

    const result = await this.client.callStreamedJson<SingleRecipeAiResponse>(
      config,
      onChunk,
      'generateSingleRecipeStreamed',
    );

    await this.client.cacheSet(
      config.cacheKey,
      result,
      config.cacheTtlKey,
      config.cacheTtlDefault,
    );

    return result;
  }

  async generateMealPlanStreamed(
    userQuery: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
    onChunk: (delta: string) => void,
  ): Promise<MealPlanAiResponse> {
    const config = this.buildMealPlanConfig(
      userQuery,
      responseLanguage,
      categories,
    );

    const cached = await this.client.cacheGet<MealPlanAiResponse>(
      config.cacheKey,
      'generateMealPlanStreamed',
    );
    if (cached) return cached;

    this.logger.info(
      {
        cacheKey: config.cacheKey,
        queryLength: userQuery.length,
        responseLanguage,
      },
      'AI cache MISS: generateMealPlanStreamed',
    );

    const result = await this.client.callStreamedJson<MealPlanAiResponse>(
      config,
      onChunk,
      'generateMealPlanStreamed',
    );

    await this.client.cacheSet(
      config.cacheKey,
      result,
      config.cacheTtlKey,
      config.cacheTtlDefault,
    );

    return result;
  }

  async suggestRecipesStreamed(
    ingredients: string[],
    responseLanguage: string = 'uk',
    strictMode: boolean = false,
    onChunk: (delta: string) => void,
  ): Promise<SuggestRecipesResponse> {
    const config = this.buildSuggestRecipesConfig(
      ingredients,
      responseLanguage,
      strictMode,
    );

    const cached = await this.client.cacheGet<SuggestRecipesResponse>(
      config.cacheKey,
      'suggestRecipesStreamed',
    );
    if (cached) return cached;

    this.logger.info(
      {
        cacheKey: config.cacheKey,
        ingredientsCount: ingredients.length,
        responseLanguage,
        strictMode,
      },
      'AI cache MISS: suggestRecipesStreamed',
    );

    const result = await this.client.callStreamedJson<SuggestRecipesResponse>(
      config,
      onChunk,
      'suggestRecipesStreamed',
    );

    await this.client.cacheSet(
      config.cacheKey,
      result,
      config.cacheTtlKey,
      config.cacheTtlDefault,
    );

    return result;
  }
}
