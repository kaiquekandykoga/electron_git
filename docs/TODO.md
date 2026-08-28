# Production readiness TODO

A working list of what stands between the current tree and a build we would be
comfortable shipping to people who are not us. Items are grouped by theme and
tagged **P0**–**P3**:

| Tag | Meaning |
| --- | --- |
| **P0** | Ship blocker — data loss, crash, or the app is unusable/untrustworthy on a user's machine |
| **P1** | Must land before a "1.0 for real" announcement |
| **P2** | Should land soon after; quality and maintainability |
| **P3** | Nice to have / future direction |

File references point at the code as it stands today.

---

## 1. Correctness and data safety

### 1.1 **P0** — A failed settings read silently destroys the user's settings

`readSettings` swallows *every* error and returns defaults
(`src/main/settings.ts:47-54`). `ensureSettings` then writes that result straight
back over the file (`src/main/settings.ts:72-74`), and it runs on every window
creation (`src/main/index.ts:13`). So a transient `EACCES`, an `EBUSY` on
Windows, a half-written file, or an NFS hiccup does not degrade gracefully — it
permanently replaces the user's tracked directories with an empty list.

- [ ] Distinguish "file does not exist" (`ENOENT` → defaults, fine to write) from
      every other failure (surface it, do **not** overwrite).
- [ ] On a parse failure, move the bad file aside (`settings.yaml.bak-<timestamp>`)
      before writing defaults, so the data is recoverable.
- [ ] Only call `ensureSettings` once at startup, not per window.

### 1.2 **P0** — Non-string IPC payload crashes the handler

`removeDirectory` passes its argument straight to `path.normalize`
(`src/main/settings.ts:96`), which throws `TypeError` for anything that is not a
string. The renderer's `run()` helper has a `try/finally` with no `catch`
(`src/renderer/pages/dashboard/dashboard.tsx:9-16`), so the rejection becomes an
unhandled promise rejection and the UI shows nothing.

- [ ] Validate and narrow every IPC argument in `src/main/ipc.ts` before it
      reaches the settings layer (the `THEME_SET` handler already does this at
      `src/main/ipc.ts:15-17` — apply the same discipline everywhere).
- [ ] Wrap handler bodies so a thrown error becomes a typed error result rather
      than a rejected `invoke`.

### 1.3 **P0** — Settings writes are not atomic and not serialised

`writeSettings` does a plain `writeFileSync` (`src/main/settings.ts:60-64`).
A crash or power loss mid-write truncates the file. Every mutation is also a
read–modify–write (`addDirectory`, `removeDirectory`, `setTheme`) with no
in-process queue, so two rapid IPC calls can interleave and lose one edit.

- [ ] Write to `settings.yaml.tmp` in the same directory, `fsync`, then
      `fs.renameSync` over the target.
- [ ] Serialise mutations behind a single promise chain in the main process.
- [ ] `chmod 0o600` the settings file — it contains the user's real directory
      paths and has no reason to be world-readable.

### 1.4 **P1** — The renderer can get stuck on "Loading…" forever

`window.api.state.read().then(setState)` has no `.catch`
(`src/renderer/index.tsx:29-31`). If the main process handler throws, `state`
stays `null` and the user sees a permanent "Loading…" with no explanation.

- [ ] Add an error state and a retry affordance.
- [ ] Same for the mutation path in `dashboard.tsx` — surface failures instead of
      just clearing `busy`.

### 1.5 **P1** — Stale window reference in the application menu

`createApplicationMenu(mainWindow)` closes over one window
(`src/main/menu.ts:8`), but `Menu.setApplicationMenu` is process-global. On
macOS, closing the window and reactivating creates a new one
(`src/main/index.ts:35-39`) while the menu still points at the destroyed one;
`webContents.send` on it throws.

- [ ] Resolve the target window at click time
      (`BrowserWindow.getFocusedWindow()` with a sensible fallback), or rebuild
      the menu on focus change.
- [ ] Guard with `isDestroyed()` before sending.

### 1.6 **P1** — `directories` is never revalidated

`hasGit` is computed once per state read (`src/main/settings.ts:77-83`). If a
repo is deleted, moved, or a drive is unmounted while the app is open, the
dashboard keeps showing a stale badge.

- [ ] Recompute on window focus, and/or expose an explicit refresh.
- [ ] Show a distinct "unreachable" state for paths that no longer exist, as
      opposed to "exists but no `.git`".

### 1.7 **P2** — Missing guards and edge cases

- [ ] `addDirectory` accepts whatever the dialog returns without checking the
      path is readable or is not already a subdirectory of a tracked entry.
- [ ] `document.getElementById('app')` returning `null` silently renders nothing
      (`src/renderer/index.tsx:51-55`) — throw instead, it is a build error.
- [ ] `useHashRoute` does not validate the hash against known routes; a
      hand-typed `#/../../etc` is harmless today but should be normalised.
