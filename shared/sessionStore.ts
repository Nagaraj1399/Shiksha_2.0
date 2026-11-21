import crypto from 'node:crypto';
import { MAX_CHAT_SESSIONS } from './config.ts';
import type { AgentMode } from './types.ts';

/**
 * Generates a random 128-bit session ID signed with HMAC-SHA256.
 *
 * @param hmacSecret Server HMAC secret.
 * @returns Raw hex session ID and `<rawId>.<hmacHex>` signed token.
 */
export function createSignedSessionId(hmacSecret: string): {
  rawId: string;
  signedId: string;
} {
  const rawId = crypto.randomBytes(16).toString('hex');
  const sig = crypto.createHmac('sha256', hmacSecret).update(rawId).digest('hex');
  return { rawId, signedId: `${rawId}.${sig}` };
}

/**
 * Verifies the HMAC-SHA256 signature on a signed session token in constant time.
 *
 * @param signedToken Token supplied by the client (`<rawId>.<hmacHex>`).
 * @param hmacSecret Server HMAC secret.
 * @returns Verified raw session ID, or `null` if invalid/tampered.
 */
export function verifySignedSessionId(
  signedToken: string | undefined,
  hmacSecret: string
): string | null {
  if (!signedToken || typeof signedToken !== 'string') {
    return null;
  }
  const parts = signedToken.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [rawId, providedSig] = parts;
  if (!/^[a-f0-9]{32}$/.test(rawId) || !/^[a-f0-9]{64}$/.test(providedSig)) {
    return null;
  }
  const expectedSig = crypto
    .createHmac('sha256', hmacSecret)
    .update(rawId)
    .digest('hex');

  const providedBuf = Buffer.from(providedSig, 'hex');
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  if (providedBuf.length !== expectedBuf.length) {
    return null;
  }
  return crypto.timingSafeEqual(providedBuf, expectedBuf) ? rawId : null;
}

/**
 * Error thrown when a client presents a valid student session bound to a
 * different `studentId` than the student being accessed.
 */
export class SessionStudentMismatchError extends Error {
  constructor(message = 'Session does not belong to the requested student.') {
    super(message);
    this.name = 'SessionStudentMismatchError';
  }
}

/**
 * Server-side record tracking replies issued for a verified chat session
 * and, for student sessions, the bound `studentId`.
 */
export interface SessionRecord {
  rawId: string;
  signedId: string;
  mode: AgentMode;
  studentId?: string;
  issuedReplies: Set<string>;
  updatedAt: number;
}

/**
 * Result of verifying a student-scoped session token against an expected `studentId`.
 */
export type StudentSessionVerificationResult =
  | { ok: true; session: SessionRecord }
  | { ok: false; status: 401 | 403; error: string };

/**
 * In-memory LRU-bounded map of HMAC-signed chat sessions used to reject
 * client-forged `assistant` messages and bind every student session to its
 * owning `studentId`.
 */
export class ChatSessionStore {
  private readonly hmacSecret: string;
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly maxSessions: number;

  /**
   * @param hmacSecret Server secret used to sign and verify session IDs.
   * @param maxSessions Maximum concurrent sessions held in memory before LRU eviction.
   */
  constructor(hmacSecret: string, maxSessions = MAX_CHAT_SESSIONS) {
    this.hmacSecret = hmacSecret;
    this.maxSessions = maxSessions;
  }

