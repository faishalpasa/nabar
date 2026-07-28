# Server Action Template

Replaces reklub's service-template — this project has no axios/REST service
layer. Every mutation is a Server Action that calls Supabase directly and
returns a result the caller checks, rather than throwing.

## Location

`app/actions/<domain>.ts`

## Template

```ts
"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type ActionResult = { error?: string }

export async function create<Resource>(input: {
  /* fields the caller supplies — never an identity column like owner_id */
}): Promise<ActionResult> {
  // Validate here; return { error } for anything invalid — don't throw.
  if (!input.someField) return { error: "someField is required." }

  const supabase = await createClient()

  const { error } = await supabase.from("<table>").insert({
    // owner_id / user_id are set by a database trigger from auth.uid(),
    // never passed here
  })

  if (error) return { error: error.message }

  revalidatePath("/<affected-route>")
  return {}
}

export async function update<Resource>(
  id: string,
  patch: { /* fields allowed to change */ },
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("<table>")
    .update(patch)
    .eq("id", id)
    .select("id")

  if (error) return { error: error.message }

  // RLS denies a write by matching zero rows, not by raising an error.
  // Checking `error === null` alone would report a denied update as success.
  if (!data || data.length === 0) {
    return { error: "You don't have permission to do this." }
  }

  revalidatePath("/<affected-route>")
  return {}
}
```

## Rules

- One file per domain in `app/actions/`, `"use server"` at the top of the
  file.
- `async/await` — no `.then()` chaining.
- Named exports only.
- **Return `{ error?: string }`, never `throw`** — a thrown error crossing the
  Server Action boundary becomes an opaque digest in production, not the
  message you threw.
- **Check the returned row count** on `update`/`delete`, not just
  `error === null`.
- Call `revalidatePath(...)` (or `revalidateTag(...)`) after every successful
  write.
- No business logic beyond input validation and the Supabase call — the real
  business rules (who can approve what, whether a status transition is legal)
  live in the database as constraints/triggers/RLS policies, not here. An
  action's job is to call the database and translate its response, not to
  re-implement what it already enforces.
- Add corresponding TypeScript types to `lib/types.ts`.
