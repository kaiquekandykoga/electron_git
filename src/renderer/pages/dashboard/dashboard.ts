import type { Route } from '../../router/types.js';

export const dashboardRoute: Route = {
  path: '/dashboard',
  mount(container) {
    const heading = document.createElement('h1');
    heading.textContent = 'Electron git';

    const versions = document.createElement('div');
    versions.id = 'versions';
    const { node, chrome, electron } = window.api.versions;
    versions.textContent = `Node ${node()} · Chrome ${chrome()} · Electron ${electron()}`;

    container.append(heading, versions);
  },
};
