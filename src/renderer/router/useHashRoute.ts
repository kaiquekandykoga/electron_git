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
