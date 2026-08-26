import type { Route } from '../../router/types.js';

export const settingsRoute: Route = {
  path: '/settings',
  mount(container) {
    const heading = document.createElement('h1');
    heading.textContent = 'Settings';

    const description = document.createElement('p');
    description.textContent = 'App preferences will live here.';

    container.append(heading, description);
  },
};
