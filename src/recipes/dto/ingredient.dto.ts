export class IngredientDto {
  name: string;
  quantity: string;
  unit: string;
}

export class ParseRecipeResponseDto {
  ingredients: IngredientDto[];
}
