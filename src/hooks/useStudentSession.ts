import { useCallback, useEffect, useRef, useState } from 'react';
import { STUDENT_SESSION_HEADER } from '../../shared/config';
import type {
  AppTab,
  ProgressLog,
  PublicStudentProfile,
  StudentLearningPath,
} from '../../shared/types';

/**
 * Manages the public student roster, per-student HMAC session creation
 * (`POST /api/students/:id/session`), authenticated student progress fetching,
 * and Personalised Learning Path loading.
 */
export function useStudentSession(
  activeTab: AppTab,
  onRosterError: (message: string) => void
) {
  const [publicStudents, setPublicStudents] = useState<PublicStudentProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentProgressLogs, setStudentProgressLogs] = useState<ProgressLog[]>([]);

  const [learningPath, setLearningPath] = useState<StudentLearningPath | null>(null);
  const [learningPathLoading, setLearningPathLoading] = useState(false);
  const [learningPathError, setLearningPathError] = useState<string | null>(null);

  const [studentSessionId, setStudentSessionId] = useState<string | undefined>(
    undefined
  );
  const studentSessionsRef = useRef<Map<string, string>>(new Map());

  const ensureStudentSession = useCallback(
    async (studentId: string, forceNew = false): Promise<string | undefined> => {
      if (!studentId) return undefined;
      if (!forceNew) {
        const cached = studentSessionsRef.current.get(studentId);
        if (cached) return cached;
      }
      try {
        const res = await fetch(
          `/api/students/${encodeURIComponent(studentId)}/session`,
          { method: 'POST' }
        );
        if (!res.ok) return undefined;
        const data = (await res.json().catch(() => ({}))) as { sessionId?: string };
        if (typeof data.sessionId === 'string' && data.sessionId.length > 0) {
          studentSessionsRef.current.set(studentId, data.sessionId);
          setStudentSessionId(data.sessionId);
          return data.sessionId;
        }
      } catch {
        // Ignore transient network errors; route handlers surface clear errors
      }
      return undefined;
    },
    []
  );

  const saveStudentSession = useCallback((studentId: string, sessionId: string) => {
    studentSessionsRef.current.set(studentId, sessionId);
    setStudentSessionId(sessionId);
  }, []);

  const getCachedStudentSession = useCallback(
    (studentId: string) =>
      studentSessionsRef.current.get(studentId) ?? studentSessionId,
    [studentSessionId]
  );

  const rotateStudentSession = useCallback(
    (studentId: string) => {
      if (!studentId) return;
      studentSessionsRef.current.delete(studentId);
      setStudentSessionId(undefined);
      void ensureStudentSession(studentId, true);
    },
    [ensureStudentSession]
  );

  useEffect(() => {
    let active = true;
    fetch('/api/students')
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error('Failed to load student profiles'))
      )
      .then((data: { students: PublicStudentProfile[] }) => {
        if (!active) return;
        const list = Array.isArray(data.students) ? data.students : [];
        setPublicStudents(list);
        if (list.length > 0) {
          setSelectedStudentId((prev) =>
            list.some((s) => s.id === prev) ? prev : list[0].id
          );
        }
      })
      .catch(() => {
        if (!active) return;
        onRosterError('Unable to load student profiles right now.');
      });
    return () => {
      active = false;
    };
  }, [onRosterError]);

  useEffect(() => {
    if (!selectedStudentId) return;
    let active = true;
    void (async () => {
      const sessionId = await ensureStudentSession(selectedStudentId);
      if (!active) return;
      try {
        const headers: Record<string, string> = {};
        if (sessionId) {
          headers[STUDENT_SESSION_HEADER] = sessionId;
        }
        const res = await fetch(
          `/api/students/${encodeURIComponent(selectedStudentId)}/progress`,
          { headers }
        );
        if (!res.ok) {
          throw new Error('Failed to load student progress');
        }
        const data = (await res.json()) as { progressLogs: ProgressLog[] };
        if (!active) return;
        setStudentProgressLogs(
          Array.isArray(data.progressLogs) ? data.progressLogs : []
        );
      } catch {
        if (!active) return;
        setStudentProgressLogs([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedStudentId, ensureStudentSession]);

  const fetchLearningPath = useCallback(
    async (studentId: string, refresh = false) => {
      if (!studentId) return;
      setLearningPathLoading(true);
      setLearningPathError(null);
      try {
        const sessionId = await ensureStudentSession(studentId);
        const headers: Record<string, string> = {};
        if (sessionId) {
          headers[STUDENT_SESSION_HEADER] = sessionId;
        }
        const suffix = refresh ? '?refresh=1' : '';
        const res = await fetch(
          `/api/students/${encodeURIComponent(studentId)}/learning-path${suffix}`,
          { headers }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'Unable to load your learning path.'
          );
        }
        if (data.learningPath) {
          setLearningPath(data.learningPath as StudentLearningPath);
        }
      } catch (err) {
        setLearningPathError(
          err instanceof Error
            ? err.message
            : 'Unable to load your learning path right now.'
        );
      } finally {
        setLearningPathLoading(false);
      }
    },
    [ensureStudentSession]
  );

  useEffect(() => {
    if (activeTab !== 'path' || !selectedStudentId) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      await fetchLearningPath(selectedStudentId, false);
    });
    return () => {
      active = false;
    };
  }, [activeTab, selectedStudentId, fetchLearningPath]);

  const selectStudentProfile = useCallback((id: string) => {
    setSelectedStudentId(id);
    setStudentSessionId(studentSessionsRef.current.get(id));
    setLearningPath(null);
    setLearningPathError(null);
  }, []);

  return {
    publicStudents,
    selectedStudentId,
    studentProgressLogs,
    setStudentProgressLogs,
    learningPath,
    setLearningPath,
    learningPathLoading,
    learningPathError,
    ensureStudentSession,
    saveStudentSession,
    getCachedStudentSession,
    rotateStudentSession,
    fetchLearningPath,
    selectStudentProfile,
  };
}
