import { useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Compass,
  Loader2,
  Lock,
  MessageSquareHeart,
  PlayCircle,
  RefreshCw,
} from 'lucide-react';
import type {
  LearningPathStep,
  ProgressLog,
  PublicStudentProfile,
  StudentLearningPath,
} from '../../shared/types';

interface MyPathViewProps {
  students: PublicStudentProfile[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  learningPath: StudentLearningPath | null;
  progressLogs: ProgressLog[];
  isLoading: boolean;
  errorMessage: string | null;
  onRefreshPath: () => void;
  onPracticeStep: (subject: string, topic: string) => void;
  onStartQuiz: (subject: string, topic: string) => void;
}

function StepStatusBadge({ status }: { status: LearningPathStep['status'] }) {
  if (status === 'Mastered') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C4EED0] text-[#072711] dark:bg-[#0F5223] dark:text-[#C4EED0]">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Mastered</span>
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D3E3FD] text-[#041E49] dark:bg-[#0842A0] dark:text-[#E8F0FE]">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>In Progress</span>
      </span>
    );
  }
  if (status === 'Unlocked') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C2E7FF] text-[#001D35] dark:bg-[#004A77] dark:text-[#D8F0FF]">
        <PlayCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Unlocked</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAEFF7] text-[#44474F] dark:bg-[#282B33] dark:text-[#C4C6D0]">
      <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Locked</span>
    </span>
  );
}

/**
 * Student-facing "My Path" view displaying a Gemini-generated 5-step
 * Personalised Learning Path that unlocks sequentially as topics reach Mastery
 * and launches 3-question bilingual Practice Quizzes on Mastered steps.
 */
