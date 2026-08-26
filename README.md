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

Releases are built and published automatically by GitHub Actions — see
[.github/workflows/release.yml](.github/workflows/release.yml).

License: BSD-3-Clause.
