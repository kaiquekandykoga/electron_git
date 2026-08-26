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
    window.api.state.read().then(setState);
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
