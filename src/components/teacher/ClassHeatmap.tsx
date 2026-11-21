import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Minus,
  Sparkles,
} from 'lucide-react';
import { buildClassHeatmap, exportHeatmapToCsv } from '../../../shared/educationLogic';
import type {
  DropoutAlert,
  ProgressLog,
  TeacherStudentProfile,
  WeeklySummaryResponse,
} from '../../../shared/types';
import {
  getOverviewCellStyle,
  StudentInteractionsPanel,
} from './StudentInteractionsPanel';

export interface ClassHeatmapProps {
  students: TeacherStudentProfile[];
  progressLogs: ProgressLog[];
  dropoutAlerts: DropoutAlert[];
  studentById: Map<string, TeacherStudentProfile>;
  onGenerateWeeklySummary?: () => Promise<WeeklySummaryResponse>;
}

/**
 * Interactive Class Overview Heatmap (students × topics) with cell click
 * interaction inspector, CSV export, and Gemini 5-bullet weekly class summary.
 */
export function ClassHeatmap({
  students,
  progressLogs,
  dropoutAlerts,
  studentById,
  onGenerateWeeklySummary,
}: ClassHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{
    studentId: string;
    topic: string;
    subject: string;
  } | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryResponse | null>(
    null
  );
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const heatmap = useMemo(
    () => buildClassHeatmap(students, progressLogs),
    [students, progressLogs]
  );

  const inspectedStudent = selectedCell
    ? (studentById.get(selectedCell.studentId) ?? null)
    : null;

  const inspectedLogs = useMemo(() => {
    if (!selectedCell) return [];
    const matching = progressLogs.filter(
      (l) => l.student_id === selectedCell.studentId
    );
    return [...matching].sort((a, b) => {
      const aHit = a.topic === selectedCell.topic ? 1 : 0;
      const bHit = b.topic === selectedCell.topic ? 1 : 0;
      if (aHit !== bHit) return bHit - aHit;
      return b.timestamp.localeCompare(a.timestamp);
    });
  }, [progressLogs, selectedCell]);

  const inspectedAlerts = useMemo(() => {
    if (!selectedCell) return [];
    return dropoutAlerts.filter((a) => a.student_id === selectedCell.studentId);
  }, [dropoutAlerts, selectedCell]);

  const handleExportOverviewCsv = () => {
    const csv = exportHeatmapToCsv(heatmap);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'shiksha-class-overview.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleGenerateSummary = async () => {
    if (!onGenerateWeeklySummary || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const result = await onGenerateWeeklySummary();
      setWeeklySummary(result);
    } catch (err) {
      setSummaryError(
        err instanceof Error
          ? err.message
          : 'Unable to generate weekly class summary right now.'
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div
      id="teacher-panel-overview"
      role="tabpanel"
      aria-labelledby="teacher-tab-overview"
      className="space-y-5"
    >
      <div className="rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E7F0] dark:border-[#282B33] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
              Class Overview Heatmap (Students × Topics)
            </h2>
            <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
              Click any cell to inspect that student&apos;s recent interactions. Green =
              Mastered · Amber = Progressing · Red = Struggling · Grey = Not Started.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportOverviewCsv}
              disabled={heatmap.rows.length === 0}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors disabled:opacity-45 whitespace-nowrap"
            >
              <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Export CSV</span>
            </button>

            {onGenerateWeeklySummary && (
              <button
                type="button"
                onClick={() => void handleGenerateSummary()}
                disabled={summaryLoading}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {summaryLoading ? (
                  <Loader2
                    className="w-4 h-4 animate-spin shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {summaryLoading ? 'Generating summary…' : 'Generate weekly summary'}
                </span>
              </button>
            )}
          </div>
        </div>

        {summaryError && (
          <div
            role="alert"
            className="mx-5 mt-4 px-4 py-3 rounded-2xl bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] text-xs font-medium"
          >
            {summaryError}
          </div>
        )}

        {weeklySummary && (
          <div className="mx-5 mt-4 rounded-2xl bg-white dark:bg-[#22262E] border border-[#E2E7F0] dark:border-[#2F333D] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
                Weekly Class Summary (5 Key Insights)
              </h3>
              <span className="text-xs font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
                {new Date(weeklySummary.generatedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-[#1A1C1E] dark:text-[#E2E2E9]">
              {weeklySummary.bullets.map((bullet, i) => (
                <li key={i} className="leading-relaxed">
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}

        {heatmap.topics.length === 0 || heatmap.rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#44474F] dark:text-[#C4C6D0]">
            No topic attempts recorded yet to populate the class overview heatmap.
          </div>
        ) : (
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E7F0] dark:border-[#282B33] text-xs font-medium text-[#44474F] dark:text-[#C4C6D0]">
                  <th scope="col" className="py-3 px-5 whitespace-nowrap">
                    Student
                  </th>
                  {heatmap.topics.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className="py-3 px-4 whitespace-nowrap"
                    >
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
                        {row.student.maskedPhone ? ` · ${row.student.maskedPhone}` : ''}
                      </span>
                    </th>
                    {heatmap.topics.map((col) => {
                      const cell = row.cells[col.key] ?? {
                        status: 'Not Started',
                      };
                      const isSelected =
                        selectedCell?.studentId === row.student.id &&
                        selectedCell?.topic === col.topic;
                      return (
                        <td key={col.key} className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCell({
                                studentId: row.student.id,
                                topic: col.topic,
                                subject: col.subject,
                              })
                            }
                            aria-pressed={isSelected}
                            aria-label={`Inspect ${row.student.name} on ${col.topic}: ${cell.status}`}
                            className={`min-h-[44px] w-full px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${getOverviewCellStyle(
                              cell.status
                            )} ${
                              isSelected
                                ? 'ring-2 ring-offset-1 ring-[#0B57D0] dark:ring-[#A8C7FA]'
                                : ''
                            }`}
                          >
                            {cell.status === 'Mastered' ? (
                              <CheckCircle2
                                className="w-3.5 h-3.5 shrink-0"
                                aria-hidden="true"
                              />
                            ) : cell.status === 'Progressing' ? (
                              <Clock
                                className="w-3.5 h-3.5 shrink-0"
                                aria-hidden="true"
                              />
                            ) : cell.status === 'Struggling' ? (
                              <AlertCircle
                                className="w-3.5 h-3.5 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <Minus
                                className="w-3.5 h-3.5 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <span>{cell.status}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCell && inspectedStudent && (
        <StudentInteractionsPanel
          student={inspectedStudent}
          focusedTopic={selectedCell.topic}
          logs={inspectedLogs}
          alerts={inspectedAlerts}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
}
