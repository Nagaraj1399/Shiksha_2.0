import type { NextFunction, Request, Response } from 'express';
import { getRequestId } from './requestId.ts';

/**
 * Central Express error-handling middleware.
 *
 * Logs full error details server-side keyed by correlation `requestId` and
 * returns only safe, generic messages to the client (never raw `error.message`).
 *
 * @param err Unhandled error passed via `next(err)`.
 * @param req Express request.
 * @param res Express response.
 * @param next Next error handler callback.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const requestId = getRequestId(res);
  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status?: unknown }).status === 'number'
      ? (err as { status: number }).status
      : 500;
  const errType =
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof (err as { type?: unknown }).type === 'string'
      ? (err as { type: string }).type
      : '';

  console.error(`[${requestId}] Unhandled error on ${req.method} ${req.path}:`, err);

  if (errType === 'entity.too.large' || status === 413) {
    res.status(413).json({
      error: 'Request payload is too large.',
      requestId,
    });
    return;
  }

  if (status === 400 || errType === 'entity.parse.failed') {
    res.status(400).json({
      error: 'Malformed request body.',
      requestId,
    });
    return;
  }

  res.status(500).json({
    error: 'An unexpected server error occurred.',
    requestId,
  });
}
