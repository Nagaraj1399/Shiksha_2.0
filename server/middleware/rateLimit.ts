import type { RateLimitRequestHandler } from 'express-rate-limit';
import rateLimit from 'express-rate-limit';
import {
  CHAT_RATE_LIMIT_MAX,
  GENERAL_API_RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
} from '../../shared/config.ts';
import { getRequestId } from './requestId.ts';

/**
 * Creates a rate limiter protecting `POST /api/chat` (20 requests/minute per IP).
 *
 * @param limit Optional override for maximum requests per window.
 * @returns Express rate-limit middleware.
 */
export function createChatRateLimiter(
  limit = CHAT_RATE_LIMIT_MAX
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many chat requests. Please wait a minute and try again.',
        requestId: getRequestId(res),
      });
    },
  });
}

/**
 * Creates a rate limiter protecting all non-chat `/api/*` endpoints
 * (60 requests/minute per IP).
 *
 * @param limit Optional override for maximum requests per window.
 * @returns Express rate-limit middleware.
 */
export function createGeneralApiRateLimiter(
  limit = GENERAL_API_RATE_LIMIT_MAX
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.path === '/chat',
    handler: (_req, res) => {
      res.status(429).json({
        error: 'Too many requests. Please slow down and try again shortly.',
        requestId: getRequestId(res),
      });
    },
  });
}

/**
 * Default rate limiter protecting `POST /api/chat`.
 */
export const chatRateLimiter = createChatRateLimiter();

/**
 * Default rate limiter protecting non-chat `/api/*` endpoints.
 */
export const generalApiRateLimiter = createGeneralApiRateLimiter();
