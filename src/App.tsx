import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppTab } from '../shared/types';
import { AppShell } from './components/AppShell';
import { LandingPage } from './components/LandingPage';
import { useShikshaState } from './hooks/useShikshaState';
import { useTeacherAuth } from './hooks/useTeacherAuth';
import { useTheme } from './hooks/useTheme';
import {
  type AppRoute,
  getCurrentRoute,
  getTabFromSearch,
  isTeacherTab,
  pushAppRoute,
  pushHomeRoute,
} from './routing';

/**
 * Root Shiksha-Agent application coordinating the public landing page at `/`,
 * the full student/teacher workspace at `/app`, theme & text-size persistence,
 * teacher RBAC auth, and student session state.
 */
export default function App() {
  const [route, setRoute] = useState<AppRoute>(getCurrentRoute);
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const requested = getTabFromSearch();
    return requested && !isTeacherTab(requested) ? requested : 'tutor';
  });

  const { isDark, toggleTheme, textSize, setTextSize } = useTheme();

  const onResetTeacherSessionIdRef = useRef<() => void>(() => {});
  const onStudentDataDeletedRef = useRef<(studentId: string) => void>(() => {});

  const handleResetTeacherSessionId = useCallback(() => {
    onResetTeacherSessionIdRef.current();
  }, []);

  const handleStudentDataDeleted = useCallback((studentId: string) => {
    onStudentDataDeletedRef.current(studentId);
  }, []);

  const teacher = useTeacherAuth({
    onSelectActiveTab: setActiveTab,
    onResetTeacherSessionId: handleResetTeacherSessionId,
    onStudentDataDeleted: handleStudentDataDeleted,
  });

  const state = useShikshaState({
    activeTab,
    onSelectActiveTab: setActiveTab,
    teacherCode: teacher.teacherCode,
    teacherOverview: teacher.teacherOverview,
    setTeacherOverview: teacher.setTeacherOverview,
    clearTeacherSession: teacher.clearTeacherSession,
    promptTeacherLogin: teacher.promptTeacherLogin,
  });

  useEffect(() => {
    onResetTeacherSessionIdRef.current = state.resetTeacherSessionId;
    onStudentDataDeletedRef.current = state.clearDeletedStudentData;
  }, [state.resetTeacherSessionId, state.clearDeletedStudentData]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getCurrentRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelectTab = useCallback(
    (tab: AppTab) => {
      if (!isTeacherTab(tab)) {
        setActiveTab(tab);
        return;
      }
      teacher.openTeacherTab(tab);
    },
    [teacher]
  );

  const handleOpenAppFromLanding = useCallback(
    (initialTab: AppTab = 'tutor') => {
      pushAppRoute(initialTab);
      setRoute('/app');
      handleSelectTab(initialTab);
    },
    [handleSelectTab]
  );

  const handleGoHome = useCallback(() => {
    pushHomeRoute();
    setRoute('/');
  }, []);

  if (route === '/') {
    return (
      <LandingPage
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenApp={handleOpenAppFromLanding}
      />
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      onGoHome={handleGoHome}
      activeAlertCount={teacher.activeAlertCount}
      isDark={isDark}
      onToggleTheme={toggleTheme}
      textSize={textSize}
      onChangeTextSize={setTextSize}
      publicStudents={state.publicStudents}
      selectedStudentId={state.selectedStudentId}
      onSelectStudentId={state.handleSelectStudentId}
      studentMessages={state.studentMessages}
      onSendStudentMessage={(text, attachment, hintLevel) =>
        state.sendChat('student', text, attachment, hintLevel)
      }
      onResetStudentChat={state.resetStudentChat}
      studentDraftPrompt={state.studentDraftPrompt}
      onConsumeStudentDraftPrompt={() => state.setStudentDraftPrompt('')}
      studentLoading={state.studentLoading}
      studentError={state.studentError}
      studentProgressLogs={state.studentProgressLogs}
      learningPath={state.learningPath}
      learningPathLoading={state.learningPathLoading}
      learningPathError={state.learningPathError}
      onRefreshPath={() => void state.fetchLearningPath(state.selectedStudentId, true)}
      onPracticePathStep={state.handlePracticePathStep}
      onStartQuiz={state.quiz.handleStartQuiz}
      teacherOverview={teacher.teacherOverview}
      teacherMessages={state.teacherMessages}
      onSendTeacherMessage={(text, attachment) =>
        state.sendChat('teacher', text, attachment)
      }
      onResetTeacherChat={state.resetTeacherChat}
      onSignOutTeacher={() => teacher.clearTeacherSession()}
      onGenerateWeeklySummary={teacher.handleGenerateWeeklySummary}
      onGenerateParentUpdate={teacher.handleGenerateParentUpdate}
      onDeleteStudentData={teacher.handleDeleteStudentData}
      onToggleAcknowledge={teacher.handleToggleAcknowledge}
      onOpenInterventionInAide={state.handleOpenInterventionInAide}
      teacherLoading={state.teacherLoading}
      teacherError={state.teacherError}
      teacherDraftPrompt={state.teacherDraftPrompt}
      onConsumeTeacherDraftPrompt={() => state.setTeacherDraftPrompt('')}
      quizOpen={state.quiz.quizOpen}
      quizLoading={state.quiz.quizLoading}
      quizSubmitting={state.quiz.quizSubmitting}
      quizTopicLabel={state.quiz.quizTopicLabel}
      activeQuiz={state.quiz.activeQuiz}
      quizResult={state.quiz.quizResult}
      quizError={state.quiz.quizError}
      onSubmitQuizAnswers={state.quiz.handleSubmitQuizAnswers}
      onCloseQuiz={state.quiz.closeQuiz}
      loginDialogOpen={teacher.loginDialogOpen}
      loginSubmitting={teacher.loginSubmitting}
      loginError={teacher.loginError}
      onTeacherLoginSubmit={teacher.handleTeacherLoginSubmit}
      onCloseLoginDialog={teacher.closeLoginDialog}
    />
  );
}
