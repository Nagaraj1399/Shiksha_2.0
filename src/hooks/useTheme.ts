import { useCallback, useEffect, useState } from 'react';
import { TEXT_SIZE_STORAGE_KEY, THEME_STORAGE_KEY } from '../../shared/config';
import type { TextSizeScale } from '../../shared/types';

/**
 * Persists and synchronizes Light/Night theme (`dark` class on `<html>`) and
 * low-vision text-size scaling (`data-text-size` attribute on `<html>`).
 */
export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  });

  const [textSize, setTextSize] = useState<TextSizeScale>(() => {
    if (typeof window === 'undefined') return 'base';
    const stored = window.localStorage.getItem(TEXT_SIZE_STORAGE_KEY);
    return stored === 'lg' || stored === 'xl' ? stored : 'base';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDark]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
    window.localStorage.setItem(TEXT_SIZE_STORAGE_KEY, textSize);
  }, [textSize]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return {
    isDark,
    toggleTheme,
    textSize,
    setTextSize,
  };
}