- [ ] Theme changes do not update `BrowserWindow.setBackgroundColor`, so the
      window chrome keeps the launch-time colour until restart
      (`src/main/index.ts:19`).

---

## 2. Electron security

The basics are right — `contextIsolation: true`, `nodeIntegration: false`, a
`contextBridge` surface, and a CSP meta tag. What is missing is the rest of the
[Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security).

### 2.1 **P0** — No navigation or window-open policy

Nothing stops the renderer from navigating away from the app or opening a
window. There is no remote content today, but this is the one mitigation that
turns a future XSS from "full compromise" into "annoying bug".

- [ ] `contents.setWindowOpenHandler(() => ({ action: 'deny' }))` — route real
      external links through `shell.openExternal` after allowlisting the scheme.
- [ ] Block `will-navigate` for anything outside the packaged `file://` origin.
- [ ] Deny `webContents.session.setPermissionRequestHandler` by default
      (camera, geolocation, notifications — none are needed).
- [ ] Apply all of the above from `app.on('web-contents-created')` so it covers
      every future window, not just the first one.

### 2.2 **P1** — Be explicit about the sandbox

`sandbox` is not set in `webPreferences` (`src/main/index.ts:20-24`). Electron
defaults it to `true`, and the preload is written for a sandboxed world
(`src/preload/index.ts:3-6`), but relying on a default for a security-critical
flag is a regression waiting to happen.

- [ ] Set `sandbox: true` and `webSecurity: true` explicitly.
- [ ] Add `nodeIntegrationInSubFrames: false`, `allowRunningInsecureContent: false`.

### 2.3 **P1** — Tighten the CSP

Current policy (`src/renderer/index.html:5-8`) covers `default-src`,
`script-src`, `style-src` only.

- [ ] Add `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`,
      `frame-ancestors 'none'`, `frame-src 'none'`, `connect-src 'none'`,
      `img-src 'self' data:`.
- [ ] Also set the CSP via `session.defaultSession.webRequest.onHeadersReceived`
      so it cannot be bypassed by a document that loads without the meta tag.

### 2.4 **P1** — No sender validation on IPC handlers

Every `ipcMain.handle` in `src/main/ipc.ts` trusts its caller. With a single
trusted renderer this is currently fine; it stops being fine the moment a
webview, iframe, or second window exists.

- [ ] Validate `event.senderFrame` origin/URL in a shared wrapper before running
      any handler.
- [ ] Consider a single typed `registerHandler(channel, schema, fn)` helper so
      validation cannot be forgotten for a new channel.

### 2.5 **P1** — Supply chain and CI hardening

- [ ] Run `npm audit --audit-level=high` (or `osv-scanner`) in CI; today
      `npm run ci` is only lint + jest (`package.json:13`).
- [ ] Pin GitHub Actions to commit SHAs, not floating tags
      (`.github/workflows/ci.yml`, `.github/workflows/release.yml`).
- [ ] Scope `permissions:` per job in `release.yml` instead of granting
      `contents: write` to the whole workflow (`.github/workflows/release.yml:19-20`).
- [ ] Move `${{ github.ref_name }}` out of the inline shell script and into
      `env:` in the *Bump version and tag* step
      (`.github/workflows/release.yml:47-57`) — interpolating context directly
      into `run:` is the standard Actions script-injection footgun.
- [ ] Enable Dependabot security updates and, ideally, `npm ci --ignore-scripts`
      plus an explicit `allowScripts` review process.
- [ ] Publish an SBOM and build provenance attestation with the release.

---

## 3. Distribution and updates

### 3.1 **P0** — The app has no icon

`build` in `package.json` sets no `icon` for any platform, so shipped builds use
the default Electron icon. This alone makes a release look unfinished.

- [ ] Add `build/icon.icns`, `build/icon.ico`, and a `build/icons/` PNG set.
- [ ] Set `mac.category` (`LSApplicationCategoryType`) and Linux
      `desktop` metadata (`synopsis`, `keywords`, `StartupWMClass`).

### 3.2 **P0** — No auto-update path

Once a `.dmg`/`.exe`/`.AppImage` is on a user's machine there is no way to get a
fix to them. Security fixes in particular need a delivery mechanism.

- [ ] Add `electron-updater`, publish `latest*.yml` from the release workflow,
      and wire a check-on-start + "Restart to update" prompt.
- [ ] Signature verification must be on — an unsigned auto-updater is a remote
      code execution channel, not a feature.

### 3.3 **P1** — Code signing

`README.md` already documents the macOS situation honestly, and
`scripts/ad-hoc-sign-mac.js` is a reasonable stopgap, but neither platform ships
a trusted binary.

- [ ] macOS: Developer ID certificate in GitHub secrets, hardened runtime,
      entitlements plist, and notarisation (`notarize` in electron-builder).
