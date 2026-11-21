import { lazy, Suspense } from 'react';
import type {
  AppTab,
  ChatMessage,
  DropoutAlert,
  HintLevel,
  ParentUpdateLanguage,
  ParentUpdateResponse,
  ProgressLog,
  PublicPracticeQuiz,
  PublicStudentProfile,
  QuizSubmissionResult,
  StudentLearningPath,
  TeacherOverviewResponse,
  TextSizeScale,
  WeeklySummaryResponse,
} from '../../shared/types';
import type { EncodedImageAttachment } from '../utils/imageHelper';
import { PracticeQuizModal } from './PracticeQuizModal';
import { StudentTutorView } from './StudentTutorView';
import { TeacherLoginDialog } from './TeacherLoginDialog';
import { TopBar } from './TopBar';

const MyPathView = lazy(() => import('./MyPathView'));
const TeacherAideView = lazy(() => import('./TeacherAideView'));
const ProgressLedgerView = lazy(() => import('./ProgressLedgerView'));
const DropoutAlertsView = lazy(() => import('./DropoutAlertsView'));

function LazyViewFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-8 flex items-center justify-center min-h-[320px]"
    >
      <div className="flex items-center gap-3 text-sm text-[#44474F] dark:text-[#C4C6D0]">
        <span className="w-4 h-4 rounded-full border-2 border-[#0B57D0] dark:border-[#A8C7FA] border-t-transparent animate-spin" />
        <span>Loading {label}...</span>
      </div>
    </div>
  );
}

export interface AppShellProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onGoHome: () => void;
  activeAlertCount: number | null;
  isDark: boolean;
  onToggleTheme: () => void;
  textSize: TextSizeScale;
  onChangeTextSize: (size: TextSizeScale) => void;
  publicStudents: PublicStudentProfile[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  studentMessages: ChatMessage[];
  onSendStudentMessage: (
    text: string,
    attachment?: EncodedImageAttachment,
    hintLevel?: HintLevel
  ) => Promise<void>;
  onResetStudentChat: () => void;
  studentDraftPrompt: string;
  onConsumeStudentDraftPrompt: () => void;
  studentLoading: boolean;
  studentError: string | null;
  studentProgressLogs: ProgressLog[];
  learningPath: StudentLearningPath | null;
  learningPathLoading: boolean;
  learningPathError: string | null;
  onRefreshPath: () => void;
  onPracticePathStep: (subject: string, topic: string) => void;
  onStartQuiz: (subject: string, topic: string) => void;
  teacherOverview: TeacherOverviewResponse | null;
  teacherMessages: ChatMessage[];
  onSendTeacherMessage: (
    text: string,
    attachment?: EncodedImageAttachment
  ) => Promise<void>;
  onResetTeacherChat: () => void;
  onSignOutTeacher: () => void;
  onGenerateWeeklySummary: () => Promise<WeeklySummaryResponse>;
  onGenerateParentUpdate: (
    studentId: string,
    language: ParentUpdateLanguage
  ) => Promise<ParentUpdateResponse>;
  onDeleteStudentData: (studentId: string) => Promise<void>;
  onToggleAcknowledge: (alertId: string) => Promise<void>;
  onOpenInterventionInAide: (alert: DropoutAlert) => void;
  teacherLoading: boolean;
  teacherError: string | null;
  teacherDraftPrompt: string;
  onConsumeTeacherDraftPrompt: () => void;
  quizOpen: boolean;
  quizLoading: boolean;
  quizSubmitting: boolean;
  quizTopicLabel: string;
  activeQuiz: PublicPracticeQuiz | null;
  quizResult: QuizSubmissionResult | null;
  quizError: string | null;
  onSubmitQuizAnswers: (answers: number[]) => Promise<void>;
  onCloseQuiz: () => void;
  loginDialogOpen: boolean;
  loginSubmitting: boolean;
  loginError: string | null;
  onTeacherLoginSubmit: (code: string) => Promise<void>;
  onCloseLoginDialog: () => void;
}

/**
 * Authenticated & student workspace shell rendered at `/app`, containing the
 * Skip Link, TopBar, active workspace view (with lazy-loaded tabs), Practice
 * Quiz modal, and Teacher Login dialog.
 */
