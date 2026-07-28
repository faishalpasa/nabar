# Type Template

## Location

`lib/types.ts` for anything mirroring the database (this project's actual
convention — see the file's own header comment for why it's hand-written
instead of generated). Split into `lib/types/<domain>.ts` only if `lib/types.ts`
grows unwieldy; keep the same shape.

## Template — a table/view mirrored from `supabase/migrations/`

```ts
// Row type — matches a table's columns exactly, including the fact that
// Postgres `numeric` arrives as a string over the wire, never a number.
export type <Entity>Row = {
  id: string
  amount: string // numeric — Number(row.amount) before doing math with it
  status: <Entity>Status
  created_at: string
}

// Narrow, hand-written union mirroring a `check` constraint — this is the
// project's default for status/type columns, not an `as const` object
// (see templates/constant-template.md for when the object form is warranted
// instead).
export type <Entity>Status = "pending" | "verified" | "rejected"

// Insert type: only the columns a client is actually allowed to supply.
// Anything a trigger sets from auth.uid()/now() is deliberately absent here,
// not just optional.
export type <Entity>Insert = {
  group_id: string
  amount: number
}
```

## Discriminated union (e.g. an RPC's varying result shape)

```ts
export type InvitationState =
  | "ok"
  | "not_found"
  | "expired"
  | "used"
  | "revoked"
  | "already_member"
```

## Utility type derivation

```ts
export type <Entity>Preview = Pick<<Entity>Row, "id" | "name">
```

## Rules

- Named exports only.
- Prefer a plain `type` for object shapes here (this project uses `type`
  throughout `lib/types.ts`, not `interface`) — unions, intersections, and
  utility derivations are also `type`.
- No `any` types.
- Group types for the same domain/entity together.
- File name in camelCase if split out: `types/booking.ts`.
- Derive related types (`Pick`, `Omit`, `Partial`) rather than duplicating
  fields manually.
- Match the database exactly — a `numeric` column is `string`, a nullable
  column is `| null`, not optional-and-undefined. Check
  `supabase/migrations/` before guessing a column's type.
