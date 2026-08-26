export {};

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
