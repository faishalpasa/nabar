# Tech Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5 (strict mode)
- Tailwind CSS v4 — tokens defined as CSS custom properties in `app/globals.css`
- shadcn/ui on **Base UI** primitives (`components/ui/**`) — not Radix. `Button` has
  no `asChild`; render a styled `<Link>` via `buttonVariants({...})` instead of
  wrapping `Button` around a `Link`.
- Supabase (Postgres + Auth + Storage) via `@supabase/ssr` — `lib/supabase/{client,server,session,admin}.ts`
- Server Actions (`app/actions/*.ts`) for every mutation — no client-side fetch
  library, no axios, no TanStack Query
- ESLint flat config adapted from `reklub/member-dashboard`'s `.claude/rules` —
  double quotes, no semicolons, arrow-function components (see `eslint.config.mjs`)

## Path Alias

`@/` maps to the repo root (not `src/` — this project has no `src/` directory).
Use it for all internal imports: `@/components/...`, `@/lib/...`.

## Deliberately not used

- **axios / any HTTP client** — Supabase's client and Server Actions replace the
  service-layer-over-REST pattern entirely.
- **Zod** — not installed. Server Actions validate inputs manually today
  (see `app/actions/groups.ts`). Add Zod only when a form's validation rules
  outgrow a few `if` checks; don't add the dependency speculatively.
- **A responsive Dialog/Drawer switch** (`@/components/molecules/dialog` in
  reklub) — this app is mobile-only by design (`.app-frame` caps width in
  `globals.css`), so there is no desktop breakpoint to switch to a Drawer for.
  Use `@/components/ui/dialog` directly.
- **A global client state store** (`app-context.tsx` in reklub) — see
  `rules/architecture.md` for why Server Components remove most of the need
  for one.
