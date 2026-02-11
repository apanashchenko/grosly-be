# Grosly Backend API — Frontend Integration Guide

Base URL: `http://localhost:3000`
Content-Type: `application/json`
Rate limit: 10 requests per 60 seconds (per IP)

## Authentication

All endpoints except `POST /auth/google`, `POST /auth/refresh`, and `GET /` require a Bearer JWT token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Without a valid token, protected endpoints return `401 Unauthorized`.

---

## 1. POST /auth/google

Authenticate with Google. Frontend sends a Google ID token (obtained via Google Sign-In SDK), backend verifies it, creates the user on first login, and returns JWT tokens.

### Setup: Google Sign-In on Frontend

```html
<!-- Load Google Identity Services SDK -->
<script src="https://accounts.google.com/gsi/client" async></script>
```

```typescript
// Initialize Google Sign-In
google.accounts.id.initialize({
  client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  callback: handleCredentialResponse,
});

// Render the button
google.accounts.id.renderButton(
  document.getElementById('google-signin-btn'),
  { theme: 'outline', size: 'large' }
);

// Handle the response
function handleCredentialResponse(response: { credential: string }) {
  const googleIdToken = response.credential;
  // Send to backend ↓
}
```

### Request

```typescript
interface GoogleAuthRequest {
  token: string;  // Google ID token from Google Sign-In SDK
}
```

### Response (200)

```typescript
interface AuthResponse {
  accessToken: string;   // JWT, short-lived (15min by default). Use for Authorization header.
  refreshToken: string;  // JWT, long-lived (7 days). Store securely, use to get new tokens.
  user: {
    id: string;          // UUID v4
    email: string;       // e.g. "user@gmail.com"
    name: string;        // e.g. "John Doe"
    avatarUrl: string;   // Google profile picture URL
    language: string;    // e.g. "uk"
  };
}
```

### Example

```typescript
const res = await fetch('http://localhost:3000/auth/google', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: googleIdToken }),
});
const data: AuthResponse = await res.json();

// Store tokens
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

### Errors
- `401` — Invalid or expired Google token
- `401` — Email already registered with a different sign-in method
- `401` — Account is deactivated

---

## 2. POST /auth/refresh

Exchange a valid refresh token for a new access/refresh token pair (token rotation). Call this when the access token expires (401 from protected endpoint).

### Request

```typescript
interface RefreshRequest {
  refreshToken: string;  // The refresh token from login or previous refresh
}
```

### Response (200)

Same `AuthResponse` as `/auth/google`.

### Example

```typescript
async function refreshTokens(): Promise<AuthResponse | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  const res = await fetch('http://localhost:3000/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    // Refresh token expired or revoked — redirect to login
    localStorage.clear();
    return null;
  }

  const data: AuthResponse = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}
```

### Errors
- `401` — Invalid, expired, or revoked refresh token

---

## 3. POST /auth/logout

Invalidate the refresh token. Requires Bearer token.

### Request

No body required. Send the access token in the Authorization header.

### Response

`204 No Content` — empty response body on success.

### Example

```typescript
await fetch('http://localhost:3000/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
localStorage.clear();
```

### Errors
- `401` — Unauthorized (invalid or missing token)

---

## 4. GET /users/me

Get the current authenticated user's profile. Requires Bearer token.

### Response (200)

```typescript
interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  language: string;
}
```

### Example

```typescript
const res = await fetch('http://localhost:3000/users/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` },
});
const user: UserProfile = await res.json();
```

### Errors
- `401` — Unauthorized

---

## 5. POST /recipes/generate

Generate recipes from a free-text user query. The AI parses the query to understand how many people, days, dietary restrictions, and meal type, then generates matching recipes with full ingredient lists.

### Request

```typescript
interface GenerateRequest {
  query: string;       // Free-text query, 3-500 chars. Examples: "борщ на 4 людини", "plan for 3 days for 2 people", "вечеря на тиждень, вегетаріанська"
  language?: string;   // ISO 639-1 code: "uk" | "en" | "pl" | "de" | "es" | "fr". Default: "uk"
}
```

### Response (200)

```typescript
interface GenerateResponse {
  parsedRequest: {
    numberOfPeople: number;         // 1-20
    numberOfDays: number;           // 1-7
    dietaryRestrictions: string[];  // e.g. ["vegetarian"]
    mealType: string | null;        // "breakfast" | "lunch" | "dinner" | null
  };
  recipes: Array<{
    dishName: string;               // e.g. "Класичний український борщ"
    description: string;            // Short description of the dish
    ingredients: Array<{
      name: string;                 // e.g. "буряк"
      quantity: number;             // e.g. 2
      unit: {
        canonical: string;          // Language-neutral: "g", "ml", "pcs", "tbsp", "tsp"
        localized: string;          // Localized: "грам", "мл", "штук", "ст.л."
      };
    }>;
    cookingTime: number;            // Minutes
  }>;
}
```

### Example

```bash
curl -X POST http://localhost:3000/recipes/generate \
  -H "Content-Type: application/json" \
  -d '{"query": "борщ на 4 людини", "language": "uk"}'