- [ ] Windows: an Authenticode certificate — an unsigned NSIS installer trips
      SmartScreen and most users will not click through it.
- [ ] Once real signing lands, drop `--deep` from `ad-hoc-sign-mac.js:27` (it is
      deprecated by Apple) and prefer signing inner bundles first.

### 3.4 **P2** — Packaging details

- [ ] `files: ["dist/**/*"]` (`package.json`) ships `.js.map` files and the
      unminified renderer bundle. Exclude source maps from the shipped asar (or
      upload them separately for symbolication).
- [ ] Add `repository`, `homepage`, `bugs`, and a real `description` to
      `package.json` — electron-builder reads several of these for installer
      metadata, and `description` is currently empty.
- [ ] Ship Linux `.deb` in addition to `AppImage`.
- [ ] Build macOS `arm64` *and* `x64` (or universal) explicitly rather than
      whatever the runner happens to be.
- [ ] Add an `engines.node` field and a `.nvmrc` matching the CI Node version.

---

## 4. Performance and startup

### 4.1 **P1** — Blocking synchronous filesystem work on the main process

`describeDirectories` calls `fs.existsSync` once per tracked directory on every
state read (`src/main/settings.ts:77-83`), on the main process, synchronously.
For a local SSD with five repos this is invisible. For a tracked network share,
an unmounted volume, or a sleeping external drive it blocks the entire UI for
seconds.

- [ ] Move to `fs.promises.access` and run the checks concurrently.
- [ ] Add a short timeout per path so one dead mount cannot hang the app.
- [ ] Cache results and invalidate on focus rather than recomputing per read.

### 4.2 **P1** — Startup does synchronous I/O before the window exists

`ensureSettings()` reads *and writes* the YAML file before `new BrowserWindow`
(`src/main/index.ts:13`), and if the write throws the app dies with no window
and no error dialog.

- [ ] Create the window first; load settings asynchronously.
- [ ] Use `show: false` + `ready-to-show` to avoid the white flash on launch.
- [ ] Wrap startup in a handler that shows `dialog.showErrorBox` instead of
      exiting silently.

### 4.3 **P2** — Renderer bundle is unoptimised

`scripts/build-renderer.js` sets `bundle` and the production `NODE_ENV` but no
`minify`, no `target`, no source maps.

- [ ] `minify: true` and an explicit `target` matching the bundled Chromium.
- [ ] `sourcemap: 'external'`, kept out of the shipped package but archived for
      crash symbolication.
- [ ] Add a bundle-size check so a stray dependency cannot silently double it.

### 4.4 **P2** — Other

- [ ] Persist and restore window bounds (size, position, maximised) — currently
      hardcoded 1024×768 every launch (`src/main/index.ts:16-17`).
- [ ] Add `app.requestSingleInstanceLock()`; two instances today will race on the
      same settings file.
- [ ] Whole-app re-render on every state change is fine at this size but should
      be split once the directory list grows (virtualise beyond a few hundred).

---

## 5. Architecture, TypeScript, readability

### 5.1 **P1** — The IPC contract is stringly typed and duplicated three times

Channel names are declared in `src/shared/ipc.ts:1-7`, hand-copied into
`src/preload/index.ts:7-11`, and the resulting API surface is *separately*
hand-declared in `src/renderer/window.d.ts`. Three places to keep in sync, and
nothing fails at compile time when they drift. The comment at
`src/preload/index.ts:3-6` explains the constraint honestly, but bundling solves
it.

- [ ] Bundle the preload with esbuild (same as the renderer) so it can `import`
      from `src/shared/` and stay sandbox-safe.
- [ ] Derive the `Window['api']` type from the actual preload object
      (`typeof api`) instead of restating it.
- [ ] Introduce a typed channel map (`channel -> [request, response]`) and thin
      `invoke`/`handle` wrappers so a mismatched payload is a type error.

### 5.2 **P2** — Stricter compiler settings

`tsconfig.json` has `strict: true` but stops there.

- [ ] Enable `noUncheckedIndexedAccess` — `routes[path]`
      (`src/renderer/index.tsx:47`) is currently typed as non-`undefined` when it
      is not.
- [ ] Enable `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`,
      `noFallthroughCasesInSwitch`, `exactOptionalPropertyTypes`,
      `isolatedModules`, `verbatimModuleSyntax`.
- [ ] Type-check the renderer in CI — `tsconfig.renderer.json` runs with
      `noEmit` in `npm run build`, which is right, but make sure a renderer type
      error actually fails `npm run ci` too.

### 5.3 **P2** — Lint coverage

`eslint.config.js` is `js/recommended` + `typescript-eslint/recommended` only.

- [ ] Add `eslint-plugin-react` and `eslint-plugin-react-hooks` — nothing today
      catches a bad dependency array (`react-hooks/exhaustive-deps`).
