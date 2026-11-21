import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import type { AppTab } from '../../../shared/types';

export interface TeacherSectionProps {
  onOpenApp: (initialTab?: AppTab) => void;
}

/**
 * Teacher showcase section pairing classroom workflow benefits with a preview
 * of the Progress Ledger and Early Dropout Risk Alert card.
 */
export function TeacherSection({ onOpenApp }: TeacherSectionProps) {
  return (
    <section
      id="for-teachers"
      aria-labelledby="for-teachers-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 sm:pb-24"
    >
      <div className="rounded-[24px] bg-white dark:bg-[#0F1F20] border border-[#DCE7E8] dark:border-[#1E3B3E] p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 space-y-5">
            <p className="text-sm font-semibold text-[#24666B] dark:text-[#D4F36B]">
              For Teachers
            </p>
            <h2
              id="for-teachers-heading"
              className="text-3xl sm:text-4xl font-light tracking-tight text-[#111819] dark:text-white text-balance"
            >
              Spot who needs help before exam week arrives
            </h2>
            <p className="text-[15px] leading-relaxed text-[#425557] dark:text-[#B4CECF]">
              Every Socratic chat quietly builds a live class mastery heatmap and
              surfaces dropout-risk alerts—while Teacher Aide generates printable lesson
              plans and separate-page answer keys from syllabus photos.
            </p>

            <ul className="space-y-2.5 text-[15px] text-[#243638] dark:text-[#D4E6E7]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2
                  className="w-5 h-5 text-[#24666B] dark:text-[#D4F36B] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>Students × topics mastery heatmap with one-click CSV export</span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2
                  className="w-5 h-5 text-[#24666B] dark:text-[#D4F36B] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>
                  Printable bilingual worksheets with Answer Keys on a new page
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2
                  className="w-5 h-5 text-[#24666B] dark:text-[#D4F36B] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>Role-protected teacher access with zero phone PII stored</span>
              </li>
            </ul>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenApp('teacher')}
                className="min-h-[48px] px-7 py-3 rounded-full bg-[#1C1C1C] hover:bg-[#111111] dark:bg-[#D4F36B] dark:hover:bg-[#C6E853] text-white dark:text-[#111819] text-[15px] font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>Open Teacher Aide</span>
                <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-[20px] bg-[#F5F9F9] dark:bg-[#14292B] border border-[#DCE7E8] dark:border-[#1E3B3E] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#DCE7E8] dark:border-[#1E3B3E]">
                <p className="text-sm font-semibold text-[#111819] dark:text-white">
                  Classroom Progress Ledger
                </p>
                <span className="text-xs font-mono-tabular text-[#425557] dark:text-[#B4CECF]">
                  State-Board Live Sync
                </span>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="text-[#425557] dark:text-[#B4CECF] border-b border-[#DCE7E8] dark:border-[#1E3B3E]">
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Student
                      </th>
                      <th scope="col" className="py-2 pr-3 font-medium">
                        Topic
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EEEF] dark:divide-[#1E3B3E]">
                    <tr>
                      <td className="py-2.5 pr-3 font-medium text-[#111819] dark:text-white">
                        Priya Nair · Class 6
                      </td>
                      <td className="py-2.5 pr-3 text-[#425557] dark:text-[#B4CECF]">
                        Photosynthesis
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#0F5223] dark:text-[#A8DAB5]">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Mastered</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-medium text-[#111819] dark:text-white">
                        Aarav Sharma · Class 8
                      </td>
                      <td className="py-2.5 pr-3 text-[#425557] dark:text-[#B4CECF]">
                        Linear Equations
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#1E5F63] dark:text-[#A9DEE0]">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Progressing</span>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 pr-3 font-medium text-[#111819] dark:text-white">
                        Rohan Verma · Class 7
                      </td>
                      <td className="py-2.5 pr-3 text-[#425557] dark:text-[#B4CECF]">
                        Fractions &amp; Ratios
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#B3261E] dark:text-[#F2B8B5]">
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Struggling</span>
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-[20px] bg-[#FBF2F1] dark:bg-[#2A1818] border border-[#EFCBC8] dark:border-[#5C2B28] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 rounded-full bg-[#B3261E]/15 text-[#B3261E] dark:text-[#F2B8B5] inline-flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[#410E0B] dark:text-[#F9DEDC]">
                    Early Dropout Risk Alert · Rohan Verma (Class 7)
                  </p>
                  <p className="text-xs sm:text-sm text-[#5C1A16] dark:text-[#F2B8B5] mt-0.5">
                    Repeated frustration on Fractions &amp; Ratios. Suggested action:
                    5-minute visual roti-sharing warm-up before next class.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenApp('alerts')}
                className="min-h-[44px] px-4 py-2 rounded-full bg-[#410E0B] hover:bg-[#2C0907] dark:bg-[#F9DEDC] dark:hover:bg-white text-white dark:text-[#410E0B] text-xs font-semibold whitespace-nowrap shrink-0"
              >
                Review Alerts
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
