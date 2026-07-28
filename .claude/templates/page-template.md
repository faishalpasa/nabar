# Page Template

## Location

`app/<route-path>/page.tsx`

## Folder Structure

```
app/<route-path>/
  page.tsx           ← route entry, async Server Component, default export
  _components/       ← page-specific components (kebab-case filenames;
                        "private folder" — Next excludes it from routing)
  hooks/              ← page-specific hooks (optional)
```

There is no `_context.tsx` — `page.tsx` itself is the data-fetching layer. See
`.claude/rules/architecture.md` for why this project doesn't need reklub's
page-level context pattern.

## Static route — no dynamic segment, no mutation

```tsx
import { createClient } from "@/lib/supabase/server"

const SettingsPage = async () => {
  const supabase = await createClient()
  const { data: items } = await supabase.from("<table>").select("*")

  return (
    <main className="flex flex-1 flex-col">
      {/* page UI, using `items` directly */}
    </main>
  )
}

export default SettingsPage
```

## Dynamic route with an owned resource

This is the real, recurring shape in this codebase (`app/g/[id]/page.tsx`):
fetch the resource, `notFound()` if it's missing *or not the caller's* — RLS
already made those two cases indistinguishable at the query layer, so the page
should keep them indistinguishable in its response too.

```tsx
import { notFound } from "next/navigation"

import { createClient, getUser } from "@/lib/supabase/server"

const ResourcePage = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params // params is a Promise — always await it

  const user = await getUser()
  const supabase = await createClient()

  const { data: resource } = await supabase
    .from("<view_or_table>")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!resource) notFound()

  const isOwner = user?.id === resource.owner_id

  return (
    <main className="flex flex-1 flex-col">
      {/* page UI */}
    </main>
  )
}

export default ResourcePage
```

## Page-specific component (`_components/`)

```tsx
type PageContentProps = {
  items: SomeType[]
}

export const PageContent = ({ items }: PageContentProps) => (
  <div>{/* render items */}</div>
)
```

## Rules

- Route folder name in kebab-case (e.g. `my-activity`, `g/[id]/catat`).
- Component name in PascalCase, e.g. `ResourcePage`.
- `page.tsx` uses a **default export** — the one place in this codebase that's
  correct, because Next.js requires it.
- All data fetching happens directly in `page.tsx` via `await`ed Supabase
  calls — not in a separate context file.
- `params` / `searchParams` are Promises — always `await` them before
  destructuring.
- Page-specific components in `_components/` with kebab-case filenames, named
  exports.
- Page-specific hooks in `hooks/` folder inside the page, `"use client"` at
  the top.
- Mutations happen through `app/actions/<domain>.ts`, called from a
  `"use client"` component via `useTransition` — never a direct Supabase write
  from `page.tsx` or a client component.
- Missing/unauthorized resource → `notFound()`, not a rendered error message.
- No nested ternaries.
- No `any` types.
