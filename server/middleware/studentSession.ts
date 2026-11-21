import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { STUDENT_SESSION_HEADER } from '../../shared/config.ts';
import type { ChatSessionStore } from '../../shared/sessionStore.ts';
import { getRequestId } from './requestId.ts';

/**
 * Express middleware enforcing that student-scoped endpoints
 * (`/students/:id/progress`, `/learning-path`, `/quiz`, `/quiz/submit`)
 * carry a valid HMAC-signed student session token (`x-student-session`)
 * bound to the exact `:id` route parameter.
 *
 * Returns `401` when the session header is missing, malformed, or expired,
 * and `403` when the session belongs to a different student.
 *
 * @param sessionStore Server-side HMAC chat session store.
 * @returns Express request handler (must run after `validateIdParam`).
 */
export function requireStudentSession(sessionStore: ChatSessionStore): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = getRequestId(res);
    const expectedStudentId = String(res.locals.validatedId ?? '');
    const token = req.header(STUDENT_SESSION_HEADER);
    const verification = sessionStore.verifyStudentSession(token, expectedStudentId);

    if (!verification.ok) {
      res.status(verification.status).json({
        error: verification.error,
        requestId,
      });
      return;
    }

    res.locals.studentSession = verification.session;
    next();
  };
}
