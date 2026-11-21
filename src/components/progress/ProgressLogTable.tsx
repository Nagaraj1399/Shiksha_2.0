import { memo } from 'react';
import { AlertCircle, CheckCircle2, Clock, Search } from 'lucide-react';
import type {
  CompetencyLevel,
  ProgressLog,
  TeacherStudentProfile,
} from '../../../shared/types';

const FILTER_OPTIONS: readonly ('All' | CompetencyLevel)[] = [
  'All',
  'Mastered',
  'Progressing',
  'Struggling',
];

const ProgressLogRow = memo(function ProgressLogRow({
  log,
  student,
}: {
  log: ProgressLog;
  student?: TeacherStudentProfile;
}) {
  const formattedTime = new Date(log.timestamp).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <tr className="hover:bg-white/60 dark:hover:bg-[#22262E]/60 transition-colors">
      <td className="py-3.5 px-5">
        <p className="font-medium text-[#1A1C1E] dark:text-[#E2E2E9]">
          {student?.name ?? log.student_id}
        </p>
        <p className="text-xs font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
          {log.student_id}
          {student ? ` · ${student.grade} · ${student.board}` : ''}
        </p>
      </td>
      <td className="py-3.5 px-4">
        <p className="font-medium text-[#1A1C1E] dark:text-[#E2E2E9]">{log.topic}</p>
        <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">
          {log.subject}
          {typeof log.quiz_score === 'number' && typeof log.quiz_total === 'number'
            ? ` · Quiz ${log.quiz_score}/${log.quiz_total}`
            : ''}
        </p>
      </td>
      <td className="py-3.5 px-4">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            log.competency_level === 'Mastered'
              ? 'text-[#0F5223] dark:text-[#A8DAB5]'
              : log.competency_level === 'Struggling'
                ? 'text-[#B3261E] dark:text-[#F2B8B5]'
                : 'text-[#0B57D0] dark:text-[#A8C7FA]'
          }`}
        >
          {log.competency_level === 'Mastered' ? (
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          ) : log.competency_level === 'Struggling' ? (
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{log.competency_level}</span>
        </span>
      </td>
      <td className="py-3.5 px-4 text-xs font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
        {typeof log.hints_used === 'number' ? log.hints_used : 0}
      </td>
      <td className="py-3.5 px-4 text-xs">
        {log.frustration_detected ? (
          <span className="font-medium text-[#B3261E] dark:text-[#F2B8B5]">
            Detected
          </span>
        ) : (
          <span className="text-[#44474F] dark:text-[#C4C6D0]">None</span>
        )}
      </td>
      <td className="py-3.5 px-5 text-right text-xs font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
        {formattedTime}
      </td>
    </tr>
  );
});

export interface ProgressLogTableProps {
  filter: 'All' | CompetencyLevel;
  onChangeFilter: (next: 'All' | CompetencyLevel) => void;
  query: string;
  onChangeQuery: (value: string) => void;
  filteredLogs: ProgressLog[];
  studentById: Map<string, TeacherStudentProfile>;
}

/**
 * Filterable and searchable detailed progress ledger table for teachers.
 */
export function ProgressLogTable({
  filter,
  onChangeFilter,
  query,
  onChangeQuery,
  filteredLogs,
  studentById,
}: ProgressLogTableProps) {
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Filter by competency level"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl bg-[#EAEFF7] dark:bg-[#1F2229] max-w-full"
        >
          {FILTER_OPTIONS.map((option) => {
            const active = filter === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => onChangeFilter(option)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-[#041E49] dark:bg-[#282B33] dark:text-[#E2E2E9]'
                    : 'text-[#44474F] hover:text-[#1A1C1E] dark:text-[#C4C6D0] dark:hover:text-[#E2E2E9]'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-80">
          <Search
            className="w-4 h-4 text-[#44474F] dark:text-[#C4C6D0] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <label htmlFor="progress-search" className="sr-only">
            Search student ID, subject, or topic
          </label>
          <input
            id="progress-search"
            type="search"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search student ID, subject, or topic..."
            className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-2xl bg-[#F2F4F8] dark:bg-[#191C22] text-sm text-[#1A1C1E] dark:text-[#E2E2E9] placeholder:text-[#575A63] dark:placeholder:text-[#A0A4B0] border border-[#E2E7F0] dark:border-[#282B33] focus-visible:outline-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]"
          />
        </div>
      </div>

      <div className="rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] overflow-hidden">
        <h2 className="sr-only">Detailed Progress Logs</h2>
        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-[#1A1C1E] dark:text-[#E2E2E9]">
              No matching student progress logs found
            </p>
            <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-1">
              Try clearing your search filter or interact with a student in Student
              Tutor mode.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E7F0] dark:border-[#282B33] text-xs font-medium text-[#44474F] dark:text-[#C4C6D0]">
                  <th scope="col" className="py-3.5 px-5">
                    Student
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Subject & Topic
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Competency
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Hints
                  </th>
                  <th scope="col" className="py-3.5 px-4">
                    Frustration
                  </th>
                  <th scope="col" className="py-3.5 px-5 text-right">
                    Logged At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7F0] dark:divide-[#282B33] text-sm">
                {filteredLogs.map((log) => (
                  <ProgressLogRow
                    key={log.id}
                    log={log}
                    student={studentById.get(log.student_id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
