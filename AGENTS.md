# Repository Guidelines

## Project Structure & Module Organization
- `app/`: Next.js App Router pages, layouts, server actions (`app/actions`), and API routes (`app/api`).
- `components/`: Shared UI and feature components; base primitives live in `components/ui`.
- `lib/`: Core domain and infrastructure utilities (auth, db, calculations, helpers).
- `prisma/`: Schema, migrations, and seed script (`prisma/seed.ts`).
- `public/`: Static assets (icons, media, PWA files).
- `scripts/`: One-off maintenance and migration helper scripts.

## Build, Test, and Development Commands
Use `pnpm` (lockfile is `pnpm-lock.yaml`).
- `pnpm dev`: Run local dev server.
- `pnpm build`: Create production build.
- `pnpm start`: Start the production server.
- `pnpm lint`: Run ESLint (Next core-web-vitals + TypeScript rules).
- `pnpm db:migrate`: Create/apply Prisma migrations in development.
- `pnpm db:push`: Push schema changes without creating migration files.
- `pnpm db:seed`: Seed local database.
- `pnpm db:studio`: Open Prisma Studio.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict: true`), React 19, Next.js App Router.
- Indentation: follow existing file style (default 2 spaces in TS/TSX).
- Components: PascalCase file/component names (example: `OrderItemsTable.tsx` pattern in route `_components`).
- Utilities/actions: kebab-case files (example: `date-utils.ts`, `round-robin.ts`).
- Use `@/*` import alias for root-based imports.
- Run `pnpm lint` before opening a PR.

## Testing Guidelines
- No dedicated automated test framework is currently configured in this repository.
- Minimum validation for contributions: `pnpm lint` and `pnpm build` must pass.
- For data-flow or UI-heavy changes, include a short manual test checklist in the PR description (affected route, scenario, expected result).

## Commit & Pull Request Guidelines
- Follow Conventional Commits observed in history: `feat(scope): ...`, `fix(scope): ...`, `debug(scope): ...`.
- Keep commit subjects imperative and scoped (example: `fix(order-form): pass organizationId to embed flow`).
- PRs should include:
  - concise summary of behavior changes,
  - linked issue/task (if available),
  - screenshots/video for UI changes,
  - notes on schema/env changes (`.env`, Prisma migrations).

## Security & Configuration Tips
- Never commit secrets; keep runtime values in `.env` and update `.env.example` when adding new variables.
- Review Prisma migrations before merging; treat schema changes as high-impact.
