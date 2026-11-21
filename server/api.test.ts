import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHAT_RATE_LIMIT_MAX,
  MAX_IMAGE_BYTES,
  SEED_RECORD_IDS,
  SEED_STUDENT_IDS,
  STUDENT_SESSION_HEADER,
  TEACHER_ACCESS_HEADER,
  TOOL_NAMES,
} from '../shared/config.ts';
import { ChatSessionStore } from '../shared/security.ts';
import { createApp, resolveSessionHmacSecret } from './index.ts';
import { PersistentShikshaStore } from './services/store.ts';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  class MockGoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
    };
  }
  return {
    ...actual,
    GoogleGenAI: MockGoogleGenAI,
  };
});

const TEST_TEACHER_CODE = 'shiksha-secret-teacher-code';

async function createTestHarness() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shiksha-api-test-'));
  const storePath = path.join(tempDir, 'store.json');
  const storeManager = new PersistentShikshaStore(storePath, 20);
  await storeManager.init();
  const sessionStore = new ChatSessionStore('test-hmac-secret-at-least-32-chars');
  const app = createApp({ storeManager, sessionStore, isProd: true });

  const mintStudentSession = async (studentId: string): Promise<string> => {
    const res = await request(app).post(`/api/students/${studentId}/session`);
    expect(res.status).toBe(200);
    expect(res.body.studentId).toBe(studentId);
    expect(typeof res.body.sessionId).toBe('string');
    return res.body.sessionId as string;
  };

  return {
    app,
    storeManager,
    storePath,
    mintStudentSession,
    cleanup: async () => {
      await storeManager.flush();
      await fs.rm(tempDir, { recursive: true, force: true });
    },
  };
}

