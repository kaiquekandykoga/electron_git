/**
 * src/renderer/window.d.ts
 *
 * @process      Renderer. Ambient declarations only; nothing is emitted.
 * @purpose      Declare the shape of `window.api` so renderer code type-checks against
 *               the preload bridge.
 * @exports      Global augmentation of `Window` with `api`.
 * @dependencies ../shared/ipc: AppState, IpcResult and ThemeId (type-only).
 * @sideEffects  None.
 * @notes        A hand-maintained mirror of src/preload/index.ts. The compiler cannot
 *               check the two against each other, so change both together.
 */

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
