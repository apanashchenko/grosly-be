import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async extractIngredientsFromRecipe(
    recipeText: string,
    responseLanguage: string = 'uk',
    categories: { slug: string; name: string }[] = [],
  ): Promise<Ingredient[]> {
    this.logger.debug(
      {
        recipeTextLength: recipeText.length,
        responseLanguage,
        categoriesCount: categories.length,
      },
      'Calling OpenAI API: extractIngredientsFromRecipe',
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

    const startTime = Date.now();
    const completion = await this.openai.chat.completions.create({
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
    });
    const duration = Date.now() - startTime;

    this.logger.log(
      {
        model: 'gpt-4.1-mini',
        duration,
        tokensUsed: completion.usage?.total_tokens,
      },
      'OpenAI API call completed: extractIngredients',
    );

    const responseText = completion.choices[0].message.content?.trim();

    if (!responseText) {
      this.logger.error('Empty response from OpenAI API');
      throw new Error('Empty response from OpenAI');
    }

    // Remove markdown formatting if present
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(jsonText) as { ingredients: Ingredient[] };

    this.logger.debug(
      { ingredientsCount: parsed.ingredients.length },
      'Ingredients extracted successfully',
    );

    return parsed.ingredients;
  }

  async generateMealPlanFromUserQuery(
    userQuery: string,
    responseLanguage: string = 'uk',
  ): Promise<MealPlanAiResponse> {
    this.logger.debug(
      { queryLength: userQuery.length, responseLanguage },
      'Calling OpenAI API: generateMealPlanFromUserQuery',
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

Return ONLY valid JSON in the following format:

{
  "parsedRequest": {
    "numberOfPeople": number,
    "numberOfDays": number,
    "dietaryRestrictions": string[],
    "mealType": string | null
  },
  "recipes": [
    {
      "dishName": string,
      "description": string,
      "ingredients": [
        {
          "name": string,
          "quantity": number,
          "unit": {
            "canonical": string,
            "localized": string
          }
        }
      ],
      "instructions": [
        {
          "step": number,
          "text": string
        }
      ],
      "cookingTime": number
    }
  ]
}

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
- Return JSON ONLY, without markdown or explanations
`;

    const startTime = Date.now();
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-5-mini',
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
    });
    const duration = Date.now() - startTime;

    this.logger.log(
      {
        model: 'gpt-5-mini',
        duration,
        tokensUsed: completion.usage?.total_tokens,
      },
      'OpenAI API call completed: generateMealPlan',
    );

    const responseText = completion.choices[0].message.content?.trim();

    if (!responseText) {
      this.logger.error('Empty response from OpenAI API');
      throw new Error('Empty response from OpenAI');
    }

    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result = JSON.parse(jsonText) as MealPlanAiResponse;

    this.logger.debug(
      {
        numberOfPeople: result.parsedRequest.numberOfPeople,
        numberOfDays: result.parsedRequest.numberOfDays,
        recipesCount: result.recipes.length,
      },
      'Meal plan generated successfully',
    );

    return result;
  }

  async suggestRecipesFromIngredients(
    ingredients: string[],
    responseLanguage: string = 'uk',
    strictMode: boolean = false,
  ): Promise<SuggestRecipesResponse> {
    this.logger.debug(
      { ingredientsCount: ingredients.length, responseLanguage, strictMode },
      'Calling OpenAI API: suggestRecipesFromIngredients',
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

Return ONLY valid JSON in the following format:

{
  "suggestedRecipes": [
    {
      "dishName": string,
      "description": string,
      "ingredients": [
        {
          "name": string,
          "quantity": number,
          "unit": {
            "canonical": string,
            "localized": string
          }
        }
      ],
      "instructions": [
        {
          "step": number,
          "text": string
        }
      ],
      "cookingTime": number,
      "matchedIngredients": string[],
      "additionalIngredients": string[]
    }
  ]
}

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
- Return JSON ONLY, without markdown or explanations
`;

    const startTime = Date.now();
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-5-mini',
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
    });
    const duration = Date.now() - startTime;

    this.logger.log(
      {
        model: 'gpt-5-mini',
        duration,
        tokensUsed: completion.usage?.total_tokens,
      },
      'OpenAI API call completed: suggestRecipes',
    );

    const responseText = completion.choices[0].message.content?.trim();
    if (!responseText) {
      this.logger.error('Empty response from OpenAI API');
      throw new Error('Empty response from OpenAI');
    }

    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let result: SuggestRecipesResponse;
    try {
      result = JSON.parse(jsonText);
    } catch (err) {
      this.logger.error(
        { jsonText, error: err },
        'Failed to parse JSON from OpenAI',
      );
      throw new Error('Failed to parse recipe suggestions');
    }

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

    this.logger.debug(
      {
        recipesCount: result.suggestedRecipes.length,
      },
      'Recipes suggested successfully',
    );

    return result;
  }

  async categorizeItems(
    items: { id: string; name: string }[],
    categories: { id: string; slug: string; name: string }[],
  ): Promise<ItemCategoryMapping[]> {
    this.logger.debug(
      { itemsCount: items.length, categoriesCount: categories.length },
      'Calling OpenAI API: categorizeItems',
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

    const startTime = Date.now();
    const completion = await this.openai.chat.completions.create({
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
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
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
    });
    const duration = Date.now() - startTime;

    this.logger.log(
      {
        model: 'gpt-4.1-mini',
        duration,
        tokensUsed: completion.usage?.total_tokens,
      },
      'OpenAI API call completed: categorizeItems',
    );

    const responseText = completion.choices[0].message.content?.trim();

    if (!responseText) {
      this.logger.error('Empty response from OpenAI API');
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(responseText) as {
      mappings: ItemCategoryMapping[];
    };

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
      if (mapping.categoryId !== null && !categoryIds.has(mapping.categoryId)) {
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

    this.logger.debug(
      {
        mappingsCount: parsed.mappings.length,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        lowConfidenceCount: lowConfidence.length,
      },
      'Items categorized successfully',
    );

    return parsed.mappings;
  }
}
