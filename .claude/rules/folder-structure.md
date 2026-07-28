# Folder Structure

```
app/
├── layout.tsx              # Root layout — fonts, <Toaster>, .app-frame shell
├── page.tsx                # Home (Server Component)
├── globals.css             # Tailwind + design tokens (:root / .dark) only
├── login/
│   └── page.tsx
├── new/
│   └── page.tsx             # Create-group wizard
├── join/
│   └── [token]/
│       └── page.tsx         # Invitation confirm / expired / already-member states
├── auth/
│   └── callback/
│       └── route.ts         # Route Handler — exchanges OAuth code for a session
├── g/
│   └── [id]/
│       ├── page.tsx          # Detail — History/Member via ?tab=
│       ├── catat/
│       │   └── page.tsx      # Record deposit / withdrawal
│       └── _components/      # page-specific components, if a page outgrows one file
│                              # ("private folder" — Next excludes _-prefixed
│                              #  folders from routing, at any depth)
└── actions/                 # Server Actions — one file per domain, "use server"
    ├── groups.ts
    ├── transactions.ts
    └── invitations.ts

components/
├── ui/                      # shadcn primitives — regenerate via `npx shadcn add`,
│                             # never hand-edit (also excluded from ESLint, see
│                             # eslint.config.mjs)
└── *.tsx                    # shared components, flat — no category subfolders
                              # yet; introduce components/<category>/ only once
                              # a category has 3+ members

lib/
├── supabase/
│   ├── client.ts            # Browser client (publishable key)
│   ├── server.ts             # Server Component / Server Action client + getUser()
│   ├── session.ts            # updateSession() — called from proxy.ts
│   └── admin.ts               # service_role client — notifications only, see
│                               # rules/architecture.md § RLS is the authorization boundary
├── email/
│   ├── send.ts                # Resend REST call
│   └── templates.ts           # Email HTML/text bodies
├── types.ts                  # DB row/view/RPC types, hand-written to mirror
│                              # supabase/migrations/ (see file header for why)
├── format.ts                 # Rupiah/date/percent formatters
├── env.ts                    # Validated env var access — import this, never
│                              # `process.env.X` directly outside this file
├── request-url.ts            # Origin resolution for links sent outside the app
├── notifications.ts          # Notification queue drain, called via after()
└── utils.ts                  # cn() and other tiny pure helpers

hooks/                       # Reusable custom hooks — doesn't exist yet; create
                              # it the first time a hook is needed in 2+ places

supabase/
├── migrations/               # Numbered SQL, one concern per file, forward-only
└── README.md                 # Schema rationale + open questions
```

## Where new things go

| Adding... | Goes in |
|---|---|
| A new route | `app/<route>/page.tsx` |
| A component used by one page only | `app/<route>/_components/<name>.tsx` |
| A component used by 2+ routes | `components/<name>.tsx` |
| A new mutation | Existing or new `app/actions/<domain>.ts` |
| A new read query needed in 2+ places | New `lib/queries/<domain>.ts` (create the folder the first time) |
| A reusable stateful hook | `hooks/use<Name>.ts` (create the folder the first time) |
| A page-specific hook | `app/<route>/hooks/use<Name>.ts` |
| A pure formatter/helper | `lib/format.ts` or `lib/utils.ts` if small; own file if large |
| A new DB table/column/policy | New numbered file in `supabase/migrations/` — never edit an already-applied one |
