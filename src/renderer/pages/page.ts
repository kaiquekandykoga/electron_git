/**
 * src/renderer/pages/page.ts
 *
 * @process      Renderer. The contract between the app shell and every routed page.
 * @purpose      Define the props a page receives: the current state, and the callback
 *               that lifts a new one back to the shell.
 * @exports      PageProps.
 * @dependencies ../../shared/ipc: AppState (type-only).
 * @sideEffects  None.
 * @notes        Pages never own the state. Every mutation resolves to a full AppState,
 *               which is handed upwards rather than merged locally.
 */

import type { AppState } from '../../shared/ipc';

/** Props every routed page receives from the app shell. */
export interface PageProps {
  state: AppState;
  onStateChange: (state: AppState) => void;
}
