import { useEffect } from 'react';
import type { JSX } from 'react';
import { createRoot } from 'react-dom/client';
import { Dashboard } from './pages/dashboard/dashboard.js';
import { Settings } from './pages/settings/settings.js';
import { useHashRoute } from './router/useHashRoute.js';

const DEFAULT_PATH = '/dashboard';

const routes: Record<string, () => JSX.Element> = {
  '/dashboard': Dashboard,
  '/settings': Settings,
};

function App() {
  const path = useHashRoute(DEFAULT_PATH);

  useEffect(
    () =>
      window.api.router.onNavigate((route) => {
        window.location.hash = `/${route}`;
      }),
    [],
  );

  const Page = routes[path] ?? routes[DEFAULT_PATH];
  return <Page />;
}

const appEl = document.getElementById('app');

if (appEl) {
  createRoot(appEl).render(<App />);
}
