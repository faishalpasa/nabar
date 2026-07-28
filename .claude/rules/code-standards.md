# Code Standards

- TypeScript strict mode — avoid `any`.
- Use `async/await` over `.then()` chaining.
- No nested ternary expressions — use `if/else`, early returns, or named
  variables instead.
- Readability over cleverness.
- No comments unless the WHY is non-obvious. (This repo's existing comments
  lean toward explaining *why a constraint exists* — e.g. why a trigger sets
  `created_at` server-side — not *what the next line does*. Match that.)

## Exports

- **Named exports** for all components, hooks, utils, types, and Server
  Actions.
- **No default exports** — with one hard exception: Next.js requires a default
  export from `page.tsx`, `layout.tsx`, `route.ts` handlers, `error.tsx`,
  `loading.tsx`, `not-found.tsx`, and `proxy.ts`. That's a framework contract,
  not a preference; don't add a matching named export "just in case" for these
  files, and don't relax the rule for anything else.

## Avoid

- Calling `supabase.from(...).insert/update/delete()` from a Client Component
  — mutations always go through `app/actions/*.ts`. (Reads directly from a
  Server Component are fine and idiomatic — see `rules/architecture.md`.)
- Trusting `error === null` as proof a mutation succeeded — RLS denies writes
  by matching zero rows, not by raising an error. Check the returned row
  count.
- Large files with multiple responsibilities.
- Duplicating logic across pages instead of extracting to `lib/` or `hooks/`.
- Inline styles — use Tailwind CSS (one narrow, genuinely-dynamic exception;
  see `rules/conventions.md`).
- Scattering `process.env.X` reads outside `lib/env.ts`.

## AI Instructions

When generating or refactoring code:

- Use Tailwind CSS for all styles, pulling colors from the tokens in
  `app/globals.css`.
- Default to a Server Component; add `"use client"` only on the leaf that
  needs it.
- Route all mutations through `app/actions/*.ts`, returning `{ error? }` and
  checking row counts — never `throw` across the Server Action boundary.
- Determine whether logic is reusable (→ `lib/`, `hooks/`, `components/`) or
  page-specific (→ `app/<route>/_components/`, `app/<route>/hooks/`).
- Do not modify the architecture (Server Actions, RLS-as-authorization, no
  global client context) without clear justification.
- Never use nested ternary expressions — use `if/else` or early returns.
- Remember `params`/`searchParams` are Promises — `await` them.