```

### Errors
- `400` — Empty/invalid query, forbidden characters, prompt injection detected
- `400` — Business constraint violation (people > 20, days > 7)
- `500` — OpenAI API error

---

## 6. POST /recipes/suggest

Suggest 1-3 recipes based on ingredients the user already has. Shows which ingredients match and what additional ones are needed.

### Request

```typescript
interface SuggestRequest {
  ingredients: string[];    // 1-20 ingredient names. e.g. ["картопля", "яйця", "цибуля", "морква", "олія"]
  language?: string;        // ISO 639-1 code. Default: "uk"
  strictMode?: boolean;     // Default: false. If true — use ONLY provided ingredients (basic staples like salt, pepper, water, oil, butter are still allowed). If no recipe is possible, returns empty array.
}
```

### Response (200)

```typescript
interface SuggestResponse {
  suggestedRecipes: Array<{
    dishName: string;                 // e.g. "Деруни (картопляні оладки)"
    description: string;              // Short description
    ingredients: Array<{
      name: string;                   // e.g. "картопля"
      quantity: number;               // e.g. 500
      unit: {
        canonical: string;            // "g", "ml", "pcs", etc.
        localized: string;            // "грам", "мл", "штук", etc.
      };
    }>;
    instructions: Array<{
      step: number;                   // Ordered starting from 1
      text: string;                   // Concise instruction. e.g. "Очистити та натерти картоплю"
    }>;                               // 3-10 steps
    cookingTime: number;              // Minutes
    matchedIngredients: string[];     // Which user ingredients are used. e.g. ["картопля", "яйця", "цибуля"]
    additionalIngredients: string[];  // What needs to be bought. Empty [] if recipe uses only provided ingredients. e.g. ["борошно", "сіль"]
  }>;
}
```

### Example

```bash
curl -X POST http://localhost:3000/recipes/suggest \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["картопля", "яйця", "цибуля", "морква", "олія"], "language": "uk"}'
```

### Errors
- `400` — Empty array, more than 20 ingredients
- `500` — OpenAI API error

---

## 7. POST /shopping-list

Create a new shopping list. Returns the list with a generated UUID and creation timestamp.

### Request

```typescript
interface CreateShoppingListRequest {
  name?: string;                    // Optional, 1-200 chars. If omitted, auto-generated as "Shopping list YYYY-MM-DD"
  groupedByCategories?: boolean;    // Optional, default: false. If true — frontend should group items by category.
  items: Array<{
    name: string;         // Product name, 1-200 chars. e.g. "молоко"
    quantity: number;     // >= 0. e.g. 2
    unit: string;         // 1-50 chars. e.g. "л"
    purchased?: boolean;  // Optional, default: false
  }>;  // 1-100 items
}
```

### Response (201)

```typescript
interface ShoppingListResponse {
  id: string;                       // UUID v4. e.g. "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  name: string;                     // List name (provided or auto-generated)
  groupedByCategories: boolean;     // If true — frontend should group items by their category field
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    purchased?: boolean;
  }>;
  createdAt: string;   // ISO 8601. e.g. "2026-02-09T12:00:00.000Z"
}
```

### Example

```bash
curl -X POST http://localhost:3000/shopping-list \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Для борщу",
    "items": [
      {"name": "буряк", "quantity": 2, "unit": "шт"},
      {"name": "картопля", "quantity": 4, "unit": "шт"},
      {"name": "м'\''ясо", "quantity": 500, "unit": "г"}
    ]
  }'
