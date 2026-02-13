import type OpenAI from 'openai';

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
    categorySlug: { type: ['string', 'null'] },
  },
  required: ['name', 'quantity', 'unit', 'categorySlug'],
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

export const SINGLE_RECIPE_RESPONSE_FORMAT: OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format'] =
  {
    type: 'json_schema',
    json_schema: {
      name: 'single_recipe',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          numberOfPeople: { type: 'number' },
          recipe: RECIPE_SCHEMA,
        },
        required: ['numberOfPeople', 'recipe'],
        additionalProperties: false,
      },
    },
  };

export const MEAL_PLAN_RESPONSE_FORMAT: OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format'] =
  {
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
          description: {
            type: 'string',
            description:
              'Short summary of the meal plan theme/goal (1-2 sentences)',
          },
          recipes: {
            type: 'array',
            items: RECIPE_SCHEMA,
          },
        },
        required: ['parsedRequest', 'description', 'recipes'],
        additionalProperties: false,
      },
    },
  };

export const SUGGEST_RECIPES_RESPONSE_FORMAT: OpenAI.Chat.Completions.ChatCompletionCreateParams['response_format'] =
  {
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
  };
