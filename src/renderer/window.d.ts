import type { AppState, ThemeId } from '../shared/ipc';

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
        read: () => Promise<AppState>;
        setTheme: (theme: ThemeId) => Promise<AppState>;
        addDirectory: () => Promise<AppState>;
        removeDirectory: (directory: string) => Promise<AppState>;
      };
    };
  }
}
