import { Router } from 'express';
import {
  parentUpdateRequestSchema,
  toTeacherStudentProfile,
} from '../../shared/security.ts';
import type {
  DeleteStudentDataResponse,
  ShikshaStoreState,
  TeacherOverviewResponse,
  WeeklySummaryResponse,
} from '../../shared/types.ts';
import { requireTeacherAccess } from '../middleware/auth.ts';
import { getRequestId } from '../middleware/requestId.ts';
import { validateIdParam } from '../middleware/validation.ts';
import { GeminiTimeoutError } from '../services/geminiClient.ts';
import type { PersistentShikshaStore } from '../services/store.ts';
import {
  generateParentUpdate,
  generateWeeklyClassSummary,
} from '../services/teacherGenerators.ts';

/**
 * Projects full store state into the teacher overview payload with separately
 * mapped phone numbers masked as `******1234` (raw numbers never leave the server).
 *
 * @param store In-memory store state.
 * @returns Masked teacher overview payload.
 */
export function buildTeacherOverview(
  store: ShikshaStoreState
): TeacherOverviewResponse {
  return {
    students: store.students.map((student) =>
      toTeacherStudentProfile(student, store.studentPhoneMap?.[student.id])
    ),
    progressLogs: store.progressLogs,
    dropoutAlerts: store.dropoutAlerts,
  };
}

/**
 * Builds the Express router for teacher-protected endpoints:
 * - `GET /teacher/overview` — masked roster, progress ledger, and dropout alerts.
 * - `POST /teacher/weekly-summary` — Gemini 5-bullet weekly class summary.
 * - `POST /teacher/students/:id/parent-update` — warm 4–5 line regional-language parent preview.
 * - `DELETE /teacher/students/:id/data` — deletes a student's logs & alerts from `data/shiksha_store.json`.
 * - `POST /alerts/:id/acknowledge` — toggles alert status and returns `{ alert }`.
 *
 * @param storeManager Persistent store instance.
 * @returns Configured Express {@link Router}.
 */
export function createTeacherRouter(storeManager: PersistentShikshaStore): Router {
  const router = Router();

  router.get('/teacher/overview', requireTeacherAccess, (_req, res) => {
    const store = storeManager.getState();
    res.json(buildTeacherOverview(store));
  });

  router.post(
    '/teacher/weekly-summary',
    requireTeacherAccess,
    async (_req, res, next) => {
      const requestId = getRequestId(res);
      try {
        const store = storeManager.getState();
        const bullets = await generateWeeklyClassSummary({
          students: store.students,
          progressLogs: store.progressLogs,
          dropoutAlerts: store.dropoutAlerts,
        });
        const payload: WeeklySummaryResponse = {
          bullets,
          generatedAt: new Date().toISOString(),
        };
        res.json(payload);
      } catch (err) {
        if (err instanceof GeminiTimeoutError) {
          res.status(504).json({
            error: 'Generating the weekly class summary took too long. Please retry.',
            requestId,
          });
          return;
        }
        next(err);
      }
    }
  );

  router.post(
    '/teacher/students/:id/parent-update',
    requireTeacherAccess,
    validateIdParam('id', 'Invalid student ID format.'),
    async (req, res, next) => {
      const requestId = getRequestId(res);
      const parsedBody = parentUpdateRequestSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({
          error: 'Please choose a valid language: Hindi, Tamil, Marathi, or English.',
          requestId,
        });
        return;
      }

      const studentId = String(res.locals.validatedId);
      const store = storeManager.getState();
      const student = store.students.find((s) => s.id === studentId);
      if (!student) {
        res.status(404).json({ error: 'Student not found.', requestId });
        return;
      }

      try {
        const studentLogs = store.progressLogs.filter(
          (l) => l.student_id === studentId
        );
        const update = await generateParentUpdate({
          student,
          progressLogs: studentLogs,
          language: parsedBody.data.language,
        });
        res.json(update);
      } catch (err) {
        if (err instanceof GeminiTimeoutError) {
          res.status(504).json({
            error: 'Generating the parent update took too long. Please retry.',
            requestId,
          });
          return;
        }
        next(err);
      }
    }
  );

  router.delete(
    '/teacher/students/:id/data',
    requireTeacherAccess,
    validateIdParam('id', 'Invalid student ID format.'),
    async (_req, res, next) => {
      const requestId = getRequestId(res);
      const studentId = String(res.locals.validatedId);
      const store = storeManager.getState();
      const student = store.students.find((s) => s.id === studentId);
      if (!student) {
        res.status(404).json({ error: 'Student not found.', requestId });
        return;
      }

      try {
        const prevLogsLen = store.progressLogs.length;
        const prevAlertsLen = store.dropoutAlerts.length;

        store.progressLogs = store.progressLogs.filter(
          (l) => l.student_id !== studentId
        );
        store.dropoutAlerts = store.dropoutAlerts.filter(
          (a) => a.student_id !== studentId
        );
        if (store.learningPaths && store.learningPaths[studentId]) {
          delete store.learningPaths[studentId];
        }

        storeManager.scheduleSave();
        await storeManager.flush();

        const payload: DeleteStudentDataResponse = {
          studentId,
          deletedLogsCount: prevLogsLen - store.progressLogs.length,
          deletedAlertsCount: prevAlertsLen - store.dropoutAlerts.length,
        };
        res.json(payload);
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    '/alerts/:id/acknowledge',
    requireTeacherAccess,
    validateIdParam('id', 'Invalid alert ID format.'),
    (_req, res) => {
      const requestId = getRequestId(res);
      const alertId = String(res.locals.validatedId);
      const store = storeManager.getState();

      const target = store.dropoutAlerts.find((a) => a.id === alertId);
      if (!target) {
        res.status(404).json({ error: 'Alert not found.', requestId });
        return;
      }

      target.status = target.status === 'Active' ? 'Acknowledged' : 'Active';
      storeManager.scheduleSave();
      res.json({ alert: target });
    }
  );

  return router;
}
