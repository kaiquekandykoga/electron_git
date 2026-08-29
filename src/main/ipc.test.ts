/**
 * src/main/ipc.test.ts
 *
 * @process      Main. Unit tests for the IPC handlers; electron is mocked, so no app or
 *               window is created.
 * @purpose      Assert that every channel narrows its payload, answers with an
 *               IpcResult, and never rejects.
 * @dependencies ./ipc: the subject under test; ../shared/ipc: channel names and shapes;
 *               jest: the electron and settings mocks.
 * @sideEffects  None beyond Jest module mocks.
 * @notes        Persistence is settings.test.ts’ job. Here the settings layer is an
 *               in-memory stand-in whose narrow parameter types are the point: an
 *               unvalidated payload reaching it is recorded.
 */

import { IPC_CHANNELS, AppState, IpcResult, Settings, ThemeId } from '../shared/ipc';

type Handler = (event: unknown, arg?: unknown) => Promise<IpcResult<AppState>>;

const mockHandlers = new Map<string, Handler>();
const mockShowOpenDialog = jest.fn();

jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, handler: Handler) => mockHandlers.set(channel, handler),
  },
  BrowserWindow: { fromWebContents: () => null },
  dialog: { showOpenDialog: mockShowOpenDialog },
}));

// Persistence is covered by settings.test.ts. Here the settings layer is an
// in-memory stand-in whose narrow parameter types are the point: if a handler
// forwards an unvalidated payload, the test records it reaching this far.
let mockSettings: Settings = { theme: 'light', directories: [] };

const mockReadSettings = jest.fn((): Settings => mockSettings);
const mockSetTheme = jest.fn((theme: ThemeId): Settings => ({ ...mockSettings, theme }));
const mockAddDirectory = jest.fn(
  (directory: string): Settings => ({
    ...mockSettings,
    directories: [...mockSettings.directories, directory],
  }),
);
const mockRemoveDirectory = jest.fn(
  (directory: string): Settings => ({
    ...mockSettings,
    directories: mockSettings.directories.filter((entry) => entry !== directory),
  }),
);

jest.mock('./settings', () => ({
  readSettings: () => mockReadSettings(),
  setTheme: (theme: ThemeId) => mockSetTheme(theme),
  addDirectory: (directory: string) => mockAddDirectory(directory),
  removeDirectory: (directory: string) => mockRemoveDirectory(directory),
  toAppState: (settings: Settings): AppState => ({
    theme: settings.theme,
    directories: settings.directories.map((entry) => ({ path: entry, hasGit: false })),
  }),
  serializeMutation: <T,>(mutate: () => T) => Promise.resolve().then(mutate),
}));

import { registerIpcHandlers } from './ipc';

const event = { sender: {} };

const invoke = (channel: string, arg?: unknown): Promise<IpcResult<AppState>> => {
  const handler = mockHandlers.get(channel);
  if (!handler) {
    throw new Error(`No handler registered for ${channel}`);
  }
  return handler(event, arg);
};

const ok = (state: Partial<AppState> = {}): IpcResult<AppState> => ({
  ok: true,
  value: { theme: 'light', directories: [], ...state },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockHandlers.clear();
  mockSettings = { theme: 'light', directories: [] };
  registerIpcHandlers();
});

describe('state:read', () => {
  it('returns the app state', async () => {
    mockSettings = { theme: 'dark', directories: ['/repo'] };

    await expect(invoke(IPC_CHANNELS.STATE_READ)).resolves.toEqual(
      ok({ theme: 'dark', directories: [{ path: '/repo', hasGit: false }] }),
    );
  });

  it('reports a failed read instead of rejecting', async () => {
    mockReadSettings.mockImplementationOnce(() => {
      throw new Error('Could not read settings.yaml');
    });

    await expect(invoke(IPC_CHANNELS.STATE_READ)).resolves.toEqual({
      ok: false,
      error: 'Could not read settings.yaml',
    });
  });
});

describe('theme:set', () => {
  it('accepts a known theme', async () => {
    await expect(invoke(IPC_CHANNELS.THEME_SET, 'dark')).resolves.toEqual(ok({ theme: 'dark' }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it.each([undefined, null, 42, 'neon', { theme: 'dark' }])(
    'rejects %p without touching the settings file',
    async (payload) => {
      const result = await invoke(IPC_CHANNELS.THEME_SET, payload);

      expect(result.ok).toBe(false);
      expect(mockSetTheme).not.toHaveBeenCalled();
    },
  );
});

describe('directory:remove', () => {
  it('removes a directory given a path', async () => {
    mockSettings = { theme: 'light', directories: ['/repo'] };

    await expect(invoke(IPC_CHANNELS.DIRECTORY_REMOVE, '/repo')).resolves.toEqual(ok());
    expect(mockRemoveDirectory).toHaveBeenCalledWith('/repo');
  });

  // A non-string used to reach `path.normalize`, which throws a `TypeError` the
  // renderer never caught: the click did nothing and the UI said nothing.
  it.each([undefined, null, 42, '', '   ', ['/repo'], { path: '/repo' }])(
    'answers with an error result for %p',
    async (payload) => {
      const result = await invoke(IPC_CHANNELS.DIRECTORY_REMOVE, payload);

      expect(result).toEqual({ ok: false, error: expect.stringContaining('directory path') });
      expect(mockRemoveDirectory).not.toHaveBeenCalled();
    },
  );
});

describe('directory:add', () => {
  it('adds the selected directory', async () => {
    mockShowOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: ['/repo'] });

    await expect(invoke(IPC_CHANNELS.DIRECTORY_ADD)).resolves.toEqual(
      ok({ directories: [{ path: '/repo', hasGit: false }] }),
    );
    expect(mockAddDirectory).toHaveBeenCalledWith('/repo');
  });

  it.each([
    ['cancelled', { canceled: true, filePaths: [] }],
    ['empty', { canceled: false, filePaths: [] }],
  ])('writes nothing when the dialog is %s', async (_name, result) => {
    mockShowOpenDialog.mockResolvedValueOnce(result);

    await expect(invoke(IPC_CHANNELS.DIRECTORY_ADD)).resolves.toEqual(ok());
    expect(mockAddDirectory).not.toHaveBeenCalled();
  });

  it('reports a dialog failure instead of rejecting', async () => {
    mockShowOpenDialog.mockRejectedValueOnce(new Error('no display'));

    await expect(invoke(IPC_CHANNELS.DIRECTORY_ADD)).resolves.toEqual({
      ok: false,
      error: 'no display',
    });
  });
});
