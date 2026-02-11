import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Patterns that might indicate prompt injection attempts
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+instructions?/i,
  /system\s*:\s*/i,
  /you\s+are\s+now/i,
  /act\s+as\s+(a|an)/i,
  /pretend\s+to\s+be/i,
  /<\|.*?\|>/, // Special tokens like <|system|>
  /\[SYSTEM\]/i,
  /\[INST\]/i,
  /assistant\s*:\s*/i,
  /\{\{.*?\}\}/, // Template injection
];

/**
 * Custom validator to detect potential prompt injection attempts
 *
 * @example
 * ```typescript
 * @IsNotPromptInjection()
 * recipeText: string;
 * ```
 */
export function IsNotPromptInjection(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotPromptInjection',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: 'Input contains suspicious patterns',
        ...validationOptions,
      },
      validator: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        validate(value: any, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;

          // Check if input matches any suspicious patterns
          return !PROMPT_INJECTION_PATTERNS.some((pattern) =>
            pattern.test(value),
          );
        },
      },
    });
  };
}
