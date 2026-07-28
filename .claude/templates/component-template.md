# Component Template

## Location

- Reusable: `components/<ComponentName>.tsx`
- Page-specific: `app/<route>/_components/<component-name>.tsx` (kebab-case
  filename, PascalCase export)

## Template — Server Component (default)

```tsx
type <ComponentName>Props = {
  // define props here
}

export const <ComponentName> = ({}: <ComponentName>Props) => {
  return (
    <div>
      {/* content */}
    </div>
  )
}
```

## Template — Client Component (needs state/handlers/browser APIs)

```tsx
"use client"

import { useState } from "react"

type <ComponentName>Props = {
  // define props here
}

export const <ComponentName> = ({}: <ComponentName>Props) => {
  const [value, setValue] = useState("")

  return (
    <div>
      {/* content */}
    </div>
  )
}
```

## With a dialog

```tsx
"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type <ComponentName>Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const <ComponentName> = ({ open, onOpenChange }: <ComponentName>Props) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Title</DialogTitle>
      </DialogHeader>
      {/* body */}
      <DialogFooter>{/* actions */}</DialogFooter>
    </DialogContent>
  </Dialog>
)
```

## Rules

- Named export only — no `export default`.
- Arrow function only.
- Props type named `<ComponentName>Props`.
- No nested ternaries — use `if/else` or named variables.
- Tailwind CSS only — no inline styles unless a value is genuinely dynamic.
- No `any` types.
- Server Component by default — add `"use client"` only when the component
  itself needs it.
- Import dialogs from `@/components/ui/dialog` directly (no responsive
  Dialog/Drawer wrapper in this project — see `.claude/rules/tech-stack.md`).
