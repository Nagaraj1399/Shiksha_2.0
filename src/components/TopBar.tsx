import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Compass,
  MessageSquareHeart,
  Moon,
  Sun,
} from 'lucide-react';
import type { AppTab, TextSizeScale } from '../../shared/types';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onGoHome?: () => void;
  activeAlertCount: number | null;
  isDark: boolean;
  onToggleTheme: () => void;
  textSize: TextSizeScale;
  onChangeTextSize: (size: TextSizeScale) => void;
}

const TEXT_SIZE_OPTIONS: {
  id: TextSizeScale;
  label: string;
  ariaLabel: string;
}[] = [
  { id: 'base', label: 'A', ariaLabel: 'Default text size' },
  { id: 'lg', label: 'A+', ariaLabel: 'Large text size' },
  { id: 'xl', label: 'A++', ariaLabel: 'Extra large text size' },
];

/**
 * Sticky application header and mobile bottom navigation bar with primary
 * route tabs (`aria-current="page"`), text-size controls (`A` / `A+` / `A++`),
 * and Light/Night theme toggle.
 */
export function TopBar({
  activeTab,
  onSelectTab,
  onGoHome,
  activeAlertCount,
  isDark,
  onToggleTheme,
  textSize,
  onChangeTextSize,
}: TopBarProps) {
  const showCount = typeof activeAlertCount === 'number' && activeAlertCount > 0;
  const navItems: { id: AppTab; label: string; mobileLabel: string }[] = [
    { id: 'tutor', label: 'Student Tutor', mobileLabel: 'Tutor' },
    { id: 'path', label: 'My Path', mobileLabel: 'My Path' },
    { id: 'teacher', label: 'Teacher Aide', mobileLabel: 'Aide' },
    { id: 'progress', label: 'Student Progress', mobileLabel: 'Progress' },
    {
      id: 'alerts',
      label: showCount ? `Dropout Alerts (${activeAlertCount})` : 'Dropout Alerts',
      mobileLabel: showCount ? `Alerts (${activeAlertCount})` : 'Alerts',
    },
  ];

  const getIcon = (id: AppTab) => {
    switch (id) {
      case 'tutor':
        return <MessageSquareHeart className="w-5 h-5" aria-hidden="true" />;
      case 'path':
        return <Compass className="w-5 h-5" aria-hidden="true" />;
      case 'teacher':
        return <BookOpenCheck className="w-5 h-5" aria-hidden="true" />;
      case 'progress':
        return <BarChart3 className="w-5 h-5" aria-hidden="true" />;
      case 'alerts':
        return <AlertTriangle className="w-5 h-5" aria-hidden="true" />;
    }
  };

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-[#E2E7F0] dark:border-[#282B33] bg-[#F8F9FC]/95 dark:bg-[#111318]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 min-h-14 md:min-h-16 py-1.5 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => (onGoHome ? onGoHome() : onSelectTab('tutor'))}
            aria-label={
              onGoHome ? 'Shiksha-Agent — Return to home page' : 'Shiksha-Agent'
            }
            className="min-h-[44px] px-1 inline-flex items-center font-display text-lg sm:text-xl font-bold tracking-tight text-[#1A1C1E] dark:text-[#E2E2E9] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA] rounded-lg"
          >
            Shiksha-Agent
          </button>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex flex-wrap items-center gap-4 lg:gap-5"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`min-h-[44px] px-1 inline-flex items-center text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA] ${
                    active
                      ? 'border-[#0B57D0] text-[#0B57D0] dark:border-[#A8C7FA] dark:text-[#A8C7FA]'
                      : 'border-transparent text-[#44474F] hover:text-[#1A1C1E] dark:text-[#C4C6D0] dark:hover:text-[#E2E2E9]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label="Text size"
              className="inline-flex items-center rounded-full bg-[#EAEFF7] dark:bg-[#282B33] p-0.5 border border-[#D4DBE8] dark:border-[#3A3E4A]"
            >
              {TEXT_SIZE_OPTIONS.map((option) => {
                const active = textSize === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onChangeTextSize(option.id)}
                    aria-pressed={active}
                    aria-label={option.ariaLabel}
                    className={`min-w-[44px] min-h-[44px] px-2 rounded-full text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA] ${
                      active
                        ? 'bg-[#0B57D0] text-white dark:bg-[#A8C7FA] dark:text-[#062E6F]'
                        : 'text-[#041E49] hover:bg-[#DCE4F2] dark:text-[#E2E2E9] dark:hover:bg-[#333742]'
                    }`}
                  >
                    <span aria-hidden="true">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Night Theme'}
              className="inline-flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-3 sm:px-4 rounded-full text-xs sm:text-sm font-medium bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Night Theme</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Mobile navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 min-h-16 bg-[#F2F4F8]/95 dark:bg-[#191C22]/95 backdrop-blur-md border-t border-[#E2E7F0] dark:border-[#282B33] grid grid-cols-5 items-center px-1 py-1"
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center justify-center min-h-[48px] min-w-[44px] gap-0.5 focus-visible:outline-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA] rounded-xl px-1"
            >
              <span
                className={`px-2.5 py-1 rounded-full transition-colors duration-150 ${
                  active
                    ? 'bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#C2E7FF]'
                    : 'text-[#44474F] dark:text-[#C4C6D0]'
                }`}
              >
                {getIcon(item.id)}
              </span>
              <span
                className={`text-xs font-medium truncate max-w-full ${
                  active
                    ? 'text-[#001D35] dark:text-[#C2E7FF]'
                    : 'text-[#44474F] dark:text-[#C4C6D0]'
                }`}
              >
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
