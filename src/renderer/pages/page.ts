import type { AppState } from '../../shared/ipc';

/** Props every routed page receives from the app shell. */
export interface PageProps {
  state: AppState;
  onStateChange: (state: AppState) => void;
}
