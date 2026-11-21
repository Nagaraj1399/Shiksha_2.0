import { Router } from 'express';
import { MAX_GEMINI_MESSAGES } from '../../shared/config.ts';
import { extractNumericProblemAnswer } from '../../shared/educationLogic.ts';
import {
  chatRequestSchema,
  type ChatSessionStore,
  SessionStudentMismatchError,
  toPublicStudentProfile,
  type ValidatedChatRequest,
} from '../../shared/security.ts';
import {
  buildSystemInstruction,
  sliceRecentMessages,
} from '../../shared/shikshaLogic.ts';
import type { HintLevel } from '../../shared/types.ts';
import { checkTeacherAccess } from '../middleware/auth.ts';
import { createChatRateLimiter } from '../middleware/rateLimit.ts';
import { getRequestId } from '../middleware/requestId.ts';
import { validateBody } from '../middleware/validation.ts';
import { buildGeminiContents, runGeminiChatLoop } from '../services/chatLoop.ts';
import { GeminiTimeoutError } from '../services/geminiClient.ts';
import type { PersistentShikshaStore } from '../services/store.ts';

/**
 * Builds the Express router for `POST /chat`, handling Student Tutor (including
 * Hint Ladder & Socratic Answer Guard) and Teacher Aide interactions with Zod
 * validation, HMAC session-to-student binding, history anti-spoofing, teacher
 * access enforcement, rate limiting, and delta record responses.
 *
 * @param storeManager Persistent store instance.
 * @param sessionStore Server-side HMAC chat session store.
 * @returns Configured Express {@link Router}.
 */
export function createChatRouter(
  storeManager: PersistentShikshaStore,
  sessionStore: ChatSessionStore
): Router {
  const router = Router();
  const chatRateLimiter = createChatRateLimiter();

  router.post(
    '/chat',
    chatRateLimiter,
    validateBody(chatRequestSchema, 'Invalid chat request payload.'),
    async (req, res) => {
      const requestId = getRequestId(res);
      try {
        const body = res.locals.validatedBody as ValidatedChatRequest;
        const {
          mode,
          studentId,
          sessionId: incomingSessionId,
          messages,
          imageBase64,
          imageMimeType,
          hintLevel,
        } = body;

        if (mode === 'teacher' && !checkTeacherAccess(req, res)) {
          return;
        }

        const store = storeManager.getState();
        let activeStudent = undefined;
        if (mode === 'student') {
          activeStudent = store.students.find((s) => s.id === studentId);
          if (!activeStudent) {
            res.status(404).json({
              error: 'Student not found.',
              requestId,
            });
            return;
          }
        }

        let session;
        try {
          session = sessionStore.getOrCreateSession(
            incomingSessionId,
            mode,
            activeStudent?.id
          );
        } catch (sessionError) {
          if (sessionError instanceof SessionStudentMismatchError) {
            res.status(403).json({
              error: sessionError.message,
              requestId,
            });
            return;
          }
          throw sessionError;
        }

        const trustedMessages = sessionStore.sanitizeHistory(session, messages);
        const cappedMessages = sliceRecentMessages(
          trustedMessages,
          MAX_GEMINI_MESSAGES
        );

        const relevantLogs =
          mode === 'student' && activeStudent
            ? store.progressLogs.filter((l) => l.student_id === activeStudent.id)
            : store.progressLogs;

        const activeHintLevel =
          mode === 'student' ? (hintLevel as HintLevel | undefined) : undefined;

        const systemInstruction = buildSystemInstruction({
          mode,
          activeStudent: activeStudent
            ? toPublicStudentProfile(activeStudent)
            : undefined,
          recentLogs: relevantLogs,
          activeAlerts: mode === 'teacher' ? store.dropoutAlerts : [],
          hintLevel: activeHintLevel,
        });

        const contents = buildGeminiContents({
          mode,
          messages: cappedMessages,
          imageBase64,
          imageMimeType,
        });

        // Scan backwards across recent user turns so the Socratic Answer Guard
        // stays active even across 3 consecutive "I'm stuck" Hint Ladder clicks.
        const userMessages = cappedMessages.filter((m) => m.role === 'user');
        let latestUserPrompt = userMessages[userMessages.length - 1]?.text ?? '';
        for (let i = userMessages.length - 1; i >= 0; i -= 1) {
          if (extractNumericProblemAnswer(userMessages[i].text)) {
            latestUserPrompt = userMessages[i].text;
            break;
          }
        }

        const result = await runGeminiChatLoop({
          mode,
          activeStudentId: activeStudent?.id,
          hintLevel: activeHintLevel,
          latestUserPrompt,
          systemInstruction,
          contents,
          store,
        });

        // Invalidate cached learning path whenever new progress logs arrive for this student
        if (
          mode === 'student' &&
          activeStudent &&
          result.createdLogs.length > 0 &&
          store.learningPaths
        ) {
          delete store.learningPaths[activeStudent.id];
        }

        if (result.storeMutated) {
          storeManager.scheduleSave();
        }

        sessionStore.recordIssuedReply(session, result.reply);

        if (mode === 'student') {
          res.json({
            reply: result.reply,
            toolEvents: result.toolEvents,
            sessionId: session.signedId,
            newProgressLogs: result.createdLogs,
            answerGuardTriggered: result.answerGuardTriggered,
          });
        } else {
          res.json({
            reply: result.reply,
            toolEvents: result.toolEvents,
            sessionId: session.signedId,
            newProgressLogs: result.createdLogs,
            newDropoutAlerts: result.createdAlerts,
          });
        }
      } catch (error) {
        if (error instanceof GeminiTimeoutError) {
          console.error(`[${requestId}] ${error.message}`);
          res.status(504).json({
            error:
              'Shiksha-Agent took too long to respond. Please wait a moment and try sending your message again.',
            requestId,
          });
          return;
        }
        console.error(`[${requestId}] Error in /api/chat:`, error);
        res.status(500).json({
          error: 'Unable to complete your request right now. Please try again.',
          requestId,
        });
      }
    }
  );

  return router;
}
