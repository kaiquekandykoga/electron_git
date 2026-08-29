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
- Every source file opens with a header comment giving its architectural
  context — see below.

## File headers

A file in a three-process Electron app is hard to place from its contents
alone: the same `import` can mean a main-process capability, a bridge across
the context isolation boundary, or renderer code that may only talk over IPC.
The header states that context up front so it does not have to be reverse
engineered.

### Which files carry a header

**Required** — these and nothing else:

- every `*.ts` and `*.tsx` under `src/`, including `*.test.ts` and `*.d.ts`
- every `*.js` under `scripts/`

**Exempt — do not add a header:**

- Formats with no comment syntax: `*.json`, `package-lock.json`.
- Prose: every `*.md`, including `README.md`, `docs/*.md` and this file. A
  Markdown document states its own subject in its title and opening lines.
- Markup and styles shipped to the renderer: `src/renderer/index.html`,
  `src/renderer/index.css`.
- Repo config: `eslint.config.js`, `jest.config.js`, `tsconfig*.json`,
  `.github/**`, `.gitignore`.

A path outside both lists is exempt. Do not extend either list by analogy.

### When to write one

Write the header when you create a required file. Update it when you change
the process, exports, dependencies or side effects of a required file you are
already editing. Do not retrofit headers into files you are not otherwise
touching, and never make a commit whose only content is added headers.

### Format

A single JSDoc block at the very top of the file, before the first `import`,
followed by one blank line:

```ts
/**
 * src/main/settings.ts
 *
 * @process      Main. Owns the only writer of the on-disk settings file.
 * @purpose      Load, validate and persist `~/.electron_git/settings.yaml`,
 *               keeping unknown keys and never destroying a file it cannot
 *               parse.
 * @exports      defaultSettings, ensureSettings, readSettings, writeSettings.
 * @dependencies ../shared/ipc: Settings shape shared with the renderer;
 *               yaml: parses and serialises the settings file.
 * @sideEffects  Creates ~/.electron_git; reads and atomically rewrites
 *               settings.yaml.
 * @notes        A malformed file is backed up, not overwritten — the user's
 *               real paths live in it.
 */
```

- First line: the path exactly as it appears on disk, repo-relative, with no
  `@` tag.
- Second line: a bare `*`.
- Tags start at column 4. Values start at column 18. Continuation lines are
  blank to column 18. Wrap header text at 88 columns.

### Field content

Fields appear in this order and no other.

- `@process` — required. `Main`, `Preload`, `Renderer`, `Shared` or `Build`,
  plus one clause on the role the file plays there. This is the field that
  earns the header: it fixes which side of the IPC and context isolation
  boundaries the code runs on.
- `@purpose` — required. 1–2 sentences on why the file exists and its single
  responsibility.
- `@exports` — the public contract: types, components, functions, constants,
  IPC channel names. Name them; do not explain them. Local helpers are not
  exports. Omit the field only when the file exports nothing.
- `@dependencies` — `name: purpose/interaction` pairs separated by `;`.
  Internal modules, npm packages and Electron APIs only. Omit Node builtins
  unless the interaction is non-obvious. Omit the field when there are none.
- `@sideEffects` — required. Filesystem writes, IPC registration, window or
  menu creation, subprocess spawns, global state, DOM mutation. Write `None.`
  when the file is pure — the absence of side effects is information worth
  stating.
- `@notes` — non-obvious constraints, deliberate design choices, edge cases.
  Omit rather than pad.

### Keep it true

The header is part of the file. When the process, exports, dependencies or
side effects change, update the affected lines in the same edit and delete any
line that no longer holds. A stale header is a defect in that file.

## Before finishing a change

```bash
npm run build
npm run ci      # eslint + jest
```

Both must pass; CI runs the same commands on all three platforms.

## Releases

Releases are fully automated (`.github/workflows/release.yml`). Never create
tags by hand — the workflow tags, builds and publishes. Two ways to release:

- trigger the *Release* workflow from the Actions tab and pick the bump; it
  bumps `version` in `package.json` for you, or
- bump `version` in `package.json` yourself and push it to `master`; the
  workflow detects the new version and releases it.

A push to `master` that leaves `version` alone — or whose version is already
tagged — does not release anything.
