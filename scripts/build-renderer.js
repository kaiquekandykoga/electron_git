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
