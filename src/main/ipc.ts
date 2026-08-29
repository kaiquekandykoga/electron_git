/**
 * src/main/ipc.ts
 *
 * @process      Main. The receiving end of every channel the preload bridge exposes.
 * @purpose      Register the ipcMain handlers, narrow the untrusted payloads they
 *               receive, and answer with the resulting AppState.
 * @exports      registerIpcHandlers.
 * @dependencies electron: ipcMain registration and the directory picker; ./settings:
 *               reads and serialised mutations; ../shared/ipc: channel names and the
 *               result shape.
 * @sideEffects  Registers handlers on ipcMain; opens the native open-directory dialog;
 *               writes settings through ./settings.
 * @notes        Handlers never reject — a thrown error comes back as `{ ok: false }`,
 *               because a rejected invoke would surface in the renderer as an unhandled
 *               rejection the user never sees.
 */

import { BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from 'electron';
import { AppState, IPC_CHANNELS, IpcResult, THEMES, ThemeId } from '../shared/ipc';
import {
  addDirectory,
  readSettings,
  removeDirectory,
  serializeMutation,
  setTheme,
  toAppState,
} from './settings';

/** Raised by a handler when the renderer sent something the channel forbids. */
class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Registers a handler that always resolves. Anything thrown inside — a bad
 * payload, an unreadable settings file — comes back as `{ ok: false }` instead
 * of rejecting the renderer's `invoke`, which would surface as an unhandled
 * promise rejection and show the user nothing.
 */
function handle<T>(
  channel: string,
  handler: (event: IpcMainInvokeEvent, arg: unknown) => T | Promise<T>,
): void {
  ipcMain.handle(channel, async (event, arg: unknown): Promise<IpcResult<T>> => {
    try {
      return { ok: true, value: await handler(event, arg) };
    } catch (error) {
      return { ok: false, error: describeError(error) };
    }
  });
}

/** Every payload crossing the bridge is `unknown` until it is narrowed here. */
function asTheme(value: unknown): ThemeId {
  if (!THEMES.includes(value as ThemeId)) {
    throw new InvalidArgumentError(`Unknown theme: ${JSON.stringify(value)}`);
  }
  return value as ThemeId;
}

function asDirectory(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidArgumentError(`Expected a directory path, received ${typeof value}`);
  }
  return value;
}

export function registerIpcHandlers(): void {
  handle(IPC_CHANNELS.STATE_READ, (): AppState => toAppState(readSettings()));

  handle(IPC_CHANNELS.THEME_SET, (_event, theme): Promise<AppState> => {
    const next = asTheme(theme);
    return serializeMutation(() => toAppState(setTheme(next)));
  });

  handle(IPC_CHANNELS.DIRECTORY_ADD, async (event): Promise<AppState> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: Electron.OpenDialogOptions = {
      title: 'Add directory',
      properties: ['openDirectory', 'createDirectory'],
    };

    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);

    const [selected] = result.filePaths;
    if (result.canceled || typeof selected !== 'string') {
      return serializeMutation(() => toAppState(readSettings()));
    }

    return serializeMutation(() => toAppState(addDirectory(selected)));
  });

  handle(IPC_CHANNELS.DIRECTORY_REMOVE, (_event, directory): Promise<AppState> => {
    const target = asDirectory(directory);
    return serializeMutation(() => toAppState(removeDirectory(target)));
  });
}
