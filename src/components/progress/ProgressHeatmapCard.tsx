import { memo } from 'react';
import { AlertCircle, CheckCircle2, Clock, Download, Minus } from 'lucide-react';
import type { ClassHeatmapData, HeatmapCell } from '../../../shared/types';

const HeatmapStatusCell = memo(function HeatmapStatusCell({
  cell,
}: {
  cell: HeatmapCell;
}) {
  if (cell.status === 'Mastered') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#C4EED0] text-[#072711] dark:bg-[#0F5223] dark:text-[#C4EED0] whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          Mastered
          {typeof cell.quizScore === 'number' && typeof cell.quizTotal === 'number'
            ? ` (${cell.quizScore}/${cell.quizTotal})`
            : ''}
        </span>
      </span>
    );
  }
  if (cell.status === 'Progressing') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#FEF3C7] text-[#78350F] dark:bg-[#4A3208] dark:text-[#FDE68A] whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Progressing</span>
      </span>
    );
  }
  if (cell.status === 'Struggling') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Struggling</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium bg-[#E5E7EB] text-[#374151] dark:bg-[#282B33] dark:text-[#C4C6D0] whitespace-nowrap">
      <Minus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Not Started</span>
    </span>
  );
});

export interface ProgressHeatmapCardProps {
  heatmap: ClassHeatmapData;
  onExportCsv: () => void;
}

/**
 * Class Mastery Heatmap matrix (Students × Topics) with color + icon + text
 * indicators and one-click CSV download.
 */
export function ProgressHeatmapCard({
  heatmap,
  onExportCsv,
}: ProgressHeatmapCardProps) {
  return (
    <div className="rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E7F0] dark:border-[#282B33] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
            Class Mastery Heatmap (Students × Topics)
          </h2>
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
            Color and text indicators for every student across tracked curriculum topics
          </p>
        </div>
        <button
          type="button"
          onClick={onExportCsv}
          disabled={heatmap.rows.length === 0}
          className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] transition-colors disabled:opacity-45 whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Export CSV</span>
        </button>
      </div>

      {heatmap.topics.length === 0 || heatmap.rows.length === 0 ? (
        <div className="p-8 text-center text-xs text-[#44474F] dark:text-[#C4C6D0]">
          No topic attempts recorded yet to populate the class heatmap.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E7F0] dark:border-[#282B33] text-xs font-medium text-[#44474F] dark:text-[#C4C6D0]">
                <th scope="col" className="py-3 px-5 whitespace-nowrap">
                  Student
                </th>
                {heatmap.topics.map((col) => (
                  <th key={col.key} scope="col" className="py-3 px-4 whitespace-nowrap">
                    <span className="block font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
                      {col.topic}
                    </span>
                    <span className="block text-xs font-normal text-[#44474F] dark:text-[#C4C6D0]">
                      {col.subject}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E7F0] dark:divide-[#282B33] text-sm">
              {heatmap.rows.map((row) => (
                <tr
                  key={row.student.id}
                  className="hover:bg-white/60 dark:hover:bg-[#22262E]/60 transition-colors"
                >
                  <th
                    scope="row"
                    className="py-3 px-5 font-medium text-[#1A1C1E] dark:text-[#E2E2E9] whitespace-nowrap"
                  >
                    <span className="block">{row.student.name}</span>
                    <span className="block text-xs font-normal font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
                      {row.student.id} · {row.student.grade}
                    </span>
                  </th>
                  {heatmap.topics.map((col) => (
                    <td key={col.key} className="py-3 px-4">
                      <HeatmapStatusCell
                        cell={row.cells[col.key] ?? { status: 'Not Started' }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
