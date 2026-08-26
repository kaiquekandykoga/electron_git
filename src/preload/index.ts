import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Sandboxed preload scripts can only `require` a small built-in allowlist
// (plus 'electron') — no arbitrary local modules — so these channel names are
// duplicated from ../shared/ipc.ts (the source of truth for the main process)
// rather than imported.
const NAVIGATE_CHANNEL = 'router:navigate';
const STATE_READ_CHANNEL = 'state:read';
const THEME_SET_CHANNEL = 'theme:set';
const DIRECTORY_ADD_CHANNEL = 'directory:add';
const DIRECTORY_REMOVE_CHANNEL = 'directory:remove';

contextBridge.exposeInMainWorld('api', {
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },
  router: {
    onNavigate: (callback: (route: string) => void) => {
      const listener = (_event: IpcRendererEvent, route: string) => callback(route);
      ipcRenderer.on(NAVIGATE_CHANNEL, listener);
      return () => {
        ipcRenderer.removeListener(NAVIGATE_CHANNEL, listener);
      };
    },
  },
  // Every mutation resolves to the full app state so the renderer never has to
  // guess what the main process wrote.
  state: {
    read: () => ipcRenderer.invoke(STATE_READ_CHANNEL),
    setTheme: (theme: string) => ipcRenderer.invoke(THEME_SET_CHANNEL, theme),
    addDirectory: () => ipcRenderer.invoke(DIRECTORY_ADD_CHANNEL),
    removeDirectory: (directory: string) =>
      ipcRenderer.invoke(DIRECTORY_REMOVE_CHANNEL, directory),
  },
});
