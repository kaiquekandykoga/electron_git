import { BrowserWindow, dialog, ipcMain } from 'electron';
import { AppState, IPC_CHANNELS, THEMES, ThemeId } from '../shared/ipc';
import {
  addDirectory,
  readSettings,
  removeDirectory,
  setTheme,
  toAppState,
} from './settings';

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.STATE_READ, (): AppState => toAppState(readSettings()));

  ipcMain.handle(IPC_CHANNELS.THEME_SET, (_event, theme: ThemeId): AppState => {
    if (!THEMES.includes(theme)) {
      return toAppState(readSettings());
    }
    return toAppState(setTheme(theme));
  });

  ipcMain.handle(IPC_CHANNELS.DIRECTORY_ADD, async (event): Promise<AppState> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Add directory',
      properties: ['openDirectory', 'createDirectory'],
    };

    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return toAppState(readSettings());
    }

    return toAppState(addDirectory(result.filePaths[0]));
  });

  ipcMain.handle(
    IPC_CHANNELS.DIRECTORY_REMOVE,
    (_event, directory: string): AppState => toAppState(removeDirectory(directory)),
  );
}
