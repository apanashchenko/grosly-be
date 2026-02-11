import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotPromptInjection } from '../../common/validators';

export class ParseRecipeDto {
  @ApiProperty({
    description: 'Recipe text to parse (plain text, no HTML)',
    example:
      'Borscht\n\nIngredients:\n- beetroot 2 pcs\n- potatoes 3 pcs\n- carrot 1 pc\n- onion 1 pc\n- cabbage 300 g\n- meat 500 g\n- tomato paste 2 tbsp\n- salt, pepper to taste',
    minLength: 3,
    maxLength: 10000,
  })
  @Transform(({ value }: { value: string }) =>
    value?.trim()?.replace(/<[^>]*>/g, ''),
  )
  @IsString()
  @IsNotEmpty({ message: 'Recipe text cannot be empty' })
  @MinLength(3, { message: 'Recipe text is too short (min 3 characters)' })
  @MaxLength(10000, {
    message: 'Recipe text is too long (max 10,000 characters)',
  })
  @IsNotPromptInjection({ message: 'Input contains suspicious patterns' })
  recipeText: string;
}
