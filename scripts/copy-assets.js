const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'renderer');
const outDir = path.join(__dirname, '..', 'dist', 'renderer');

fs.mkdirSync(outDir, { recursive: true });

for (const file of ['index.html', 'index.css']) {
  fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
}
