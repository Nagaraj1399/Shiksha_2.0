import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { idParamSchema } from '../../shared/security.ts';
import { getRequestId } from './requestId.ts';

/**
 * Creates Express middleware that validates `req.body` against a Zod schema,
 * storing the parsed result on `res.locals.validatedBody` or returning HTTP 400
 * with a safe, generic error message.
 *
 * @param schema Zod schema used to validate the request body.
 * @param errorMessage Safe client-facing error message on validation failure.
 * @returns Express request handler.
 */
export function validateBody<T>(
  schema: ZodType<T>,
  errorMessage: string
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: errorMessage,
        requestId: getRequestId(res),
      });
      return;
    }
    res.locals.validatedBody = parsed.data;
    next();
  };
}

/**
 * Creates Express middleware that validates a URL route parameter against
 * {@link idParamSchema}, storing the sanitized ID on `res.locals.validatedId`.
 *
 * @param paramName Route parameter key (e.g., `'id'`).
 * @param errorMessage Safe client-facing error message when the ID format is invalid.
 * @returns Express request handler.
 */
export function validateIdParam(
  paramName: string,
  errorMessage: string
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = idParamSchema.safeParse(req.params[paramName]);
    if (!parsed.success) {
      res.status(400).json({
        error: errorMessage,
        requestId: getRequestId(res),
      });
      return;
    }
    res.locals.validatedId = parsed.data;
    next();
  };
}
