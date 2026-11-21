import crypto from 'node:crypto';
import { z } from 'zod';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ID_MAX_LENGTH,
  ID_MIN_LENGTH,
  MAX_CHAT_MESSAGES,
  MAX_HINT_LEVEL,
  MAX_IMAGE_BYTES,
  MAX_MESSAGE_CHARS,
  MAX_SUBJECT_CHARS,
  MAX_TOPIC_CHARS,
  PARENT_UPDATE_LANGUAGES,
  PRACTICE_QUIZ_QUESTION_COUNT,
  SESSION_ID_MAX_LENGTH,
  SESSION_ID_MIN_LENGTH,
} from './config.ts';
import type {
  PublicStudentProfile,
  StudentProfile,
  TeacherStudentProfile,
} from './types.ts';

export {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_CHAT_MESSAGES,
  MAX_IMAGE_BYTES,
  MAX_MESSAGE_CHARS,
};

/**
 * Zod schema validating URL entity identifiers (student IDs, alert IDs).
 */
export const idParamSchema = z
  .string()
  .trim()
  .min(ID_MIN_LENGTH)
  .max(ID_MAX_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);

/**
 * Zod schema validating a single chat turn sent by the client.
 */
export const chatMessageInputSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().max(MAX_MESSAGE_CHARS),
});

/**
 * Computes the exact decoded byte length of a base64 payload, or returns `null`
 * if the string is not valid base64.
 *
 * @param rawBase64 Base64-encoded payload (whitespace allowed).
 * @returns Decoded byte count, or `null` when malformed.
 */
export function getDecodedBase64ByteLength(rawBase64: string): number | null {
  const cleaned = rawBase64.replace(/\s+/g, '');
  if (cleaned.length === 0 || cleaned.length % 4 !== 0) {
    return null;
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    return null;
  }
  const decoded = Buffer.from(cleaned, 'base64');
  return decoded.byteLength;
}

/**
 * Strict Zod schema validating `POST /api/chat` request payloads, including
 * mode rules, message caps, MIME allowlist, and decoded 4 MB image cap.
 */
export const chatRequestSchema = z
  .object({
    mode: z.enum(['student', 'teacher']),
    studentId: idParamSchema.optional(),
    sessionId: z
      .string()
      .trim()
      .min(SESSION_ID_MIN_LENGTH)
      .max(SESSION_ID_MAX_LENGTH)
      .optional(),
    messages: z.array(chatMessageInputSchema).min(1).max(MAX_CHAT_MESSAGES),
    imageBase64: z.string().min(1).optional(),
    imageMimeType: z.enum(ALLOWED_IMAGE_MIME_TYPES).optional(),
    hintLevel: z.number().int().min(1).max(MAX_HINT_LEVEL).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.mode === 'student' && !data.studentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['studentId'],
        message: 'Student ID is required in student mode.',
      });
    }

    const hasBase64 = Boolean(data.imageBase64);
    const hasMime = Boolean(data.imageMimeType);
    if (hasBase64 !== hasMime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['imageMimeType'],
        message:
          'Both imageBase64 and a valid imageMimeType must be provided together.',
      });
    }

    if (data.imageBase64) {
      const byteLength = getDecodedBase64ByteLength(data.imageBase64);
      if (byteLength === null || byteLength === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['imageBase64'],
          message: 'Invalid base64 image payload.',
        });
      } else if (byteLength > MAX_IMAGE_BYTES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['imageBase64'],
          message: 'Image exceeds maximum size of 4 MB.',
        });
      }
    }

    const lastMessage = data.messages[data.messages.length - 1];
    if (lastMessage.role !== 'user') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['messages'],
        message: 'The latest message must be from the user.',
      });
    }
    if (!lastMessage.text.trim() && !data.imageBase64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['messages'],
        message: 'Message text or an image attachment is required.',
      });
    }
  });

