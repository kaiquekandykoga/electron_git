/**
 * src/main/index.ts
 *
 * @process      Main. Process entry point: owns the app lifecycle and the only
 *               BrowserWindow.
 * @purpose      Boot the app — load settings once, register the IPC handlers and the
 *               menu, open the window, and follow each platform’s window-closing
 *               convention.
 * @dependencies electron: app/BrowserWindow lifecycle and the startup error dialog;
 *               ./settings: the one-time settings load; ./ipc: handler registration;
 *               ./menu: application menu.
 * @sideEffects  Creates ~/.electron_git on first run; registers IPC handlers and the
 *               application menu; opens a window; quits the app off macOS when the last
 *               window closes.
 * @notes        Settings are read once at startup, never per window. A failed read
 *               falls back to in-memory defaults and leaves whatever is on disk
 *               untouched.
 */

import { app, BrowserWindow, dialog } from 'electron';
import * as path from 'path';
import { ThemeId } from '../shared/ipc';
import { registerIpcHandlers } from './ipc';
import { createApplicationMenu } from './menu';
import { defaultSettings, ensureSettings } from './settings';

const WINDOW_BACKGROUNDS = {
  light: '#fff5f8',
  dark: '#21121a',
} as const;

/**
 * Reads (and, on first run, creates) the settings file once for the whole
 * process. A failure here must not be fatal and must not overwrite anything:
 * the app falls back to in-memory defaults and says so, leaving whatever is on
 * disk intact for the next launch.
 */
function loadStartupSettings(): ThemeId {
  try {
    return ensureSettings().theme;
  } catch (error) {
    dialog.showErrorBox(
      'Could not load settings',
      `${error instanceof Error ? error.message : String(error)}\n\n` +
        'Electron git will start with default settings. Your settings file has ' +
        'been left untouched.',
    );
    return defaultSettings().theme;
  }
}

function createWindow(theme: ThemeId): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    title: 'Electron git',
    backgroundColor: WINDOW_BACKGROUNDS[theme],
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  createApplicationMenu(mainWindow);
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  const theme = loadStartupSettings();

  registerIpcHandlers();
  createWindow(theme);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(theme);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
