import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async extractIngredientsFromRecipe(
    recipeText: string,
  ): Promise<Ingredient[]> {
    const prompt = `
Проаналізуй текст рецепту і витягни всі інгредієнти у структурованому форматі JSON.

Рецепт:
${recipeText}

Поверни список інгредієнтів у форматі JSON array, де кожен елемент має структуру:
{
  "name": "назва продукту",
  "quantity": "кількість (число)",
  "unit": "одиниця виміру (грам, кг, літр, мл, штук, за смаком)"
}

Важливо:
- Якщо кількість не вказана, використовуй "за смаком" для quantity та unit
- Для "щіпки солі" використовуй quantity "за смаком"
- Конвертуй всі одиниці виміру в українську мову
- Поверни тільки JSON без додаткового тексту
`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'Ти помічник для аналізу рецептів. Повертай тільки валідний JSON без markdown форматування.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content.trim();

    // Видаляємо markdown форматування якщо є
    const jsonText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(jsonText);
  }
}
