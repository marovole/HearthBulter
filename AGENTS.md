<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Agent Development Guidelines

This repository is a Next.js (App Router) application focused on health and nutrition.

## 🛠 Critical Commands

### Environment & Database

- **Setup**: `pnpm install`
- **DB Generate**: `pnpm db:generate` (Prisma)
- **DB Push**: `pnpm db:push` (Development schema sync)
- **Supabase Test**: `pnpm supabase:test`

### Testing (Jest & Playwright)

- **All tests**: `pnpm test`
- **Single test file**: `npx jest src/__tests__/path/to/test.test.ts`
- **Single test case**: `npx jest -t "description of test"`
- **Watch mode**: `pnpm test:watch`
- **E2E tests**: `pnpm test:e2e`

### Linting & Quality

- **Lint**: `pnpm lint`
- **Format**: `pnpm format`
- **Type Check**: `pnpm type-check`
- **Pre-commit Review**: `pnpm review` (Runs internal AI quality check)

## 🎨 Code Style & Conventions

### 1. Imports

- Use path aliases: `@/` for `src/` directory.
- Order: React/Next.js core → External libs → Internal hooks/services → UI components → Types.
- No unused imports.

### 2. Types & Interface

- **Strict Typing**: Use TypeScript for everything. Avoid `any`.
- **Location**: Use `src/types/` for shared types; define local types in the component/service file.
- **Zod**: Use Zod for runtime validation (found in `src/schemas/`).

### 3. Naming Conventions

- **Components**: PascalCase (e.g., `RecommendationCard.tsx`).
- **Hooks**: camelCase with `use` prefix (e.g., `useHealthData.ts`).
- **Services**: kebab-case file names, PascalCase class names (e.g., `ai-review-service.ts`).
- **Variables/Functions**: camelCase.
- **Constants**: UPPER_SNAKE_CASE.

### 4. Component Structure (UI)

- This project uses **shadcn/ui** (Radix UI + Tailwind).
- Follow the pattern in `src/components/ui/`.
- Use `cn()` utility for merging Tailwind classes.
- Prefer Functional Components with `export function Name()`.

### 5. Error Handling

- Use `try/catch` blocks in services and API routes.
- Return meaningful error messages or `NextResponse.json` with appropriate status codes (400, 401, 403, 500).
- For UI, use `sonner` for toast notifications.

### 6. Internationalization (i18n)

- Codebase primarily uses Chinese (Simplified) for UI text and comments. Maintain this convention unless requested otherwise.

## 🚀 Cloudflare Deployment

This project has a complex Cloudflare Pages + OpenNext build pipeline.

- Build command: `pnpm build:cloudflare`
- Always verify bundle size after significant dependency changes: `pnpm check-bundle-size`.

## 🧠 Decision Making

- **Simplicity**: Favor standard React/Next.js patterns. Avoid unnecessary abstractions.
- **Performance**: Be mindful of client-side vs. server-side rendering. Use `"use client"` only when interactive.
- **Database**: Use Prisma for type-safe queries. Always check `prisma/schema.prisma` before modifying data logic.
