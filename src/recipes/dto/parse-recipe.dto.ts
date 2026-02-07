import { IsString, IsNotEmpty } from 'class-validator';

export class ParseRecipeDto {
  @IsString()
  @IsNotEmpty()
  recipeText: string;
}
