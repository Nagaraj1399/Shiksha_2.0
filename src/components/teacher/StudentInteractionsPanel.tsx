import { X } from 'lucide-react';
import type {
  DropoutAlert,
  HeatmapCell,
  ProgressLog,
  TeacherStudentProfile,
} from '../../../shared/types';

/** Shared accessible Light/Night cell colour classes for Class Overview Heatmap badges. */
export function getOverviewCellStyle(status: HeatmapCell['status']): string {
  if (status === 'Mastered') {
    return 'bg-[#C4EED0] hover:bg-[#AEDFB9] text-[#072711] dark:bg-[#0F5223] dark:hover:bg-[#146B2E] dark:text-[#C4EED0]';
  }
  if (status === 'Progressing') {
    return 'bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#78350F] dark:bg-[#4A3208] dark:hover:bg-[#5E400A] dark:text-[#FDE68A]';
  }
  if (status === 'Struggling') {
    return 'bg-[#F9DEDC] hover:bg-[#F4C7C3] text-[#410E0B] dark:bg-[#8C1D18] dark:hover:bg-[#A6251F] dark:text-[#F9DEDC]';
  }
  return 'bg-[#E5E7EB] hover:bg-[#D1D5DB] text-[#374151] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#C4C6D0]';
}

export interface StudentInteractionsPanelProps {
  student: TeacherStudentProfile;
  focusedTopic: string;
  logs: ProgressLog[];
  alerts: DropoutAlert[];
  onClose: () => void;
}

/**
 * Detail drawer rendered under the Class Overview Heatmap when a teacher clicks
 * a student × topic cell, surfacing recent attempts and dropout risk signals.
 */
export function StudentInteractionsPanel({
  student,
  focusedTopic,
  logs,
  alerts,
  onClose,
}: StudentInteractionsPanelProps) {
  return (
    <div
      aria-label={`Recent interactions for ${student.name}`}
      className="rounded-[28px] bg-white dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#0B57D0] dark:text-[#A8C7FA]">
            Student Recent Interactions · Focused Topic: {focusedTopic}
          </p>
          <h3 className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9] mt-0.5">
            {student.name} ({student.id})
          </h3>
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
            {student.grade} · {student.board} · {student.preferredLanguage}
            {student.maskedPhone ? ` · Contact ${student.maskedPhone}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close student interactions panel"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#44474F] dark:text-[#C4C6D0] hover:bg-[#EAEFF7] dark:hover:bg-[#282B33]"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {logs.length === 0 ? (
        <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">
          No interactions logged yet for {student.name}.
        </p>
      ) : (
        <ul className="divide-y divide-[#E2E7F0] dark:divide-[#282B33]">
          {logs.map((log) => (
            <li
              key={log.id}
              className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div>
                <p className="font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
                  {log.topic}{' '}
                  <span className="font-normal text-[#44474F] dark:text-[#C4C6D0]">
                    ({log.subject})
                  </span>
                </p>
                <p className="text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
                  Hints used: {log.hints_used ?? 0}
                  {typeof log.quiz_score === 'number' &&
                  typeof log.quiz_total === 'number'
                    ? ` · Quiz ${log.quiz_score}/${log.quiz_total}`
                    : ''}
                  {log.frustration_detected ? ' · Frustration detected' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-1 rounded-xl font-semibold ${getOverviewCellStyle(
                    log.competency_level
                  )}`}
                >
                  {log.competency_level}
                </span>
                <span className="font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
                  {new Date(log.timestamp).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {alerts.length > 0 && (
        <div className="rounded-2xl bg-[#F9DEDC]/60 dark:bg-[#8C1D18]/40 border border-[#F9DEDC] dark:border-[#8C1D18] p-3.5 space-y-1.5">
          <p className="text-xs font-semibold text-[#410E0B] dark:text-[#F9DEDC]">
            Dropout Risk Signals ({alerts.length})
          </p>
          {alerts.map((al) => (
            <p key={al.id} className="text-xs text-[#410E0B] dark:text-[#F9DEDC]">
              • {al.reason_for_alert} ({al.status})
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
