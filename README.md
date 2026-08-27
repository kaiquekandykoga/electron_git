# Electron git

Desktop git companion built with TypeScript, React and Electron. Navigation is
driven by the [application menu](https://www.electronjs.org/docs/latest/tutorial/application-menu);
settings (theme, tracked directories) live in `~/.electron_git/settings.yaml`.

```bash
npm ci
npm start      # build + run
npm run ci     # lint + test
npm run package # local installer in release/
```

<!-- latest-release:start -->
Download the latest release: [v1.0.3](https://github.com/kaiquekandykoga/electron_git/releases/tag/v1.0.3)
<!-- latest-release:end -->

Releases are built and published automatically by GitHub Actions — see
[.github/workflows/release.yml](.github/workflows/release.yml). The link above
is rewritten by that workflow on every release.

The macOS builds are ad-hoc signed, not notarized (CI has no Apple Developer
certificate). The first launch is blocked; open *System Settings → Privacy &
Security*, scroll to the security section and choose *Open Anyway*.

License: BSD-3-Clause.
