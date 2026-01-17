# Authentication System Documentation

This document explains the cookie-based JWT authentication system used in Melina Studio.

## Table of Contents

1. [Overview](#overview)
2. [Why Cookies Instead of localStorage?](#why-cookies-instead-of-localstorage)
3. [How Cookies Work](#how-cookies-work)
4. [Authentication Flow](#authentication-flow)
5. [Token Types](#token-types)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Security Considerations](#security-considerations)

---

## Overview

Melina Studio uses a **dual-token authentication system** with:
- **Access Token**: Short-lived (15 minutes), used for API authorization
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

Both tokens are stored in **httpOnly cookies**, which are automatically sent with every request to the backend.

---

## Why Cookies Instead of localStorage?

### The Problem with localStorage

```
┌─────────────────────────────────────────────────────────────┐
│                     localStorage                             │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Your App       │    │  Malicious JS   │                │
│  │  (JavaScript)   │    │  (XSS Attack)   │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           │  Can Read/Write      │  Can Also Read!          │
│           ▼                      ▼                          │
│  ┌─────────────────────────────────────────┐               │
│  │         localStorage.getItem()           │               │
│  │         { "token": "eyJhbG..." }         │               │
│  └─────────────────────────────────────────┘               │
│                                                              │
│  VULNERABILITY: Any JavaScript can access tokens!           │
└─────────────────────────────────────────────────────────────┘
```

When tokens are stored in localStorage:
- Any JavaScript running on the page can read them
- If an attacker injects malicious JavaScript (XSS attack), they can steal the tokens
- Stolen tokens can be used from anywhere to impersonate the user

### The Cookie Solution

```
┌─────────────────────────────────────────────────────────────┐
│                    httpOnly Cookies                          │
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │  Your App       │    │  Malicious JS   │                │
│  │  (JavaScript)   │    │  (XSS Attack)   │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                      │                          │
│           │  Cannot Read         │  Cannot Read!            │
│           ▼                      ▼                          │
│  ┌─────────────────────────────────────────┐               │
│  │         httpOnly Cookie                  │               │
│  │         (Invisible to JavaScript)        │               │
│  └─────────────────────────────────────────┘               │
│           │                                                  │
│           │  Only Browser Can Access                        │
│           ▼                                                  │
│  ┌─────────────────────────────────────────┐               │
│  │         Sent Automatically with          │               │
│  │         Every Request to Backend         │               │
│  └─────────────────────────────────────────┘               │
│                                                              │
│  SECURE: JavaScript cannot read httpOnly cookies!           │
└─────────────────────────────────────────────────────────────┘
```

---

## How Cookies Work

### What is a Cookie?

A cookie is a small piece of data that the **server sends to the browser**, and the **browser automatically sends back** with every subsequent request to that server.

### Cookie Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           COOKIE LIFECYCLE                                │
└──────────────────────────────────────────────────────────────────────────┘

Step 1: User Logs In
━━━━━━━━━━━━━━━━━━━━

  Frontend                                              Backend
  ────────                                              ───────
     │                                                     │
     │  POST /api/v1/auth/login                           │
     │  { email: "...", password: "..." }                 │
     │ ─────────────────────────────────────────────────► │
     │                                                     │
     │                                    Validates credentials
     │                                    Generates tokens
     │                                                     │
     │  Response with Set-Cookie headers                  │
     │  ◄───────────────────────────────────────────────── │
     │                                                     │
     │  Headers:                                           │
     │  Set-Cookie: access_token=eyJ...; HttpOnly; Path=/
     │  Set-Cookie: refresh_token=eyJ...; HttpOnly; Path=/
     │                                                     │


Step 2: Browser Stores Cookies (Automatic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────────────────────┐
  │           Browser Storage            │
  │                                      │
  │  Cookie: access_token=eyJhbGci...   │
  │  Cookie: refresh_token=eyJhbGci...  │
  │                                      │
  │  (Invisible to JavaScript!)          │
  └─────────────────────────────────────┘


Step 3: Subsequent API Requests (Automatic)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Frontend                                              Backend
  ────────                                              ───────
     │                                                     │
     │  GET /api/v1/boards                                │
     │  Cookie: access_token=eyJ...; refresh_token=eyJ...│
     │ ─────────────────────────────────────────────────► │
     │                                                     │
     │                              Reads access_token from cookie
     │                              Validates JWT
     │                              Returns data
     │                                                     │
     │  Response: { boards: [...] }                       │
     │ ◄───────────────────────────────────────────────── │
```

### Why Backend Sets Cookies (Not Frontend)

The backend **must** set cookies because:

1. **httpOnly flag**: Only the server can set the `httpOnly` flag, which prevents JavaScript access
2. **Secure flag**: Server controls whether cookies are sent only over HTTPS
3. **SameSite flag**: Server controls cross-site request behavior
4. **Expiration**: Server controls when cookies expire

```go
// Backend sets the cookie with security flags
c.Cookie(&fiber.Cookie{
    Name:     "access_token",
    Value:    accessToken,
    Expires:  time.Now().Add(15 * time.Minute),
    HTTPOnly: true,  // JavaScript CANNOT read this cookie
    Secure:   true,  // Only sent over HTTPS (in production)
    SameSite: "Lax", // Protects against CSRF
    Path:     "/",   // Cookie sent for all paths
})
```

If frontend tried to set cookies via JavaScript:
```javascript
// This CANNOT set httpOnly cookies - browser doesn't allow it
document.cookie = "access_token=eyJ...; HttpOnly";  // HttpOnly flag IGNORED!
```

---

## Authentication Flow

### Login Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              LOGIN FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

  User        Frontend              Backend                Database
   │              │                    │                       │
   │ Enter creds  │                    │                       │
   │─────────────►│                    │                       │
   │              │                    │                       │
   │              │ POST /login        │                       │
   │              │ {email, password}  │                       │
   │              │───────────────────►│                       │
   │              │                    │                       │
   │              │                    │ Get user by email     │
   │              │                    │──────────────────────►│
   │              │                    │                       │
   │              │                    │◄──────────────────────│
   │              │                    │ User record           │
   │              │                    │                       │
   │              │                    │ Verify password hash  │
   │              │                    │ Generate access token │
   │              │                    │ Generate refresh token│
   │              │                    │                       │
   │              │                    │ Store refresh token   │
   │              │                    │──────────────────────►│
   │              │                    │                       │
   │              │ Set-Cookie headers │                       │
   │              │ + user data        │                       │
   │              │◄───────────────────│                       │
   │              │                    │                       │
   │              │ Store user in      │                       │
   │              │ React state        │                       │
   │              │                    │                       │
   │ Logged in!   │                    │                       │
   │◄─────────────│                    │                       │
```

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TOKEN REFRESH FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

  Frontend                    Backend                    Database
     │                           │                          │
     │ GET /api/boards           │                          │
     │ Cookie: access_token=...  │                          │
     │──────────────────────────►│                          │
     │                           │                          │
     │                           │ Token expired!           │
     │                           │                          │
     │ 401 Unauthorized          │                          │
     │◄──────────────────────────│                          │
     │                           │                          │
     │ (Axios interceptor)       │                          │
     │                           │                          │
     │ POST /auth/refresh        │                          │
     │ Cookie: refresh_token=... │                          │
     │──────────────────────────►│                          │
     │                           │                          │
     │                           │ Validate refresh token   │
     │                           │─────────────────────────►│
     │                           │                          │
     │                           │ Token valid              │
     │                           │◄─────────────────────────│
     │                           │                          │
     │                           │ Revoke old refresh token │
     │                           │ (Rotation for security)  │
     │                           │─────────────────────────►│
     │                           │                          │
     │                           │ Generate new tokens      │
     │                           │                          │
     │ Set-Cookie: new tokens    │                          │
     │◄──────────────────────────│                          │
     │                           │                          │
     │ (Axios interceptor)       │                          │
     │ Retry original request    │                          │
     │                           │                          │
     │ GET /api/boards           │                          │
     │ Cookie: new_access_token  │                          │
     │──────────────────────────►│                          │
     │                           │                          │
     │ { boards: [...] }         │                          │
     │◄──────────────────────────│                          │
```

---

## Token Types

### Access Token

| Property | Value |
|----------|-------|
| Purpose | Authorize API requests |
| Lifetime | 15 minutes |
| Storage | `access_token` cookie |
| Contains | User ID, expiration time |

### Refresh Token

| Property | Value |
|----------|-------|
| Purpose | Get new access tokens |
| Lifetime | 7 days |
| Storage | `refresh_token` cookie + database |
| Contains | User ID, JTI (unique ID), expiration time |
| Rotation | Yes (one-time use) |

---

## Backend Implementation

### File Structure

```
internal/
├── auth/
│   ├── jwt.go           # Token generation and validation
│   ├── middleware.go    # Auth middleware (reads cookies)
│   └── password.go      # Password hashing
├── handlers/
│   └── auth_handler.go  # Login, Register, Refresh, Logout
└── service/
    └── auth_service.go  # Refresh token business logic
```

### Key Code: Setting Cookies (auth_handler.go)

```go
func setAuthCookies(c *fiber.Ctx, accessToken, refreshToken string) {
    isProduction := os.Getenv("GO_ENV") == "production"

    // Access token cookie
    c.Cookie(&fiber.Cookie{
        Name:     "access_token",
        Value:    accessToken,
        Expires:  time.Now().Add(15 * time.Minute),
        HTTPOnly: true,                    // Cannot be read by JavaScript
        Secure:   isProduction,            // HTTPS only in production
        SameSite: "Lax",                   // CSRF protection
        Path:     "/",                     // Available for all routes
    })

    // Refresh token cookie
    c.Cookie(&fiber.Cookie{
        Name:     "refresh_token",
        Value:    refreshToken,
        Expires:  time.Now().Add(7 * 24 * time.Hour),
        HTTPOnly: true,
        Secure:   isProduction,
        SameSite: "Lax",
        Path:     "/",
    })
}
```

### Key Code: Reading Cookies (middleware.go)

```go
func AuthMiddleware() fiber.Handler {
    return func(c *fiber.Ctx) error {
        // Read access token from cookie
        tokenStr := c.Cookies("access_token")

        // Fallback to Authorization header (for API clients)
        if tokenStr == "" {
            authHeader := c.Get("Authorization")
            if authHeader != "" {
                tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
            }
        }

        if tokenStr == "" {
            return fiber.ErrUnauthorized
        }

        // Validate the token
        claims, err := ValidateAccessToken(tokenStr)
        if err != nil {
            return fiber.ErrUnauthorized
        }

        // Store user ID for handlers to use
        c.Locals("userID", claims.UserID)
        return c.Next()
    }
}
```

### CORS Configuration (server.go)

For cookies to work cross-origin, CORS must be configured:

```go
app.Use(cors.New(cors.Config{
    AllowOrigins:     "http://localhost:3000",  // Frontend URL
    AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
    AllowCredentials: true,  // REQUIRED for cookies!
}))
```

---

## Frontend Implementation

### File Structure

```
src/
├── lib/
│   └── axios.ts         # Axios instance with interceptors
├── service/
│   └── auth.ts          # Auth API calls
└── providers/
    └── AuthProvider.tsx # React auth context
```

### Key Code: Axios Configuration (axios.ts)

```typescript
const api = axios.create({
    baseURL: "http://localhost:8080",
    withCredentials: true,  // REQUIRED: Send cookies with requests
});

// Interceptor: Auto-refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && !error.config._retry) {
            error.config._retry = true;

            try {
                // Attempt to refresh tokens
                await api.post("/api/v1/auth/refresh");
                // Retry the original request
                return api(error.config);
            } catch (refreshError) {
                // Refresh failed, redirect to login
                window.location.href = "/auth";
            }
        }
        return Promise.reject(error);
    }
);
```

### Key Code: Auth Provider (AuthProvider.tsx)

```typescript
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    // Login - cookies set by server automatically
    const login = async (email: string, password: string) => {
        const { data } = await api.post("/api/v1/auth/login", { email, password });
        setUser(data.user);  // Just store user in React state
        // Cookies are automatically stored by browser!
    };

    // Logout - server clears cookies
    const logout = async () => {
        await api.post("/api/v1/auth/logout");
        setUser(null);
        // Cookies are automatically cleared by browser!
    };

    // Fetch current user (for protected routes)
    const refreshUser = async () => {
        const { data } = await api.get("/api/v1/auth/me");
        setUser(data.user);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}
```

### Key Concept: Frontend Doesn't Handle Tokens

Notice that the frontend code **never touches tokens directly**:

| localStorage Approach | Cookie Approach |
|-----------------------|-----------------|
| `localStorage.setItem("token", token)` | Not needed |
| `localStorage.getItem("token")` | Not needed |
| `headers: { Authorization: \`Bearer ${token}\` }` | Not needed |

The browser handles everything automatically when `withCredentials: true` is set.

---

## Security Considerations

### Protection Summary

| Attack | Protection |
|--------|------------|
| XSS (token theft) | `httpOnly` flag prevents JavaScript access |
| CSRF | `SameSite: Lax` + CORS configuration |
| Token reuse | Refresh token rotation (one-time use) |
| Man-in-the-middle | `Secure` flag (HTTPS only in production) |

### Token Rotation

Refresh tokens use rotation for security:

```
┌─────────────────────────────────────────────────────────────┐
│                    TOKEN ROTATION                            │
└─────────────────────────────────────────────────────────────┘

  Before Refresh:
  ┌─────────────────┐
  │ Refresh Token A │ ──► Valid
  └─────────────────┘

  After Refresh:
  ┌─────────────────┐
  │ Refresh Token A │ ──► REVOKED (can never be used again)
  └─────────────────┘
  ┌─────────────────┐
  │ Refresh Token B │ ──► Valid (new token issued)
  └─────────────────┘

  If attacker steals Token A and tries to use it:
  ┌─────────────────┐
  │ Refresh Token A │ ──► REJECTED (already used/revoked)
  └─────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/v1/auth/login` | No | Login, sets cookies |
| POST | `/api/v1/auth/register` | No | Register, sets cookies |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh tokens |
| POST | `/api/v1/auth/logout` | No | Logout, clears cookies |
| POST | `/api/v1/auth/logout-all` | Yes | Logout all devices |
| GET | `/api/v1/auth/me` | Yes | Get current user |
| GET | `/api/v1/auth/sessions` | Yes | Get active sessions |
| DELETE | `/api/v1/auth/sessions/:id` | Yes | Revoke specific session |

---

## Testing the Flow

1. **Login**: Check browser DevTools > Application > Cookies
   - You should see `access_token` and `refresh_token` cookies
   - Note: You can see they exist, but cannot read values (httpOnly)

2. **API Request**: Check Network tab
   - Request headers should include `Cookie: access_token=...; refresh_token=...`
   - This is automatic with `withCredentials: true`

3. **Token Refresh**: Wait 15+ minutes or manually expire token
   - You should see a 401, then automatic refresh, then retry

4. **Logout**: Cookies should be cleared
   - Check Application > Cookies - tokens should be gone
