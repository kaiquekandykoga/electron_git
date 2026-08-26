export {};

declare global {
  interface Window {
    api: {
      versions: {
        node: () => string;
        chrome: () => string;
        electron: () => string;
      };
    };
  }
}

const versionsEl = document.getElementById('versions');
if (versionsEl) {
  const { node, chrome, electron } = window.api.versions;
  versionsEl.textContent = `Node ${node()} · Chrome ${chrome()} · Electron ${electron()}`;
}
