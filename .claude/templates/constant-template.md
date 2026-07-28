# Constant Template

## Location

`lib/constants.ts`, or a new `lib/<name>-constants.ts` for a large enough
group.

## Template

```ts
// Single constant
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

// Grouped related constants as a const object
export const TX_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected",
} as const

export type TxStatus = (typeof TX_STATUS)[keyof typeof TX_STATUS]

// Enum-style with labels (for UI display)
export const TX_STATUS_LABEL: Record<TxStatus, string> = {
  pending: "Menunggu",
  verified: "Terverifikasi",
  rejected: "Ditolak",
}
```

Note: this project currently defines most status unions directly as string
literal unions in `lib/types.ts` (e.g. `TxStatus = "pending" | "verified" | "rejected"`)
because they mirror a Postgres `check` constraint 1:1 and never need a runtime
value. Reach for the `as const` object form above only when you also need a
runtime-iterable list of values (a `<select>`'s options, a label map) — don't
convert an existing type union to an object just for its own sake.

## Rules

- Named exports only.
- SCREAMING_SNAKE_CASE for standalone constants.
- PascalCase for const objects used as enum substitutes.
- Use `as const` on object literals to preserve literal types.
- Derive union types from const objects rather than writing them manually —
  unless the type already exists as a hand-written union mirroring a DB
  constraint in `lib/types.ts`, in which case keep it there.
- Group related constants in one file; keep unrelated constants separate.
