# Spysko - AI-Powered Shopping List Generator

## Опис проекту

**Spysko** - це додаток для автоматичної генерації списків продуктів з рецептів за допомогою штучного інтелекту. Натхнення взято з [neomi.app](https://neomi.app/).

### Основна ідея
Користувач хоче приготувати страву (наприклад, борщ), просто вводить назву страви, а система автоматично генерує рецепт і структурований список всіх необхідних інгредієнтів для покупки.

### Реалізований функціонал (MVP)
- **Генерація рецептів** за назвою страви (`POST /recipes/generate`)
- **Пропозиція рецептів** на основі наявних інгредієнтів (`POST /recipes/suggest`)
- **Парсинг текстових рецептів** з автоматичним призначенням категорій (`POST /recipes/parse`)
- **Shopping List** — повний CRUD + item-level CRUD, прив'язка до юзера, position, categoryId, purchased
- **Categories** — системні (`userId=null`) + кастомні користувача (CRUD, системні — 403 на edit/delete)
- **Google OAuth** — JWT access + refresh tokens з ротацією, глобальний JwtAuthGuard, `@Public()` для відкритих
- **User Preferences** — алергії, дієтичні обмеження, defaultServings, customNotes
- **Swagger/OpenAPI** на `/api`
- Комплексна валідація (length limits, HTML sanitization, prompt injection detection)

### Формат вводу
- Назва страви → AI генерує рецепт + інгредієнти
- Список наявних продуктів → AI пропонує рецепти
- Текст рецепту → AI витягує інгредієнти
- Майбутнє: URL рецепту, фото рецепту

## Tech Stack

- **Backend:** NestJS + TypeScript (strict), pnpm
- **DB:** PostgreSQL + TypeORM, SnakeNamingStrategy (camelCase TS → snake_case DB), DB_SYNCHRONIZE=true in dev
- **AI:** OpenAI GPT-3.5 Turbo (temperature 0.3)
- **Auth:** Google OAuth (token-based via google-auth-library) + JWT (passport-jwt)
- **Validation:** class-validator + class-transformer + custom validators
- **Docs:** Swagger/OpenAPI on `/api`

## Modules

| Module | Responsibility |
|--------|---------------|
| `ai/` | OpenAI integration (extractIngredients, generateRecipe, suggestRecipe) |
| `recipes/` | POST /recipes/generate, /suggest, /parse |
| `shopping-list/` | Full CRUD for lists + item-level CRUD (user-owned, ownership check) |
| `categories/` | System + custom user categories (CRUD, system = 403 for edit/delete) |
| `auth/` | Google OAuth, JWT tokens, global JwtAuthGuard, @Public() decorator |
| `users/` | GET /users/me |
| `user-preferences/` | Allergies, dietary restrictions, defaultServings, customNotes |
| `common/` | Custom validators (IsNotPromptInjection) |
| `entities/` | TypeORM entities: User, UserPreferences, ShoppingList, ShoppingListItem, Category, Product, Allergy, DietaryRestriction |
| `database/` | PostgreSQL connection, SnakeNamingStrategy |

## Key Architecture Decisions

- **Global JwtAuthGuard** as APP_GUARD — all endpoints protected, use `@Public()` for open routes
- **@CurrentUser()** decorator extracts user from JWT request
- **Categories:** `userId = null` → system (read-only), `userId = 'xxx'` → user's custom
- **Shopping list items** have `position` (drag & drop), `categoryId` (FK to Category), `purchased` flag
- **User Preferences:** auto-created on first GET, allergyIds/dietaryRestrictionIds are full-replace arrays
- **Parse endpoint** auto-assigns categoryId (system or user's custom) to each ingredient via AI

## Environment Variables

```env
OPENAI_API_KEY=sk-...
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=spysko
DB_SYNCHRONIZE=true
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
JWT_SECRET=...
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

## Dev Rules

- **Code comments, Swagger docs, API descriptions: English only** (user-facing AI content can be any language)
- TypeScript strict mode, ESLint + Prettier
- Files: `kebab-case`, Classes: `PascalCase`, Constants: `UPPER_SNAKE_CASE`
- DTOs for all endpoints, Services for business logic
- Git: Commitizen style (feat:, fix:, docs:), co-authored with Claude

## Running

```bash
pnpm install
docker compose up -d          # PostgreSQL
cp .env.example .env          # fill in keys
pnpm start:dev
# Swagger: http://localhost:3000/api
# Test auth: npx serve . -l 4000 → open test-google-auth.html
```

## Related Docs

- [FRONTEND_API_PROMPT.md](FRONTEND_API_PROMPT.md) — full API docs for frontend
- Swagger UI at `/api` — interactive API explorer with all endpoints, DTOs, examples
- [VALIDATION_SUMMARY.md](VALIDATION_SUMMARY.md) — validation overview
