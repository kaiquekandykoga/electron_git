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

export function defaultSettings(): Settings {
  return { theme: DEFAULT_THEME, directories: [] };
}

function isTheme(value: unknown): value is ThemeId {
  return THEMES.includes(value as ThemeId);
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

/** Reads the settings file, creating neither directory nor file if absent. */
export function readSettings(dir: string = SETTINGS_DIR): Settings {
  try {
    const contents = fs.readFileSync(path.join(dir, SETTINGS_FILENAME), 'utf8');
    return normalizeSettings(yaml.load(contents));
  } catch {
    return defaultSettings();
  }
}

/** Writes the settings file, creating `~/.electron_git/` on first use. */
export function writeSettings(settings: Settings, dir: string = SETTINGS_DIR): Settings {
  const normalized = normalizeSettings(settings);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, SETTINGS_FILENAME),
    yaml.dump(normalized, { noRefs: true }),
    'utf8',
  );
  return normalized;
}

/**
 * Guarantees `~/.electron_git/settings.yaml` exists, so the file is there to be
 * inspected or hand-edited from the first launch onwards.
 */
export function ensureSettings(dir: string = SETTINGS_DIR): Settings {
  return writeSettings(readSettings(dir), dir);
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
