import { useEffect, useState } from 'react';
import type { AppTab, PublicLandingState } from '../../shared/types';
import { FeatureStrip } from './landing/FeatureStrip';
import { Footer } from './landing/Footer';
import { Hero } from './landing/Hero';
import { HowItWorks } from './landing/HowItWorks';
import { TeacherSection } from './landing/TeacherSection';
import type { NavSectionId } from './landing/types';

interface LandingPageProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenApp: (initialTab?: AppTab) => void;
}

/**
 * Public Shiksha-Agent landing page at `/` with live aggregate counters from
 * `GET /api/state`, bilingual Socratic overview, feature strip, how-it-works
 * walkthrough, teacher preview, and responsive Light/Night teal theming.
 */
export function LandingPage({ isDark, onToggleTheme, onOpenApp }: LandingPageProps) {
  const [activeNav, setActiveNav] = useState<NavSectionId>('home');
  const [liveState, setLiveState] = useState<PublicLandingState | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Partial<PublicLandingState> | null) => {
        if (!active || !data) return;
        if (
          typeof data.studentsTracked === 'number' &&
          typeof data.topicsMastered === 'number' &&
          typeof data.teacherAlerts === 'number'
        ) {
          setLiveState({
            studentsTracked: data.studentsTracked,
            topicsMastered: data.topicsMastered,
            teacherAlerts: data.teacherAlerts,
          });
        }
      })
      .catch(() => {
        // Keep loading placeholder if server is unreachable; never invent counts.
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      id="home"
      className="min-h-screen flex flex-col bg-[#F5F9F9] dark:bg-[#0B1718] text-[#111819] dark:text-[#ECF4F4] transition-colors duration-200"
    >
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-full focus:bg-[#D4F36B] focus:text-[#111819] focus:font-semibold"
      >
        Skip to main content
      </a>

      <Hero
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onOpenApp={onOpenApp}
        liveState={liveState}
      />

      <main id="landing-main" tabIndex={-1} className="flex-1 outline-none">
        <FeatureStrip />
        <HowItWorks onOpenApp={onOpenApp} />
        <TeacherSection onOpenApp={onOpenApp} />
      </main>

      <Footer onSelectNav={setActiveNav} onOpenApp={onOpenApp} />
    </div>
  );
}

export default LandingPage;
