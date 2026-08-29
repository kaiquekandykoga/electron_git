/**
 * scripts/copy-assets.js
 *
 * @process      Build. The asset copying step of `npm run build`.
 * @purpose      Put the renderer’s HTML and CSS next to the bundle, so dist/renderer is
 *               loadable on its own.
 * @sideEffects  Creates dist/renderer; overwrites index.html and index.css there.
 * @notes        Node rather than a shell copy: the build has to run on Linux, macOS and
 *               Windows.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'renderer');
const outDir = path.join(__dirname, '..', 'dist', 'renderer');

fs.mkdirSync(outDir, { recursive: true });

for (const file of ['index.html', 'index.css']) {
  fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
}
