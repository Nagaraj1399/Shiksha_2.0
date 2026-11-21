import type { AppTab } from '../shared/types';

export type AppRoute = '/' | '/app';

/**
 * Returns `true` when the tab requires teacher authentication.
 */
export function isTeacherTab(tab: AppTab): boolean {
  return tab === 'teacher' || tab === 'progress' || tab === 'alerts';
}

/**
 * Reads the current browser pathname and maps `/app*` to `'/app'`, everything
 * else to the public landing route `'/'`.
 */
export function getCurrentRoute(): AppRoute {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname.startsWith('/app') ? '/app' : '/';
}

/**
 * Parses an optional `?tab=` query parameter from `window.location.search`.
 */
export function getTabFromSearch(): AppTab | null {
  if (typeof window === 'undefined') return null;
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (
    tab === 'tutor' ||
    tab === 'path' ||
    tab === 'teacher' ||
    tab === 'progress' ||
    tab === 'alerts'
  ) {
    return tab;
  }
  return null;
}

/**
 * Pushes `/app` (with optional `?tab=`) into browser history and scrolls to top.
 */
export function pushAppRoute(initialTab: AppTab = 'tutor'): void {
  const nextPath =
    initialTab !== 'tutor' ? `/app?tab=${encodeURIComponent(initialTab)}` : '/app';
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', nextPath);
    window.scrollTo?.({ top: 0 });
  }
}

/**
 * Pushes `/` (public landing page) into browser history and scrolls to top.
 */
export function pushHomeRoute(): void {
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', '/');
    window.scrollTo?.({ top: 0 });
  }
}
