import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { registerIpcHandlers } from './ipc';
import { createApplicationMenu } from './menu';
import { ensureSettings } from './settings';

const WINDOW_BACKGROUNDS = {
  light: '#fff5f8',
  dark: '#21121a',
} as const;

function createWindow(): void {
  const { theme } = ensureSettings();

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
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
