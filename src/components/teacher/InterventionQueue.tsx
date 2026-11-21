import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type {
  DropoutAlert,
  ProgressLog,
  TeacherStudentProfile,
} from '../../../shared/types';

const InterventionAlertItem = memo(function InterventionAlertItem({
  alert,
  student,
  isLoading,
  onDraft,
}: {
  alert: DropoutAlert;
  student?: TeacherStudentProfile;
  isLoading: boolean;
  onDraft: (prompt: string) => void;
}) {
  const label = student?.name ?? alert.student_id;
  return (
    <li className="text-xs space-y-1">
      <div className="flex items-center gap-1.5 font-semibold text-[#B3261E] dark:text-[#F2B8B5]">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="break-words">
          {label} · {alert.student_id}
          {student ? ` · ${student.grade}` : ''}
        </span>
      </div>
      <p className="text-[#44474F] dark:text-[#C4C6D0] leading-relaxed">
        {alert.reason_for_alert}
      </p>
      <button
        type="button"
        disabled={isLoading}
        onClick={() =>
          onDraft(
            `Create a gentle 1-on-1 remediation plan for ${label} (${alert.student_id}) addressing: ${alert.reason_for_alert}`
          )
        }
        className="min-h-[44px] px-2 -mx-2 rounded-lg inline-flex items-center text-xs font-medium text-[#0B57D0] dark:text-[#A8C7FA] hover:underline disabled:opacity-50"
      >
        Draft intervention plan
      </button>
    </li>
  );
});

const StrugglingTopicItem = memo(function StrugglingTopicItem({
  log,
  studentName,
}: {
  log: ProgressLog;
  studentName: string;
}) {
  return (
    <li className="text-xs flex items-center justify-between gap-2">
      <span className="text-[#1A1C1E] dark:text-[#E2E2E9] truncate">
        {studentName} · {log.topic}
      </span>
      <span className="font-mono-tabular text-[#44474F] dark:text-[#C4C6D0] shrink-0">
        {log.subject}
      </span>
    </li>
  );
});

export interface InterventionQueueProps {
  activeAlerts: DropoutAlert[];
  strugglingLogs: ProgressLog[];
  studentById: Map<string, TeacherStudentProfile>;
  isLoading: boolean;
  onDraftIntervention: (prompt: string) => void;
}

/**
 * Right-rail classroom grounding sidebar displaying active dropout alerts and
 * recent struggling topics with one-click intervention plan drafting.
 */
export function InterventionQueue({
  activeAlerts,
  strugglingLogs,
  studentById,
  isLoading,
  onDraftIntervention,
}: InterventionQueueProps) {
  return (
    <aside
      aria-label="Students Needing Intervention"
      className="lg:col-span-4 min-w-0 rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] divide-y divide-[#E2E7F0] dark:divide-[#282B33]"
    >
      <div className="p-5">
        <p className="text-xs font-medium text-[#0B57D0] dark:text-[#A8C7FA]">
          Classroom Grounding
        </p>
        <h2 className="font-display text-xl font-semibold text-[#1A1C1E] dark:text-[#E2E2E9] mt-1">
          Intervention Queue
        </h2>
        <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-1">
          Teacher Aide automatically reads recent struggling topics and active dropout
          alerts.
        </p>
      </div>

      <div className="p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
          Active Dropout Alerts ({activeAlerts.length})
        </h3>
        {activeAlerts.length === 0 ? (
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">
            No active dropout alerts right now.
          </p>
        ) : (
          <ul className="space-y-3">
            {activeAlerts.slice(0, 4).map((alert) => (
              <InterventionAlertItem
                key={alert.id}
                alert={alert}
                student={studentById.get(alert.student_id)}
                isLoading={isLoading}
                onDraft={onDraftIntervention}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
          Recent Struggling Topics ({strugglingLogs.length})
        </h3>
        {strugglingLogs.length === 0 ? (
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">
            No struggling attempts recorded.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {strugglingLogs.slice(0, 4).map((log) => (
              <StrugglingTopicItem
                key={log.id}
                log={log}
                studentName={studentById.get(log.student_id)?.name ?? log.student_id}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