export function AppShell({
  activeTab,
  onSelectTab,
  onGoHome,
  activeAlertCount,
  isDark,
  onToggleTheme,
  textSize,
  onChangeTextSize,
  publicStudents,
  selectedStudentId,
  onSelectStudentId,
  studentMessages,
  onSendStudentMessage,
  onResetStudentChat,
  studentDraftPrompt,
  onConsumeStudentDraftPrompt,
  studentLoading,
  studentError,
  studentProgressLogs,
  learningPath,
  learningPathLoading,
  learningPathError,
  onRefreshPath,
  onPracticePathStep,
  onStartQuiz,
  teacherOverview,
  teacherMessages,
  onSendTeacherMessage,
  onResetTeacherChat,
  onSignOutTeacher,
  onGenerateWeeklySummary,
  onGenerateParentUpdate,
  onDeleteStudentData,
  onToggleAcknowledge,
  onOpenInterventionInAide,
  teacherLoading,
  teacherError,
  teacherDraftPrompt,
  onConsumeTeacherDraftPrompt,
  quizOpen,
  quizLoading,
  quizSubmitting,
  quizTopicLabel,
  activeQuiz,
  quizResult,
  quizError,
  onSubmitQuizAnswers,
  onCloseQuiz,
  loginDialogOpen,
  loginSubmitting,
  loginError,
  onTeacherLoginSubmit,
  onCloseLoginDialog,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FC] text-[#1A1C1E] dark:bg-[#111318] dark:text-[#E2E2E9] transition-colors duration-200">
      <a
        href="#main-content"
        className="no-print sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:min-h-[44px] focus:inline-flex focus:items-center focus:px-4 focus:py-2 focus:rounded-xl focus:bg-[#0B57D0] focus:text-white dark:focus:bg-[#A8C7FA] dark:focus:text-[#062E6F] focus:font-semibold focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>

      <TopBar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onGoHome={onGoHome}
        activeAlertCount={activeAlertCount}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        textSize={textSize}
        onChangeTextSize={onChangeTextSize}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]"
      >
        {activeTab === 'tutor' && (
          <StudentTutorView
            students={publicStudents}
            selectedStudentId={selectedStudentId}
            onSelectStudentId={onSelectStudentId}
            messages={studentMessages}
            onSendMessage={onSendStudentMessage}
            onResetChat={onResetStudentChat}
            onStartQuiz={onStartQuiz}
            draftPrompt={studentDraftPrompt}
            onConsumeDraftPrompt={onConsumeStudentDraftPrompt}
            isLoading={studentLoading}
            errorMessage={studentError}
            progressLogs={studentProgressLogs}
          />
        )}

        {activeTab === 'path' && (
          <Suspense fallback={<LazyViewFallback label="Personalised Learning Path" />}>
            <MyPathView
              students={publicStudents}
              selectedStudentId={selectedStudentId}
              onSelectStudentId={onSelectStudentId}
              learningPath={learningPath}
              progressLogs={studentProgressLogs}
              isLoading={learningPathLoading}
              errorMessage={learningPathError}
              onRefreshPath={onRefreshPath}
              onPracticeStep={onPracticePathStep}
              onStartQuiz={onStartQuiz}
            />
          </Suspense>
        )}

        {activeTab === 'teacher' && teacherOverview && (
          <Suspense fallback={<LazyViewFallback label="Teacher Aide" />}>
            <TeacherAideView
              students={teacherOverview.students}
              progressLogs={teacherOverview.progressLogs}
              dropoutAlerts={teacherOverview.dropoutAlerts}
              messages={teacherMessages}
              onSendMessage={onSendTeacherMessage}
              onResetChat={onResetTeacherChat}
              onSignOutTeacher={onSignOutTeacher}
              onGenerateWeeklySummary={onGenerateWeeklySummary}
              isLoading={teacherLoading}
              errorMessage={teacherError}
              draftPrompt={teacherDraftPrompt}
              onConsumeDraftPrompt={onConsumeTeacherDraftPrompt}
            />
          </Suspense>
        )}

        {activeTab === 'progress' && teacherOverview && (
          <Suspense fallback={<LazyViewFallback label="Progress Ledger" />}>
            <ProgressLedgerView
              students={teacherOverview.students}
              progressLogs={teacherOverview.progressLogs}
              dropoutAlerts={teacherOverview.dropoutAlerts}
              onGenerateParentUpdate={onGenerateParentUpdate}
              onDeleteStudentData={onDeleteStudentData}
              onSignOutTeacher={onSignOutTeacher}
            />
          </Suspense>
        )}

        {activeTab === 'alerts' && teacherOverview && (
          <Suspense fallback={<LazyViewFallback label="Dropout Alerts" />}>
            <DropoutAlertsView
              students={teacherOverview.students}
              alerts={teacherOverview.dropoutAlerts}
              onToggleAcknowledge={onToggleAcknowledge}
              onOpenInterventionInAide={onOpenInterventionInAide}
              onSignOutTeacher={onSignOutTeacher}
            />
          </Suspense>
        )}
      </main>

      <PracticeQuizModal
        isOpen={quizOpen}
        isLoading={quizLoading}
        isSubmitting={quizSubmitting}
        topicLabel={quizTopicLabel}
        quiz={activeQuiz}
        result={quizResult}
        errorMessage={quizError}
        onSubmitAnswers={onSubmitQuizAnswers}
        onClose={onCloseQuiz}
      />

      <TeacherLoginDialog
        isOpen={loginDialogOpen}
        isSubmitting={loginSubmitting}
        errorMessage={loginError}
        onSubmit={onTeacherLoginSubmit}
        onClose={onCloseLoginDialog}
      />
    </div>
  );
}
