import { Router } from 'express';
import {
  MAX_ACTIVE_QUIZZES,
  QUIZ_PASS_MIN_SCORE,
  QUIZ_TTL_MS,
} from '../../shared/config.ts';
import { applyLearningPathStatuses } from '../../shared/educationLogic.ts';
import {
  type ChatSessionStore,
  practiceQuizRequestSchema,
  practiceQuizSubmitSchema,
  toPublicStudentProfile,
  type ValidatedPracticeQuizRequest,
  type ValidatedPracticeQuizSubmit,
} from '../../shared/security.ts';
import type {
  PracticeQuiz,
  ProgressLog,
  PublicPracticeQuiz,
  QuizQuestionResult,
  StudentLearningPath,
} from '../../shared/types.ts';
import { createChatRateLimiter } from '../middleware/rateLimit.ts';
import { getRequestId } from '../middleware/requestId.ts';
import { requireStudentSession } from '../middleware/studentSession.ts';
import { validateBody, validateIdParam } from '../middleware/validation.ts';
import { GeminiTimeoutError } from '../services/geminiClient.ts';
import { generateLearningPath } from '../services/learningPath.ts';
import { generatePracticeQuiz } from '../services/quizGenerator.ts';
import type { PersistentShikshaStore } from '../services/store.ts';

interface StoredQuizEntry {
  quiz: PracticeQuiz;
  expiresAt: number;
}

function toPublicQuiz(quiz: PracticeQuiz): PublicPracticeQuiz {
  return {
    quizId: quiz.quizId,
    studentId: quiz.studentId,
    subject: quiz.subject,
    topic: quiz.topic,
    language: quiz.language,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    })),
  };
}

/**
 * Builds the Express router for student endpoints:
 * - `GET /state` — returns aggregate public metrics for the landing page.
 * - `GET /students` — returns public student profiles (zero phone PII).
 * - `POST /students/:id/session` — issues an HMAC-signed session bound to `:id`.
 * - `GET /students/:id/progress` — returns progress logs (requires bound student session).
 * - `GET /students/:id/learning-path` — returns or generates a 5-step path (requires bound session).
 * - `POST /students/:id/quiz` — generates a 3-question bilingual quiz (requires bound session).
 * - `POST /students/:id/quiz/submit` — grades a quiz server-side (requires bound session).
 *
 * @param storeManager Persistent store instance.
 * @param sessionStore Server-side HMAC session store binding sessions to student IDs.
 * @returns Configured Express {@link Router}.
 */
