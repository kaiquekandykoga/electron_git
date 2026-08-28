import { useState } from 'react';
import type { AppState, IpcResult } from '../../../shared/ipc.js';
import type { PageProps } from '../page.js';

export function Dashboard({ state, onStateChange }: PageProps) {
  const { node, chrome, electron } = window.api.versions;
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<IpcResult<AppState>>) => {
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        onStateChange(result.value);
      } else {
        console.error(result.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <h1>Electron git</h1>
      <div id="versions">
        Node {node()} · Chrome {chrome()} · Electron {electron()}
      </div>

      <section className="panel">
        <header className="panel-header">
          <h2>Directories</h2>
          <button type="button" disabled={busy} onClick={() => run(window.api.state.addDirectory)}>
            Add directory
          </button>
        </header>

        {state.directories.length === 0 ? (
          <p className="empty">No directories yet. Add one to start tracking it.</p>
        ) : (
          <ul className="directory-list">
            {state.directories.map((directory) => (
              <li key={directory.path} className="directory">
                <div className="directory-info">
                  <span className="directory-path">{directory.path}</span>
                  <span className={directory.hasGit ? 'badge badge-git' : 'badge badge-no-git'}>
                    {directory.hasGit ? '.git present' : 'no .git'}
                  </span>
                </div>
                <button
                  type="button"
                  className="remove"
                  disabled={busy}
                  onClick={() => run(() => window.api.state.removeDirectory(directory.path))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
