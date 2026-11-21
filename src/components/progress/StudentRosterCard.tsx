import { MessageSquareHeart, ShieldCheck, Trash2 } from 'lucide-react';
import type {
  DropoutAlert,
  ProgressLog,
  TeacherStudentProfile,
} from '../../../shared/types';

export interface StudentRosterCardProps {
  students: TeacherStudentProfile[];
  progressLogs: ProgressLog[];
  dropoutAlerts: DropoutAlert[];
  onOpenParentUpdate?: (student: TeacherStudentProfile) => void;
  onRequestDeleteStudent?: (student: TeacherStudentProfile) => void;
}

/**
 * Student roster card surfacing ID-mapped masked contact privacy, regional
 * Parent Update triggers, and student data deletion controls.
 */
export function StudentRosterCard({
  students,
  progressLogs,
  dropoutAlerts,
  onOpenParentUpdate,
  onRequestDeleteStudent,
}: StudentRosterCardProps) {
  return (
    <div className="rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E7F0] dark:border-[#282B33] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
            Students · Parent Updates & Data Privacy
          </h2>
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
            Internal IDs replace raw phone numbers; contacts stay masked as ******1234.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F5223] dark:text-[#A8DAB5]">
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>ID-Mapped Privacy Active</span>
        </span>
      </div>

      <ul className="divide-y divide-[#E2E7F0] dark:divide-[#282B33]">
        {students.map((student) => {
          const stuLogsCount = progressLogs.filter(
            (l) => l.student_id === student.id
          ).length;
          const stuAlertsCount = dropoutAlerts.filter(
            (a) => a.student_id === student.id
          ).length;
          return (
            <li
              key={student.id}
              className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
                  {student.name}
                </p>
                <p className="text-xs font-mono-tabular text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
                  {student.id} · {student.grade} · {student.board}
                  {student.maskedPhone ? ` · Phone ${student.maskedPhone}` : ''}
                </p>
                <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
                  {stuLogsCount} {stuLogsCount === 1 ? 'log' : 'logs'} ·{' '}
                  {stuAlertsCount} {stuAlertsCount === 1 ? 'alert' : 'alerts'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {onOpenParentUpdate && (
                  <button
                    type="button"
                    onClick={() => onOpenParentUpdate(student)}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#D3E3FD] hover:bg-[#BED6FB] text-[#041E49] dark:bg-[#0842A0] dark:hover:bg-[#0B57D0] dark:text-[#E8F0FE] transition-colors whitespace-nowrap"
                  >
                    <MessageSquareHeart
                      className="w-3.5 h-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Parent update</span>
                  </button>
                )}

                {onRequestDeleteStudent && (
                  <button
                    type="button"
                    onClick={() => onRequestDeleteStudent(student)}
                    disabled={stuLogsCount === 0 && stuAlertsCount === 0}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#F9DEDC] hover:bg-[#F4C7C3] text-[#410E0B] dark:bg-[#8C1D18] dark:hover:bg-[#A6251F] dark:text-[#F9DEDC] transition-colors disabled:opacity-45 whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Delete student data</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