  private evictIfFull(): void {
    if (this.sessions.size < this.maxSessions) {
      return;
    }
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, rec] of this.sessions.entries()) {
      if (rec.updatedAt < oldestTime) {
        oldestTime = rec.updatedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.sessions.delete(oldestKey);
    }
  }

  /**
   * Allocates and registers a fresh HMAC-signed session bound to a specific
   * `studentId`.
   *
   * @param studentId Verified student identifier.
   * @returns Newly created {@link SessionRecord}.
   */
  createStudentSession(studentId: string): SessionRecord {
    this.evictIfFull();
    const { rawId, signedId } = createSignedSessionId(this.hmacSecret);
    const created: SessionRecord = {
      rawId,
      signedId,
      mode: 'student',
      studentId,
      issuedReplies: new Set<string>(),
      updatedAt: Date.now(),
    };
    this.sessions.set(rawId, created);
    return created;
  }

  /**
   * Retrieves an existing verified session matching the requested mode (and
   * bound `studentId` in student mode), or allocates a fresh signed session.
   *
   * Throws {@link SessionStudentMismatchError} if a verified student session
   * belongs to a different student than `studentId`.
   *
   * @param signedToken Optional client-supplied signed session token.
   * @param mode Active agent mode (`student` or `teacher`).
   * @param studentId Authoritative student ID when `mode === 'student'`.
   * @returns Active {@link SessionRecord}.
   */
  getOrCreateSession(
    signedToken: string | undefined,
    mode: AgentMode,
    studentId?: string
  ): SessionRecord {
    const verifiedRawId = verifySignedSessionId(signedToken, this.hmacSecret);
    if (verifiedRawId) {
      const existing = this.sessions.get(verifiedRawId);
      if (existing && existing.mode === mode) {
        if (mode === 'student') {
          if (existing.studentId && studentId && existing.studentId !== studentId) {
            throw new SessionStudentMismatchError();
          }
          if (!existing.studentId && studentId) {
            existing.studentId = studentId;
          }
        }
        existing.updatedAt = Date.now();
        return existing;
      }
    }

    this.evictIfFull();

    const { rawId, signedId } = createSignedSessionId(this.hmacSecret);
    const created: SessionRecord = {
      rawId,
      signedId,
      mode,
      ...(mode === 'student' && studentId ? { studentId } : {}),
      issuedReplies: new Set<string>(),
      updatedAt: Date.now(),
    };
    this.sessions.set(rawId, created);
    return created;
  }

  /**
   * Verifies that `signedToken` corresponds to an active student session bound
   * to `expectedStudentId`.
   *
   * @param signedToken Signed session token from header or request body.
   * @param expectedStudentId Student ID from route parameter.
   * @returns Verification outcome with `401` (missing/invalid) or `403` (mismatch).
   */
  verifyStudentSession(
    signedToken: string | undefined,
    expectedStudentId: string
  ): StudentSessionVerificationResult {
    if (!signedToken || signedToken.trim().length === 0) {
      return {
        ok: false,
        status: 401,
        error: 'A valid student session is required for this endpoint.',
      };
    }

    const verifiedRawId = verifySignedSessionId(signedToken.trim(), this.hmacSecret);
    if (!verifiedRawId) {
      return {
        ok: false,
        status: 401,
        error: 'Invalid or expired student session.',
      };
    }

    const existing = this.sessions.get(verifiedRawId);
    if (!existing || existing.mode !== 'student' || !existing.studentId) {
      return {
        ok: false,
        status: 401,
        error: 'Invalid or expired student session.',
      };
    }

    if (existing.studentId !== expectedStudentId) {
      return {
        ok: false,
        status: 403,
        error: 'Session does not belong to the requested student.',
      };
    }

    existing.updatedAt = Date.now();
    return { ok: true, session: existing };
  }

  /**
   * Filters client-supplied conversation history, dropping any `assistant`
   * message whose text was not previously issued by the server in this session.
   *
   * @param session Active session record.
   * @param messages Client-supplied message list.
   * @returns Sanitized conversation history safe to forward to Gemini.
   */
  sanitizeHistory(
    session: SessionRecord,
    messages: Array<{ role: 'user' | 'assistant'; text: string }>
  ): Array<{ role: 'user' | 'assistant'; text: string }> {
    return messages.filter((msg) => {
      if (msg.role === 'user') {
        return true;
      }
      return session.issuedReplies.has(msg.text.trim());
    });
  }

  /**
   * Records a server-issued assistant reply so future turns in the same
   * session can legitimately include it in conversation history.
   *
   * @param session Active session record.
   * @param reply Assistant reply text emitted by the server.
   */
  recordIssuedReply(session: SessionRecord, reply: string): void {
    const trimmed = reply.trim();
    if (trimmed.length > 0) {
      session.issuedReplies.add(trimmed);
      session.updatedAt = Date.now();
    }
  }
}
