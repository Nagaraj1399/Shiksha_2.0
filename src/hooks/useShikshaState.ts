import React, { useCallback, useState } from 'react';
import {
  MAX_CHAT_MESSAGES,
  MAX_MESSAGE_CHARS,
  TEACHER_ACCESS_HEADER,
  WELCOME_MESSAGE_IDS,
} from '../../shared/config';
import { mergeDropoutAlerts, mergeProgressLogs } from '../../shared/shikshaLogic';
import type {
  AgentMode,
  AppTab,
  ChatMessage,
  DropoutAlert,
  HintLevel,
  ProgressLog,
  TeacherOverviewResponse,
} from '../../shared/types';
import type { EncodedImageAttachment } from '../utils/imageHelper';
import {
  createInitialStudentMessages,
  createInitialTeacherMessages,
  formatNowTime,
} from './chatDefaults';
import { useStudentQuiz } from './useStudentQuiz';
import { useStudentSession } from './useStudentSession';

export interface UseShikshaStateParams {
  activeTab: AppTab;
  onSelectActiveTab: (tab: AppTab) => void;
  teacherCode: string | null;
  teacherOverview: TeacherOverviewResponse | null;
  setTeacherOverview: React.Dispatch<
    React.SetStateAction<TeacherOverviewResponse | null>
  >;
  clearTeacherSession: (openDialogForTab?: AppTab) => void;
  promptTeacherLogin: (tab: AppTab) => void;
}

/**
 * Coordinates student/teacher chat turns with delta state merging, composing
 * `useStudentSession` and `useStudentQuiz`.
 */
