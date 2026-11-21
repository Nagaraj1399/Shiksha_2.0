import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER } from '../../shared/config.ts';

/**
 * Express middleware that assigns a unique UUID request identifier to
 * `res.locals.requestId` and echoes it in the `X-Request-Id` response header.
 *
 * @param _req Express request.
 * @param res Express response.
 * @param next Next middleware callback.
 */
export function requestIdMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId = crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}

/**
 * Retrieves the correlation request ID attached to an Express response,
 * generating a fallback UUID if none was assigned yet.
 *
 * @param res Express response.
 * @returns Correlation request ID string.
 */
export function getRequestId(res: Response): string {
  return typeof res.locals.requestId === 'string'
    ? res.locals.requestId
    : crypto.randomUUID();
}