```

### Errors
- `400` — Empty items array, validation errors (forbidden characters, length limits)

---

## 8. PUT /shopping-list/:id

Update an existing shopping list. Currently mocked — returns the updated data without persisting. All fields in the body are optional.

### Request

URL param: `id` — UUID of the shopping list

```typescript
interface UpdateShoppingListRequest {
  name?: string;                    // Updated name, 1-200 chars
  groupedByCategories?: boolean;    // Toggle category grouping on/off
  items?: Array<{                   // Updated items list, 1-100 items
    name: string;
    quantity: number;
    unit: string;
    purchased?: boolean;
  }>;
}
```

### Response (200)

Same `ShoppingListResponse` as POST.

### Example

```bash
curl -X PUT http://localhost:3000/shopping-list/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Оновлений список",
    "items": [
      {"name": "молоко", "quantity": 1, "unit": "л", "purchased": true},
      {"name": "хліб", "quantity": 2, "unit": "шт", "purchased": false}
    ]
  }'
```

### Errors
- `400` — Invalid UUID format, validation errors

---

## 9. DELETE /shopping-list/:id

Delete a shopping list. Currently mocked — does not persist deletion.

### Request

URL param: `id` — UUID of the shopping list

No body required.

### Response

`204 No Content` — empty response body on success.

### Example

```bash
curl -X DELETE http://localhost:3000/shopping-list/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

### Errors
- `400` — Invalid UUID format

---

## Common Error Format

All validation errors return:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;         // e.g. "Bad Request"
}
```

## TypeScript Types Summary

```typescript
// Shared unit type (used in recipe responses)
interface Unit {
  canonical: string;   // "g" | "ml" | "pcs" | "tbsp" | "tsp" | ...
  localized: string;   // Localized version based on language param
}

// Recipe ingredient (from AI endpoints)
interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: Unit;
}

// Shopping list item (user-managed)
interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  purchased?: boolean;
}

// Shopping list
interface ShoppingList {
  id: string;
  name: string;
  groupedByCategories: boolean;
  items: ShoppingListItem[];
  createdAt: string;
}
```

## Authenticated Fetch Helper

Wrap all API calls with automatic token refresh on 401:

```typescript
const API_BASE = 'http://localhost:3000';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = localStorage.getItem('accessToken');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers,
    },
  });

  // If 401 — try to refresh tokens
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('Not authenticated');

    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      localStorage.clear();
      throw new Error('Session expired');
    }

    const tokens = await refreshRes.json();
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);

    // Retry original request with new token
    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.accessToken}`,
        ...options.headers,
      },
    });
  }

  return res;
}

// Usage:
const res = await apiFetch('/recipes/generate', {
  method: 'POST',
  body: JSON.stringify({ query: 'борщ на 4 людини' }),
});
const data = await res.json();
```

## Typical Frontend Flow

**Auth flow:**
1. User clicks "Sign in with Google" -> Google Sign-In SDK returns ID token
2. Call `POST /auth/google` with the token -> receive `accessToken`, `refreshToken`, `user`
3. Store tokens in localStorage (or secure cookie)
4. Use `accessToken` in `Authorization: Bearer` header for all protected endpoints
5. On `401` response -> call `POST /auth/refresh` with `refreshToken` -> get new tokens
6. If refresh fails -> redirect to login (session expired)

**Main flow (authenticated):**
1. User enters a dish name or query -> call `POST /recipes/generate`
2. Display recipes with ingredients
3. User selects recipes -> convert ingredients to shopping list items -> call `POST /shopping-list`
4. User manages the shopping list (toggle purchased, edit items) -> call `PUT /shopping-list/:id`
5. User deletes the list -> call `DELETE /shopping-list/:id`

**Alternative flow (authenticated):**
1. User enters ingredients they have -> call `POST /recipes/suggest`
2. Display matched recipes with `matchedIngredients` (already have) and `additionalIngredients` (need to buy)
3. User selects a recipe -> create shopping list from `additionalIngredients` -> call `POST /shopping-list`

**Profile:**
- Call `GET /users/me` to get current user info (name, email, avatar)
- Call `POST /auth/logout` to sign out (invalidates refresh token)
