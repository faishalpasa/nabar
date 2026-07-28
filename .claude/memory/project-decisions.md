# Project Decisions

Track architectural and design decisions made during development, including
the reasoning behind them.

---

## Template

```
### [Decision title]
- **Date**: YYYY-MM-DD
- **Decision**: what was decided
- **Why**: the motivation or constraint that drove this choice
- **Alternatives considered**: other options that were ruled out
- **Impact**: files or areas affected
```

---

## Recorded Decisions

### RLS is the sole authorization layer — no app-level ownership checks
- **Date**: 2026-07-28
- **Decision**: Every table has Row Level Security policies that decide who
  can read/write which row. Application code (Server Actions, Server
  Components) never re-implements an ownership check like
  `if (row.owner_id === user.id)` — it trusts the database's answer.
- **Why**: A single source of truth for authorization means it can't drift out
  of sync between a page's read query and an action's write query. It also
  means `service_role` (which bypasses RLS) can be banned from almost the
  entire codebase — see the next decision.
- **Alternatives considered**: Checking ownership in Server Actions before
  calling Supabase (rejected — duplicates what RLS already enforces and can
  disagree with it).
- **Impact**: `supabase/migrations/*_rls.sql`, every file in `app/actions/`,
  every `page.tsx` that calls `notFound()` on a missing/unauthorized row.

### `service_role` is banned everywhere except `lib/supabase/admin.ts`
- **Date**: 2026-07-28
- **Decision**: The only file allowed to use the Supabase `service_role` key
  is `lib/supabase/admin.ts`, and the only caller of that file is
  `lib/notifications.ts`.
- **Why**: Notifications need to read a recipient's email address, but RLS
  deliberately blocks members from reading each other's email (see the
  `profiles.email` leak this was found and fixed alongside). The code path
  that reads it must not be acting on behalf of any particular user, so it
  can't be the normal per-request client.
- **Alternatives considered**: Granting `authenticated` read access to
  `profiles.email` (rejected — that's the leak, not a fix for it).
- **Impact**: `lib/supabase/admin.ts`, `lib/notifications.ts`,
  `supabase/migrations/*_notifications.sql`.

### Server Actions return `{ error? }`, never `throw`
- **Date**: 2026-07-28
- **Decision**: Every Server Action in `app/actions/` returns a result object
  the caller checks with `if (error)`, instead of throwing.
- **Why**: An error thrown across the Server Action network boundary becomes
  an opaque digest string in production Next.js builds — the actual message
  is stripped. Returning a typed result keeps the real message intact.
- **Alternatives considered**: `try/catch` at each call site around a
  throwing action (rejected — still loses the message in production).
- **Impact**: Every file in `app/actions/`, every client component that calls
  one via `useTransition`.

### Row-count checks on `update`/`delete`, not just `error === null`
- **Date**: 2026-07-28
- **Decision**: Every mutating Server Action calls `.select()` after
  `update`/`delete` and checks `data.length`, rather than trusting a null
  `error` as proof the write happened.
- **Why**: Verified against the live database — when an RLS policy denies an
  `update`, Postgres does not raise an error. It matches zero rows and returns
  success with an empty result. Checking `error` alone would report a denied
  mutation (e.g. a member trying to approve their own deposit) as if it had
  succeeded.
- **Alternatives considered**: Trusting `error === null` (this was the
  original implementation; found wrong via a live-database test suite before
  shipping).
- **Impact**: `app/actions/transactions.ts` (`mutateTransaction`), the pattern
  documented in `.claude/rules/conventions.md` § Server Actions.

### Named exports everywhere, except Next.js's required default exports
- **Date**: 2026-07-28
- **Decision**: Ported reklub's "named exports only" rule as-is, with one
  explicit carve-out: `page.tsx`, `layout.tsx`, `route.ts` handlers,
  `error.tsx`, `loading.tsx`, `not-found.tsx`, and `proxy.ts` use default
  exports because Next.js requires it.
- **Why**: Reklub is a Vite SPA with no framework-mandated default exports, so
  its rule could be absolute. Next.js's file-based routing contract can't be
  worked around without breaking routing.
- **Alternatives considered**: Applying "no default exports" without
  exception and adding a matching named export to every special file anyway
  (rejected — adds a second export Next.js never uses, for no benefit).
- **Impact**: Every file under `app/` matching one of the special names.

### ESLint config adapted from `reklub/member-dashboard`
- **Date**: 2026-07-28
- **Decision**: `eslint.config.mjs` is adapted from reklub's
  `.claude/rules` conventions (double quotes, no semicolons, arrow-function
  components, import ordering) layered on top of `eslint-config-next`, rather
  than written from scratch.
- **Why**: Consistency across reklub projects the user works across, without
  re-deriving the same style rules independently.
- **Alternatives considered**: `eslint-config-next` defaults only (rejected —
  loses the shared house style).
- **Impact**: `eslint.config.mjs`. Only `prettier` is registered in the
  `plugins` block — `react`, `react-hooks`, `jsx-a11y`, `import`, and
  `@typescript-eslint` are already registered by `eslint-config-next`, and
  re-registering them throws "Cannot redefine plugin".

### "Ink" visual direction adopted from Claude Design
- **Date**: 2026-07-28
- **Decision**: Adopted turn 3 ("Ink" direction, continuing 2d/2g/2h) from the
  `Nabung Bareng.dc.html` Claude Design doc across every screen — dark teal
  header panels with a large rounded bottom edge, floating pill CTAs, ring
  progress indicators. The brand mark was deliberately **not** changed; the
  design doc itself defers that decision.
- **Why**: The design doc's own turn 3 note says which direction and mark
  status to carry forward — followed it rather than picking a different
  combination.
- **Alternatives considered**: The two other visual directions in the same
  doc ("Ledger", "Bareng") — not chosen, per the doc's own resolution.
- **Impact**: `app/globals.css` (`.ink-*` tokens/classes),
  `components/ink-header.tsx`, `components/progress-ring.tsx`,
  `components/avatar-stack.tsx`, and every page under `app/`.
