import { BellRing, Camera, FileSpreadsheet, MessageCircleQuestion } from 'lucide-react';

const FEATURE_CARDS = [
  {
    title: 'Socratic Tutoring',
    description:
      'Guides students with local Indian examples and step-by-step hints instead of handing out final answers.',
    icon: MessageCircleQuestion,
    highlighted: false,
  },
  {
    title: 'Photo Homework Help',
    description:
      'Snap any handwritten math or science notebook page and get bilingual guiding questions in seconds.',
    icon: Camera,
    highlighted: true,
  },
  {
    title: 'Lesson Plans in Minutes',
    description:
      'Turn state-board syllabus photos into time-boxed lesson plans and printable bilingual worksheets.',
    icon: FileSpreadsheet,
    highlighted: false,
  },
  {
    title: 'Early Dropout Alerts',
    description:
      'Flags repeated frustration and struggling topics automatically so teachers can step in early.',
    icon: BellRing,
    highlighted: false,
  },
] as const;

/**
 * Overlapping 4-card feature strip highlighting Shiksha-Agent's core classroom
 * capabilities below the hero.
 */
export function FeatureStrip() {
  return (
    <section
      id="for-students"
      aria-label="Core capabilities"
      className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-[60px]"
    >
      <div className="rounded-[24px] bg-white/95 dark:bg-[#0F1F20]/95 backdrop-blur-md border border-[#DCE7E8] dark:border-[#1E3B3E] p-4 sm:p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.title}
                className={`rounded-[20px] p-5 sm:p-6 flex flex-col justify-between gap-4 transition-colors ${
                  card.highlighted
                    ? 'bg-[#D4F36B] text-[#111819]'
                    : 'bg-[#F5F9F9] dark:bg-[#14292B] text-[#111819] dark:text-[#ECF4F4] border border-[#E4EEEF] dark:border-[#1E3B3E]'
                }`}
              >
                <div className="relative w-11 h-11 inline-flex items-center justify-center rounded-2xl bg-white/75 dark:bg-white/10">
                  <Icon
                    className={`w-5 h-5 ${
                      card.highlighted
                        ? 'text-[#111819]'
                        : 'text-[#1E5F63] dark:text-[#A9DEE0]'
                    }`}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                      card.highlighted ? 'bg-[#111819]' : 'bg-[#D4F36B]'
                    }`}
                  />
                </div>

                <div>
                  <h2 className="text-base sm:text-lg font-semibold leading-snug">
                    {card.title}
                  </h2>
                  <p
                    className={`text-[14px] sm:text-[15px] leading-relaxed mt-1.5 ${
                      card.highlighted
                        ? 'text-[#1D2A14]'
                        : 'text-[#425557] dark:text-[#B4CECF]'
                    }`}
                  >
                    {card.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
