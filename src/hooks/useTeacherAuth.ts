import { useCallback, useEffect, useMemo, useState } from 'react';
import { TEACHER_ACCESS_HEADER, TEACHER_CODE_STORAGE_KEY } from '../../shared/config';
import { mergeDropoutAlerts } from '../../shared/shikshaLogic';
import type {
  AppTab,
  DropoutAlert,
  ParentUpdateLanguage,
  ParentUpdateResponse,
  TeacherOverviewResponse,
  WeeklySummaryResponse,
} from '../../shared/types';
import { getCurrentRoute, getTabFromSearch, isTeacherTab } from '../routing';

export interface UseTeacherAuthParams {
  onSelectActiveTab: (tab: AppTab) => void;
  onResetTeacherSessionId: () => void;
  onStudentDataDeleted: (studentId: string) => void;
}

/**
 * Manages teacher RBAC authentication (code persisted in `sessionStorage` only
 * after server verification), teacher overview data, dropout-alert toggles,
 * weekly summaries, parent updates, and student data deletion.
 */
export function useTeacherAuth({
  onSelectActiveTab,
  onResetTeacherSessionId,
  onStudentDataDeleted,
}: UseTeacherAuthParams) {
  const [teacherCode, setTeacherCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(TEACHER_CODE_STORAGE_KEY);
  });
  const [teacherOverview, setTeacherOverview] =
    useState<TeacherOverviewResponse | null>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const requested = getTabFromSearch();
    const hasSavedCode = Boolean(
      window.sessionStorage.getItem(TEACHER_CODE_STORAGE_KEY)
    );
    return (
      getCurrentRoute() === '/app' &&
      requested !== null &&
      isTeacherTab(requested) &&
      !hasSavedCode
    );
  });
  const [pendingTeacherTab, setPendingTeacherTab] = useState<AppTab | null>(() => {
    const requested = getTabFromSearch();
    return requested && isTeacherTab(requested) ? requested : null;
  });
  const [loginSubmitting, setLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const clearTeacherSession = useCallback(
    (openDialogForTab?: AppTab) => {
      window.sessionStorage.removeItem(TEACHER_CODE_STORAGE_KEY);
      setTeacherCode(null);
      setTeacherOverview(null);
      onResetTeacherSessionId();
      onSelectActiveTab('tutor');
      if (openDialogForTab) {
        setPendingTeacherTab(openDialogForTab);
        setLoginError('Please sign in again with your teacher access code.');
        setLoginDialogOpen(true);
      }
    },
    [onResetTeacherSessionId, onSelectActiveTab]
  );

  const requestTeacherOverview = useCallback(
    async (
      code: string
    ): Promise<{
      ok: boolean;
      overview?: TeacherOverviewResponse;
      error?: string;
    }> => {
      try {
        const res = await fetch('/api/teacher/overview', {
          headers: { [TEACHER_ACCESS_HEADER]: code },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return {
            ok: false,
            error:
              typeof data.error === 'string'
                ? data.error
                : 'Invalid teacher access code.',
          };
        }
        return { ok: true, overview: data as TeacherOverviewResponse };
      } catch {
        return {
          ok: false,
          error: 'Unable to reach the server. Please try again.',
        };
      }
    },
    []
  );

  const fetchTeacherOverview = useCallback(
    async (code: string): Promise<{ ok: boolean; error?: string }> => {
      const result = await requestTeacherOverview(code);
      if (result.ok && result.overview) {
        setTeacherOverview(result.overview);
      }
      return { ok: result.ok, error: result.error };
    },
    [requestTeacherOverview]
  );

  useEffect(() => {
    if (!teacherCode) return;
    let active = true;
    void requestTeacherOverview(teacherCode).then((result) => {
      if (!active) return;
      if (result.ok && result.overview) {
        setTeacherOverview(result.overview);
        const requested = getTabFromSearch();
        if (requested && isTeacherTab(requested)) {
          onSelectActiveTab(requested);
          setPendingTeacherTab(null);
        }
      } else {
        window.sessionStorage.removeItem(TEACHER_CODE_STORAGE_KEY);
        setTeacherCode(null);
        setTeacherOverview(null);
      }
    });
    return () => {
      active = false;
    };
  }, [teacherCode, requestTeacherOverview, onSelectActiveTab]);

  const openTeacherTab = useCallback(
    (tab: AppTab) => {
      if (teacherCode && teacherOverview) {
        onSelectActiveTab(tab);
        void fetchTeacherOverview(teacherCode).then((result) => {
          if (!result.ok) {
            clearTeacherSession(tab);
          }
        });
        return;
      }

      setPendingTeacherTab(tab);
      setLoginError(null);
      setLoginDialogOpen(true);
    },
    [
      teacherCode,
      teacherOverview,
      onSelectActiveTab,
      fetchTeacherOverview,
      clearTeacherSession,
    ]
  );

  const promptTeacherLogin = useCallback((tab: AppTab) => {
    setPendingTeacherTab(tab);
    setLoginDialogOpen(true);
  }, []);

  const handleTeacherLoginSubmit = useCallback(
    async (enteredCode: string) => {
      setLoginSubmitting(true);
      setLoginError(null);
      const result = await fetchTeacherOverview(enteredCode);
      setLoginSubmitting(false);

      if (!result.ok) {
        setLoginError(result.error || 'Invalid teacher access code.');
        return;
      }

      window.sessionStorage.setItem(TEACHER_CODE_STORAGE_KEY, enteredCode);
      setTeacherCode(enteredCode);
      setLoginDialogOpen(false);
      const nextTab = pendingTeacherTab ?? 'teacher';
      setPendingTeacherTab(null);
      onSelectActiveTab(nextTab);
    },
    [fetchTeacherOverview, pendingTeacherTab, onSelectActiveTab]
  );

  const closeLoginDialog = useCallback(() => {
    setLoginDialogOpen(false);
    setPendingTeacherTab(null);
    setLoginError(null);
  }, []);

  const handleToggleAcknowledge = useCallback(
    async (alertId: string) => {
      if (!teacherCode) {
        clearTeacherSession('alerts');
        return;
      }
      try {
        const res = await fetch(
          `/api/alerts/${encodeURIComponent(alertId)}/acknowledge`,
          {
            method: 'POST',
            headers: { [TEACHER_ACCESS_HEADER]: teacherCode },
          }
        );
        if (res.status === 401) {
          clearTeacherSession('alerts');
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (data.alert) {
          const updatedAlert = data.alert as DropoutAlert;
          setTeacherOverview((prev) =>
            prev
              ? {
                  ...prev,
                  dropoutAlerts: mergeDropoutAlerts(prev.dropoutAlerts, [updatedAlert]),
                }
              : prev
          );
        }
      } catch {
        // Quietly ignore transient network error
      }
    },
    [teacherCode, clearTeacherSession]
  );

  const handleGenerateWeeklySummary =
    useCallback(async (): Promise<WeeklySummaryResponse> => {
      if (!teacherCode) {
        clearTeacherSession('teacher');
        throw new Error('Teacher authentication required.');
      }
      const res = await fetch('/api/teacher/weekly-summary', {
        method: 'POST',
        headers: { [TEACHER_ACCESS_HEADER]: teacherCode },
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearTeacherSession('teacher');
        throw new Error('Session expired. Please sign in again.');
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Unable to generate weekly class summary.'
        );
      }
      return data as WeeklySummaryResponse;
    }, [teacherCode, clearTeacherSession]);

  const handleGenerateParentUpdate = useCallback(
    async (
      studentId: string,
      language: ParentUpdateLanguage
    ): Promise<ParentUpdateResponse> => {
      if (!teacherCode) {
        clearTeacherSession('progress');
        throw new Error('Teacher authentication required.');
      }
      const res = await fetch(
        `/api/teacher/students/${encodeURIComponent(studentId)}/parent-update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [TEACHER_ACCESS_HEADER]: teacherCode,
          },
          body: JSON.stringify({ language }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearTeacherSession('progress');
        throw new Error('Session expired. Please sign in again.');
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : 'Unable to generate parent update.'
        );
      }
      return data as ParentUpdateResponse;
    },
    [teacherCode, clearTeacherSession]
  );

  const handleDeleteStudentData = useCallback(
    async (studentId: string): Promise<void> => {
      if (!teacherCode) {
        clearTeacherSession('progress');
        throw new Error('Teacher authentication required.');
      }
      const res = await fetch(
        `/api/teacher/students/${encodeURIComponent(studentId)}/data`,
        {
          method: 'DELETE',
          headers: { [TEACHER_ACCESS_HEADER]: teacherCode },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearTeacherSession('progress');
        throw new Error('Session expired. Please sign in again.');
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Unable to delete student data.'
        );
      }

      setTeacherOverview((prev) =>
        prev
          ? {
              ...prev,
              progressLogs: prev.progressLogs.filter((l) => l.student_id !== studentId),
              dropoutAlerts: prev.dropoutAlerts.filter(
                (a) => a.student_id !== studentId
              ),
            }
          : prev
      );
      onStudentDataDeleted(studentId);
    },
    [teacherCode, clearTeacherSession, onStudentDataDeleted]
  );

  const activeAlertCount = useMemo(
    () =>
      teacherOverview
        ? teacherOverview.dropoutAlerts.filter((a) => a.status === 'Active').length
        : null,
    [teacherOverview]
  );

  return {
    teacherCode,
    teacherOverview,
    setTeacherOverview,
    activeAlertCount,
    loginDialogOpen,
    loginSubmitting,
    loginError,
    clearTeacherSession,
    openTeacherTab,
    promptTeacherLogin,
    handleTeacherLoginSubmit,
    closeLoginDialog,
    handleToggleAcknowledge,
    handleGenerateWeeklySummary,
    handleGenerateParentUpdate,
    handleDeleteStudentData,
  };
}
