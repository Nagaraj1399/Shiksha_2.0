import { memo, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, LogOut, Sparkles } from 'lucide-react';
import type { DropoutAlert, TeacherStudentProfile } from '../../shared/types';

interface DropoutAlertsViewProps {
  students: TeacherStudentProfile[];
  alerts: DropoutAlert[];
  onToggleAcknowledge: (alertId: string) => Promise<void>;
  onOpenInterventionInAide: (alert: DropoutAlert) => void;
  onSignOutTeacher: () => void;
}

const DropoutAlertRow = memo(function DropoutAlertRow({
  alert,
  student,
  onToggleAcknowledge,
  onOpenInterventionInAide,
}: {
  alert: DropoutAlert;
  student?: TeacherStudentProfile;
  onToggleAcknowledge: (alertId: string) => Promise<void>;
  onOpenInterventionInAide: (alert: DropoutAlert) => void;
}) {
  const isActive = alert.status === 'Active';
  const formattedTime = new Date(alert.timestamp).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isActive ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[#B3261E] dark:text-[#F2B8B5]">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Active Risk Alert</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-[#0F5223] dark:text-[#A8DAB5]">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Acknowledged</span>
            </span>
          )}
          <span aria-hidden="true" className="text-[#44474F] dark:text-[#C4C6D0]">
            ·
          </span>
          <span className="font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
            {alert.student_id}
          </span>
          {student && (
            <>
              <span aria-hidden="true" className="text-[#44474F] dark:text-[#C4C6D0]">
                ·
              </span>
              <span className="text-[#44474F] dark:text-[#C4C6D0]">
                {student.grade} · {student.board}
              </span>
            </>
          )}
          <span aria-hidden="true" className="text-[#44474F] dark:text-[#C4C6D0]">
            ·
          </span>
          <span className="font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
            {formattedTime}
          </span>
        </div>

        <h2 className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
          {student?.name ?? alert.student_id}
        </h2>

        <p className="text-sm text-[#44474F] dark:text-[#C4C6D0] max-w-3xl leading-relaxed">
          {alert.reason_for_alert}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => onOpenInterventionInAide(alert)}
          className="min-h-[44px] px-4 py-2 rounded-2xl text-xs font-medium inline-flex items-center gap-1.5 bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Plan Intervention</span>
        </button>

        <button
          type="button"
          onClick={() => onToggleAcknowledge(alert.id)}
          className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs font-medium transition-colors whitespace-nowrap ${
            isActive
              ? 'bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F]'
              : 'bg-white hover:bg-[#EAEFF7] text-[#1A1C1E] border border-[#C4C6D0] dark:bg-[#111318] dark:hover:bg-[#282B33] dark:text-[#E2E2E9] dark:border-[#44474F]'
          }`}
        >
          {isActive ? 'Acknowledge Alert' : 'Reopen Alert'}
        </button>
      </div>
    </div>
  );
});

export function DropoutAlertsView({
  students,
  alerts,
  onToggleAcknowledge,
  onOpenInterventionInAide,
  onSignOutTeacher,
}: DropoutAlertsViewProps) {
  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const activeCount = useMemo(
    () => alerts.filter((a) => a.status === 'Active').length,
    [alerts]
  );

  return (
    <section aria-label="Teacher Dropout Risk Alerts" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
            Teacher Dropout Risk Alerts
          </h1>
          <p className="text-sm text-[#44474F] dark:text-[#C4C6D0] mt-1">
            Immediate alerts triggered via alert_teacher_dropout_risk when high
            frustration or repeated failure is detected
          </p>
        </div>

        <div className="text-sm flex flex-wrap items-center gap-3">
          <span>
            <span className="text-[#44474F] dark:text-[#C4C6D0]">Active Alerts: </span>
            <span className="font-mono-tabular font-semibold text-[#B3261E] dark:text-[#F2B8B5]">
              {activeCount}
            </span>
          </span>
          <span className="text-[#44474F] dark:text-[#C4C6D0]" aria-hidden="true">
            ·
          </span>
          <span>
            <span className="text-[#44474F] dark:text-[#C4C6D0]">Total: </span>
            <span className="font-mono-tabular font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
              {alerts.length}
            </span>
          </span>
          <button
            type="button"
            onClick={onSignOutTeacher}
            aria-label="Sign out of teacher mode"
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 bg-white hover:bg-[#EAEFF7] text-[#44474F] border border-[#C4C6D0] dark:bg-[#191C22] dark:hover:bg-[#282B33] dark:text-[#C4C6D0] dark:border-[#44474F] transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] divide-y divide-[#E2E7F0] dark:divide-[#282B33]">
        {alerts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-[#1A1C1E] dark:text-[#E2E2E9]">
              No dropout risk alerts recorded
            </p>
            <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-1">
              Alerts appear here automatically when Shiksha-Agent detects high student
              frustration or repeated foundational failure.
            </p>
          </div>
        ) : (
          alerts.map((alert) => (
            <DropoutAlertRow
              key={alert.id}
              alert={alert}
              student={studentById.get(alert.student_id)}
              onToggleAcknowledge={onToggleAcknowledge}
              onOpenInterventionInAide={onOpenInterventionInAide}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default DropoutAlertsView;