export function useShikshaState({
  activeTab,
  onSelectActiveTab,
  teacherCode,
  teacherOverview,
  setTeacherOverview,
  clearTeacherSession,
  promptTeacherLogin,
}: UseShikshaStateParams) {
  const [teacherSessionId, setTeacherSessionId] = useState<string | undefined>(
    undefined
  );
  const [studentMessages, setStudentMessages] = useState<ChatMessage[]>(
    createInitialStudentMessages
  );
  const [teacherMessages, setTeacherMessages] = useState<ChatMessage[]>(
    createInitialTeacherMessages
  );

  const [studentLoading, setStudentLoading] = useState(false);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [studentDraftPrompt, setStudentDraftPrompt] = useState('');
  const [teacherDraftPrompt, setTeacherDraftPrompt] = useState('');

  const studentSession = useStudentSession(activeTab, setStudentError);
  const {
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
  } = studentSession;

  const handleSelectStudentId = useCallback(
    (id: string) => {
      selectStudentProfile(id);
      setStudentMessages(createInitialStudentMessages());
      setStudentError(null);
    },
    [selectStudentProfile]
  );

  const handleQuizProgressLogged = useCallback(
    (progressLog: ProgressLog) => {
      const logged = [progressLog];
      setStudentProgressLogs((prev) => mergeProgressLogs(prev, logged));
      setTeacherOverview((prev) =>
        prev
          ? {
              ...prev,
              progressLogs: mergeProgressLogs(prev.progressLogs, logged),
            }
          : prev
      );
      setLearningPath(null);
      if (activeTab === 'path' && selectedStudentId) {
        void fetchLearningPath(selectedStudentId, true);
      }
    },
    [
      activeTab,
      selectedStudentId,
      fetchLearningPath,
      setLearningPath,
      setStudentProgressLogs,
      setTeacherOverview,
    ]
  );

  const quiz = useStudentQuiz({
    selectedStudentId,
    ensureStudentSession,
    onQuizProgressLogged: handleQuizProgressLogged,
  });

  const sendChat = useCallback(
    async (
      mode: AgentMode,
      text: string,
      attachment?: EncodedImageAttachment,
      hintLevel?: HintLevel
    ) => {
      if (mode === 'student' && !selectedStudentId) {
        setStudentError('Please wait for student profiles to load.');
        return;
      }

      if (mode === 'teacher' && !teacherCode) {
        promptTeacherLogin('teacher');
        return;
      }

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text:
          text ||
          (attachment
            ? mode === 'teacher'
              ? 'Uploaded syllabus photo for lesson planning.'
              : 'Uploaded homework photo for Socratic help.'
            : ''),
        imageUrl: attachment?.previewUrl,
        timestamp: formatNowTime(),
      };

      const history = mode === 'student' ? studentMessages : teacherMessages;
      const nextHistory = [...history, userMsg];

      if (mode === 'student') {
        setStudentMessages(nextHistory);
        setStudentLoading(true);
        setStudentError(null);
      } else {
        setTeacherMessages(nextHistory);
        setTeacherLoading(true);
        setTeacherError(null);
      }

      try {
        const payloadMessages = nextHistory
          .filter(
            (m) =>
              m.id !== WELCOME_MESSAGE_IDS.STUDENT &&
              m.id !== WELCOME_MESSAGE_IDS.TEACHER
          )
          .slice(-MAX_CHAT_MESSAGES)
          .map((m) => ({
            role: m.role,
            text: m.text.slice(0, MAX_MESSAGE_CHARS),
          }));

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (mode === 'teacher' && teacherCode) {
          headers[TEACHER_ACCESS_HEADER] = teacherCode;
        }

        const currentSessionId =
          mode === 'student'
            ? getCachedStudentSession(selectedStudentId)
            : teacherSessionId;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mode,
            studentId: mode === 'student' ? selectedStudentId : undefined,
            sessionId: currentSessionId,
            messages: payloadMessages,
            imageBase64: attachment?.base64,
            imageMimeType: attachment?.mimeType,
            hintLevel: mode === 'student' ? hintLevel : undefined,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (response.status === 401 && mode === 'teacher') {
          clearTeacherSession('teacher');
          return;
        }
        if (!response.ok) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : `Request failed (${response.status})`
          );
        }

        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          timestamp: formatNowTime(),
          toolEvents: data.toolEvents,
        };

        if (mode === 'student') {
          setStudentMessages((prev) => [...prev, assistantMsg]);
          if (typeof data.sessionId === 'string') {
            saveStudentSession(selectedStudentId, data.sessionId);
          }
          if (Array.isArray(data.newProgressLogs) && data.newProgressLogs.length > 0) {
            const incomingLogs = data.newProgressLogs as ProgressLog[];
            setStudentProgressLogs((prev) => mergeProgressLogs(prev, incomingLogs));
            setTeacherOverview((prev) =>
              prev
                ? {
                    ...prev,
                    progressLogs: mergeProgressLogs(prev.progressLogs, incomingLogs),
                  }
                : prev
            );
            setLearningPath(null);
          }
        } else {
          setTeacherMessages((prev) => [...prev, assistantMsg]);
          if (typeof data.sessionId === 'string') {
            setTeacherSessionId(data.sessionId);
          }
          const incomingLogs = Array.isArray(data.newProgressLogs)
            ? (data.newProgressLogs as ProgressLog[])
            : [];
          const incomingAlerts = Array.isArray(data.newDropoutAlerts)
            ? (data.newDropoutAlerts as DropoutAlert[])
            : [];
          if (incomingLogs.length > 0 || incomingAlerts.length > 0) {
            setTeacherOverview((prev) =>
              prev
                ? {
                    ...prev,
                    progressLogs:
                      incomingLogs.length > 0
                        ? mergeProgressLogs(prev.progressLogs, incomingLogs)
                        : prev.progressLogs,
                    dropoutAlerts:
                      incomingAlerts.length > 0
                        ? mergeDropoutAlerts(prev.dropoutAlerts, incomingAlerts)
                        : prev.dropoutAlerts,
                  }
                : prev
            );
          }
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to reach Shiksha-Agent right now.';
        if (mode === 'student') {
          setStudentError(message);
        } else {
          setTeacherError(message);
        }
      } finally {
        if (mode === 'student') {
          setStudentLoading(false);
        } else {
          setTeacherLoading(false);
        }
      }
    },
    [
      selectedStudentId,
      studentMessages,
      teacherMessages,
      teacherCode,
      teacherSessionId,
      getCachedStudentSession,
      saveStudentSession,
      setStudentProgressLogs,
      setLearningPath,
      clearTeacherSession,
      promptTeacherLogin,
      setTeacherOverview,
    ]
  );

  const handlePracticePathStep = useCallback(
    (subject: string, topic: string) => {
      setStudentDraftPrompt(
        `Help me practice ${topic} (${subject}) step by step using Socratic questions.`
      );
      onSelectActiveTab('tutor');
    },
    [onSelectActiveTab]
  );

  const handleOpenInterventionInAide = useCallback(
    (alert: DropoutAlert) => {
      const student = teacherOverview?.students.find((s) => s.id === alert.student_id);
      const label = student ? `${student.name} (${student.id})` : alert.student_id;
      setTeacherDraftPrompt(
        `Draft a supportive, practical 15-minute remediation plan for ${label}. Alert reason: ${alert.reason_for_alert}`
      );
      onSelectActiveTab('teacher');
    },
    [teacherOverview, onSelectActiveTab]
  );

  const resetStudentChat = useCallback(() => {
    setStudentMessages(createInitialStudentMessages());
    setStudentError(null);
    rotateStudentSession(selectedStudentId);
  }, [selectedStudentId, rotateStudentSession]);

  const resetTeacherChat = useCallback(() => {
    setTeacherMessages(createInitialTeacherMessages());
    setTeacherSessionId(undefined);
    setTeacherError(null);
  }, []);

  const clearDeletedStudentData = useCallback(
    (studentId: string) => {
      if (selectedStudentId === studentId) {
        setStudentProgressLogs([]);
        setLearningPath(null);
      }
    },
    [selectedStudentId, setLearningPath, setStudentProgressLogs]
  );

  const resetTeacherSessionId = useCallback(() => {
    setTeacherSessionId(undefined);
  }, []);

  return {
    publicStudents,
    selectedStudentId,
    studentProgressLogs,
    learningPath,
    learningPathLoading,
    learningPathError,
    studentMessages,
    teacherMessages,
    studentLoading,
    teacherLoading,
    studentError,
    teacherError,
    studentDraftPrompt,
    teacherDraftPrompt,
    setStudentDraftPrompt,
    setTeacherDraftPrompt,
    fetchLearningPath,
    handleSelectStudentId,
    sendChat,
    handlePracticePathStep,
    handleOpenInterventionInAide,
    resetStudentChat,
    resetTeacherChat,
    clearDeletedStudentData,
    resetTeacherSessionId,
    quiz,
  };
}
