import { Award, BellRing, Users } from 'lucide-react';
import type { PublicLandingState } from '../../../shared/types';

export interface StatChipsProps {
  liveState: PublicLandingState | null;
  /**
   * `'overlay'` renders floating chips strictly inside the portrait container
   * at `>= 1100px`. `'row'` renders a 3-column horizontal row beneath the
   * portrait below `1100px` (preventing overflow and photo overlap at 800–1100px).
   */
  layout: 'overlay' | 'row';
}

/**
 * Live aggregate stat chips for the landing hero (`Students tracked`,
 * `Topics mastered`, `Teacher alerts`). Uses a dark-teal `rgba(18,59,62,0.85)`
 * (`bg-[#123B3E]/85`) surface so white text achieves >= 4.5:1 contrast even
 * over bright areas of the student photograph.
 */
export function StatChips({ liveState, layout }: StatChipsProps) {
  const statItems = [
    {
      label: 'Students tracked',
      value: liveState ? String(liveState.studentsTracked) : '—',
      icon: Users,
      positionClass: 'min-[1100px]:top-4 min-[1100px]:left-3 landing-float-chip',
    },
    {
      label: 'Topics mastered',
      value: liveState ? String(liveState.topicsMastered) : '—',
      icon: Award,
      positionClass:
        'min-[1100px]:top-1/2 min-[1100px]:right-3 min-[1100px]:-translate-y-1/2 landing-float-chip-delayed',
    },
    {
      label: 'Teacher alerts',
      value: liveState ? String(liveState.teacherAlerts) : '—',
      icon: BellRing,
      positionClass:
        'min-[1100px]:bottom-4 min-[1100px]:left-3 landing-float-chip-slow',
    },
  ];

  if (layout === 'overlay') {
    return (
      <>
        {statItems.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              data-testid="hero-stat-chip-overlay"
              className={`hidden min-[1100px]:flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] bg-[#123B3E]/85 backdrop-blur-md border border-white/25 text-white absolute z-10 max-w-[calc(100%-1.5rem)] ${stat.positionClass}`}
            >
              <span className="w-8 h-8 rounded-full bg-white/15 inline-flex items-center justify-center shrink-0">
                <Icon
                  className="w-4 h-4 text-[#D4F36B]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-white/95 leading-tight whitespace-nowrap">
                  {stat.label}
                </p>
                <p className="font-mono-tabular text-lg font-bold text-white leading-tight mt-0.5">
                  {stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div
      data-testid="hero-stat-chips-row"
      className="min-[1100px]:hidden grid grid-cols-3 gap-2.5 mt-4"
    >
      {statItems.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-[14px] bg-[#123B3E]/85 backdrop-blur-md border border-white/25 px-3 py-2.5 text-white flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5">
              <Icon
                className="w-3.5 h-3.5 text-[#D4F36B] shrink-0"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span className="font-mono-tabular text-base font-bold leading-none">
                {stat.value}
              </span>
            </div>
            <span className="text-[11px] text-white/95 leading-snug">{stat.label}</span>
          </div>
        );
      })}
    </div>
  );
}
