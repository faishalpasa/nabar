# Git

These rules are also stated at the top level in `AGENTS.md` (loaded into every
session automatically) and enforced mechanically by `permissions.ask` and
`attribution` in `.claude/settings.json`. This file is the detailed reference;
`AGENTS.md` is the always-loaded summary. Don't rely on the permission prompt
alone — the point is that the command is never typed, not that it gets denied.

## Commit and Push Policy

- **Never commit or push automatically after making code changes.**
- Only commit when the user explicitly asks (e.g. "commit", "commit changes").
  **Finishing a task is not, by itself, a request to commit** — the user wants
  to review the diff first. Stop with the working tree changed and
  uncommitted; summarize what changed and wait.
- Only push when the user explicitly asks (e.g. "push", "git push"). Pushing to
  `main` triggers a production deploy on Vercel — treat it as an irreversible,
  outward-facing action, not a routine follow-up to a commit.
- "commit changes dan push" is valid — do both only when both are explicitly
  requested together.
- After completing a task, stop at the code changes. Do not run `git add`,
  `git commit`, or `git push` unless asked.
- `.claude/settings.json`'s `permissions.ask` gates both `git commit` and
  `git push`, but don't rely on that prompt as the actual safeguard — the
  point is that the command is never typed, not that it gets caught and
  denied.

## Pull Request / Merge Request Title

- The PR/MR title must match the source branch name exactly (e.g. branch
  `feature/happy-hour` → title `feature/happy-hour`).
- Applies to every PR/MR created, regardless of target branch (`main`,
  `release`, etc.).

## Pre-Commit / Pre-Push Hooks

Ported from `reklub/member-dashboard`'s `.husky/` setup (husky v9 +
lint-staged), with one substitution: that project runs its Vitest suite in
`pre-commit`; this one has no test suite, so `pre-commit` runs `tsc --noEmit`
instead — the fast, whole-project safety check available here, catching
exactly the class of bug ("this compiles" / "this doesn't") a pre-commit hook
exists to catch early. If a real test suite is added later, add it back
alongside the typecheck rather than replacing it.

- **`.husky/pre-commit`** — `npm run typecheck` (`tsc --noEmit`, whole
  project), then `npx lint-staged` (`eslint --cache --fix` on staged
  `.js`/`.jsx`/`.ts`/`.tsx` files only). A file lint-staged can't
  auto-fix aborts the commit; fix it and re-stage.
- **`.husky/pre-push`** — `npm run build` (`next build`). This is the same
  build Vercel runs on deploy; failing it locally before push is strictly
  cheaper than finding out from a failed Vercel deployment, especially since
  pushing to `main` deploys straight to production (see § Commit and Push
  Policy above).
- Both hooks are real, executable files checked into `.husky/` — they run for
  every commit/push from every clone, not just this one. Don't bypass them
  with `--no-verify` to work around a failure; fix the underlying typecheck,
  lint, or build error instead.

## No Claude as Co-Author / Collaborator

- Never add Claude, Anthropic, or any AI assistant as a co-author,
  collaborator, or committer on commits, merge requests, or pull requests.
- Do not include `Co-Authored-By: Claude ...` (or any similar attribution) in
  commit messages.
- Do not mention Claude/AI assistance in commit messages, merge request
  descriptions, or PR descriptions.
- Commits and merge requests must be authored solely as the user (using the
  user's configured git identity), with no AI attribution — even if default
  tooling behavior would otherwise add it. `attribution.commit` and
  `attribution.pr` in `.claude/settings.json` set this to an empty string
  mechanically; this rule states the intent behind that setting.
