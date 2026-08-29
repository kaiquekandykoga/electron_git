/**
 * src/renderer/router/useHashRoute.ts
 *
 * @process      Renderer. The routing primitive the app shell reads.
 * @purpose      Track the current hash path and keep the URL in step with it.
 * @exports      useHashRoute.
 * @dependencies react: useState and useEffect.
 * @sideEffects  Writes window.location.hash when it is empty; adds and removes a
 *               hashchange listener.
 * @notes        Hash routing rather than history routing: the window loads the bundle
 *               from a file:// URL, where path-based routing has nothing to resolve
 *               against.
 */

import { useEffect, useState } from 'react';

function readHash(defaultPath: string): string {
  return window.location.hash.replace(/^#/, '') || defaultPath;
}

/**
 * Minimal hash-based route reader. Falls back to `defaultPath` when there is
 * no hash yet, and writes it back so the URL reflects the active route.
 */
export function useHashRoute(defaultPath: string): string {
  const [path, setPath] = useState(() => readHash(defaultPath));

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = defaultPath;
    }

    const onHashChange = () => setPath(readHash(defaultPath));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [defaultPath]);

  return path;
}
