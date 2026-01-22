# API Reference

This document describes the Melina Studio REST API.

## Base URL

```
Development: http://localhost:8080
Production:  https://api.melina.studio
```

## Authentication

Most endpoints require authentication via JWT bearer token.

```
Authorization: Bearer <access_token>
```

### Obtaining Tokens

Tokens are obtained through OAuth authentication:
- `GET /api/v1/auth/google` - Google OAuth
- `GET /api/v1/auth/github` - GitHub OAuth

## Endpoints

### Health Check

#### GET /api/v1/health

Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### Authentication

#### GET /api/v1/auth/google

Initiate Google OAuth flow.

**Response:** Redirects to Google OAuth consent screen.

---

#### GET /api/v1/auth/google/callback

Google OAuth callback handler.

**Query Parameters:**
- `code` - Authorization code from Google

**Response:** Sets auth cookies and redirects to frontend.

---

#### GET /api/v1/auth/github

Initiate GitHub OAuth flow.

**Response:** Redirects to GitHub OAuth consent screen.

---

#### GET /api/v1/auth/github/callback

GitHub OAuth callback handler.

**Query Parameters:**
- `code` - Authorization code from GitHub

**Response:** Sets auth cookies and redirects to frontend.

---

#### POST /api/v1/auth/refresh

Refresh access token.

**Request:** (uses httpOnly cookie)

**Response:**
```json
{
  "access_token": "eyJhbG...",
  "expires_in": 86400
}
```

---

#### POST /api/v1/auth/logout

Log out user.

**Response:** Clears auth cookies.

---

### Boards

#### GET /api/v1/boards

Get all boards for authenticated user.

**Response:**
```json
{
  "boards": [
    {
      "id": "uuid",
      "name": "My Board",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

#### POST /api/v1/boards

Create a new board.

**Request:**
```json
{
  "name": "My New Board"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "My New Board",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

#### GET /api/v1/boards/:id

Get a specific board.

**Response:**
```json
{
  "id": "uuid",
  "name": "My Board",
  "data": {
    "shapes": [...],
    "viewport": {...}
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

#### PUT /api/v1/boards/:id

Update a board.

**Request:**
```json
{
  "name": "Updated Name",
  "data": {
    "shapes": [...],
    "viewport": {...}
  }
}
```

---

#### DELETE /api/v1/boards/:id

Delete a board.

**Response:** `204 No Content`

---

### Chat / AI

#### WebSocket /api/v1/chat/ws

WebSocket endpoint for AI chat.

**Message Format (Client -> Server):**
```json
{
  "type": "message",
  "content": "Add a blue rectangle",
  "board_id": "uuid"
}
```

**Message Format (Server -> Client):**
```json
{
  "type": "response",
  "content": "I'll add a blue rectangle...",
  "tool_calls": [...]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

API requests are rate limited:
- **Authenticated**: 1000 requests/minute
- **Unauthenticated**: 100 requests/minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1705315800
```
