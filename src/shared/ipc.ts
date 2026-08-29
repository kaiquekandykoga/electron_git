export const IPC_CHANNELS = {
  NAVIGATE: 'router:navigate',
  STATE_READ: 'state:read',
  THEME_SET: 'theme:set',
  DIRECTORY_ADD: 'directory:add',
  DIRECTORY_REMOVE: 'directory:remove',
} as const;

export type RouteId = 'dashboard' | 'settings';

export const THEMES = ['light', 'dark'] as const;
export type ThemeId = (typeof THEMES)[number];
export const DEFAULT_THEME: ThemeId = 'light';

/** Shape persisted to ~/.electron_git/settings.yaml. */
export interface Settings {
  theme: ThemeId;
  directories: string[];
}

/** A tracked directory, decorated with whatever the main process can see on disk. */
export interface DirectoryEntry {
  path: string;
  hasGit: boolean;
}

/** What the renderer works with: settings plus the derived on-disk facts. */
export interface AppState {
  theme: ThemeId;
  directories: DirectoryEntry[];
}

/**
 * What every `ipcMain.handle` resolves to. A rejected `invoke` surfaces in the
 * renderer as an unhandled promise rejection — the user sees nothing at all —
 * so failures travel as a value instead.
 */
export type IpcResult<T> = { ok: true; value: T } | { ok: false; error: string };
