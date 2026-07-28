# Skill: create-hook

Create a new custom React hook following project conventions.

## Trigger

When the user says "create a hook", "add a hook", or "new hook named X".

## Steps

1. Determine if the hook is reusable (→ `hooks/use<Name>.ts` — create the
   `hooks/` folder the first time one is needed, it doesn't exist yet) or
   page-specific (→ `app/<route>/hooks/use<Name>.ts`).
2. Name the hook starting with `use` (e.g., `useCountdown`).
3. Use strict TypeScript typing for all inputs and return values.
4. Prefer `async/await` over promise chaining for async logic.
5. Add `"use client"` at the top of the file — hooks only run client-side.
6. Keep side effects explicit and documented if non-obvious.

## Rules

- Hook file name must match the hook name: `useCountdown.ts`.
- No `any` types.
- No nested ternary expressions.
- Pure data-fetching or state logic only — no JSX inside hooks.
- If the hook needs data from the server, prefer fetching it in the parent
  Server Component and passing it as a prop — only reach for a client-side
  hook when the data genuinely can't be known until the browser (e.g. reading
  `window`, a media query, a timer).

## Output

A single `.ts` file placed in the correct hooks folder.
