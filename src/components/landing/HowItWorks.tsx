import { BookOpen } from 'lucide-react';
import type { AppTab } from '../../../shared/types';

const STEPS = [
  {
    step: '01',
    title: 'Ask or snap a photo',
    body: 'Type a question in Hindi, Tamil, Marathi, or English—or upload a photo of a handwritten notebook page.',
  },
  {
    step: '02',
    title: 'Get guiding questions',
    body: 'Shiksha replies with relatable Indian examples and a 3-level Hint Ladder, never handing over the final answer.',
  },
  {
    step: '03',
    title: 'Teacher sees progress',
    body: 'Every mastery milestone, hint count, quiz score, and frustration signal flows into the teacher ledger.',
  },
] as const;

export interface HowItWorksProps {
  onOpenApp: (initialTab?: AppTab) => void;
}

/**
 * Three-step walkthrough paired with an illustrative bilingual Socratic chat
 * bubble preview.
 */
export function HowItWorks({ onOpenApp }: HowItWorksProps) {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <div>
            <p className="text-sm font-semibold text-[#24666B] dark:text-[#D4F36B]">
              How it works
            </p>
            <h2
              id="how-it-works-heading"
              className="text-3xl sm:text-4xl font-light tracking-tight text-[#111819] dark:text-white mt-2 text-balance"
            >
              From a stuck homework question to real understanding
            </h2>
          </div>

          <ol className="space-y-5">
            {STEPS.map((item) => (
              <li
                key={item.step}
                className="flex items-start gap-4 p-4 rounded-[20px] bg-white dark:bg-[#0F1F20] border border-[#DCE7E8] dark:border-[#1E3B3E]"
              >
                <span className="font-mono-tabular text-sm font-bold w-10 h-10 rounded-full bg-[#D4F36B] text-[#111819] inline-flex items-center justify-center shrink-0">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[#111819] dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-[15px] text-[#425557] dark:text-[#B4CECF] mt-1 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-[24px] bg-white dark:bg-[#0F1F20] border border-[#DCE7E8] dark:border-[#1E3B3E] p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4EEEF] dark:border-[#1E3B3E] pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[#2F7F84] text-[#D4F36B] inline-flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#111819] dark:text-white">
                    Shiksha Student Tutor
                  </p>
                  <p className="text-xs text-[#425557] dark:text-[#B4CECF]">
                    Socratic Mode · Bilingual
                  </p>
                </div>
              </div>
              <span className="text-xs font-medium text-[#24666B] dark:text-[#D4F36B]">
                Class 8 · Math
              </span>
            </div>

            <div className="flex justify-end">
              <div
                lang="hi"
                className="max-w-[85%] rounded-[20px] rounded-br-md bg-[#2F7F84] dark:bg-[#1B5559] text-white px-4 py-3 text-[15px] leading-relaxed"
              >
                Sir, 2x + 5 = 15 ka seedha answer bata do na?
              </div>
            </div>

            <div className="flex justify-start">
              <div
                lang="hi"
                className="max-w-[88%] rounded-[20px] rounded-bl-md bg-[#F2F7F7] dark:bg-[#162C2E] text-[#111819] dark:text-[#ECF4F4] border border-[#DCE7E8] dark:border-[#244649] px-4 py-3 text-[15px] leading-relaxed space-y-2"
              >
                <p>
                  Bilkul madad karunga! Isse ek tarazu (balancing scale) jaisa socho: ek
                  taraf 2 dabbe aam (<span className="font-mono-tabular">2x</span>) aur
                  5 khule aam hain, aur doosri taraf 15 aam.
                </p>
                <p className="font-medium text-[#1E5F63] dark:text-[#D4F36B]">
                  Agar dono taraf se 5 khule aam hata dein, toh right side mein kitne
                  aam bachenge?
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-[20px] rounded-br-md bg-[#2F7F84] dark:bg-[#1B5559] text-white px-4 py-3 text-[15px]">
                10 aam! Toh 2x = 10 hua!
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-[#425557] dark:text-[#B4CECF] border-t border-[#E4EEEF] dark:border-[#1E3B3E]">
              <span>Logged automatically: Linear Equations · Progressing</span>
              <button
                type="button"
                onClick={() => onOpenApp('tutor')}
                className="min-h-[44px] px-3 text-sm font-semibold text-[#1E5F63] dark:text-[#D4F36B] hover:underline whitespace-nowrap"
              >
                Try it live
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
