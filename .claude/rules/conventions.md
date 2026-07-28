# Conventions

## Page Convention

- Each route lives at `app/<route>/page.tsx` — an `async` **Server Component**
  by default. Fetch data by awaiting Supabase calls directly in the component;
  there is no `_context.tsx` to hold it (see `rules/architecture.md`).
- Dynamic route segments use brackets: `app/g/[id]/page.tsx`.
- `params` and `searchParams` are **Promises** in this Next.js version — always
  `await params` before destructuring. Forgetting the `await` is a real,
  version-specific bug class here, not a style nit.
- Page-specific components: `app/<route>/_components/<name>.tsx` (kebab-case
  filenames) — only once a page has enough sub-pieces that one file is
  unwieldy. A short page stays in a single `page.tsx`.
- Missing or unauthorized resources: call `notFound()`, don't render an error
  message. RLS already made "doesn't exist" and "not yours" indistinguishable
  at the query layer — `page.tsx` should keep them indistinguishable too, so a
  tabungan's existence never leaks to someone outside it.

```tsx
const { data: group } = await supabase
  .from("group_overview")
  .select("*")
  .eq("group_id", id)
  .maybeSingle()

if (!group) notFound()
```

---

## Components

- Functional components, arrow-function syntax only.
- **Named exports** for every component, hook, util, type, and Server Action —
  **except** the Next.js files that require a default export by framework
  contract: `page.tsx`, `layout.tsx`, `route.ts` handlers, `error.tsx`,
  `loading.tsx`, `not-found.tsx`, and `proxy.ts`. That's a hard Next.js
  constraint, not a style choice — don't fight it, and don't apply "named
  exports only" to those files.
- Props typed with a `<ComponentName>Props` type — name it, don't inline an
  anonymous object type in the function signature.
- Server Component by default. Add `"use client"` only to the leaf component
  that actually needs `useState`/`useEffect`/event handlers/browser APIs —
  push the boundary as far down the tree as it will go rather than marking a
  whole page client-side because one button needs an `onClick`.

---

## Dialogs

Use `@/components/ui/dialog` directly — `Dialog`, `DialogContent`,
`DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`. This app is
mobile-only (`.app-frame` in `globals.css` caps the viewport width), so there
is no desktop breakpoint that would need a Dialog-becomes-Drawer switch. If
this project ever grows a real desktop layout, revisit this — don't build the
responsive wrapper before there's a second layout for it to switch between.

---

## Server Actions

- One file per domain in `app/actions/*.ts`, `"use server"` at the top of the
  file.
- **Return `{ error?: string }` (or a discriminated result), never `throw`.**
  This is a deliberate reversal of reklub's "services throw, the caller
  catches" rule: a thrown error crossing the Server Action boundary becomes an
  opaque digest string in production, not the message you threw. Every action
  in this repo returns a result the caller checks with `if (error)`.
- **Check the row count, not just `error === null`.** When an RLS policy denies
  an `update`/`delete`, Postgres doesn't raise an error — it matches zero rows
  and returns success with empty data. `.update(...).select()` and check
  `data.length === 0` before reporting success; see `app/actions/transactions.ts`
  for the pattern (`mutateTransaction`'s `deniedMessage`).
- Call `revalidatePath(...)` after a successful write so the Server Component
  reflects it on next render — a Server Action can't rely on the browser to
  refetch anything itself.
- `owner_id`, `user_id`, and similar identity columns are set by database
  triggers from `auth.uid()`, never accepted from the action's input — see any
  `Insert` type in `lib/types.ts` for which fields are deliberately absent.

---

## Hooks

- All custom hooks start with `use`.
- Reusable → `hooks/use<Name>.ts` (create the folder the first time one is
  needed — it doesn't exist yet).
- Page-specific → `app/<route>/hooks/use<Name>.ts`.
- Hooks only run client-side — a file exporting one needs `"use client"`
  unless it's re-exported from a component that already has it.

---

## Styling

- Tailwind CSS v4 for all styling. Design tokens live as CSS custom properties
  in `app/globals.css` under `:root` / `.dark` — pull colors from there
  (`bg-card`, `text-muted-foreground`, `bg-ink`, …), don't hardcode a hex value
  in a component.
- No inline `style` props except for a genuinely dynamic numeric value Tailwind
  can't express statically — a progress-bar width computed from a percentage
  is the one real example in this codebase (`components/group-summary.tsx`
  equivalent). Everything else is a utility class.
- No global CSS beyond `app/globals.css`'s reset/tokens/keyframes.

---

## Utilities

- Pure functions only, in `lib/format.ts`, `lib/utils.ts`, or a new `lib/<name>.ts`
  for a large enough group.
- No side effects, no Supabase calls, no `fetch` inside a function that lives
  in `lib/` unless the file's entire job is a network wrapper (`lib/email/send.ts`
  is the one legitimate exception — it's explicitly a network-call module, not
  a "pure utility" pretending not to be one).
