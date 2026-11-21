import { useCallback, useState } from 'react';
import { STUDENT_SESSION_HEADER } from '../../shared/config';
import type {
  ProgressLog,
  PublicPracticeQuiz,
  QuizSubmissionResult,
} from '../../shared/types';

export interface UseStudentQuizParams {
  selectedStudentId: string;
  ensureStudentSession: (studentId: string) => Promise<string | undefined>;
  onQuizProgressLogged: (progressLog: ProgressLog) => void;
}

/**
 * Encapsulates Practice Quiz modal state, quiz generation, and server-side
 * submission using the active student's bound HMAC session header.
 */
export function useStudentQuiz({
  selectedStudentId,
  ensureStudentSession,
  onQuizProgressLogged,
}: UseStudentQuizParams) {
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizTopicLabel, setQuizTopicLabel] = useState('');
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<PublicPracticeQuiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  const handleStartQuiz = useCallback(
    async (subject: string, topic: string) => {
      if (!selectedStudentId) return;
      setQuizTopicLabel(topic);
      setActiveQuiz(null);
      setQuizResult(null);
      setQuizError(null);
      setQuizOpen(true);
      setQuizLoading(true);
      try {
        const sessionId = await ensureStudentSession(selectedStudentId);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (sessionId) {
          headers[STUDENT_SESSION_HEADER] = sessionId;
        }
        const res = await fetch(
          `/api/students/${encodeURIComponent(selectedStudentId)}/quiz`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ subject, topic }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'Unable to generate practice quiz.'
          );
        }
        setActiveQuiz(data.quiz as PublicPracticeQuiz);
      } catch (err) {
        setQuizError(
          err instanceof Error
            ? err.message
            : 'Unable to generate a practice quiz right now.'
        );
      } finally {
        setQuizLoading(false);
      }
    },
    [selectedStudentId, ensureStudentSession]
  );

  const handleSubmitQuizAnswers = useCallback(
    async (answers: number[]) => {
      if (!selectedStudentId || !activeQuiz) return;
      setQuizSubmitting(true);
      setQuizError(null);
      try {
        const sessionId = await ensureStudentSession(selectedStudentId);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (sessionId) {
          headers[STUDENT_SESSION_HEADER] = sessionId;
        }
        const res = await fetch(
          `/api/students/${encodeURIComponent(selectedStudentId)}/quiz/submit`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              quizId: activeQuiz.quizId,
              answers,
            }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'Unable to grade quiz answers.'
          );
        }
        const submission = data as QuizSubmissionResult;
        setQuizResult(submission);
        if (submission.progressLog) {
          onQuizProgressLogged(submission.progressLog);
        }
      } catch (err) {
        setQuizError(
          err instanceof Error
            ? err.message
            : 'Unable to submit your quiz answers right now.'
        );
      } finally {
        setQuizSubmitting(false);
      }
    },
    [selectedStudentId, activeQuiz, ensureStudentSession, onQuizProgressLogged]
  );

  const closeQuiz = useCallback(() => {
    setQuizOpen(false);
  }, []);

  return {
    quizOpen,
    quizTopicLabel,
    quizLoading,
    quizSubmitting,
    activeQuiz,
    quizResult,
    quizError,
    handleStartQuiz,
    handleSubmitQuizAnswers,
    closeQuiz,
  };
}
