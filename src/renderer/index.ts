import { Router } from './router/router.js';
import { dashboardRoute } from './pages/dashboard/dashboard.js';
import { settingsRoute } from './pages/settings/settings.js';

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
    };
  }
}

const appEl = document.getElementById('app');

if (appEl) {
  const router = new Router(appEl, [dashboardRoute, settingsRoute], '/dashboard');
  router.start();

  window.api.router.onNavigate((route) => {
    router.navigate(`/${route}`);
  });
}
