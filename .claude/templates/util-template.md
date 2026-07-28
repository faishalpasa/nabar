# Utility Template

## Location

`lib/format.ts` or `lib/utils.ts` for a small addition; a new `lib/<name>.ts`
for a large enough group of related helpers.

## Template

```ts
/**
 * One-line description of what this function does and why it exists here.
 * (Only add this if the behavior is non-obvious.)
 */
export const <functionName> = (input: InputType): OutputType => {
  // pure logic — no side effects
  return result
}
```

## Multiple related utilities in one file (this project's real style)

```ts
const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

// Nominal from Postgres arrives as a string (numeric) — accept both so
// callers don't need to Number(...) it themselves first.
export const formatRupiah = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "—"
  return rupiah.format(Number(value))
}
```

## Rules

- Pure functions only — no side effects, no Supabase calls, no `fetch`.
  (`lib/email/send.ts` is the one intentional exception in this codebase — its
  entire job is a network call, so it doesn't pretend to be a pure utility.)
- Named exports only.
- No `any` types.
- Group related small utilities in one file; give a large one its own file.
- File name in kebab-case for multi-word files (this repo's actual convention,
  e.g. `request-url.ts`, not `requestUrl.ts`); single-word files look the same
  either way (`format.ts`, `utils.ts`).
