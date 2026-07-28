# Testing

No end-to-end suite exists in this repo yet. This convention is forward-looking
— apply it now to new interactive elements so a Playwright (or equivalent)
suite can be added later without a retrofit pass across every component.

## `data-test-id` Convention

Pattern: `data-test-id="[module]_[element]_[action]"`

- **module** — feature area, matching the route or domain (e.g. `auth`, `home`,
  `group`, `transaction`, `invitation`, `member`)
- **element** — element type (e.g. `button`, `input`, `dropdown`, `checkbox`,
  `link`, `card`, `dialog`)
- **action** — what it does or represents (e.g. `submit`, `close`, `approve`,
  `reject`, `confirm`, `search`, `download`)

Examples, using this project's actual domains:

```tsx
<button data-test-id="transaction_button_approve">Setujui</button>
<button data-test-id="transaction_button_reject">Tolak</button>
<input data-test-id="group_input_amount" />
<div data-test-id="group_card_summary">...</div>
<a data-test-id="invitation_link_copy">Salin link</a>
```

## Rules

- Use `snake_case` throughout — no camelCase or kebab-case.
- Apply to buttons, inputs, dropdowns, checkboxes, links, dialogs, and any
  clickable/interactive element.
- Do not add `data-test-id` to purely decorative or layout elements (wrappers,
  spacers, icons).
- IDs must be unique within a page — if the same element type appears multiple
  times, differentiate via the action segment (e.g.
  `transaction_button_approve` vs `transaction_button_reject`).
- For lists/rows with repeated items, append the item identifier:
  `` data-test-id={`transaction_card_item_${tx.id}`} ``.
- Dialog trigger and dialog content should each have their own `data-test-id`.

## What Counts as Interactive

An element is interactive when it has **any** user-event handler —
`onClick`, `onChange`, `onSubmit`, `onBlur`, `onFocus`, `onKeyDown`,
`onMouseDown`, `onTouchStart`, etc. — or triggers navigation. The tag doesn't
matter:

- A `<Card>`, `<div>`, or `<span>` with `onClick` is a button, not decoration —
  it needs a `data-test-id`.
- A `<Link>` is navigation and needs one too.
- A `<form>` (or a `*Form` component receiving `onSubmit`) is interactive.

The decorative exemption (wrappers, spacers, icons, dividers) applies **only**
to elements with no handlers and no navigation.

## Commonly Skipped — Explicit Checklist

- `DialogContent` — every dialog body, not just its trigger (e.g.
  `transaction_dialog_reject_confirm`).
- Hidden `<input type="file">` (bukti upload) — a test targets it via
  `setInputFiles`; hidden ≠ decorative.
- Native `<button>` used for tab switching (History/Member pills), pagination,
  and icon-only actions.
- Server Action `<form action={...}>` submit buttons.
- External `<a href>` links, not only `<Link>`.

## `asChild` / Trigger Composition

This project's `Button` (Base UI, not Radix) has no `asChild` — links are
rendered with `buttonVariants({...})` directly on a `<Link>`, so the
`data-test-id` goes straight on that `<Link>`, not on a wrapped child.

## Shared Components

Composite components that own interactive DOM internally must accept a
`data-test-id` prop (or spread `...props`) and forward it to their root
interactive DOM element, deriving ids for internal parts from the forwarded
base id.

## AI Instructions

When generating or refactoring components:

- Add `data-test-id` to every interactive element.
- Choose the module name from the route or domain the element belongs to.
- Before finishing, re-scan the diff for any added `on*` handler or `<Link>`
  whose element lacks a `data-test-id`.
