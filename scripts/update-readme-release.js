const fs = require('fs');
const path = require('path');

// Rewrites the download link in README.md so it always points at the release
// that was just published. Run from the Release workflow, after the tag exists.
//
// The link lives between HTML comment markers so the surrounding prose can be
// edited freely without breaking the automation.
const START = '<!-- latest-release:start -->';
const END = '<!-- latest-release:end -->';

const tag = process.argv[2] || process.env.TAG;
const repo = process.argv[3] || process.env.GITHUB_REPOSITORY;

if (!tag || !repo) {
  console.error('usage: update-readme-release.js <tag> <owner/repo>');
  process.exit(1);
}

const readmePath = path.join(__dirname, '..', 'README.md');
const readme = fs.readFileSync(readmePath, 'utf8');

const start = readme.indexOf(START);
const end = readme.indexOf(END);

if (start === -1 || end === -1 || end < start) {
  console.error(`README.md is missing the ${START} / ${END} markers`);
  process.exit(1);
}

const url = `https://github.com/${repo}/releases/tag/${tag}`;
const block = `${START}\nDownload the latest release: [${tag}](${url})\n${END}`;
const updated =
  readme.slice(0, start) + block + readme.slice(end + END.length);

if (updated === readme) {
  console.log(`README.md already points at ${tag}`);
  process.exit(0);
}

fs.writeFileSync(readmePath, updated);
console.log(`README.md now points at ${url}`);