describe('Shiksha-Agent Express API (supertest + mocked Gemini)', () => {
  const originalEnv = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    TEACHER_ACCESS_CODE: process.env.TEACHER_ACCESS_CODE,
    SESSION_HMAC_SECRET: process.env.SESSION_HMAC_SECRET,
  };

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockGenerateContent.mockReset();
    process.env.GEMINI_API_KEY = 'mock-server-gemini-key';
    process.env.TEACHER_ACCESS_CODE = TEST_TEACHER_CODE;
    process.env.SESSION_HMAC_SECRET = 'configured-hmac-secret-123456';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    process.env.GEMINI_API_KEY = originalEnv.GEMINI_API_KEY;
    process.env.TEACHER_ACCESS_CODE = originalEnv.TEACHER_ACCESS_CODE;
    process.env.SESSION_HMAC_SECRET = originalEnv.SESSION_HMAC_SECRET;
  });

  it('resolveSessionHmacSecret uses configured secret or generates fallback entropy', () => {
    expect(resolveSessionHmacSecret()).toBe('configured-hmac-secret-123456');
    process.env.SESSION_HMAC_SECRET = 'short';
    const generated = resolveSessionHmacSecret();
    expect(generated.length).toBeGreaterThanOrEqual(32);
  });

  it('GET /api/students returns public roster and NEVER contains whatsappNumber or maskedPhone', async () => {
    const harness = await createTestHarness();
    try {
      const res = await request(harness.app).get('/api/students');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.students)).toBe(true);
      expect(res.body.students.length).toBeGreaterThanOrEqual(4);
      expect(JSON.stringify(res.body)).not.toContain('whatsappNumber');
      expect(JSON.stringify(res.body)).not.toContain('maskedPhone');
      expect(JSON.stringify(res.body)).not.toContain('+91');

      const aaravSession = await harness.mintStudentSession(SEED_STUDENT_IDS.AARAV);

      const progressRes = await request(harness.app)
        .get(`/api/students/${SEED_STUDENT_IDS.AARAV}/progress`)
        .set(STUDENT_SESSION_HEADER, aaravSession);
      expect(progressRes.status).toBe(200);
      expect(progressRes.body.studentId).toBe(SEED_STUDENT_IDS.AARAV);
      expect(Array.isArray(progressRes.body.progressLogs)).toBe(true);

      const badIdRes = await request(harness.app).get('/api/students/a/progress');
      expect(badIdRes.status).toBe(400);

      const unknownSessionRes = await request(harness.app).post(
        '/api/students/STU-UNKNOWN-999/session'
      );
      expect(unknownSessionRes.status).toBe(404);
    } finally {
      await harness.cleanup();
    }
  });

  it('binds student sessions to studentId: returns 401 without session and 403 on cross-student session reuse across chat, progress, learning-path, and quiz routes', async () => {
    const harness = await createTestHarness();
    try {
      const aaravSession = await harness.mintStudentSession(SEED_STUDENT_IDS.AARAV);
      const priyaSession = await harness.mintStudentSession(SEED_STUDENT_IDS.PRIYA);

      // Missing x-student-session -> 401 on all protected student routes
      expect(
        (
          await request(harness.app).get(
            `/api/students/${SEED_STUDENT_IDS.AARAV}/progress`
          )
        ).status
      ).toBe(401);
      expect(
        (
          await request(harness.app).get(
            `/api/students/${SEED_STUDENT_IDS.AARAV}/learning-path`
          )
        ).status
      ).toBe(401);
      expect(
        (
          await request(harness.app)
            .post(`/api/students/${SEED_STUDENT_IDS.AARAV}/quiz`)
            .send({ subject: 'Math', topic: 'Linear Equations' })
        ).status
      ).toBe(401);
      expect(
        (
          await request(harness.app)
            .post(`/api/students/${SEED_STUDENT_IDS.AARAV}/quiz/submit`)
            .send({ quizId: 'quiz-123', answers: [0, 1, 2] })
        ).status
      ).toBe(401);

      // Cross-student session reuse (Priya's session used on Aarav's routes) -> 403
      expect(
        (
          await request(harness.app)
            .get(`/api/students/${SEED_STUDENT_IDS.AARAV}/progress`)
            .set(STUDENT_SESSION_HEADER, priyaSession)
        ).status
      ).toBe(403);
      expect(
        (
          await request(harness.app)
            .get(`/api/students/${SEED_STUDENT_IDS.AARAV}/learning-path`)
            .set(STUDENT_SESSION_HEADER, priyaSession)
        ).status
      ).toBe(403);
      expect(
        (
          await request(harness.app)
            .post(`/api/students/${SEED_STUDENT_IDS.AARAV}/quiz`)
            .set(STUDENT_SESSION_HEADER, priyaSession)
            .send({ subject: 'Math', topic: 'Linear Equations' })
        ).status
      ).toBe(403);
      expect(
        (
          await request(harness.app)
            .post(`/api/students/${SEED_STUDENT_IDS.AARAV}/quiz/submit`)
            .set(STUDENT_SESSION_HEADER, priyaSession)
            .send({ quizId: 'quiz-123', answers: [0, 1, 2] })
        ).status
      ).toBe(403);

      // Cross-student sessionId on POST /api/chat -> 403
      const chatMismatch = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.PRIYA,
          sessionId: aaravSession,
          messages: [{ role: 'user', text: 'Trying another student session' }],
        });
      expect(chatMismatch.status).toBe(403);
      expect(chatMismatch.body.error).toMatch(
        /does not belong to the requested student/i
      );
    } finally {
      await harness.cleanup();
    }
  });

  it('GET /api/state returns live aggregate counters with zero PII and updates when alerts change', async () => {
    const harness = await createTestHarness();
    try {
      const res = await request(harness.app).get('/api/state');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        studentsTracked: 4,
        topicsMastered: 1,
        teacherAlerts: 1,
      });

      // Must never leak student names, phone numbers, or alert reasons
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('whatsappNumber');
      expect(serialized).not.toContain('Aarav');
      expect(serialized).not.toContain('Rohan');
      expect(serialized).not.toContain('+91');

      // Acknowledge the active alert -> teacherAlerts count drops live to 0
      const ackRes = await request(harness.app)
        .post(`/api/alerts/${SEED_RECORD_IDS.ALERT_1}/acknowledge`)
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(ackRes.status).toBe(200);

      const updated = await request(harness.app).get('/api/state');
      expect(updated.status).toBe(200);
      expect(updated.body.teacherAlerts).toBe(0);
      expect(updated.body.studentsTracked).toBe(4);
      expect(updated.body.topicsMastered).toBe(1);
    } finally {
      await harness.cleanup();
    }
  });

  it('returns 401 on teacher routes without x-teacher-code, 503 when unconfigured, and 200 with valid code', async () => {
    const harness = await createTestHarness();
    try {
      const unauthOverview = await request(harness.app).get('/api/teacher/overview');
      expect(unauthOverview.status).toBe(401);

      const wrongOverview = await request(harness.app)
        .get('/api/teacher/overview')
        .set(TEACHER_ACCESS_HEADER, 'wrong-secret');
      expect(wrongOverview.status).toBe(401);

      const unauthAck = await request(harness.app).post(
        `/api/alerts/${SEED_RECORD_IDS.ALERT_1}/acknowledge`
      );
      expect(unauthAck.status).toBe(401);

      const unauthTeacherChat = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'teacher',
          messages: [{ role: 'user', text: 'Create a 40-min lesson plan' }],
        });
      expect(unauthTeacherChat.status).toBe(401);

      // Misconfigured TEACHER_ACCESS_CODE fails closed with 503
      delete process.env.TEACHER_ACCESS_CODE;
      const misconfiguredRes = await request(harness.app)
        .get('/api/teacher/overview')
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(misconfiguredRes.status).toBe(503);
      process.env.TEACHER_ACCESS_CODE = TEST_TEACHER_CODE;

      // Authorized overview masks teacher contact numbers as ******1234 and NEVER exposes raw phone numbers
      const authOverview = await request(harness.app)
        .get('/api/teacher/overview')
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(authOverview.status).toBe(200);
      expect(JSON.stringify(authOverview.body)).not.toContain('whatsappNumber');
      expect(JSON.stringify(authOverview.body)).not.toContain('+91');
      expect(authOverview.body.students[0].maskedPhone).toMatch(/^\*{6}\d{4}$/);

      // Authorized alert acknowledge toggles status and returns delta { alert }
      const ackRes = await request(harness.app)
        .post(`/api/alerts/${SEED_RECORD_IDS.ALERT_1}/acknowledge`)
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(ackRes.status).toBe(200);
      expect(ackRes.body).toHaveProperty('alert');
      expect(ackRes.body.alert.status).toBe('Acknowledged');
      expect(ackRes.body).not.toHaveProperty('overview');

      const notFoundAck = await request(harness.app)
        .post('/api/alerts/alert-does-not-exist/acknowledge')
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(notFoundAck.status).toBe(404);
    } finally {
      await harness.cleanup();
    }
  });

  it('returns 400 on invalid body, oversized messages, bad MIME type, oversized image, and malformed JSON', async () => {
    const harness = await createTestHarness();
    try {
      // Invalid mode
      const badMode = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'superadmin',
          messages: [{ role: 'user', text: 'Hi' }],
        });
      expect(badMode.status).toBe(400);
      expect(badMode.body.requestId).toBeTruthy();

      // Oversized message text (> 2000 chars)
      const longMsg = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          messages: [{ role: 'user', text: 'x'.repeat(2001) }],
        });
      expect(longMsg.status).toBe(400);

      // Too many messages (> 20)
      const manyMsgs = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          messages: Array.from({ length: 21 }, () => ({
            role: 'user',
            text: 'hi',
          })),
        });
      expect(manyMsgs.status).toBe(400);

      // Bad MIME type
      const tinyImg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64');
      const badMime = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          messages: [{ role: 'user', text: 'Check this' }],
          imageBase64: tinyImg,
          imageMimeType: 'image/gif',
        });
      expect(badMime.status).toBe(400);

      // Oversized image (> 4 MB decoded, within 5mb express JSON limit? Let's test 4.05MB -> ~5.4MB -> 413 or 400!)
      const oversizedBase64 = Buffer.alloc(MAX_IMAGE_BYTES + 1024, 1).toString(
        'base64'
      );
      const hugeImg = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          messages: [{ role: 'user', text: 'Huge photo' }],
          imageBase64: oversizedBase64,
          imageMimeType: 'image/jpeg',
        });
      expect([400, 413]).toContain(hugeImg.status);

      // Malformed JSON triggers errorHandler 400 without stack trace
      const malformedJson = await request(harness.app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('{"mode": "student",');
      expect(malformedJson.status).toBe(400);
      expect(JSON.stringify(malformedJson.body)).not.toContain('SyntaxError');
      expect(JSON.stringify(malformedJson.body)).not.toContain(' at ');
    } finally {
      await harness.cleanup();
    }
  });

  it('tool loop executes log_student_progress & alert_teacher_dropout_risk and ignores spoofed student_id', async () => {
    const harness = await createTestHarness();
    try {
      // Turn 1: Gemini invokes BOTH tools with a spoofed student_id
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                {
                  functionCall: {
                    name: TOOL_NAMES.LOG_STUDENT_PROGRESS,
                    args: {
                      student_id: 'STU-SPOOFED-999',
                      subject: 'Math',
                      topic: 'Quadratic Equations',
                      competency_level: 'Struggling',
                      frustration_detected: true,
                    },
                  },
                },
                {
                  functionCall: {
                    name: TOOL_NAMES.ALERT_TEACHER_DROPOUT_RISK,
                    args: {
                      student_id: 'STU-SPOOFED-999',
                      reason_for_alert: 'Repeated frustration on algebra foundations.',
                    },
                  },
                },
              ],
            },
          },
        ],
        functionCalls: [
          {
            id: 'call-1',
            name: TOOL_NAMES.LOG_STUDENT_PROGRESS,
            args: {
              student_id: 'STU-SPOOFED-999',
              subject: 'Math',
              topic: 'Quadratic Equations',
              competency_level: 'Struggling',
              frustration_detected: true,
            },
          },
          {
            id: 'call-2',
            name: TOOL_NAMES.ALERT_TEACHER_DROPOUT_RISK,
            args: {
              student_id: 'STU-SPOOFED-999',
              reason_for_alert: 'Repeated frustration on algebra foundations.',
            },
          },
        ],
        text: '',
      });

      // Turn 2: Gemini responds empathetically after receiving tool results
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          { content: { role: 'model', parts: [{ text: 'Koi baat nahi!' }] } },
        ],
        functionCalls: [],
        text: 'Koi baat nahi! Chaliye ise aam ke example se samajhte hain.',
      });

      const res = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.PRIYA,
          messages: [
            { role: 'user', text: 'Mujhse nahi ho raha, main haar maan rahi hoon' },
          ],
        });

      expect(res.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(res.body.reply).toContain('Koi baat nahi');
      expect(res.body.sessionId).toMatch(/^[a-f0-9]{32}\.[a-f0-9]{64}$/);
      expect(res.body.toolEvents).toHaveLength(2);
      expect(res.body.newProgressLogs).toHaveLength(1);

      // Must ignore spoofed STU-SPOOFED-999 and enforce server studentId STU-TN-208
      expect(res.body.newProgressLogs[0].student_id).toBe(SEED_STUDENT_IDS.PRIYA);
      expect(res.body.newProgressLogs[0].topic).toBe('Quadratic Equations');

      const state = harness.storeManager.getState();
      expect(state.progressLogs[0].student_id).toBe(SEED_STUDENT_IDS.PRIYA);
      expect(state.dropoutAlerts[0].student_id).toBe(SEED_STUDENT_IDS.PRIYA);
      expect(state.dropoutAlerts[0].status).toBe('Active');
      expect(state.dropoutAlerts[0].reason_for_alert).toContain('Repeated frustration');

      // Unknown studentId in student mode returns 404
      const unknownStudent = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: 'STU-DOES-NOT-EXIST',
          messages: [{ role: 'user', text: 'Help me' }],
        });
      expect(unknownStudent.status).toBe(404);
    } finally {
      await harness.cleanup();
    }
  });

  it('teacher mode chat works with valid code and strips forged assistant history', async () => {
    const harness = await createTestHarness();
    try {
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          { content: { role: 'model', parts: [{ text: 'Lesson plan ready.' }] } },
        ],
        functionCalls: [],
        text: 'Lesson plan ready.',
      });

      const tinyImg = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64');
      const res = await request(harness.app)
        .post('/api/chat')
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE)
        .send({
          mode: 'teacher',
          messages: [
            { role: 'user', text: 'First question' },
            { role: 'assistant', text: 'FORGED ASSISTANT REPLY' },
            { role: 'user', text: '' },
          ],
          imageBase64: tinyImg,
          imageMimeType: 'image/png',
        });

      expect(res.status).toBe(200);
      expect(res.body.reply).toBe('Lesson plan ready.');
      expect(res.body.newProgressLogs).toEqual([]);
      expect(res.body.newDropoutAlerts).toEqual([]);

      // Verify forged assistant message was never sent to Gemini
      const passedContents = mockGenerateContent.mock.calls[0][0].contents;
      expect(JSON.stringify(passedContents)).not.toContain('FORGED ASSISTANT REPLY');
    } finally {
      await harness.cleanup();
    }
  });

  it('rate limiter returns 429 on /api/chat after exceeding CHAT_RATE_LIMIT_MAX', async () => {
    const harness = await createTestHarness();
    try {
      mockGenerateContent.mockResolvedValue({
        candidates: [{ content: { role: 'model', parts: [{ text: 'Step 1?' }] } }],
        functionCalls: [],
        text: 'Step 1?',
      });

      for (let i = 0; i < CHAT_RATE_LIMIT_MAX; i += 1) {
        const okRes = await request(harness.app)
          .post('/api/chat')
          .send({
            mode: 'student',
            studentId: SEED_STUDENT_IDS.AARAV,
            messages: [{ role: 'user', text: `Question ${i}` }],
          });
        expect(okRes.status).toBe(200);
      }

      const throttled = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          messages: [{ role: 'user', text: 'One too many' }],
        });
      expect(throttled.status).toBe(429);
      expect(throttled.body.error).toMatch(/Too many chat requests/i);
      expect(throttled.body.requestId).toBeTruthy();
    } finally {
      await harness.cleanup();
    }
  });

  it('error responses contain no stack trace and Gemini abort returns 504 with friendly retry message', async () => {
    const harness = await createTestHarness();
    try {
      const secretError = new Error('Internal secret crash at /srv/private/db.ts:99');
      mockGenerateContent.mockRejectedValueOnce(secretError);

      const errRes = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          messages: [{ role: 'user', text: 'Trigger failure' }],
        });

      expect(errRes.status).toBe(500);
      expect(errRes.body.requestId).toBeTruthy();
      const serialized = JSON.stringify(errRes.body);
      expect(serialized).not.toContain('Internal secret crash');
      expect(serialized).not.toContain('/srv/private');
      expect(serialized).not.toContain('stack');
      expect(serialized).not.toContain(' at ');

      // AbortError simulates 30s timeout -> 504 friendly retry message
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      mockGenerateContent.mockRejectedValueOnce(abortErr);

      const timeoutRes = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          messages: [{ role: 'user', text: 'Slow call' }],
        });

      expect(timeoutRes.status).toBe(504);
      expect(timeoutRes.body.error).toMatch(/took too long/i);
      expect(timeoutRes.body.requestId).toBeTruthy();
    } finally {
      await harness.cleanup();
    }
  });

  it('Socratic answer guard regenerates once on direct numeric leak and logs hints_used from Hint Ladder', async () => {
    const harness = await createTestHarness();
    try {
      // Turn 1: Gemini calls log_student_progress
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                {
                  functionCall: {
                    name: TOOL_NAMES.LOG_STUDENT_PROGRESS,
                    args: {
                      student_id: SEED_STUDENT_IDS.AARAV,
                      subject: 'Math',
                      topic: 'Linear Equations',
                      competency_level: 'Progressing',
                      frustration_detected: false,
                    },
                  },
                },
              ],
            },
          },
        ],
        functionCalls: [
          {
            id: 'call-hint-1',
            name: TOOL_NAMES.LOG_STUDENT_PROGRESS,
            args: {
              student_id: SEED_STUDENT_IDS.AARAV,
              subject: 'Math',
              topic: 'Linear Equations',
              competency_level: 'Progressing',
              frustration_detected: false,
            },
          },
        ],
        text: '',
      });

      // Turn 2: Gemini accidentally leaks final numeric answer x = 5
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [{ text: 'Subtract 5 and divide by 2, so x = 5.' }],
            },
          },
        ],
        functionCalls: [],
        text: 'Subtract 5 and divide by 2, so x = 5.',
      });

      // Turn 3: Socratic Answer Guard triggers a single safe regeneration
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [
          {
            content: {
              role: 'model',
              parts: [
                {
                  text: 'Try a similar example: 3y + 4 = 19. What should we subtract from both sides first?',
                },
              ],
            },
          },
        ],
        functionCalls: [],
        text: 'Try a similar example: 3y + 4 = 19. What should we subtract from both sides first?',
      });

      const res = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          hintLevel: 2,
          messages: [{ role: 'user', text: 'Can you solve 2x + 5 = 15?' }],
        });

      expect(res.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
      expect(res.body.answerGuardTriggered).toBe(true);
      expect(res.body.reply).not.toContain('x = 5');
      expect(res.body.reply).toContain('3y + 4 = 19');
      expect(res.body.newProgressLogs).toHaveLength(1);
      expect(res.body.newProgressLogs[0].hints_used).toBe(2);
    } finally {
      await harness.cleanup();
    }
  });

  it('GET /api/students/:id/learning-path generates a 5-step path with sequential unlock and caches until refresh', async () => {
    const harness = await createTestHarness();
    try {
      const mockPathJson = JSON.stringify({
        steps: [
          {
            subject: 'Science',
            topic: 'Photosynthesis',
            why: 'Already mastered foundation for plant nutrition.',
            estimatedMinutes: 15,
          },
          {
            subject: 'Science',
            topic: 'Plant Respiration',
            why: 'Natural next concept after photosynthesis.',
            estimatedMinutes: 20,
          },
          {
            subject: 'Math',
            topic: 'Fractions',
            why: 'Builds core number sense for Class 6.',
            estimatedMinutes: 20,
          },
          {
            subject: 'Math',
            topic: 'Decimals',
            why: 'Connects fractions to rupee-paise problems.',
            estimatedMinutes: 25,
          },
          {
            subject: 'Science',
            topic: 'Water Cycle',
            why: 'Links evaporation to local monsoon patterns.',
            estimatedMinutes: 15,
          },
        ],
      });

      mockGenerateContent.mockResolvedValue({
        text: mockPathJson,
      });

      // Priya (STU-TN-208) already has Photosynthesis = Mastered in seed logs
      const priyaSession = await harness.mintStudentSession(SEED_STUDENT_IDS.PRIYA);
      const res1 = await request(harness.app)
        .get(`/api/students/${SEED_STUDENT_IDS.PRIYA}/learning-path`)
        .set(STUDENT_SESSION_HEADER, priyaSession);
      expect(res1.status).toBe(200);
      expect(res1.body.learningPath.steps).toHaveLength(5);
      expect(
        res1.body.learningPath.steps.map((s: { status: string }) => s.status)
      ).toEqual(['Mastered', 'Unlocked', 'Locked', 'Locked', 'Locked']);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Second call uses cached path without calling Gemini again
      const resCached = await request(harness.app)
        .get(`/api/students/${SEED_STUDENT_IDS.PRIYA}/learning-path`)
        .set(STUDENT_SESSION_HEADER, priyaSession);
      expect(resCached.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // ?refresh=1 forces regeneration
      const resRefreshed = await request(harness.app)
        .get(`/api/students/${SEED_STUDENT_IDS.PRIYA}/learning-path?refresh=1`)
        .set(STUDENT_SESSION_HEADER, priyaSession);
      expect(resRefreshed.status).toBe(200);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);

      // Unknown student with Priya's session returns 403
      const unknown = await request(harness.app)
        .get('/api/students/STU-UNKNOWN-999/learning-path')
        .set(STUDENT_SESSION_HEADER, priyaSession);
      expect(unknown.status).toBe(403);
    } finally {
      await harness.cleanup();
    }
  });

  it('POST /api/students/:id/quiz & /quiz/submit generate a 3-question quiz without leaking answers, grade server-side, and log result', async () => {
    const harness = await createTestHarness();
    try {
      const mockQuizJson = JSON.stringify({
        language: 'Tamil / English',
        questions: [
          {
            id: 'q1',
            question: 'Which gas do plants absorb during photosynthesis?',
            options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'],
            correctIndex: 1,
            explanation: 'Plants absorb carbon dioxide through stomata.',
          },
          {
            id: 'q2',
            question: 'Which pigment gives leaves their green colour?',
            options: ['Chlorophyll', 'Haemoglobin', 'Melanin', 'Carotene'],
            correctIndex: 0,
            explanation: 'Chlorophyll captures sunlight for food production.',
          },
          {
            id: 'q3',
            question: 'Where does most photosynthesis take place?',
            options: ['Roots', 'Stem bark', 'Leaves', 'Seeds'],
            correctIndex: 2,
            explanation: 'Leaves contain abundant chloroplasts exposed to sunlight.',
          },
        ],
      });

      mockGenerateContent.mockResolvedValueOnce({ text: mockQuizJson });

      const priyaSession = await harness.mintStudentSession(SEED_STUDENT_IDS.PRIYA);

      const createRes = await request(harness.app)
        .post(`/api/students/${SEED_STUDENT_IDS.PRIYA}/quiz`)
        .set(STUDENT_SESSION_HEADER, priyaSession)
        .send({ subject: 'Science', topic: 'Photosynthesis' });

      expect(createRes.status).toBe(200);
      expect(createRes.body.quiz.questions).toHaveLength(3);
      // Answer key must never leak to the client before submission
      expect(JSON.stringify(createRes.body)).not.toContain('correctIndex');
      expect(JSON.stringify(createRes.body)).not.toContain('explanation');

      const quizId = createRes.body.quiz.quizId as string;

      // Submit 2 correct + 1 incorrect answer -> 2/3 (passed)
      const submitRes = await request(harness.app)
        .post(`/api/students/${SEED_STUDENT_IDS.PRIYA}/quiz/submit`)
        .set(STUDENT_SESSION_HEADER, priyaSession)
        .send({ quizId, answers: [1, 0, 0] });

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.score).toBe(2);
      expect(submitRes.body.total).toBe(3);
      expect(submitRes.body.passed).toBe(true);
      expect(submitRes.body.results).toHaveLength(3);
      expect(submitRes.body.results[2].isCorrect).toBe(false);
      expect(submitRes.body.results[2].correctIndex).toBe(2);
      expect(submitRes.body.results[2].explanation).toContain('chloroplasts');
      expect(submitRes.body.progressLog.quiz_score).toBe(2);
      expect(submitRes.body.progressLog.quiz_total).toBe(3);
      expect(submitRes.body.progressLog.competency_level).toBe('Mastered');

      // Re-submitting the same consumed quizId returns 404
      const replayRes = await request(harness.app)
        .post(`/api/students/${SEED_STUDENT_IDS.PRIYA}/quiz/submit`)
        .set(STUDENT_SESSION_HEADER, priyaSession)
        .send({ quizId, answers: [1, 0, 2] });
      expect(replayRes.status).toBe(404);
    } finally {
      await harness.cleanup();
    }
  });

  it('Socratic Answer Guard stays active across 3 consecutive Hint Ladder clicks and /learning-path & /quiz return safe 504/500/400 responses', async () => {
    const harness = await createTestHarness();
    try {
      // Simulate Hint Level 3 where the original math problem was 3 user turns earlier
      mockGenerateContent
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ text: 'First step is 2x = 10, so x = 5.' }],
              },
            },
          ],
          functionCalls: [],
          text: 'First step is 2x = 10, so x = 5.',
        })
        .mockResolvedValueOnce({
          candidates: [
            {
              content: {
                role: 'model',
                parts: [
                  {
                    text: 'First step: subtract 5 from both sides to get 2x = 10. Now you finish the last step!',
                  },
                ],
              },
            },
          ],
          functionCalls: [],
          text: 'First step: subtract 5 from both sides to get 2x = 10. Now you finish the last step!',
        });

      const hint3Res = await request(harness.app)
        .post('/api/chat')
        .send({
          mode: 'student',
          studentId: SEED_STUDENT_IDS.AARAV,
          hintLevel: 3,
          messages: [
            { role: 'user', text: 'Can you solve 2x + 5 = 15?' },
            { role: 'user', text: "I'm stuck, give me a Level 1 guiding question." },
            {
              role: 'user',
              text: "I'm still stuck, give me a Level 2 worked example.",
            },
            { role: 'user', text: "I'm still stuck, show me ONLY the first step." },
          ],
        });

      expect(hint3Res.status).toBe(200);
      expect(hint3Res.body.answerGuardTriggered).toBe(true);
      expect(hint3Res.body.reply).not.toContain('x = 5');

      // Timeout on /learning-path -> 504 friendly retry without stack trace
      const aaravSession = await harness.mintStudentSession(SEED_STUDENT_IDS.AARAV);
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      mockGenerateContent.mockRejectedValueOnce(abortErr);

      const pathTimeout = await request(harness.app)
        .get(`/api/students/${SEED_STUDENT_IDS.AARAV}/learning-path`)
        .set(STUDENT_SESSION_HEADER, aaravSession);
      expect(pathTimeout.status).toBe(504);
      expect(pathTimeout.body.error).toMatch(/took too long/i);

      // Unexpected error on /quiz -> 500 safe message with no internal details
      mockGenerateContent.mockRejectedValueOnce(
        new Error('Internal private model failure at /srv/secret.ts:42')
      );
      const quizErr = await request(harness.app)
        .post(`/api/students/${SEED_STUDENT_IDS.AARAV}/quiz`)
        .set(STUDENT_SESSION_HEADER, aaravSession)
        .send({ subject: 'Math', topic: 'Linear Equations' });
      expect(quizErr.status).toBe(500);
      expect(JSON.stringify(quizErr.body)).not.toContain('/srv/secret');

      // Invalid quiz payload -> 400
      const badQuizBody = await request(harness.app)
        .post(`/api/students/${SEED_STUDENT_IDS.AARAV}/quiz`)
        .set(STUDENT_SESSION_HEADER, aaravSession)
        .send({ subject: '', topic: '' });
      expect(badQuizBody.status).toBe(400);
    } finally {
      await harness.cleanup();
    }
  });

  it('POST /api/teacher/weekly-summary enforces auth, returns 5 structured bullets, and handles 504 timeouts', async () => {
    const harness = await createTestHarness();
    try {
      const unauth = await request(harness.app).post('/api/teacher/weekly-summary');
      expect(unauth.status).toBe(401);

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          bullets: [
            'Priya Nair (STU-TN-208) mastered Photosynthesis in Science.',
            'Rohan Verma (STU-UP-312) needs targeted Fractions & Ratios remediation.',
            'Aarav Sharma (STU-MH-104) is progressing steadily on Linear Equations.',
            'Ananya Patel (STU-GJ-415) is progressing on Water Cycle concepts.',
            'Next week: run a 15-minute small-group fractions check-in.',
          ],
        }),
      });

      const okRes = await request(harness.app)
        .post('/api/teacher/weekly-summary')
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(okRes.status).toBe(200);
      expect(okRes.body.bullets).toHaveLength(5);
      expect(okRes.body.generatedAt).toBeTruthy();

      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';
      mockGenerateContent.mockRejectedValueOnce(abortErr);

      const timeoutRes = await request(harness.app)
        .post('/api/teacher/weekly-summary')
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(timeoutRes.status).toBe(504);
      expect(timeoutRes.body.error).toMatch(/took too long/i);
    } finally {
      await harness.cleanup();
    }
  });

  it('POST /api/teacher/students/:id/parent-update enforces auth, validates language, and returns a warm regional update', async () => {
    const harness = await createTestHarness();
    try {
      const unauth = await request(harness.app)
        .post(`/api/teacher/students/${SEED_STUDENT_IDS.AARAV}/parent-update`)
        .send({ language: 'Hindi' });
      expect(unauth.status).toBe(401);

      const badLang = await request(harness.app)
        .post(`/api/teacher/students/${SEED_STUDENT_IDS.AARAV}/parent-update`)
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE)
        .send({ language: 'French' });
      expect(badLang.status).toBe(400);

      const unknownStu = await request(harness.app)
        .post('/api/teacher/students/STU-UNKNOWN-999/parent-update')
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE)
        .send({ language: 'Hindi' });
      expect(unknownStu.status).toBe(404);

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          message:
            'नमस्ते! आरव कक्षा 8 के गणित में बहुत लगन से सीख रहे हैं।\nवे रेखीय समीकरणों के कदम अच्छे से समझ रहे हैं।\nघर पर रोज़ 10 मिनट दो साधारण सवालों का अभ्यास करने से उनका आत्मविश्वास और बढ़ेगा।\nआपके सहयोग के लिए धन्यवाद!',
          strength: 'Steady effort on Linear Equations',
          practiceArea: 'Daily 10-minute practice with 2 simple balancing problems',
        }),
      });

      const okRes = await request(harness.app)
        .post(`/api/teacher/students/${SEED_STUDENT_IDS.AARAV}/parent-update`)
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE)
        .send({ language: 'Hindi' });
      expect(okRes.status).toBe(200);
      expect(okRes.body.studentId).toBe(SEED_STUDENT_IDS.AARAV);
      expect(okRes.body.language).toBe('Hindi');
      expect(okRes.body.message).toContain('नमस्ते');
      expect(okRes.body.strength).toBeTruthy();
      expect(okRes.body.practiceArea).toBeTruthy();
    } finally {
      await harness.cleanup();
    }
  });

  it('DELETE /api/teacher/students/:id/data permanently removes student logs and alerts from memory and persisted JSON', async () => {
    const harness = await createTestHarness();
    try {
      const unauth = await request(harness.app).delete(
        `/api/teacher/students/${SEED_STUDENT_IDS.ROHAN}/data`
      );
      expect(unauth.status).toBe(401);

      const unknown = await request(harness.app)
        .delete('/api/teacher/students/STU-UNKNOWN-999/data')
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(unknown.status).toBe(404);

      const delRes = await request(harness.app)
        .delete(`/api/teacher/students/${SEED_STUDENT_IDS.ROHAN}/data`)
        .set(TEACHER_ACCESS_HEADER, TEST_TEACHER_CODE);
      expect(delRes.status).toBe(200);
      expect(delRes.body.studentId).toBe(SEED_STUDENT_IDS.ROHAN);
      expect(delRes.body.deletedLogsCount).toBe(1);
      expect(delRes.body.deletedAlertsCount).toBe(1);

      // In-memory store has zero logs/alerts remaining for Rohan
      const state = harness.storeManager.getState();
      expect(
        state.progressLogs.filter((l) => l.student_id === SEED_STUDENT_IDS.ROHAN)
      ).toHaveLength(0);
      expect(
        state.dropoutAlerts.filter((a) => a.student_id === SEED_STUDENT_IDS.ROHAN)
      ).toHaveLength(0);

      // Persisted store.json on disk also reflects the deletion immediately
      const rawDisk = await fs.readFile(harness.storePath, 'utf-8');
      const diskState = JSON.parse(rawDisk) as {
        progressLogs: Array<{ student_id: string }>;
        dropoutAlerts: Array<{ student_id: string }>;
      };
      expect(
        diskState.progressLogs.filter((l) => l.student_id === SEED_STUDENT_IDS.ROHAN)
      ).toHaveLength(0);
      expect(
        diskState.dropoutAlerts.filter((a) => a.student_id === SEED_STUDENT_IDS.ROHAN)
      ).toHaveLength(0);
    } finally {
      await harness.cleanup();
    }
  });
});
