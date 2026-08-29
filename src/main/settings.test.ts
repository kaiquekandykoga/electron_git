/**
 * src/main/settings.test.ts
 *
 * @process      Main. Unit tests for the settings module; they run under Jest, not
 *               inside Electron.
 * @purpose      Cover normalisation, atomic persistence, mutation serialisation, and
 *               the read failures that must never destroy the file.
 * @dependencies ./settings: the subject under test; jest: the fs module mock; os and
 *               fs: real temp directories.
 * @sideEffects  Creates and removes directories under os.tmpdir(); mocks
 *               fs.readFileSync for the module under test.
 * @notes        fs.readFileSync is not configurable, so it is replaced by a module mock
 *               delegating to the real implementation rather than by jest.spyOn.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// `fs.readFileSync` is not configurable, so `jest.spyOn` cannot replace it.
// A module mock that delegates to the real implementation can.
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return { ...actual, readFileSync: jest.fn(actual.readFileSync) };
});
import {
  SETTINGS_FILENAME,
  SettingsError,
  addDirectory,
  describeDirectories,
  ensureSettings,
  defaultSettings,
  normalizeSettings,
  readSettings,
  removeDirectory,
  serializeMutation,
  setTheme,
  settingsPath,
  writeSettings,
} from './settings';

/** Settings store normalised paths, so expectations must match the host separator. */
const norm = (...paths: string[]): string[] => paths.map((entry) => path.normalize(entry));

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-git-settings-'));
});

afterEach(() => {
  jest.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Everything the settings directory holds, so leftovers show up in failures. */
const entries = (): string[] => fs.readdirSync(dir).sort();

/** Makes the next read fail the way a locked file or a dead mount would. */
const failNextRead = (code: string): void => {
  (fs.readFileSync as unknown as jest.Mock).mockImplementationOnce(() => {
    throw Object.assign(new Error(`${code}: simulated`), { code });
  });
};

describe('normalizeSettings', () => {
  it('falls back to defaults for unusable input', () => {
    expect(normalizeSettings(null)).toEqual(defaultSettings());
    expect(normalizeSettings({ theme: 'neon', directories: 'nope' })).toEqual(defaultSettings());
  });

  it('keeps known themes and drops blank or duplicate directories', () => {
    expect(
      normalizeSettings({ theme: 'dark', directories: ['/a', ' /a ', '', 42, '/b'] }),
    ).toEqual({ theme: 'dark', directories: norm('/a', '/b') });
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
    expect(readSettings(nested)).toEqual({ theme: 'dark', directories: norm('/repo') });
  });

  it('quarantines an unparseable file instead of dropping it', () => {
    fs.writeFileSync(settingsPath(dir), 'theme: [unclosed', 'utf8');

    expect(readSettings(dir)).toEqual(defaultSettings());

    const backups = entries().filter((entry) => entry.includes('.bak-'));
    expect(backups).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, backups[0]), 'utf8')).toBe('theme: [unclosed');
    expect(fs.existsSync(settingsPath(dir))).toBe(false);
  });

  it('refuses to hand back defaults when the read fails for any other reason', () => {
    writeSettings({ theme: 'dark', directories: ['/repo'] }, dir);
    failNextRead('EACCES');

    expect(() => readSettings(dir)).toThrow(SettingsError);
  });

  it('leaves the file on disk untouched when it cannot be read', () => {
    writeSettings({ theme: 'dark', directories: ['/repo'] }, dir);
    const before = fs.readFileSync(settingsPath(dir), 'utf8');

    failNextRead('EBUSY');

    expect(() => ensureSettings(dir)).toThrow(SettingsError);
    expect(fs.readFileSync(settingsPath(dir), 'utf8')).toBe(before);
  });

  it('writes atomically and leaves no temporary file behind', () => {
    writeSettings({ theme: 'dark', directories: ['/repo'] }, dir);
    expect(entries()).toEqual([SETTINGS_FILENAME]);
  });

  // Windows has no POSIX mode bits; chmod there is a read-only flag at best.
  (process.platform === 'win32' ? it.skip : it)('keeps the file owner-only', () => {
    writeSettings({ theme: 'dark', directories: ['/repo'] }, dir);
    expect(fs.statSync(settingsPath(dir)).mode & 0o777).toBe(0o600);
  });
});

describe('serializeMutation', () => {
  it('runs mutations in order and is not poisoned by a failure', async () => {
    const order: string[] = [];

    const first = serializeMutation(() => {
      order.push('first');
      throw new Error('boom');
    });
    const second = serializeMutation(async () => {
      order.push('second');
      return 'ok';
    });

    await expect(first).rejects.toThrow('boom');
    await expect(second).resolves.toBe('ok');
    expect(order).toEqual(['first', 'second']);
  });

  it('does not lose an edit when two mutations overlap', async () => {
    await Promise.all([
      serializeMutation(() => addDirectory('/a', dir)),
      serializeMutation(() => addDirectory('/b', dir)),
    ]);

    expect(readSettings(dir).directories).toEqual(norm('/a', '/b'));
  });
});

describe('mutations', () => {
  it('adds a directory once and removes it again', () => {
    addDirectory('/repo', dir);
    expect(addDirectory('/repo', dir).directories).toEqual(norm('/repo'));

    addDirectory('/other', dir);
    expect(removeDirectory('/repo', dir).directories).toEqual(norm('/other'));
  });

  it('preserves directories when the theme changes', () => {
    addDirectory('/repo', dir);
    expect(setTheme('dark', dir)).toEqual({ theme: 'dark', directories: norm('/repo') });
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
    expect(ensureSettings(dir)).toEqual({ theme: 'dark', directories: norm('/repo') });
  });

  it('does not rewrite a file it managed to read', () => {
    const raw = '# hand-written\ntheme: dark\ndirectories:\n  - /repo\n';
    fs.writeFileSync(settingsPath(dir), raw, 'utf8');

    ensureSettings(dir);

    expect(fs.readFileSync(settingsPath(dir), 'utf8')).toBe(raw);
  });
});
