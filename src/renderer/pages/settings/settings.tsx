import type { PageProps } from '../page.js';
import { THEMES, ThemeId } from '../../../shared/ipc.js';

const THEME_LABELS: Record<ThemeId, string> = {
  light: 'Light',
  dark: 'Dark',
};

export function Settings({ state, onStateChange }: PageProps) {
  const selectTheme = async (theme: ThemeId) => {
    onStateChange(await window.api.state.setTheme(theme));
  };

  return (
    <main className="page">
      <h1>Settings</h1>

      <section className="panel">
        <header className="panel-header">
          <h2>Theme</h2>
        </header>
        <div className="theme-options">
          {THEMES.map((theme) => (
            <label key={theme} className="theme-option">
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={state.theme === theme}
                onChange={() => selectTheme(theme)}
              />
              <span>{THEME_LABELS[theme]}</span>
            </label>
          ))}
        </div>
      </section>
    </main>
  );
}
