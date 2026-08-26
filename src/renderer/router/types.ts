export interface Route {
  path: string;
  mount: (container: HTMLElement) => void | (() => void);
}
