# Prompt: Implement Google Authentication for Grosly Frontend

You are building the authentication system for **Grosly** — an AI-powered shopping list generator app. The backend is already fully implemented. Your task is to implement the frontend auth layer.

## Tech Context

- Backend: NestJS REST API at `http://localhost:3000`
- Google Client ID: `1011361879802-8kmr188fgatqia0lmdmv3tkdaj6dbdjq.apps.googleusercontent.com`
- Auth method: Google OAuth (token-based)
- Tokens: JWT access token (15 min) + refresh token (7 days) with rotation

## What You Need to Implement

### 1. Google Sign-In Button

Use the **Google Identity Services SDK** to render a "Sign in with Google" button.

```html
<script src="https://accounts.google.com/gsi/client" async></script>
```

When the user signs in, Google returns an `credential` (ID token string). Send it to the backend.

### 2. Auth API Calls

**Login (Google):**
```
POST /auth/google
Body: { "token": "<google_id_token>" }
Response: { accessToken, refreshToken, user: { id, email, name, avatarUrl, language } }
```

**Refresh tokens (when access token expires):**
```
POST /auth/refresh
Body: { "refreshToken": "<refresh_token>" }
Response: same as login
```

**Logout:**
```
POST /auth/logout
Headers: Authorization: Bearer <accessToken>
Response: 204 No Content
```

**Get current user:**
```
GET /users/me
Headers: Authorization: Bearer <accessToken>
Response: { id, email, name, avatarUrl, language }
```

### 3. Token Storage

Store `accessToken` and `refreshToken` in `localStorage` (or secure cookies if you prefer). On app load, check if tokens exist to determine if the user is logged in.

### 4. Authenticated HTTP Client

Create a wrapper around `fetch` (or axios interceptor) that:
1. Adds `Authorization: Bearer <accessToken>` to every request
2. On `401` response — automatically calls `POST /auth/refresh` with the stored `refreshToken`
3. If refresh succeeds — retries the original request with the new `accessToken`
4. If refresh fails — clears tokens and redirects to login page

```typescript
async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = localStorage.getItem('accessToken');

  const res = await fetch(`http://localhost:3000${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('Not authenticated');

    const refreshRes = await fetch('http://localhost:3000/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      localStorage.clear();
      // redirect to login
      throw new Error('Session expired');
    }

    const tokens = await refreshRes.json();
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);

    // Retry original request with new token
    return fetch(`http://localhost:3000${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens.accessToken}`,
        ...options.headers,
      },
    });
  }

  return res;
}
```

### 5. Auth State Management

Create an auth context/store that holds:
- `user: { id, email, name, avatarUrl, language } | null`
- `isAuthenticated: boolean`
- `isLoading: boolean` (for initial token check)
- `login(googleIdToken)` — calls POST /auth/google, stores tokens, sets user
- `logout()` — calls POST /auth/logout, clears tokens, sets user to null
- `refreshUser()` — calls GET /users/me to update user data

### 6. Route Protection

- **Public routes:** Login/landing page only
- **Protected routes:** Everything else (recipes, shopping lists, profile)
- If user is not authenticated, redirect to login page
- If user is authenticated, redirect from login to main page

### 7. UI Flow

1. **Login page:** Show Google Sign-In button. On success, redirect to main page.
2. **App header/navbar:** Show user name + avatar (from `user.avatarUrl`). Show logout button.
3. **Logout:** Call backend logout, clear tokens, redirect to login page.
4. **Session expiry:** If refresh fails (401), show "Session expired" message and redirect to login.

## TypeScript Interfaces

```typescript
interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  language: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
```

## Important Notes

- All API endpoints except `/auth/google`, `/auth/refresh`, and `GET /` require a valid Bearer token — otherwise they return `401`
- Refresh tokens rotate on every refresh call (old refresh token becomes invalid)
- The backend returns `401` for: invalid token, expired token, deactivated account, email registered with a different provider
- Google Sign-In SDK does NOT work from `file://` — you must serve the frontend from `http://localhost:*`
- Rate limit: 10 requests per 60 seconds per IP
