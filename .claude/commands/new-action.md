# New Server Action

Add a new Server Action to an existing or new domain file. This replaces
reklub's `/project:new-service` — this project has no axios/REST service layer;
every mutation is a Server Action calling Supabase directly.

## Usage

```
/project:new-action <domain> <functionName> <description>
```

Example: `/project:new-action transactions approveTransaction "approve a pending deposit"`

Arguments: **$ARGUMENTS** (format: `<domain> <functionName> <description>`)

## Pattern

```typescript
"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type ActionResult = { error?: string }

export async function <functionName>(/* ...args */): Promise<ActionResult> {
  const supabase = await createClient()

  // Validate inputs here — return { error } for anything invalid, don't throw.
  if (/* invalid input */) return { error: "..." }

  const { data, error } = await supabase
    .from("<table>")
    .update({ /* ... */ })
    .eq("id", /* ... */)
    .select("id")

  if (error) return { error: error.message }

  // RLS denies a write by matching zero rows, not by raising an error —
  // check this, don't rely on `error === null` alone.
  if (!data || data.length === 0) {
    return { error: "You don't have permission to do this." }
  }

  revalidatePath("/g/[id]", "page") // or the specific path affected
  return {}
}
```

## Rules

- One file per domain in `app/actions/`, `"use server"` at the top of the
  file.
- `async/await` — no `.then()` chaining.
- Named exports only.
- **Return `{ error? }`, never `throw`** — a thrown error crossing the Server
  Action boundary becomes an opaque digest in production, not your message.
- **Check row count on `update`/`delete`**, not just `error === null`.
- Call `revalidatePath(...)` (or `revalidateTag(...)`) after every successful
  write.
- Never accept `owner_id`/`user_id`/similar identity fields as a parameter —
  those are set by database triggers from `auth.uid()`.
- Add corresponding TypeScript types to `lib/types.ts`, matching the shape in
  `supabase/migrations/`.
