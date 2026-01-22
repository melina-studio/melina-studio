# Architecture

This document provides an overview of Melina Studio's system architecture.

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   App       │  │   Canvas    │  │     State Management    │  │
│  │   Router    │  │   (Konva)   │  │       (Zustand)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (Go/Fiber)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Handlers   │──│  Services   │──│     Repositories        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│         │                │                     │                 │
│         ▼                ▼                     ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  WebSocket  │  │  AI Agents  │  │     GORM (ORM)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │                │                     │
          ▼                ▼                     ▼
    ┌──────────┐    ┌──────────┐         ┌──────────┐
    │  Redis   │    │   LLM    │         │ Postgres │
    │  Cache   │    │   APIs   │         │ Database │
    └──────────┘    └──────────┘         └──────────┘
```

## Frontend Architecture

### Technology Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **Konva** - 2D canvas rendering
- **Zustand** - State management
- **Vercel AI SDK** - AI streaming integration

### Directory Structure

```
apps/web/src/
├── app/                    # Next.js App Router
│   ├── (landing)/          # Landing page routes
│   ├── auth/               # Authentication pages
│   └── playground/         # Canvas playground
├── components/
│   ├── landing/            # Landing page components
│   ├── canvas/             # Canvas-related components
│   └── ui/                 # Reusable UI components
├── lib/                    # Utilities and helpers
└── stores/                 # Zustand state stores
```

### State Management

Zustand stores are used for:
- Canvas state (shapes, selections, history)
- User state (authentication, preferences)
- UI state (modals, sidebars, tooltips)

## Backend Architecture

### Technology Stack

- **Go** - Programming language
- **Fiber** - Express-inspired web framework
- **GORM** - ORM for database operations
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions

### Clean Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        Handlers (HTTP)                           │
│              Receive requests, validate input, send responses    │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Services                                 │
│                   Business logic and rules                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Repositories                               │
│                    Data access layer                             │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Models                                  │
│                   Data structures and DTOs                       │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
apps/api/internal/
├── api/
│   ├── server.go           # Fiber server setup
│   └── routes/             # Route definitions
├── handlers/               # HTTP request handlers
├── service/                # Business logic
├── repo/                   # Database operations
├── models/                 # Data models
├── auth/                   # Authentication
├── melina/                 # AI agent system
│   ├── agents/             # Agent definitions
│   ├── prompts/            # System prompts
│   └── tools/              # Agent tools
└── llm_handlers/           # LLM provider integrations
```

## AI System

### Agent Architecture

The AI system uses an agent-based architecture:

1. **User Request** - Natural language input
2. **Agent Processing** - Interprets intent
3. **Tool Execution** - Performs canvas operations
4. **Response Streaming** - Returns results via WebSocket

### Supported LLM Providers

- Anthropic Claude
- Google Gemini
- OpenAI (planned)

## Data Flow

### Canvas Operation Flow

```
1. User describes intent (e.g., "Add a blue rectangle")
2. Frontend sends request via WebSocket
3. Backend routes to AI agent
4. Agent interprets and generates tool calls
5. Tool handler executes canvas operations
6. Updates streamed back to frontend
7. Canvas re-renders with new state
```

### Authentication Flow

```
1. User initiates OAuth (Google/GitHub)
2. Redirect to OAuth provider
3. Callback with authorization code
4. Backend exchanges code for tokens
5. JWT issued to client
6. Client stores in httpOnly cookie
7. Subsequent requests include JWT
```

## Database Schema

### Core Tables

- **users** - User accounts
- **boards** - Canvas boards
- **board_data** - Board content (shapes, etc.)
- **chats** - Chat history
- **refresh_tokens** - JWT refresh tokens

## Security Considerations

- JWT-based authentication
- httpOnly cookies for token storage
- CORS configuration
- Input validation
- SQL injection prevention (GORM)
- XSS prevention (React)
