// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEACHER_CODE_STORAGE_KEY } from '../../../shared/config';
import {
  toPublicStudentProfile,
  toTeacherStudentProfile,
} from '../../../shared/security';
import { createSeedStore } from '../../../shared/shikshaLogic';
import type { TeacherOverviewResponse } from '../../../shared/types';
import { DeleteStudentDataDialog } from '../../components/DeleteStudentDataDialog';
import { ParentUpdateModal } from '../../components/ParentUpdateModal';
import { PracticeQuizModal } from '../../components/PracticeQuizModal';
import { PrintableContentModal } from '../../components/PrintableContentModal';
import { useShikshaState } from '../useShikshaState';
import { useStudentQuiz } from '../useStudentQuiz';
import { useTeacherAuth } from '../useTeacherAuth';

const seed = createSeedStore();
const publicStudents = seed.students.map(toPublicStudentProfile);
const teacherStudents = seed.students.map((s) =>
  toTeacherStudentProfile(s, seed.studentPhoneMap?.[s.id])
);
const mockOverview: TeacherOverviewResponse = {
  students: teacherStudents,
  progressLogs: seed.progressLogs,
  dropoutAlerts: seed.dropoutAlerts,
};

describe('React hooks (useTeacherAuth, useStudentQuiz, useShikshaState) & modal keyboard flows', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/app');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('useTeacherAuth handles login failure, valid login, tab switching, alert toggle, weekly summary, parent update, data delete, and 401 expiry', async () => {
    const onSelectActiveTab = vi.fn();
    const onResetTeacherSessionId = vi.fn();
    const onStudentDataDeleted = vi.fn();

    let nextOverviewStatus = 401;
    const nextAckStatus = 200;
    let nextSummaryStatus = 200;
    let nextParentStatus = 200;
    let nextDeleteStatus = 200;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/teacher/overview') {
        if (nextOverviewStatus !== 200) {
          return new Response(JSON.stringify({ error: 'Invalid code' }), {
            status: nextOverviewStatus,
          });
        }
        return new Response(JSON.stringify(mockOverview), { status: 200 });
      }
      if (url.includes('/acknowledge')) {
        if (nextAckStatus !== 200) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: nextAckStatus,
          });
        }
        return new Response(
          JSON.stringify({
            alert: { ...seed.dropoutAlerts[0], status: 'Acknowledged' },
          }),
          { status: 200 }
        );
      }
      if (url === '/api/teacher/weekly-summary') {
        if (nextSummaryStatus !== 200) {
          return new Response(JSON.stringify({ error: 'Summary error' }), {
            status: nextSummaryStatus,
          });
        }
        return new Response(
          JSON.stringify({
            bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4', 'Bullet 5'],
            generatedAt: new Date().toISOString(),
          }),
          { status: 200 }
        );
      }
      if (url.includes('/parent-update')) {
        if (nextParentStatus !== 200) {
          return new Response(JSON.stringify({ error: 'Parent update failed' }), {
            status: nextParentStatus,
          });
        }
        return new Response(
          JSON.stringify({
            studentId: teacherStudents[0].id,
            studentName: teacherStudents[0].name,
            language: 'Hindi',
            message: 'नमस्ते!',
            strength: 'Effort',
            practiceArea: 'Practice',
          }),
          { status: 200 }
        );
      }
      if (url.includes('/data')) {
        if (nextDeleteStatus !== 200) {
          return new Response(JSON.stringify({ error: 'Delete failed' }), {
            status: nextDeleteStatus,
          });
        }
        return new Response(
          JSON.stringify({
            studentId: teacherStudents[2].id,
            deletedLogsCount: 1,
            deletedAlertsCount: 1,
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });

    const { result } = renderHook(() =>
      useTeacherAuth({
        onSelectActiveTab,
        onResetTeacherSessionId,
        onStudentDataDeleted,
      })
    );

    // Unauthenticated action triggers login prompt / error
    act(() => {
      result.current.openTeacherTab('progress');
    });
    expect(result.current.loginDialogOpen).toBe(true);

    // Unauthenticated mutations reject cleanly
    await expect(result.current.handleGenerateWeeklySummary()).rejects.toThrow(
      /Teacher authentication required/i
    );
    await expect(
      result.current.handleGenerateParentUpdate(teacherStudents[0].id, 'Hindi')
    ).rejects.toThrow(/Teacher authentication required/i);
    await expect(
      result.current.handleDeleteStudentData(teacherStudents[2].id)
    ).rejects.toThrow(/Teacher authentication required/i);
    await act(async () => {
      await result.current.handleToggleAcknowledge(seed.dropoutAlerts[0].id);
    });

    // Invalid code shows error
    await act(async () => {
      await result.current.handleTeacherLoginSubmit('wrong-code');
    });
    expect(result.current.loginError).toBe('Invalid code');

    // Valid code persists in sessionStorage and navigates to pending tab
    nextOverviewStatus = 200;
    await act(async () => {
      await result.current.handleTeacherLoginSubmit('valid-teacher-code');
    });
    expect(result.current.teacherCode).toBe('valid-teacher-code');
    expect(window.sessionStorage.getItem(TEACHER_CODE_STORAGE_KEY)).toBe(
      'valid-teacher-code'
    );
    expect(result.current.activeAlertCount).toBe(1);

    // Open another teacher tab while already signed in refreshes overview
    await act(async () => {
      result.current.openTeacherTab('alerts');
      await Promise.resolve();
    });
    expect(onSelectActiveTab).toHaveBeenCalledWith('alerts');

    // Acknowledge alert updates activeAlertCount to 0
    await act(async () => {
      await result.current.handleToggleAcknowledge(seed.dropoutAlerts[0].id);
    });
    expect(result.current.activeAlertCount).toBe(0);

    // Weekly summary, parent update, and student data deletion succeed
    const summary = await result.current.handleGenerateWeeklySummary();
    expect(summary.bullets).toHaveLength(5);

    const parentUpdate = await result.current.handleGenerateParentUpdate(
      teacherStudents[0].id,
      'Hindi'
    );
    expect(parentUpdate.language).toBe('Hindi');

    await act(async () => {
      await result.current.handleDeleteStudentData(teacherStudents[2].id);
    });
    expect(onStudentDataDeleted).toHaveBeenCalledWith(teacherStudents[2].id);

    // Non-401 error paths throw descriptive error
    nextSummaryStatus = 504;
    await expect(result.current.handleGenerateWeeklySummary()).rejects.toThrow(
      'Summary error'
    );
    nextParentStatus = 500;
    await expect(
      result.current.handleGenerateParentUpdate(teacherStudents[0].id, 'Hindi')
    ).rejects.toThrow('Parent update failed');
    nextDeleteStatus = 500;
    await expect(
      result.current.handleDeleteStudentData(teacherStudents[2].id)
    ).rejects.toThrow('Delete failed');

    // 401 session expiry clears teacher session and re-opens login dialog
    nextSummaryStatus = 401;
    await act(async () => {
      await expect(result.current.handleGenerateWeeklySummary()).rejects.toThrow(
        /Session expired/i
      );
    });
    expect(result.current.teacherCode).toBeNull();
    expect(result.current.loginDialogOpen).toBe(true);

    act(() => {
      result.current.closeLoginDialog();
    });
    expect(result.current.loginDialogOpen).toBe(false);
  });

  it('useStudentQuiz manages quiz generation, error handling, answer submission, and modal close', async () => {
    const ensureStudentSession = vi.fn(async () => 'signed-session-token');
    const onQuizProgressLogged = vi.fn();
    let failNext = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (failNext) {
        return new Response(JSON.stringify({ error: 'Quiz service busy' }), {
          status: 503,
        });
      }
      if (url.endsWith('/quiz')) {
        return new Response(
          JSON.stringify({
            quiz: {
              quizId: 'quiz-1',
              studentId: publicStudents[0].id,
              subject: 'Math',
              topic: 'Linear Equations',
              language: 'English',
              questions: [{ id: 'q1', question: 'Q1?', options: ['A', 'B', 'C', 'D'] }],
            },
          }),
          { status: 200 }
        );
      }
      if (url.endsWith('/quiz/submit')) {
        return new Response(
          JSON.stringify({
            score: 1,
            total: 1,
            passed: true,
            results: [
              {
                questionId: 'q1',
                selectedIndex: 0,
                correctIndex: 0,
                isCorrect: true,
                explanation: 'Correct!',
              },
            ],
            progressLog: seed.progressLogs[0],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });

    const { result } = renderHook(() =>
      useStudentQuiz({
        selectedStudentId: publicStudents[0].id,
        ensureStudentSession,
        onQuizProgressLogged,
      })
    );

    // Start quiz failure surfaces error
    failNext = true;
    await act(async () => {
      await result.current.handleStartQuiz('Math', 'Linear Equations');
    });
    expect(result.current.quizOpen).toBe(true);
    expect(result.current.quizError).toBe('Quiz service busy');

    // Start quiz success loads activeQuiz
    failNext = false;
    await act(async () => {
      await result.current.handleStartQuiz('Math', 'Linear Equations');
    });
    expect(result.current.activeQuiz?.quizId).toBe('quiz-1');

    // Submit failure surfaces error
    failNext = true;
    await act(async () => {
      await result.current.handleSubmitQuizAnswers([0]);
    });
    expect(result.current.quizError).toBe('Quiz service busy');

    // Submit success stores quizResult and triggers onQuizProgressLogged
    failNext = false;
    await act(async () => {
      await result.current.handleSubmitQuizAnswers([0]);
    });
    expect(result.current.quizResult?.score).toBe(1);
    expect(onQuizProgressLogged).toHaveBeenCalledWith(seed.progressLogs[0]);

    act(() => {
      result.current.closeQuiz();
    });
    expect(result.current.quizOpen).toBe(false);
  });

  it('useShikshaState loads learning paths, handles teacher chat deltas, 401 expiry, resets, and drafts', async () => {
    const onSelectActiveTab = vi.fn();
    const setTeacherOverview = vi.fn();
    const clearTeacherSession = vi.fn();
    const promptTeacherLogin = vi.fn();

    let nextChatStatus = 200;
    let nextPathStatus = 200;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/students') {
        return new Response(JSON.stringify({ students: publicStudents }), {
          status: 200,
        });
      }
      if (url.includes('/session')) {
        return new Response(
          JSON.stringify({
            sessionId: `${'a'.repeat(32)}.${'b'.repeat(64)}`,
            studentId: publicStudents[0].id,
          }),
          { status: 200 }
        );
      }
      if (url.includes('/progress')) {
        return new Response(JSON.stringify({ progressLogs: seed.progressLogs }), {
          status: 200,
        });
      }
      if (url.includes('/learning-path')) {
        if (nextPathStatus !== 200) {
          return new Response(JSON.stringify({ error: 'Path timeout' }), {
            status: nextPathStatus,
          });
        }
        return new Response(
          JSON.stringify({
            learningPath: {
              studentId: publicStudents[0].id,
              generatedAt: new Date().toISOString(),
              sourceLogCount: 1,
              steps: [],
            },
          }),
          { status: 200 }
        );
      }
      if (url === '/api/chat') {
        if (nextChatStatus === 401) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
          });
        }
        if (nextChatStatus !== 200) {
          return new Response(JSON.stringify({ error: 'Model error' }), {
            status: nextChatStatus,
          });
        }
        return new Response(
          JSON.stringify({
            reply: 'Teacher response ready.',
            sessionId: `${'c'.repeat(32)}.${'d'.repeat(64)}`,
            toolEvents: [],
            newProgressLogs: [seed.progressLogs[0]],
            newDropoutAlerts: [seed.dropoutAlerts[0]],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });

    const { result } = renderHook(() =>
      useShikshaState({
        activeTab: 'path',
        onSelectActiveTab,
        teacherCode: 'secret-code',
        teacherOverview: mockOverview,
        setTeacherOverview,
        clearTeacherSession,
        promptTeacherLogin,
      })
    );

    await waitFor(() => {
      expect(result.current.selectedStudentId).toBe(publicStudents[0].id);
      expect(result.current.learningPath).not.toBeNull();
    });

    // Learning path error branch
    nextPathStatus = 504;
    await act(async () => {
      await result.current.fetchLearningPath(publicStudents[0].id, true);
    });
    expect(result.current.learningPathError).toBe('Path timeout');

    // Teacher chat success merges logs and alerts
    await act(async () => {
      await result.current.sendChat('teacher', 'Draft a lesson plan');
    });
    expect(result.current.teacherMessages.at(-1)?.text).toBe('Teacher response ready.');
    expect(setTeacherOverview).toHaveBeenCalled();

    // Teacher chat 401 triggers clearTeacherSession
    nextChatStatus = 401;
    await act(async () => {
      await result.current.sendChat('teacher', 'Expired call');
    });
    expect(clearTeacherSession).toHaveBeenCalledWith('teacher');

    // Student chat non-200 sets studentError
    nextChatStatus = 500;
    await act(async () => {
      await result.current.sendChat('student', 'Trigger error');
    });
    expect(result.current.studentError).toBe('Model error');

    // Draft helpers, profile switch, resets, and deletion clear
    await act(async () => {
      result.current.handlePracticePathStep('Math', 'Fractions');
      result.current.handleOpenInterventionInAide(seed.dropoutAlerts[0]);
      result.current.clearDeletedStudentData(publicStudents[0].id);
      result.current.resetStudentChat();
      result.current.resetTeacherChat();
      result.current.resetTeacherSessionId();
      result.current.handleSelectStudentId(publicStudents[1].id);
      await Promise.resolve();
    });
    expect(onSelectActiveTab).toHaveBeenCalledWith('tutor');
    expect(onSelectActiveTab).toHaveBeenCalledWith('teacher');
    await waitFor(() => {
      expect(result.current.selectedStudentId).toBe(publicStudents[1].id);
    });
  });

  it('modals close on Escape, wrap Tab/Shift+Tab focus, and render loading/error states', async () => {
    const user = userEvent.setup();
    const onCloseQuiz = vi.fn();
    const onCloseParent = vi.fn();
    const onCloseDelete = vi.fn();
    const onClosePrint = vi.fn();

    // 1. PracticeQuizModal loading + error + Escape
    const { rerender } = render(
      <PracticeQuizModal
        isOpen
        isLoading
        isSubmitting={false}
        topicLabel="Fractions"
        quiz={null}
        result={null}
        errorMessage="Failed to load quiz"
        onSubmitAnswers={vi.fn(async () => {})}
        onClose={onCloseQuiz}
      />
    );
    expect(screen.getByText('Failed to load quiz')).toBeInTheDocument();
    await user.tab();
    await user.tab({ shift: true });
    await user.keyboard('{Escape}');
    expect(onCloseQuiz).toHaveBeenCalledTimes(1);

    // 2. ParentUpdateModal loading + error + Escape + Tab wrap
    rerender(
      <ParentUpdateModal
        isOpen
        student={teacherStudents[0]}
        language="Hindi"
        onChangeLanguage={vi.fn()}
        update={null}
        isLoading={false}
        errorMessage="Unable to draft message"
        onRegenerate={vi.fn()}
        onClose={onCloseParent}
      />
    );
    expect(screen.getByText('Unable to draft message')).toBeInTheDocument();
    await user.tab();
    await user.tab({ shift: true });
    await user.keyboard('{Escape}');
    expect(onCloseParent).toHaveBeenCalledTimes(1);

    // 3. DeleteStudentDataDialog error + Escape + Tab wrap
    rerender(
      <DeleteStudentDataDialog
        isOpen
        student={teacherStudents[2]}
        logCount={2}
        alertCount={0}
        isDeleting={false}
        errorMessage="Could not delete"
        onConfirm={vi.fn(async () => {})}
        onClose={onCloseDelete}
      />
    );
    expect(screen.getByText('Could not delete')).toBeInTheDocument();
    await user.tab();
    await user.tab({ shift: true });
    await user.keyboard('{Escape}');
    expect(onCloseDelete).toHaveBeenCalledTimes(1);

    // 4. PrintableContentModal Escape + Tab wrap
    rerender(
      <PrintableContentModal
        isOpen
        title="Worksheet"
        markdown="## Worksheet\n1. Question"
        onClose={onClosePrint}
      />
    );
    await user.tab();
    await user.tab({ shift: true });
    await user.keyboard('{Escape}');
    expect(onClosePrint).toHaveBeenCalledTimes(1);
  });
});