export function createStudentsRouter(
  storeManager: PersistentShikshaStore,
  sessionStore: ChatSessionStore
): Router {
  const router = Router();
  const activeQuizzes = new Map<string, StoredQuizEntry>();
  const aiGenerationRateLimiter = createChatRateLimiter();
  const enforceStudentSession = requireStudentSession(sessionStore);

  const pruneExpiredQuizzes = (now: number) => {
    for (const [id, entry] of activeQuizzes.entries()) {
      if (entry.expiresAt <= now) {
        activeQuizzes.delete(id);
      }
    }
  };

  router.get('/state', (_req, res) => {
    const store = storeManager.getState();
    const masteredPairs = new Set<string>();
    for (const log of store.progressLogs) {
      if (log.competency_level === 'Mastered') {
        masteredPairs.add(`${log.student_id}::${log.topic.trim().toLowerCase()}`);
      }
    }
    const activeAlerts = store.dropoutAlerts.filter(
      (alert) => alert.status === 'Active'
    ).length;

    res.json({
      studentsTracked: store.students.length,
      topicsMastered: masteredPairs.size,
      teacherAlerts: activeAlerts,
    });
  });

  router.get('/students', (_req, res) => {
    const store = storeManager.getState();
    res.json({
      students: store.students.map(toPublicStudentProfile),
    });
  });

  router.post(
    '/students/:id/session',
    validateIdParam('id', 'Invalid student ID format.'),
    (_req, res) => {
      const requestId = getRequestId(res);
      const studentId = String(res.locals.validatedId);
      const store = storeManager.getState();

      const student = store.students.find((s) => s.id === studentId);
      if (!student) {
        res.status(404).json({ error: 'Student not found.', requestId });
        return;
      }

      const session = sessionStore.createStudentSession(student.id);
      res.json({
        sessionId: session.signedId,
        studentId: student.id,
      });
    }
  );

  router.get(
    '/students/:id/progress',
    validateIdParam('id', 'Invalid student ID format.'),
    enforceStudentSession,
    (_req, res) => {
      const requestId = getRequestId(res);
      const studentId = String(res.locals.validatedId);
      const store = storeManager.getState();

      const student = store.students.find((s) => s.id === studentId);
      if (!student) {
        res.status(404).json({ error: 'Student not found.', requestId });
        return;
      }

      const progressLogs = store.progressLogs.filter(
        (log) => log.student_id === student.id
      );
      res.json({
        studentId: student.id,
        progressLogs,
      });
    }
  );

  router.get(
    '/students/:id/learning-path',
    aiGenerationRateLimiter,
    validateIdParam('id', 'Invalid student ID format.'),
    enforceStudentSession,
    async (req, res) => {
      const requestId = getRequestId(res);
      try {
        const studentId = String(res.locals.validatedId);
        const store = storeManager.getState();
        const student = store.students.find((s) => s.id === studentId);

        if (!student) {
          res.status(404).json({ error: 'Student not found.', requestId });
          return;
        }

        const studentLogs = store.progressLogs.filter(
          (log) => log.student_id === student.id
        );
        const forceRefresh = req.query.refresh === '1';

        if (!store.learningPaths) {
          store.learningPaths = {};
        }

        const cached = store.learningPaths[student.id];
        if (
          !forceRefresh &&
          cached &&
          cached.sourceLogCount === studentLogs.length &&
          cached.steps.length > 0
        ) {
          const refreshedPath: StudentLearningPath = {
            ...cached,
            steps: applyLearningPathStatuses(cached.steps, studentLogs),
          };
          store.learningPaths[student.id] = refreshedPath;
          res.json({ learningPath: refreshedPath });
          return;
        }

        const steps = await generateLearningPath({
          student: toPublicStudentProfile(student),
          progressLogs: studentLogs,
        });

        const learningPath: StudentLearningPath = {
          studentId: student.id,
          generatedAt: new Date().toISOString(),
          sourceLogCount: studentLogs.length,
          steps,
        };

        store.learningPaths[student.id] = learningPath;
        storeManager.scheduleSave();
        res.json({ learningPath });
      } catch (error) {
        if (error instanceof GeminiTimeoutError) {
          console.error(`[${requestId}] ${error.message}`);
          res.status(504).json({
            error:
              'Generating your learning path took too long. Please try again in a moment.',
            requestId,
          });
          return;
        }
        console.error(`[${requestId}] Error in learning-path route:`, error);
        res.status(500).json({
          error: 'Unable to generate your learning path right now. Please try again.',
          requestId,
        });
      }
    }
  );

  router.post(
    '/students/:id/quiz',
    aiGenerationRateLimiter,
    validateIdParam('id', 'Invalid student ID format.'),
    enforceStudentSession,
    validateBody(practiceQuizRequestSchema, 'Invalid practice quiz request.'),
    async (_req, res) => {
      const requestId = getRequestId(res);
      try {
        const studentId = String(res.locals.validatedId);
        const { subject, topic } = res.locals
          .validatedBody as ValidatedPracticeQuizRequest;
        const store = storeManager.getState();
        const student = store.students.find((s) => s.id === studentId);

        if (!student) {
          res.status(404).json({ error: 'Student not found.', requestId });
          return;
        }

        const quiz = await generatePracticeQuiz({
          student: toPublicStudentProfile(student),
          subject,
          topic,
        });

        const now = Date.now();
        pruneExpiredQuizzes(now);
        if (activeQuizzes.size >= MAX_ACTIVE_QUIZZES) {
          const firstKey = activeQuizzes.keys().next().value;
          if (firstKey) activeQuizzes.delete(firstKey);
        }
        activeQuizzes.set(quiz.quizId, { quiz, expiresAt: now + QUIZ_TTL_MS });

        res.json({ quiz: toPublicQuiz(quiz) });
      } catch (error) {
        if (error instanceof GeminiTimeoutError) {
          console.error(`[${requestId}] ${error.message}`);
          res.status(504).json({
            error:
              'Generating your practice quiz took too long. Please try again in a moment.',
            requestId,
          });
          return;
        }
        console.error(`[${requestId}] Error in quiz generation route:`, error);
        res.status(500).json({
          error: 'Unable to generate a practice quiz right now. Please try again.',
          requestId,
        });
      }
    }
  );

  router.post(
    '/students/:id/quiz/submit',
    validateIdParam('id', 'Invalid student ID format.'),
    enforceStudentSession,
    validateBody(practiceQuizSubmitSchema, 'Invalid quiz submission payload.'),
    (_req, res) => {
      const requestId = getRequestId(res);
      const studentId = String(res.locals.validatedId);
      const { quizId, answers } = res.locals
        .validatedBody as ValidatedPracticeQuizSubmit;

      const store = storeManager.getState();
      const student = store.students.find((s) => s.id === studentId);
      if (!student) {
        res.status(404).json({ error: 'Student not found.', requestId });
        return;
      }

      const now = Date.now();
      pruneExpiredQuizzes(now);
      const entry = activeQuizzes.get(quizId);
      if (!entry || entry.quiz.studentId !== student.id) {
        res.status(404).json({
          error: 'Practice quiz session not found or already submitted.',
          requestId,
        });
        return;
      }

      const { quiz } = entry;
      activeQuizzes.delete(quizId);

      let score = 0;
      const results: QuizQuestionResult[] = quiz.questions.map((q, idx) => {
        const selectedIndex = answers[idx];
        const isCorrect = selectedIndex === q.correctIndex;
        if (isCorrect) score += 1;
        return {
          questionId: q.id,
          selectedIndex,
          correctIndex: q.correctIndex,
          isCorrect,
          explanation: q.explanation,
        };
      });

      const total = quiz.questions.length;
      const passed = score >= QUIZ_PASS_MIN_SCORE;

      const progressLog: ProgressLog = {
        id: `log-quiz-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        student_id: student.id,
        subject: quiz.subject,
        topic: quiz.topic,
        competency_level: passed ? 'Mastered' : 'Progressing',
        frustration_detected: false,
        hints_used: 0,
        quiz_score: score,
        quiz_total: total,
        timestamp: new Date().toISOString(),
      };

      store.progressLogs.unshift(progressLog);
      if (store.learningPaths) {
        delete store.learningPaths[student.id];
      }
      storeManager.scheduleSave();

      res.json({
        score,
        total,
        passed,
        results,
        progressLog,
      });
    }
  );

  return router;
}
