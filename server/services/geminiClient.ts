import { GoogleGenAI } from '@google/genai';
import { GEMINI_USER_AGENT } from '../../shared/config.ts';

/**
 * Error thrown when a Gemini API call exceeds its configured timeout threshold.
 */
export class GeminiTimeoutError extends Error {
  /**
   * @param timeoutMs Timeout threshold in milliseconds that was exceeded.
   */
  constructor(timeoutMs: number) {
    super(`Gemini request timed out after ${timeoutMs}ms`);
    this.name = 'GeminiTimeoutError';
  }
}

/**
 * Instantiates a configured server-side {@link GoogleGenAI} client using the
 * `GEMINI_API_KEY` environment variable.
 *
 * @throws Error if `GEMINI_API_KEY` is not set.
 * @returns Configured {@link GoogleGenAI} SDK instance.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': GEMINI_USER_AGENT,
      },
    },
  });
}

/**
 * Checks whether an error object represents an abort or timeout signal.
 *
 * @param error Unknown caught error.
 * @returns `true` if the error indicates request cancellation/timeout.
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name?: unknown }).name) : '';
  const message =
    'message' in error ? String((error as { message?: unknown }).message) : '';
  return (
    name === 'AbortError' || name === 'TimeoutError' || /aborted|abort/i.test(message)
  );
}

/**
 * Wraps an asynchronous Gemini API call with an `AbortController` timeout,
 * throwing {@link GeminiTimeoutError} if the call exceeds `timeoutMs`.
 *
 * @param timeoutMs Maximum duration in milliseconds.
 * @param fn Callback receiving an `AbortSignal` to pass into the SDK call.
 * @returns Resolved API call result.
 */
export async function generateWithTimeout<T>(
  timeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fn(controller.signal);
  } catch (err) {
    if (controller.signal.aborted || isAbortError(err)) {
      throw new GeminiTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
