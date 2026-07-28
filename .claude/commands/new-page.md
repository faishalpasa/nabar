# New Page

Create a new route following the project's App Router convention.

## Usage

```
/project:new-page <route-path>
```

Example: `/project:new-page settings` → `app/settings/page.tsx`
Example with a dynamic segment: `/project:new-page g/[id]/history` →
`app/g/[id]/history/page.tsx`

Route path from argument: **$ARGUMENTS**

## Steps

1. Create `app/$ARGUMENTS/page.tsx`
   - `async` Server Component, **default export** (Next requires this — the
     one place in the codebase default exports are correct).
   - Await any Supabase reads directly in the component:
     `const supabase = await createClient()`.
   - `await params` / `await searchParams` before destructuring — they're
     Promises.
   - Call `notFound()` for anything missing or not owned by the current user
     — don't distinguish "doesn't exist" from "not yours" in the response.

2. If the page needs client interactivity (a form, a dialog, local state):
   - Create the interactive piece as its **own** file with `"use client"` at
     the top — don't mark the whole page client-side.
   - Keep it in `components/<name>.tsx` if it could be reused, or
     `app/$ARGUMENTS/_components/<name>.tsx` if it's specific to this page.

3. If the page mutates data, add the mutation to an existing or new
   `app/actions/<domain>.ts` — see `/project:new-action`. Don't call Supabase
   writes directly from the client component.

4. Nothing to register — Next.js discovers the route from the file path
   automatically. There is no `router.tsx` equivalent.

## Conventions

- Named exports for everything except `page.tsx` itself.
- Tailwind CSS for all styles, using tokens from `app/globals.css`.
- All mutations through Server Actions in `app/actions/`.
- Server Component by default; push `"use client"` to the smallest leaf that
  needs it.
