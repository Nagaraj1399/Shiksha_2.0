import { memo, useMemo } from 'react';
import { AlertCircle, Award, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { computeStudentSummary } from '../../../shared/shikshaLogic';
import type { ProgressLog, PublicStudentProfile } from '../../../shared/types';

const RecentTopicLogItem = memo(function RecentTopicLogItem({
  log,
  onStartQuiz,
}: {
  log: ProgressLog;
  onStartQuiz?: (subject: string, topic: string) => void;
}) {
  return (
    <li className="text-xs space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-[#1A1C1E] dark:text-[#E2E2E9] truncate">
            {log.topic}
          </p>
          <p className="text-[#44474F] dark:text-[#C4C6D0]">
            {log.subject}
            {typeof log.hints_used === 'number' && log.hints_used > 0
              ? ` · Hints: ${log.hints_used}`
              : ''}
            {typeof log.quiz_score === 'number' && typeof log.quiz_total === 'number'
              ? ` · Quiz ${log.quiz_score}/${log.quiz_total}`
              : ''}
            {log.frustration_detected ? ' · Frustration noted' : ''}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
            log.competency_level === 'Mastered'
              ? 'text-[#0F5223] dark:text-[#A8DAB5]'
              : log.competency_level === 'Struggling'
                ? 'text-[#B3261E] dark:text-[#F2B8B5]'
                : 'text-[#0B57D0] dark:text-[#A8C7FA]'
          }`}
        >
          {log.competency_level === 'Mastered' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ) : log.competency_level === 'Struggling' ? (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          <span>{log.competency_level}</span>
        </span>
      </div>

      {log.competency_level === 'Mastered' && onStartQuiz && (
        <button
          type="button"
          onClick={() => onStartQuiz(log.subject, log.topic)}
          className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#C4EED0] hover:bg-[#A8E3B9] text-[#072711] dark:bg-[#0F5223] dark:hover:bg-[#146B2E] dark:text-[#C4EED0] transition-colors"
        >
          <Award className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Take 3-Question Quiz</span>
        </button>
      )}
    </li>
  );
});

export interface StudentContextPanelProps {
  activeStudent?: PublicStudentProfile;
  progressLogs: ProgressLog[];
  onStartQuiz?: (subject: string, topic: string) => void;
}

/**
 * Right-rail student profile card displaying academic metadata, attempt/mastery
 * counters, and recent topic logs with Mastery Practice Quiz launchers.
 */
export function StudentContextPanel({
  activeStudent,
  progressLogs,
  onStartQuiz,
}: StudentContextPanelProps) {
  const studentLogs = useMemo(
    () => progressLogs.filter((l) => l.student_id === activeStudent?.id),
    [progressLogs, activeStudent?.id]
  );

  const summary = useMemo(
    () => computeStudentSummary(studentLogs, [], activeStudent?.id ?? ''),
    [studentLogs, activeStudent?.id]
  );

  return (
    <aside
      aria-label="Student Context and Progress"
      className="lg:col-span-4 min-w-0 rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] divide-y divide-[#E2E7F0] dark:divide-[#282B33]"
    >
      <div className="p-5">
        <p className="text-xs font-medium text-[#0B57D0] dark:text-[#A8C7FA]">
          Active Student Profile
        </p>
        <h2 className="font-display text-xl font-semibold text-[#1A1C1E] dark:text-[#E2E2E9] mt-1">
          {activeStudent?.name ?? 'Loading profile...'}
        </h2>
        {activeStudent && (
          <>
            <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-1">
              {activeStudent.id} · {activeStudent.grade} · {activeStudent.board}
            </p>
            <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
              Language: {activeStudent.preferredLanguage}
            </p>
          </>
        )}
      </div>

      <div className="p-5 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">Attempts</p>
          <p className="font-display text-2xl font-semibold font-mono-tabular text-[#1A1C1E] dark:text-[#E2E2E9] mt-0.5">
            {summary.totalAttempts}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">Mastered</p>
          <p className="font-display text-2xl font-semibold font-mono-tabular text-[#0F5223] dark:text-[#A8DAB5] mt-0.5">
            {summary.masteredCount}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">Struggling</p>
          <p className="font-display text-2xl font-semibold font-mono-tabular text-[#B3261E] dark:text-[#F2B8B5] mt-0.5">
            {summary.strugglingCount}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
            Recent Topic Logs
          </h3>
          <TrendingUp
            className="w-4 h-4 text-[#44474F] dark:text-[#C4C6D0]"
            aria-hidden="true"
          />
        </div>

        {studentLogs.length === 0 ? (
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">
            No problem attempts logged for this student yet. Ask a question to trigger
            live progress tracking.
          </p>
        ) : (
          <ul className="space-y-3">
            {studentLogs.slice(0, 5).map((log) => (
              <RecentTopicLogItem key={log.id} log={log} onStartQuiz={onStartQuiz} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
