import { BookOpen } from 'lucide-react';
import type { AppTab } from '../../../shared/types';
import { LANDING_NAV_LINKS, type NavSectionId } from './types';

export interface FooterProps {
  onSelectNav: (id: NavSectionId) => void;
  onOpenApp: (initialTab?: AppTab) => void;
}

/**
 * Dark-teal landing page footer with section links and quick app launcher.
 */
export function Footer({ onSelectNav, onOpenApp }: FooterProps) {
  return (
    <footer
      id="contact"
      className="bg-[#103336] dark:bg-[#0A2224] text-white border-t border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-2 max-w-md">
            <div className="inline-flex items-center gap-2.5 text-lg font-semibold">
              <span className="w-8 h-8 rounded-full bg-white/12 border border-white/20 inline-flex items-center justify-center">
                <BookOpen
                  className="w-4 h-4 text-[#D4F36B]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
              <span>Shiksha</span>
            </div>
            <p className="text-sm text-white/75 leading-relaxed">
              Bilingual Socratic student tutor and teacher aide built for Indian
              state-board classrooms.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-6 gap-y-2"
          >
            {LANDING_NAV_LINKS.slice(0, 4).map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => onSelectNav(item.id)}
                className="min-h-[44px] inline-flex items-center text-sm text-white/80 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              onClick={() => onOpenApp('tutor')}
              className="min-h-[44px] inline-flex items-center text-sm font-semibold text-[#D4F36B] hover:underline"
            >
              Open App
            </button>
          </nav>
        </div>

        <div className="mt-8 pt-6 border-t border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/70">
          <p>
            Built for Hindi, Tamil, Marathi, Gujarati, and English state-board
            classrooms.
          </p>
          <p>
            For school pilots and educator onboarding, open Teacher Aide in the app.
          </p>
        </div>
      </div>
    </footer>
  );
}
