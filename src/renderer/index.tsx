/**
 * src/renderer/index.tsx
 *
 * @process      Renderer. App shell and bundle entry point — esbuild bundles this file.
 * @purpose      Mount React, hold the AppState fetched over IPC, and render whichever
 *               page the hash route selects.
 * @dependencies react-dom/client: mounts the tree; ./router/useHashRoute: the active
 *               path; ./pages/*: the routed pages; window.api: state reads and
 *               navigation events.
 * @sideEffects  Renders into #app; sets document.documentElement.dataset.theme; writes
 *               window.location.hash when the menu navigates.
 * @notes        The theme lives on <html> so the stylesheet can drive every colour from
 *               one attribute selector. A failed state read is logged, not shown
 *               (docs/TODO.md 1.4).
 */

import { useCallback, useEffect, useState } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import type { AppState } from '../shared/ipc.js';
import { Dashboard } from './pages/dashboard/dashboard.js';
import type { PageProps } from './pages/page.js';
import { Settings } from './pages/settings/settings.js';
import { useHashRoute } from './router/useHashRoute.js';

const DEFAULT_PATH = '/dashboard';

const routes: Record<string, (props: PageProps) => JSX.Element> = {
  '/dashboard': Dashboard,
  '/settings': Settings,
};

function App() {
  const path = useHashRoute(DEFAULT_PATH);
  const [state, setState] = useState<AppState | null>(null);

  useEffect(
    () =>
      window.api.router.onNavigate((route) => {
        window.location.hash = `/${route}`;
      }),
    [],
  );

  useEffect(() => {
    // Failures are logged rather than shown: the main process no longer rejects
    // the invoke, so this can never become an unhandled rejection. Surfacing the
    // error to the user is still outstanding (docs/TODO.md 1.4).
    window.api.state.read().then(
      (result) => (result.ok ? setState(result.value) : console.error(result.error)),
      (error) => console.error(error),
    );
  }, []);

  // The theme lives on <html> so the stylesheet can drive every colour from a
  // single attribute selector.
  useEffect(() => {
    if (state) {
      document.documentElement.dataset.theme = state.theme;
    }
  }, [state]);

  const onStateChange = useCallback((next: AppState) => setState(next), []);

  if (!state) {
    return <p className="loading">Loading…</p>;
  }

  const Page = routes[path] ?? routes[DEFAULT_PATH];
  return <Page state={state} onStateChange={onStateChange} />;
}

const appEl = document.getElementById('app');

if (appEl) {
  createRoot(appEl).render(<App />);
}
