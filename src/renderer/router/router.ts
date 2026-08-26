import type { Route } from './types.js';

/**
 * Minimal hash-based SPA router. Isolated from page content: it only knows
 * how to map a path to a mount function and swap the container's content.
 */
export class Router {
  private readonly container: HTMLElement;
  private readonly routes: Map<string, Route>;
  private readonly defaultPath: string;
  private unmountCurrent: (() => void) | undefined;

  constructor(container: HTMLElement, routes: Route[], defaultPath: string) {
    this.container = container;
    this.routes = new Map(routes.map((route) => [route.path, route]));
    this.defaultPath = defaultPath;

    window.addEventListener('hashchange', () => this.render());
  }

  start(): void {
    if (window.location.hash) {
      this.render();
    } else {
      this.navigate(this.defaultPath);
    }
  }

  navigate(path: string): void {
    window.location.hash = path;
  }

  private render(): void {
    const path = window.location.hash.replace(/^#/, '') || this.defaultPath;
    const route = this.routes.get(path) ?? this.routes.get(this.defaultPath);

    this.unmountCurrent?.();
    this.container.replaceChildren();
    this.unmountCurrent = route ? (route.mount(this.container) ?? undefined) : undefined;
  }
}
