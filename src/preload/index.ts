import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Sandboxed preload scripts can only `require` a small built-in allowlist
// (plus 'electron') — no arbitrary local modules — so this channel name is
// duplicated from ../shared/ipc.ts (the source of truth for the main process)
// rather than imported.
const NAVIGATE_CHANNEL = 'router:navigate';

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
});
