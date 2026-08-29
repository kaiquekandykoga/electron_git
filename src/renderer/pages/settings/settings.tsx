import type { PageProps } from '../page.js';
import { THEMES, ThemeId } from '../../../shared/ipc.js';

const THEME_LABELS: Record<ThemeId, string> = {
  light: 'Light',
  dark: 'Dark',
};

export function Settings({ state, onStateChange }: PageProps) {
  const selectTheme = async (theme: ThemeId) => {
    try {
      const result = await window.api.state.setTheme(theme);
      if (result.ok) {
        onStateChange(result.value);
      } else {
        console.error(result.error);
      }
    } catch (error) {
      console.error(error);
    }
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
