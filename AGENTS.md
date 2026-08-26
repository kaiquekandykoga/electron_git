# AGENTS.md

Guidance for AI coding agents working in this repository.

## This is a public open source project

Everything committed here is published to
<https://github.com/kaiquekandykoga/electron_git> under the BSD-3-Clause license.

**Never commit sensitive data.** That includes:

- API keys, tokens, passwords, signing certificates or private keys
- `.env` files or any other local credential store
- Absolute paths containing personal information, real user home directories,
  machine names, email addresses or other personal data
- Contents of `~/.electron_git/settings.yaml` (it holds the user's real
  directory paths)
- Logs, screenshots or test fixtures captured from a real machine

Secrets belong in GitHub Actions secrets or in the developer's local
environment, never in tracked files. If you notice a secret in the working tree
or in history, stop and tell the user instead of committing.

## Project layout

- `src/main/` — Electron main process (window, menu, IPC, settings)
- `src/preload/` — context bridge exposed to the renderer
- `src/renderer/` — React UI (hash-based routing, pages under `pages/`)
- `src/shared/` — types shared across processes (IPC channels, settings)
- `scripts/` — Node build helpers (must stay cross-platform, no shell builtins)

## Conventions

- TypeScript everywhere; keep the strict settings in `tsconfig*.json`.
- Build scripts must run on Linux, macOS and Windows — CI runs all three.
  Use Node scripts, not shell commands.
- Match the surrounding code style; comments explain *why*, not *what*.
- Tests are Jest (`*.test.ts`) and live next to the code they cover.

## Before finishing a change

```bash
npm run build
npm run ci      # eslint + jest
```

Both must pass; CI runs the same commands on all three platforms.

## Releases

Releases are fully automated (`.github/workflows/release.yml`). Do not bump
`version` in `package.json` by hand and do not create tags manually — trigger
the *Release* workflow instead, which bumps, tags, builds and publishes.
