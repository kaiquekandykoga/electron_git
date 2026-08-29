/**
 * scripts/build-renderer.js
 *
 * @process      Build. The renderer bundling step of `npm run build`.
 * @purpose      Bundle src/renderer/index.tsx and its imports into
 *               dist/renderer/index.js with esbuild.
 * @dependencies esbuild: bundles the entry point and compiles its JSX.
 * @sideEffects  Writes dist/renderer/index.js; exits non-zero when the build fails.
 * @notes        The automatic JSX runtime is what lets pages render without importing
 *               React. Paths are joined, not concatenated, so the script runs on all
 *               three CI platforms.
 */

const path = require('path');
const esbuild = require('esbuild');

const root = path.join(__dirname, '..');

esbuild
  .build({
    entryPoints: [path.join(root, 'src', 'renderer', 'index.tsx')],
    bundle: true,
    jsx: 'automatic',
    outfile: path.join(root, 'dist', 'renderer', 'index.js'),
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  .catch(() => process.exit(1));
