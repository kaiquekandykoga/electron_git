import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  SETTINGS_FILENAME,
  addDirectory,
  describeDirectories,
  ensureSettings,
  defaultSettings,
  normalizeSettings,
  readSettings,
  removeDirectory,
  setTheme,
  writeSettings,
} from './settings';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-git-settings-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('normalizeSettings', () => {
  it('falls back to defaults for unusable input', () => {
    expect(normalizeSettings(null)).toEqual(defaultSettings());
    expect(normalizeSettings({ theme: 'neon', directories: 'nope' })).toEqual(defaultSettings());
  });

  it('keeps known themes and drops blank or duplicate directories', () => {
    expect(
      normalizeSettings({ theme: 'dark', directories: ['/a', ' /a ', '', 42, '/b'] }),
    ).toEqual({ theme: 'dark', directories: ['/a', '/b'] });
  });
});

describe('persistence', () => {
  it('returns defaults when nothing has been written yet', () => {
    expect(readSettings(dir)).toEqual(defaultSettings());
  });

  it('creates the settings directory and round-trips through YAML', () => {
    const nested = path.join(dir, 'nested', '.electron_git');
    writeSettings({ theme: 'dark', directories: ['/repo'] }, nested);

    const raw = fs.readFileSync(path.join(nested, SETTINGS_FILENAME), 'utf8');
    expect(raw).toContain('theme: dark');
    expect(readSettings(nested)).toEqual({ theme: 'dark', directories: ['/repo'] });
  });

  it('falls back to defaults when the file is not valid YAML', () => {
    fs.writeFileSync(path.join(dir, SETTINGS_FILENAME), 'theme: [unclosed', 'utf8');
    expect(readSettings(dir)).toEqual(defaultSettings());
  });
});

describe('mutations', () => {
  it('adds a directory once and removes it again', () => {
    addDirectory('/repo', dir);
    expect(addDirectory('/repo', dir).directories).toEqual(['/repo']);

    addDirectory('/other', dir);
    expect(removeDirectory('/repo', dir).directories).toEqual(['/other']);
  });

  it('preserves directories when the theme changes', () => {
    addDirectory('/repo', dir);
    expect(setTheme('dark', dir)).toEqual({ theme: 'dark', directories: ['/repo'] });
  });
});

describe('describeDirectories', () => {
  it('reports whether a .git entry exists', () => {
    const repo = path.join(dir, 'repo');
    const plain = path.join(dir, 'plain');
    fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
    fs.mkdirSync(plain, { recursive: true });

    expect(describeDirectories([repo, plain, path.join(dir, 'gone')])).toEqual([
      { path: repo, hasGit: true },
      { path: plain, hasGit: false },
      { path: path.join(dir, 'gone'), hasGit: false },
    ]);
  });
});

describe('ensureSettings', () => {
  it('creates the settings file on first use', () => {
    const home = path.join(dir, '.electron_git');
    expect(ensureSettings(home)).toEqual(defaultSettings());
    expect(fs.existsSync(path.join(home, SETTINGS_FILENAME))).toBe(true);
  });

  it('leaves existing settings untouched', () => {
    writeSettings({ theme: 'dark', directories: ['/repo'] }, dir);
    expect(ensureSettings(dir)).toEqual({ theme: 'dark', directories: ['/repo'] });
  });
});
