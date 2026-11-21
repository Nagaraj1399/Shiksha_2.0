import { useCallback, useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import { buildClassHeatmap, exportHeatmapToCsv } from '../../shared/educationLogic';
import { filterProgressLogs } from '../../shared/shikshaLogic';
import type {
  CompetencyLevel,
  DropoutAlert,
  ParentUpdateLanguage,
  ParentUpdateResponse,
  ProgressLog,
  TeacherStudentProfile,
} from '../../shared/types';
import { DeleteStudentDataDialog } from './DeleteStudentDataDialog';
import { ParentUpdateModal } from './ParentUpdateModal';
import { ProgressHeatmapCard } from './progress/ProgressHeatmapCard';
import { ProgressLogTable } from './progress/ProgressLogTable';
import { StudentRosterCard } from './progress/StudentRosterCard';

interface ProgressLedgerViewProps {
  students: TeacherStudentProfile[];
  progressLogs: ProgressLog[];
  dropoutAlerts?: DropoutAlert[];
  onGenerateParentUpdate?: (
    studentId: string,
    language: ParentUpdateLanguage
  ) => Promise<ParentUpdateResponse>;
  onDeleteStudentData?: (studentId: string) => Promise<void>;
  onSignOutTeacher: () => void;
}

function defaultParentLanguage(preferredLanguage?: string): ParentUpdateLanguage {
  const norm = (preferredLanguage ?? '').toLowerCase();
  if (norm.includes('tamil')) return 'Tamil';
  if (norm.includes('marathi')) return 'Marathi';
  if (norm.includes('hindi')) return 'Hindi';
  return 'English';
}

/**
 * Teacher-only Student Progress Ledger, Class Mastery Heatmap (students ×
 * topics), regional-language Parent Update generator, and Privacy / Delete
 * Student Data controls.
 */
export function ProgressLedgerView({
  students,
  progressLogs,
  dropoutAlerts = [],
  onGenerateParentUpdate,
  onDeleteStudentData,
  onSignOutTeacher,
}: ProgressLedgerViewProps) {
  const [filter, setFilter] = useState<'All' | CompetencyLevel>('All');
  const [query, setQuery] = useState('');

  const [parentTarget, setParentTarget] = useState<TeacherStudentProfile | null>(null);
  const [parentLang, setParentLang] = useState<ParentUpdateLanguage>('Hindi');
  const [parentUpdate, setParentUpdate] = useState<ParentUpdateResponse | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<TeacherStudentProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);

  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const loadParentUpdate = useCallback(
    async (student: TeacherStudentProfile, lang: ParentUpdateLanguage) => {
      if (!onGenerateParentUpdate) return;
      setParentLoading(true);
      setParentError(null);
      setParentUpdate(null);
      try {
        const result = await onGenerateParentUpdate(student.id, lang);
        setParentUpdate(result);
      } catch (err) {
        setParentError(
          err instanceof Error
            ? err.message
            : 'Unable to draft the parent update right now.'
        );
      } finally {
        setParentLoading(false);
      }
    },
    [onGenerateParentUpdate]
  );

  const handleOpenParentUpdate = (student: TeacherStudentProfile) => {
    const lang = defaultParentLanguage(student.preferredLanguage);
    setParentTarget(student);
    setParentLang(lang);
    void loadParentUpdate(student, lang);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !onDeleteStudentData) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const targetName = deleteTarget.name;
      const targetId = deleteTarget.id;
      await onDeleteStudentData(targetId);
      setDeleteTarget(null);
      setPrivacyNotice(
        `Removed all progress logs and dropout alerts for ${targetName} (${targetId}) from data/shiksha_store.json.`
      );
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Unable to delete student data right now.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = useMemo(
    () => filterProgressLogs(progressLogs, filter, query),
    [progressLogs, filter, query]
  );

  const heatmap = useMemo(
    () => buildClassHeatmap(students, progressLogs),
    [students, progressLogs]
  );

  const { masteredTotal, strugglingTotal, frustrationTotal } = useMemo(() => {
    let mastered = 0;
    let struggling = 0;
    let frustration = 0;
    for (const log of progressLogs) {
      if (log.competency_level === 'Mastered') mastered += 1;
      else if (log.competency_level === 'Struggling') struggling += 1;
      if (log.frustration_detected) frustration += 1;
    }
    return {
      masteredTotal: mastered,
      strugglingTotal: struggling,
      frustrationTotal: frustration,
    };
  }, [progressLogs]);

  const handleExportCsv = () => {
    const csv = exportHeatmapToCsv(heatmap);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'shiksha-class-heatmap.csv';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="Student Progress Ledger" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
            Student Progress & Class Heatmap
          </h1>
          <p className="text-sm text-[#44474F] dark:text-[#C4C6D0] mt-1">
            Real-time competency matrix, hints used, and quiz assessments logged by
            Shiksha-Agent
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm">
          <div>
            <span className="text-[#44474F] dark:text-[#C4C6D0]">Total Logs: </span>
            <span className="font-mono-tabular font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
              {progressLogs.length}
            </span>
          </div>
          <div>
            <span className="text-[#44474F] dark:text-[#C4C6D0]">Mastered: </span>
            <span className="font-mono-tabular font-semibold text-[#0F5223] dark:text-[#A8DAB5]">
              {masteredTotal}
            </span>
          </div>
          <div>
            <span className="text-[#44474F] dark:text-[#C4C6D0]">Struggling: </span>
            <span className="font-mono-tabular font-semibold text-[#B3261E] dark:text-[#F2B8B5]">
              {strugglingTotal}
            </span>
          </div>
          <div>
            <span className="text-[#44474F] dark:text-[#C4C6D0]">
              Frustration Flagged:{' '}
            </span>
            <span className="font-mono-tabular font-semibold text-[#854D00] dark:text-[#F6C86E]">
              {frustrationTotal}
            </span>
          </div>
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

      {privacyNotice && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3 rounded-2xl bg-[#C4EED0] text-[#072711] dark:bg-[#0F5223] dark:text-[#C4EED0] text-xs font-medium flex items-center justify-between gap-3"
        >
          <span>{privacyNotice}</span>
          <button
            type="button"
            onClick={() => setPrivacyNotice(null)}
            className="min-h-[44px] px-2 text-xs font-semibold underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <StudentRosterCard
        students={students}
        progressLogs={progressLogs}
        dropoutAlerts={dropoutAlerts}
        onOpenParentUpdate={onGenerateParentUpdate ? handleOpenParentUpdate : undefined}
        onRequestDeleteStudent={
          onDeleteStudentData
            ? (student) => {
                setDeleteError(null);
                setDeleteTarget(student);
              }
            : undefined
        }
      />

      <ProgressHeatmapCard heatmap={heatmap} onExportCsv={handleExportCsv} />

      <ProgressLogTable
        filter={filter}
        onChangeFilter={setFilter}
        query={query}
        onChangeQuery={setQuery}
        filteredLogs={filtered}
        studentById={studentById}
      />

      <ParentUpdateModal
        isOpen={Boolean(parentTarget)}
        student={parentTarget}
        language={parentLang}
        onChangeLanguage={(lang) => {
          setParentLang(lang);
          if (parentTarget) {
            void loadParentUpdate(parentTarget, lang);
          }
        }}
        update={parentUpdate}
        isLoading={parentLoading}
        errorMessage={parentError}
        onRegenerate={() => {
          if (parentTarget) {
            void loadParentUpdate(parentTarget, parentLang);
          }
        }}
        onClose={() => {
          setParentTarget(null);
          setParentError(null);
        }}
      />

      <DeleteStudentDataDialog
        isOpen={Boolean(deleteTarget)}
        student={deleteTarget}
        logCount={
          deleteTarget
            ? progressLogs.filter((l) => l.student_id === deleteTarget.id).length
            : 0
        }
        alertCount={
          deleteTarget
            ? dropoutAlerts.filter((a) => a.student_id === deleteTarget.id).length
            : 0
        }
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      />
    </section>
  );
}

export default ProgressLedgerView;
