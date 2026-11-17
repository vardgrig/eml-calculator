import { useEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark';
const THEME_KEY = 'eml-lab.theme';

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );
  const temporaryChoice = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#141c17' : '#f5f4ee');
  }, [theme]);

  useEffect(() => {
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      if (!savedTheme() && !temporaryChoice.current) setTheme(system.matches ? 'dark' : 'light');
    };
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) {
        temporaryChoice.current = false;
        setTheme(savedTheme() ?? (system.matches ? 'dark' : 'light'));
      }
    };
    system.addEventListener('change', followSystem);
    window.addEventListener('storage', sync);
    return () => {
      system.removeEventListener('change', followSystem);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    temporaryChoice.current = true;
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* The theme still works when storage is blocked. */
    }
  };

  return { theme, toggleTheme };
}
