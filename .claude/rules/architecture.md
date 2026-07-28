# Architecture

This is the biggest divergence from the reklub conventions this file set is
adapted from. Reklub is a client-rendered SPA (Vite + TanStack Router), so it
needs `app-context.tsx` for global state and a `_context.tsx` per page for
page-scoped state + fetch-on-mount. Next.js App Router removes the reason for
both: Server Components fetch fresh data on every request, so there is no
"loading" state to coordinate and no client cache to keep in sync.

## No `app-context.tsx` equivalent — and that's correct, not missing

Don't create one preemptively. Auth state isn't global client state here: every
Server Component calls `getUser()` from `lib/supabase/server.ts` itself, per
request. There is nothing to keep in sync because nothing is cached client-side.

If a future feature genuinely needs cross-page **client** state (a multi-step
wizard spanning routes, a persistent draft), add **one** `app/providers.tsx`
client component and mount it in `app/layout.tsx` next to `<Toaster />` — don't
scatter multiple independent `createContext` calls across the tree. Until that
need exists, this file should not exist.

## No `_context.tsx` per page

Reklub's page-level context exists to hold fetch-on-mount state in a client-only
app. Here, `app/<route>/page.tsx` **is** the data-fetching layer — it's an
`async` Server Component that awaits Supabase queries directly and passes the
result down as props:

```tsx
// app/g/[id]/page.tsx (real pattern already in this repo)
const GroupPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const supabase = await createClient()
  const { data: group } = await supabase
    .from("group_overview")
    .select("*")
    .eq("group_id", id)
    .maybeSingle()

  if (!group) notFound()

  return <HistoryList rows={feed} groupId={id} isOwner={isOwner} />
}
```

If a page grows enough sub-components to feel unwieldy in one file, colocate
them in `app/<route>/_components/` — the leading underscore is a real Next.js
feature ("private folders"): any `_folder` is automatically excluded from
routing, at any nesting depth. This is the direct, load-bearing equivalent of
reklub's `_components/` convention, not a cosmetic rename.

## Reads: inline in Server Components, not a service layer

Reklub bans calling `axios` directly from components — everything must go
through a named function in `src/services/*.ts`, because a raw fetch scattered
across components is unreviewable and untestable.

The equivalent risk doesn't exist for **reads** here: a `supabase.from(...).select()`
call inside a Server Component runs entirely on the server, is invisible to the
client bundle, and is exactly the idiomatic Next.js pattern. Extract a read into
`lib/queries/<domain>.ts` only once the same query is needed in two or more
places — don't add an indirection layer a query is never going to share.

## Writes: always through `app/actions/*.ts` — this part ports directly

Every mutation is a Server Action, one file per domain
(`app/actions/groups.ts`, `app/actions/transactions.ts`,
`app/actions/invitations.ts`). This is reklub's "no raw axios in
components, always a named service function" rule, ported as-is: **no Client
Component may call `supabase.from(...).insert/update/delete()` directly** —
only `app/actions/*.ts` (server) and the browser-only Storage upload in
`components/record-transaction-form.tsx` (uploading a file has to happen from
the browser; the resulting *transaction row* is still written by a Server
Action). See `rules/conventions.md` for the exact shape a Server Action must
return.

## RLS is the authorization boundary — not a service-layer check

There is no `req.user.id === resource.ownerId` check anywhere in application
code, and there shouldn't be. Every table has Row Level Security policies
(`supabase/migrations/*_rls.sql`) that are the single source of truth for who
can read or write which row. Application code's job is to surface what the
database already decided — see `rules/code-standards.md` for the specific
gotcha this creates (RLS denies writes silently, with zero rows affected, not
with a thrown error).

## Routing

- `app/**/page.tsx` — file-based routing, no manual route registration
  (reklub's `src/router.tsx` step has no equivalent — Next discovers routes
  from the filesystem).
- Dynamic segments use brackets, e.g. `app/g/[id]/page.tsx` — same convention
  as reklub, no change needed.
- `proxy.ts` at the repo root (not `src/`) is the auth gate: it runs on every
  request, refreshes the Supabase session, and redirects unauthenticated users
  to `/login`. This is Next 16's renamed `middleware.ts` — see
  `supabase/README.md` and this repo's own history for why it's `proxy.ts` and
  not `middleware.ts`.
