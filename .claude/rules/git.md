# Git

These rules are also stated at the top level in `AGENTS.md` (loaded into every
session automatically) and enforced mechanically by `permissions.ask` and
`attribution` in `.claude/settings.json`. This file is the detailed reference;
`AGENTS.md` is the always-loaded summary. Don't rely on the permission prompt
alone — the point is that the command is never typed, not that it gets denied.

## Commit and Push Policy

- **Never commit or push automatically after making code changes.**
- Only commit when the user explicitly asks (e.g. "commit", "commit changes").
- Only push when the user explicitly asks (e.g. "push", "git push"). Pushing to
  `main` triggers a production deploy on Vercel — treat it as an irreversible,
  outward-facing action, not a routine follow-up to a commit.
- "commit changes dan push" is valid — do both only when both are explicitly
  requested together.
- After completing a task, stop at the code changes. Do not run `git add`,
  `git commit`, or `git push` unless asked.

## Pull Request / Merge Request Title

- The PR/MR title must match the source branch name exactly (e.g. branch
  `feature/happy-hour` → title `feature/happy-hour`).
- Applies to every PR/MR created, regardless of target branch (`main`,
  `release`, etc.).

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
