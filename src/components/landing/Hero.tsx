import { useState } from 'react';
import { ArrowUpRight, BookOpen, Moon, Sun } from 'lucide-react';
import type { AppTab, PublicLandingState } from '../../../shared/types';
import { StatChips } from './StatChips';
import { LANDING_NAV_LINKS, type NavSectionId } from './types';

function HeroBlobFallback() {
  return (
    <div
      role="img"
      aria-label="Illustration representing an Indian student learning with notebooks"
      className="relative w-full aspect-[3/4] max-w-[380px] mx-auto flex items-center justify-center rounded-[28px] overflow-hidden bg-white/10 border border-white/20 backdrop-blur-md"
    >
      <svg
        viewBox="0 0 360 440"
        className="w-full h-full"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id="shikshaBlobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E5F63" />
            <stop offset="55%" stopColor="#4A9A9E" />
            <stop offset="100%" stopColor="#D4F36B" />
          </linearGradient>
        </defs>
        <path
          d="M68,94 C124,28 242,32 292,102 C342,172 330,298 264,358 C198,418 86,406 46,326 C6,246 12,160 68,94 Z"
          fill="url(#shikshaBlobGrad)"
          opacity="0.9"
        />
        <rect
          x="108"
          y="148"
          width="144"
          height="168"
          rx="18"
          fill="#FFFFFF"
          fillOpacity="0.18"
          stroke="#FFFFFF"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        <line
          x1="134"
          y1="194"
          x2="226"
          y2="194"
          stroke="#D4F36B"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <line
          x1="134"
          y1="224"
          x2="210"
          y2="224"
          stroke="#FFFFFF"
          strokeOpacity="0.75"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <line
          x1="134"
          y1="250"
          x2="196"
          y2="250"
          stroke="#FFFFFF"
          strokeOpacity="0.6"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export interface HeroProps {
  activeNav: NavSectionId;
  onSelectNav: (id: NavSectionId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenApp: (initialTab?: AppTab) => void;
  liveState: PublicLandingState | null;
}

/**
 * Deep-teal landing hero combining the transparent navigation bar, primary
 * Socratic value proposition, language badges, student portrait, and
 * responsive high-contrast stat chips.
 */
export function Hero({
  activeNav,
  onSelectNav,
  isDark,
  onToggleTheme,
  onOpenApp,
  liveState,
}: HeroProps) {
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  return (
    <div className="relative overflow-hidden landing-hero-bg text-white pb-24 sm:pb-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 landing-hero-grid"
      />

      <header className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
        <div className="flex items-center justify-between gap-4 sm:gap-8 min-h-14">
          <a
            href="#home"
            onClick={() => onSelectNav('home')}
            className="min-h-[44px] inline-flex items-center gap-2.5 text-white font-semibold text-xl tracking-tight whitespace-nowrap shrink-0 rounded-full px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4F36B]"
          >
            <span className="w-8 h-8 rounded-full bg-white/15 border border-white/25 inline-flex items-center justify-center shrink-0">
              <BookOpen
                className="w-4 h-4 text-[#D4F36B]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <span>Shiksha</span>
          </a>

          <nav
            aria-label="Landing page navigation"
            className="hidden lg:flex items-center gap-7"
          >
            {LANDING_NAV_LINKS.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => onSelectNav(item.id)}
                  aria-current={isActive ? 'location' : undefined}
                  className={`relative min-h-[44px] inline-flex items-center text-[15px] font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4F36B] rounded-sm ${
                    isActive ? 'text-white' : 'text-white/75 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-[2.5px] rounded-full bg-[#D4F36B]"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Night Theme'}
              className="min-w-[44px] min-h-[44px] rounded-full bg-white/12 hover:bg-white/20 border border-white/20 inline-flex items-center justify-center text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4F36B]"
            >
              {isDark ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenApp('tutor')}
              className="min-h-[44px] pl-2 pr-5 py-1.5 rounded-full bg-[#1C1C1C] hover:bg-[#111111] text-white text-sm font-medium inline-flex items-center gap-2.5 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4F36B]"
            >
              <span className="w-7 h-7 rounded-full bg-[#D4F36B] text-[#111819] inline-flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </span>
              <span>Open App</span>
            </button>
          </div>
        </div>

        <nav
          aria-label="Mobile section navigation"
          className="lg:hidden mt-3 flex items-center gap-4 overflow-x-auto pb-1"
        >
          {LANDING_NAV_LINKS.map((item) => {
            const isActive = activeNav === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() => onSelectNav(item.id)}
                className={`relative min-h-[44px] inline-flex items-center text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-white/75 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-1.5 left-0 right-0 h-[2px] rounded-full bg-[#D4F36B]"
                  />
                )}
              </a>
            );
          })}
        </nav>
      </header>

      <section
        aria-label="Introduction"
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-10 lg:pb-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="md:col-span-7 space-y-6">
            <p className="text-[15px] font-medium text-white/85 tracking-normal landing-fade-up">
              Your AI learning partner for state-board classrooms
            </p>

            <h1 className="font-sans font-light text-[40px] sm:text-[56px] lg:text-[68px] leading-[1.1] tracking-[-0.025em] text-white text-balance landing-fade-up">
              Learn, Think, and Grow with a Tutor that{' '}
              <span className="text-[#D4F36B] font-normal">Asks</span>, Not Tells
            </h1>

            <p className="text-[15px] leading-relaxed text-white/85 max-w-xl landing-fade-up-delayed">
              Bilingual Socratic tutoring in Hindi, Tamil, Marathi, and English—guiding
              every student step by step while keeping teachers informed.
            </p>

            <div className="flex flex-wrap items-center gap-3.5 pt-1 landing-fade-up-delayed">
              <button
                type="button"
                onClick={() => onOpenApp('tutor')}
                className="min-h-[48px] px-7 py-3 rounded-full bg-[#D4F36B] hover:bg-[#C6E853] text-[#111819] text-[15px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span>Start Learning</span>
                <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onOpenApp('teacher')}
                className="min-h-[48px] px-7 py-3 rounded-full border border-white/45 hover:bg-white/12 text-white text-[15px] font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4F36B]"
              >
                <span>I&apos;m a Teacher</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3.5 pt-2 landing-fade-up-delayed">
              <div
                role="group"
                aria-label="Supported Indian languages"
                className="flex items-center -space-x-2"
              >
                <span
                  lang="hi"
                  className="w-9 h-9 rounded-full bg-[#1C1C1C] text-[#D4F36B] border-2 border-[#36888D] dark:border-[#154448] inline-flex items-center justify-center text-sm font-semibold"
                >
                  हि
                </span>
                <span
                  lang="ta"
                  className="w-9 h-9 rounded-full bg-[#D4F36B] text-[#111819] border-2 border-[#36888D] dark:border-[#154448] inline-flex items-center justify-center text-sm font-semibold"
                >
                  த
                </span>
                <span
                  lang="mr"
                  className="w-9 h-9 rounded-full bg-white text-[#111819] border-2 border-[#36888D] dark:border-[#154448] inline-flex items-center justify-center text-sm font-semibold"
                >
                  म
                </span>
              </div>
              <p className="text-[14px] text-white/85">
                Replies in your language · Never gives away the answer
              </p>
            </div>
          </div>

          <div className="md:col-span-5 relative">
            <div className="relative mx-auto max-w-[380px]">
              {heroImageFailed ? (
                <HeroBlobFallback />
              ) : (
                <div className="relative rounded-[28px] overflow-hidden border border-white/20 bg-white/8 backdrop-blur-xs">
                  <img
                    src="/hero-student.png"
                    alt="Smiling Indian school student holding notebooks"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImageFailed(true)}
                    className="w-full aspect-[3/4] object-cover object-top block"
                  />
                </div>
              )}

              <StatChips liveState={liveState} layout="overlay" />
            </div>

            <StatChips liveState={liveState} layout="row" />
          </div>
        </div>
      </section>
    </div>
  );
}
