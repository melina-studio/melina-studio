# Melina Studio

Next.js project with TypeScript, Tailwind CSS, shadcn/ui, and Zustand.

## Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - UI components
- **Zustand** - State management
- **Convex** - Backend & database

## Getting Started

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start Convex
npx convex dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/          # App router pages
├── components/   # React components
├── lib/          # Utilities
├── providers/    # Context providers
└── store/        # Zustand stores

convex/
├── schema.ts     # Database schema
├── tasks.ts      # Example queries & mutations
└── _generated/   # Auto-generated types
```

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
```

## Zustand Store Example

See `src/store/useStore.ts` for an example store implementation.

## Convex Usage

Convex is already configured with:
- Provider wrapped in `src/app/layout.tsx`
- Example schema in `convex/schema.ts`
- Example queries/mutations in `convex/tasks.ts`

**Use Convex in components:**
```tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const tasks = useQuery(api.tasks.get);
const createTask = useMutation(api.tasks.create);
```

**Dashboard:** https://dashboard.convex.dev
