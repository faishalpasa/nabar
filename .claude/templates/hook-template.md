# Hook Template

## Location

- Reusable: `hooks/use<HookName>.ts` (create the `hooks/` folder the first
  time one is needed — it doesn't exist yet)
- Page-specific: `app/<route>/hooks/use<HookName>.ts`

## Template

```ts
"use client"

type Use<HookName>Options = {
  // input options (if any)
}

type Use<HookName>Return = {
  // return shape
}

export const use<HookName> = (options: Use<HookName>Options): Use<HookName>Return => {
  // hook logic

  return {
    // return values
  }
}
```

## Async example

```ts
"use client"

import { useEffect, useState } from "react"

type Use<HookName>Return = {
  data: SomeType | null
  isLoading: boolean
  error: string | null
}

export const use<HookName> = (): Use<HookName>Return => {
  const [data, setData] = useState<SomeType | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await someClientOnlyCall()
        setData(result)
      } catch {
        setError("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  return { data, isLoading, error }
}
```

Reach for this pattern only when the data genuinely can't be fetched on the
server (e.g. it depends on a browser API). If a Server Component could fetch
it instead, do that and pass it down as a prop — that's the default in this
project, not the exception.

## Rules

- Hook name must start with `use`.
- `"use client"` at the top — hooks only run client-side.
- No JSX inside hooks.
- No `any` types.
- No nested ternaries.
- `async/await` preferred over promise chaining.
- Named export only.