- [ ] Add `typescript-eslint`'s type-aware rules (`recommendedTypeChecked`).
- [ ] Add Prettier (or `@stylistic`) so formatting is enforced rather than
      convention.
- [ ] Consider an Electron-specific security linter in CI.

### 5.4 **P3** — Structure for growth

The app is currently a settings editor; the name promises a git client.

- [ ] Decide where git operations will live (main process, spawned `git`
      binary vs `isomorphic-git`) before the first one is written — the choice
      determines the whole security model.
- [ ] If shelling out to `git`: never build command strings, always
      `execFile` with an argument array, never pass user paths through a shell.
- [ ] Split `src/main/settings.ts` once it grows past persistence: the file
      currently mixes I/O, normalisation, and derived state (`toAppState`).

---

## 6. Testing

Today: one test file, `src/main/settings.test.ts`, covering the settings module.
It is genuinely good — normalisation, round-trip, corrupt YAML, mutations — but
it is the only thing under test.

- [ ] **P1** No tests at all for `src/main/ipc.ts`, `src/main/menu.ts`, or any
      renderer code.
- [ ] **P1** `testMatch: ['**/*.test.ts']` (`jest.config.js`) excludes `.test.tsx`,
      so component tests cannot even be discovered. Add `.tsx` and a
      `jsdom` project for renderer tests with `@testing-library/react`.
- [ ] **P1** Add an end-to-end smoke test (Playwright's Electron support): launch
      the packaged app, assert the window opens, navigate via the menu, add and
      remove a directory.
- [ ] **P2** Coverage thresholds in `jest.config.js` so coverage cannot silently
      regress.
- [ ] **P2** Regression tests for each bug fixed in section 1 — especially 1.1
      (read failure must not overwrite) and 1.2 (non-string payload).
- [ ] **P2** `passWithNoTests: true` hides an accidentally empty test run; drop it
      once tests exist in every project.
- [ ] **P3** CI currently runs `npm run build` then `npm run ci` on three
      platforms — add a packaged-app job so packaging breakage is caught before
      the release workflow.

---

## 7. UX and accessibility

- [ ] **P1** No error UI anywhere. Failures are invisible (see 1.4).
- [ ] **P1** "Remove" deletes a tracked directory with no confirmation and no
      undo (`src/renderer/pages/dashboard/dashboard.tsx:45-53`).
- [ ] **P1** Theme has no "System" option and the CSS ignores
      `prefers-color-scheme` (`src/renderer/index.css`). Wire `nativeTheme` and
      add a third choice.
- [ ] **P2** No visible `:focus-visible` styling on buttons or radios — keyboard
      users cannot see where they are.
- [ ] **P2** Busy state disables buttons but announces nothing; add `aria-busy`
      and an `aria-live` region for state changes.
- [ ] **P2** Navigation is menu-only (`Cmd/Ctrl+1`, `Cmd/Ctrl+2`). Discoverable
      for the author, not for a new user — add in-window navigation.
- [ ] **P2** Long paths wrap with `overflow-wrap: anywhere`, which is workable,
      but a middle-ellipsis with a `title` tooltip reads better.
- [ ] **P3** No i18n; all strings are inline English.
- [ ] **P3** No reduced-motion or high-contrast handling.

---

## 8. Operations and project hygiene

- [ ] **P1** No logging. When a user reports "it does nothing", there is no log
      to ask for. Add `electron-log` writing to the standard per-platform
      location, with a *Help → Open logs* menu item.
- [ ] **P1** No crash reporting and no uncaught-exception handler in the main
      process — an exception currently kills the app with no dialog and no trace.
- [ ] **P2** No `CHANGELOG.md`. The release workflow bumps and tags
      (`.github/workflows/release.yml`) but the release notes are empty.
- [ ] **P2** No `CONTRIBUTING.md`, issue templates, PR template, or
      `SECURITY.md` — the last one matters for a public repo that ships binaries.
- [ ] **P2** No `CODEOWNERS` / branch protection documented.
- [ ] **P3** If any telemetry is ever added it must be opt-in, documented, and
      off by default — the settings file is currently 100% local, which is a
      property worth keeping deliberately.

---

## Suggested order

1. **Data safety first** — 1.1, 1.2, 1.3. These are the ones that can lose a
   user's data or crash on them today.
2. **Then the security posture** — 2.1, 2.2, 2.3, 2.4. Cheap, mechanical, and
   they close the door before there is remote content to worry about.
3. **Then make it shippable** — 3.1 (icons), 3.2 (updates), 8.1 (logs). Without
   these there is no way to diagnose or fix a user's problem after release.
4. **Then the foundations** — 5.1 (typed IPC) and section 6 (tests), which make
   everything after this cheaper.
5. Performance, UX, and hygiene as they become the limiting factor.
