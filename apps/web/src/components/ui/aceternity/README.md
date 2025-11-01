# Aceternity UI Setup

This project is configured to use Aceternity UI components.

## Installation Complete ✅

- ✅ `framer-motion` - For animations
- ✅ `clsx` - For conditional class names
- ✅ `tailwind-merge` - For merging Tailwind classes
- ✅ `cn` utility function at `@/lib/utils`

## Adding Aceternity Components

To add Aceternity components to your project:

1. Visit [Aceternity UI](https://ui.aceternity.com/components)
2. Choose a component you want to use
3. Copy the component code from the website
4. Create a new file in this directory (e.g., `background-gradient.tsx`)
5. Paste the component code
6. Import and use in your pages/components

Example:
```tsx
import { BackgroundGradient } from "@/components/ui/aceternity/background-gradient"

export default function MyPage() {
  return (
    <BackgroundGradient>
      <div>Your content here</div>
    </BackgroundGradient>
  )
}
```

## Path Aliases

The following aliases are configured:
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/utils` → `src/lib/utils`

## Tailwind Configuration

Your project uses Tailwind CSS v4 with the new `@import` syntax in `globals.css`.
All Aceternity components will work with your existing Tailwind setup.
