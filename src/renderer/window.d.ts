import type { AppState, IpcResult, ThemeId } from '../shared/ipc';

export {};

declare global {
  interface Window {
    api: {
      versions: {
        node: () => string;
        chrome: () => string;
        electron: () => string;
      };
      router: {
        onNavigate: (callback: (route: string) => void) => () => void;
      };
      state: {
        read: () => Promise<IpcResult<AppState>>;
        setTheme: (theme: ThemeId) => Promise<IpcResult<AppState>>;
        addDirectory: () => Promise<IpcResult<AppState>>;
        removeDirectory: (directory: string) => Promise<IpcResult<AppState>>;
      };
    };
  }
}
