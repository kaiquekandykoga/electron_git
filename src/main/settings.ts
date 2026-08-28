import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import {
  AppState,
  DEFAULT_THEME,
  DirectoryEntry,
  Settings,
  THEMES,
  ThemeId,
} from '../shared/ipc';

export const SETTINGS_DIR = path.join(os.homedir(), '.electron_git');
export const SETTINGS_FILENAME = 'settings.yaml';

/** Owner-only: the file lists the user's real directory paths. */
const SETTINGS_MODE = 0o600;
const SETTINGS_DIR_MODE = 0o700;

/** Raised when the settings file exists but could not be read or written. */
export class SettingsError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SettingsError';
  }
}

export function settingsPath(dir: string = SETTINGS_DIR): string {
  return path.join(dir, SETTINGS_FILENAME);
}

export function defaultSettings(): Settings {
  return { theme: DEFAULT_THEME, directories: [] };
}

function isTheme(value: unknown): value is ThemeId {
  return THEMES.includes(value as ThemeId);
}

function errorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as NodeJS.ErrnoException).code)
    : undefined;
}

/**
 * Coerce whatever came out of the YAML file into a valid `Settings`. The file
 * is user-editable, so anything unrecognised falls back to the default rather
 * than propagating into the UI.
 */
export function normalizeSettings(raw: unknown): Settings {
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Settings>;
  const directories = Array.isArray(source.directories) ? source.directories : [];

  return {
    theme: isTheme(source.theme) ? source.theme : DEFAULT_THEME,
    directories: [
      ...new Set(
        directories
          .filter((dir): dir is string => typeof dir === 'string' && dir.trim() !== '')
          .map((dir) => path.normalize(dir.trim())),
      ),
    ],
  };
}

/**
 * Moves an unparseable settings file aside so the user can recover it by hand.
 * Failing to do so is fatal: writing defaults over a file we could not back up
 * is exactly the data loss this guards against.
 */
function quarantineSettings(file: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${file}.bak-${stamp}`;

  try {
    fs.renameSync(file, backup);
  } catch (error) {
    throw new SettingsError(`Could not move the unreadable settings file ${file} aside`, {
      cause: error,
    });
  }

  return backup;
}

/**
 * Reads the settings file, creating neither directory nor file if absent.
 *
 * Only a missing file yields defaults silently — that is first run. Any other
 * failure (`EACCES`, `EBUSY` on Windows, a stalled network mount) throws,
 * because the real settings are still on disk and must not be overwritten by
 * the empty defaults a swallowed error would produce.
 */
export function readSettings(dir: string = SETTINGS_DIR): Settings {
  const file = settingsPath(dir);
  let contents: string;

  try {
    contents = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (errorCode(error) === 'ENOENT') {
      return defaultSettings();
    }
    throw new SettingsError(`Could not read ${file}`, { cause: error });
  }

  try {
    return normalizeSettings(yaml.load(contents));
  } catch {
    quarantineSettings(file);
    return defaultSettings();
  }
}

/**
 * Writes into a sibling temp file, flushes it, then renames over the target.
 * `rename` within a directory is atomic, so a crash mid-write leaves either the
 * old file or the new one — never a truncated one. The temp name is unique so a
 * leftover from a killed process can never be reused with the wrong mode.
 */
function writeAtomic(file: string, contents: string): void {
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const handle = fs.openSync(tmp, 'wx', SETTINGS_MODE);

  try {
    fs.writeFileSync(handle, contents, 'utf8');
    fs.fsyncSync(handle);
  } finally {
    fs.closeSync(handle);
  }

  try {
    fs.renameSync(tmp, file);
  } catch (error) {
    fs.rmSync(tmp, { force: true });
    throw error;
  }
}

/** Writes the settings file, creating `~/.electron_git/` on first use. */
export function writeSettings(settings: Settings, dir: string = SETTINGS_DIR): Settings {
  const normalized = normalizeSettings(settings);
  const file = settingsPath(dir);

  try {
    fs.mkdirSync(dir, { recursive: true, mode: SETTINGS_DIR_MODE });
    writeAtomic(file, yaml.dump(normalized, { noRefs: true }));
  } catch (error) {
    throw new SettingsError(`Could not write ${file}`, { cause: error });
  }

  return normalized;
}

/**
 * Guarantees `~/.electron_git/settings.yaml` exists, so the file is there to be
 * inspected or hand-edited from the first launch onwards. A readable file is
 * left exactly as it is — rewriting it would risk a good file for nothing.
 *
 * Call this once at startup, never per window.
 */
export function ensureSettings(dir: string = SETTINGS_DIR): Settings {
  const settings = readSettings(dir);
  return fs.existsSync(settingsPath(dir)) ? settings : writeSettings(settings, dir);
}

let mutations: Promise<unknown> = Promise.resolve();

/**
 * Runs settings mutations one at a time. Each one is a read–modify–write, so
 * two overlapping IPC calls would otherwise both read the old file and the
 * slower write would silently drop the other's edit.
 */
export function serializeMutation<T>(mutate: () => T): Promise<T> {
  const result = mutations.then(mutate, mutate);
  // The chain only sequences work; a rejection must not poison later mutations.
  mutations = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** A `.git` entry may be a directory or, for worktrees/submodules, a file. */
export function hasGit(directory: string): boolean {
  return fs.existsSync(path.join(directory, '.git'));
}

export function describeDirectories(directories: string[]): DirectoryEntry[] {
  return directories.map((directory) => ({ path: directory, hasGit: hasGit(directory) }));
}

export function toAppState(settings: Settings): AppState {
  return { theme: settings.theme, directories: describeDirectories(settings.directories) };
}

export function addDirectory(directory: string, dir: string = SETTINGS_DIR): Settings {
  const settings = readSettings(dir);
  return writeSettings({ ...settings, directories: [...settings.directories, directory] }, dir);
}

export function removeDirectory(directory: string, dir: string = SETTINGS_DIR): Settings {
  const settings = readSettings(dir);
  const target = path.normalize(directory);
  return writeSettings(
    { ...settings, directories: settings.directories.filter((entry) => entry !== target) },
    dir,
  );
}

export function setTheme(theme: ThemeId, dir: string = SETTINGS_DIR): Settings {
  return writeSettings({ ...readSettings(dir), theme }, dir);
}