export function MyPathView({
  students,
  selectedStudentId,
  onSelectStudentId,
  learningPath,
  progressLogs,
  isLoading,
  errorMessage,
  onRefreshPath,
  onPracticeStep,
  onStartQuiz,
}: MyPathViewProps) {
  const activeStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? students[0],
    [students, selectedStudentId]
  );

  const steps = useMemo(() => learningPath?.steps ?? [], [learningPath]);

  const masteredCount = useMemo(
    () => steps.filter((s) => s.status === 'Mastered').length,
    [steps]
  );

  const totalMinutes = useMemo(
    () => steps.reduce((sum, s) => sum + s.estimatedMinutes, 0),
    [steps]
  );

  const masteredLogs = useMemo(
    () =>
      progressLogs.filter(
        (l) => l.student_id === activeStudent?.id && l.competency_level === 'Mastered'
      ),
    [progressLogs, activeStudent?.id]
  );

  const completionPct =
    steps.length > 0 ? Math.round((masteredCount / steps.length) * 100) : 0;

  return (
    <section aria-label="Personalised Learning Path" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#0B57D0] dark:text-[#A8C7FA] inline-flex items-center gap-1.5">
            <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Personalised Learning Path</span>
          </p>
          <h1 className="font-display text-2xl font-semibold text-[#1A1C1E] dark:text-[#E2E2E9] mt-1">
            My Learning Path
          </h1>
          <p className="text-sm text-[#44474F] dark:text-[#C4C6D0] mt-1">
            A 5-step study roadmap tailored from your progress logs. Steps unlock as
            each topic reaches Mastered.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label htmlFor="path-student-select" className="sr-only">
            Active student profile for learning path
          </label>
          <select
            id="path-student-select"
            value={selectedStudentId}
            onChange={(e) => onSelectStudentId(e.target.value)}
            disabled={students.length === 0}
            className="min-h-[44px] max-w-full min-w-0 px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#282B33] text-[#1A1C1E] dark:text-[#E2E2E9] border border-[#C4C6D0] dark:border-[#44474F]"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onRefreshPath}
            disabled={isLoading || !activeStudent}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>Regenerate Path</span>
          </button>
        </div>
      </div>

      {/* Mastery Summary Card */}
      <div className="rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
              {activeStudent
                ? `${activeStudent.name} · ${activeStudent.grade} (${activeStudent.board})`
                : 'Loading student profile...'}
            </h2>
            <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-1">
              {masteredCount} of {steps.length || 5} path steps mastered · Est. total:{' '}
              <span className="font-mono-tabular font-semibold">
                {totalMinutes} min
              </span>
              {masteredLogs.length > 0
                ? ` · ${masteredLogs.length} mastered topic log${masteredLogs.length === 1 ? '' : 's'}`
                : ''}
            </p>
          </div>
          <span className="font-mono-tabular text-sm font-semibold text-[#0B57D0] dark:text-[#A8C7FA]">
            {completionPct}% complete
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Learning path mastery progress"
          aria-valuenow={masteredCount}
          aria-valuemin={0}
          aria-valuemax={steps.length || 5}
          className="mt-3 grid grid-cols-5 gap-1.5"
        >
          {Array.from({ length: steps.length || 5 }, (_, idx) => (
            <span
              key={idx}
              aria-hidden="true"
              className={`h-2.5 rounded-full transition-colors duration-200 ${
                idx < masteredCount
                  ? 'bg-[#0B57D0] dark:bg-[#A8C7FA]'
                  : 'bg-[#DCE4F2] dark:bg-[#282B33]'
              }`}
            />
          ))}
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="px-4 py-3 rounded-2xl bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] text-sm font-medium"
        >
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-10 flex items-center justify-center gap-3 text-sm text-[#44474F] dark:text-[#C4C6D0]"
        >
          <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />
          <span>Building your personalised 5-step path…</span>
        </div>
      ) : (
        <ol className="space-y-4">
          {steps.map((step) => {
            const isLocked = step.status === 'Locked';
            const isMastered = step.status === 'Mastered';
            return (
              <li
                key={`${step.stepNumber}-${step.topic}`}
                className={`rounded-[24px] border p-5 transition-colors ${
                  isLocked
                    ? 'bg-[#F2F4F8]/70 dark:bg-[#191C22]/70 border-[#E2E7F0] dark:border-[#282B33]'
                    : 'bg-white dark:bg-[#191C22] border-[#D4DBE8] dark:border-[#2F333D]'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      aria-hidden="true"
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-mono-tabular text-sm font-bold shrink-0 ${
                        isMastered
                          ? 'bg-[#C4EED0] text-[#072711] dark:bg-[#0F5223] dark:text-[#C4EED0]'
                          : isLocked
                            ? 'bg-[#EAEFF7] text-[#44474F] dark:bg-[#282B33] dark:text-[#C4C6D0]'
                            : 'bg-[#D3E3FD] text-[#041E49] dark:bg-[#0842A0] dark:text-[#E8F0FE]'
                      }`}
                    >
                      {step.stepNumber}
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StepStatusBadge status={step.status} />
                        <span className="text-xs font-medium text-[#44474F] dark:text-[#C4C6D0]">
                          {step.subject}
                        </span>
                        <span
                          aria-hidden="true"
                          className="text-xs text-[#44474F] dark:text-[#C4C6D0]"
                        >
                          ·
                        </span>
                        <span className="text-xs font-mono-tabular text-[#44474F] dark:text-[#C4C6D0]">
                          ~{step.estimatedMinutes} min
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
                        {step.topic}
                      </h3>

                      <p className="text-sm text-[#44474F] dark:text-[#C4C6D0] leading-relaxed">
                        {step.why}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {isLocked ? (
                      <span className="text-xs font-medium text-[#44474F] dark:text-[#C4C6D0] px-3 py-2">
                        Master earlier step to unlock
                      </span>
                    ) : isMastered ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onStartQuiz(step.subject, step.topic)}
                          className="min-h-[44px] px-4 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] transition-colors whitespace-nowrap"
                        >
                          <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>Take 3-Question Quiz</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onPracticeStep(step.subject, step.topic)}
                          className="min-h-[44px] px-4 py-2 rounded-2xl text-xs font-medium inline-flex items-center gap-1.5 bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors whitespace-nowrap"
                        >
                          <MessageSquareHeart
                            className="w-4 h-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Review with Tutor</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPracticeStep(step.subject, step.topic)}
                        className="min-h-[44px] px-4 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] transition-colors whitespace-nowrap"
                      >
                        <MessageSquareHeart
                          className="w-4 h-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>Practice with Tutor</span>
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default MyPathView;
