# Skill: create-component

Create a new React component following project conventions.

## Trigger

When the user says "create a component", "add a component", or "new component
named X".

## Steps

1. Determine if the component is reusable (→ `components/<Name>.tsx`) or
   page-specific (→ `app/<route>/_components/<name>.tsx`, kebab-case
   filename).
2. Create the file using the component template.
3. Use named exports only — never default exports.
4. Define a TypeScript type named `<ComponentName>Props` for props.
5. Use Tailwind CSS for all styling — no inline styles unless a value is
   genuinely dynamic.
6. Default to a Server Component. Only add `"use client"` at the top of the
   file if the component needs `useState`/`useEffect`/event handlers/browser
   APIs.
7. If the component uses a dialog, import from `@/components/ui/dialog`
   directly — this app is mobile-only, there's no responsive wrapper to use
   instead.

## Rules

- Functional components with arrow functions only.
- No nested ternary expressions — use `if/else` or named variables.
- No `any` types.
- Props type must be named `<ComponentName>Props`.

## Output

A single `.tsx` file placed in the correct folder per `.claude/rules/folder-structure.md`.
