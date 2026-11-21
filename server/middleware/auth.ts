import type { NextFunction, Request, Response } from 'express';
import { TEACHER_ACCESS_HEADER } from '../../shared/config.ts';
import { verifyTeacherAccessCode } from '../../shared/security.ts';
import { getRequestId } from './requestId.ts';

/**
 * Validates the `x-teacher-code` header against the server-side
 * `TEACHER_ACCESS_CODE` environment secret and writes a 503/401 JSON response
 * if validation fails.
 *
 * @param req Express request.
 * @param res Express response.
 * @returns `true` if teacher access is authorized, `false` if an error response was sent.
 */
export function checkTeacherAccess(req: Request, res: Response): boolean {
  const requestId = getRequestId(res);
  const headerVal = req.header(TEACHER_ACCESS_HEADER);
  const check = verifyTeacherAccessCode(headerVal, process.env.TEACHER_ACCESS_CODE);

  if (check.misconfigured) {
    console.error(
      `[${requestId}] TEACHER_ACCESS_CODE environment variable is not set.`
    );
    res.status(503).json({
      error: 'Teacher access is not configured on the server.',
      requestId,
    });
    return false;
  }

  if (!check.ok) {
    res.status(401).json({
      error: 'Valid teacher access code required.',
      requestId,
    });
    return false;
  }

  return true;
}

/**
 * Express middleware that enforces valid teacher access credentials on
 * protected teacher routes.
 *
 * @param req Express request.
 * @param res Express response.
 * @param next Next middleware callback.
 */
export function requireTeacherAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!checkTeacherAccess(req, res)) {
    return;
  }
  next();
}