/** Parsed and validated `/api/chat` payload type. */
export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Zod schema validating `POST /api/students/:id/quiz` request body.
 */
export const practiceQuizRequestSchema = z
  .object({
    subject: z.string().trim().min(1).max(MAX_SUBJECT_CHARS),
    topic: z.string().trim().min(1).max(MAX_TOPIC_CHARS),
  })
  .strict();

/** Parsed and validated practice quiz generation payload type. */
export type ValidatedPracticeQuizRequest = z.infer<typeof practiceQuizRequestSchema>;

/**
 * Zod schema validating `POST /api/students/:id/quiz/submit` request body.
 */
export const practiceQuizSubmitSchema = z
  .object({
    quizId: idParamSchema,
    answers: z
      .array(z.number().int().min(0).max(3))
      .length(PRACTICE_QUIZ_QUESTION_COUNT),
  })
  .strict();

/** Parsed and validated practice quiz submission payload type. */
export type ValidatedPracticeQuizSubmit = z.infer<typeof practiceQuizSubmitSchema>;

/**
 * Zod schema validating `POST /api/teacher/students/:id/parent-update` request body.
 */
export const parentUpdateRequestSchema = z
  .object({
    language: z.enum(PARENT_UPDATE_LANGUAGES),
  })
  .strict();

/** Parsed and validated parent update request payload type. */
export type ValidatedParentUpdateRequest = z.infer<typeof parentUpdateRequestSchema>;

/**
 * Masks a phone number so only the last 4 digits remain visible (`******1234`).
 *
 * @param phone Raw phone number string.
 * @returns Masked phone representation.
 */
export function maskPhoneNumber(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') {
    return '******';
  }
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '******';
  }
  return `******${digits.slice(-4)}`;
}

/**
 * Projects a {@link StudentProfile} into a safe client profile containing
 * only non-PII academic attributes (never phone numbers).
 *
 * @param student Internal student record.
 * @returns Public student profile safe for client responses.
 */
export function toPublicStudentProfile(student: StudentProfile): PublicStudentProfile {
  return {
    id: student.id,
    name: student.name,
    grade: student.grade,
    board: student.board,
    preferredLanguage: student.preferredLanguage,
  };
}

/**
 * Projects a {@link StudentProfile} into a teacher-facing profile with its
 * separately mapped phone number masked as `******1234` (raw phone numbers
 * are never transmitted to the browser).
 *
 * @param student Internal student record.
 * @param rawPhone Optional phone number from the separate server-side `studentPhoneMap`.
 * @returns Teacher-safe student profile with masked contact digits.
 */
export function toTeacherStudentProfile(
  student: StudentProfile,
  rawPhone?: string | null
): TeacherStudentProfile {
  const base = toPublicStudentProfile(student);
  if (!rawPhone) {
    return base;
  }
  return {
    ...base,
    maskedPhone: maskPhoneNumber(rawPhone),
  };
}

/**
 * Verifies a client-supplied teacher access code against the server secret
 * using SHA-256 + `crypto.timingSafeEqual` to prevent timing attacks.
 *
 * @param providedCode Header value submitted by the client.
 * @param expectedCode Server-configured `TEACHER_ACCESS_CODE`.
 * @returns Verification result indicating authorization and configuration state.
 */
export function verifyTeacherAccessCode(
  providedCode: string | undefined,
  expectedCode: string | undefined
): { ok: boolean; misconfigured: boolean } {
  if (!expectedCode || expectedCode.trim().length === 0) {
    return { ok: false, misconfigured: true };
  }
  if (!providedCode || providedCode.trim().length === 0) {
    return { ok: false, misconfigured: false };
  }
  const providedHash = crypto.createHash('sha256').update(providedCode.trim()).digest();
  const expectedHash = crypto.createHash('sha256').update(expectedCode.trim()).digest();
  return {
    ok: crypto.timingSafeEqual(providedHash, expectedHash),
    misconfigured: false,
  };
}
