# Skill: create-page

Scaffold a new route following the project's App Router convention.

## Trigger

When the user says "create a page", "add a page", or "new page named X".

## Steps

1. Create `app/<route-path>/page.tsx` — `async` Server Component, **default
   export** (the one place in this codebase a default export is correct,
   because Next.js requires it for this file).
2. Fetch data directly in the component by awaiting Supabase calls; there is
   no `_context.tsx` to create — see `.claude/rules/architecture.md` for why.
3. `await params` / `await searchParams` before destructuring them.
4. Call `notFound()` for anything missing or not owned by the current user.
5. If the page needs interactivity, extract that piece into its own
   `"use client"` component — in `components/` if reusable, in
   `app/<route-path>/_components/` (kebab-case filenames) if page-specific.
6. If the page mutates data, add the mutation to `app/actions/<domain>.ts` —
   see `/project:new-action`.
7. Nothing to register in a router file — Next discovers the route from the
   filesystem.

## Rules

- Route folder name in kebab-case (e.g. `my-activity`, `g/[id]/catat`).
- No default exports except `page.tsx` itself.
- Data fetching lives directly in `page.tsx`, not a separate context file.
- Page-specific components in `_components/` (underscore prefix — Next
  excludes it from routing automatically), kebab-case filenames.
- Page-specific hooks in `hooks/` inside the page folder.
- All mutations through Server Actions in `app/actions/` — never a direct
  Supabase write from a Client Component.
- No nested ternaries.
- No `any` types.

## Output

A `page.tsx` (and, if needed, an `_components/` folder) implementing the new
route.
