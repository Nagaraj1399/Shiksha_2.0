/**
 * Centralized configuration constants for Shiksha-Agent.
 *
 * Keeps all model identifiers, payload limits, rate limits, storage keys,
 * header names, and seed identifiers in one shared, environment-agnostic module
 * usable by both the Express backend and the React frontend.
 */

/** Gemini model alias used for both Student Tutor and Teacher Aide modes. */
export const GEMINI_MODEL = 'gemini-4-hydrogen' as const;

/** Timeout in milliseconds for each Gemini `generateContent` API call. */
export const GEMINI_TIMEOUT_MS = 30_000;

/** Maximum sequential function-calling turns allowed per chat request. */
export const GEMINI_MAX_TOOL_STEPS = 3;

/** User-Agent header sent with Gemini API requests. */
export const GEMINI_USER_AGENT = 'aistudio-build' as const;

/** Default HTTP port when `PORT` environment variable is unset. */
export const DEFAULT_PORT = 3000;

/** Maximum JSON body size accepted by Express middleware. */
export const JSON_BODY_LIMIT = '5mb' as const;

/** Directory name (relative to cwd) where persistent JSON data is stored. */
export const STORE_DIR_NAME = 'data' as const;

/** File name for the JSON data store inside {@link STORE_DIR_NAME}. */
export const STORE_FILE_NAME = 'shiksha_store.json' as const;

/** Debounce interval in milliseconds for coalescing disk writes. */
export const STORE_DEBOUNCE_MS = 300;

/** Minimum character length required for a configured `SESSION_HMAC_SECRET`. */
export const MIN_HMAC_SECRET_LENGTH = 16;

/** Maximum number of HMAC-signed chat sessions kept in memory. */
export const MAX_CHAT_SESSIONS = 500;

/** Rate-limit sliding window duration in milliseconds (1 minute). */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/** Maximum `/api/chat` requests allowed per IP within {@link RATE_LIMIT_WINDOW_MS}. */
export const CHAT_RATE_LIMIT_MAX = 20;

/** Maximum non-chat `/api/*` requests allowed per IP within {@link RATE_LIMIT_WINDOW_MS}. */
export const GENERAL_API_RATE_LIMIT_MAX = 60;

/** Maximum decoded image attachment size in bytes (4 MB). */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Maximum messages accepted by the `/api/chat` Zod schema per request. */
export const MAX_CHAT_MESSAGES = 20;

/** Maximum character length per chat message accepted by `/api/chat`. */
export const MAX_MESSAGE_CHARS = 2000;

/** Maximum recent messages forwarded to Gemini in a single call. */
export const MAX_GEMINI_MESSAGES = 12;

/** Maximum struggling progress logs injected into Teacher Aide context. */
export const MAX_TEACHER_CONTEXT_LOGS = 10;

/** Maximum active dropout alerts injected into Teacher Aide context. */
export const MAX_TEACHER_CONTEXT_ALERTS = 10;

/** Maximum recent topic attempts injected into Student Tutor context. */
export const MAX_STUDENT_RECENT_LOGS = 5;

/** Fixed number of steps in a generated Personalised Learning Path. */
export const LEARNING_PATH_STEP_COUNT = 5;

/** Fixed number of multiple-choice questions in a Mastery Practice Quiz. */
export const PRACTICE_QUIZ_QUESTION_COUNT = 3;

/** Minimum correct answers required to pass a Mastery Practice Quiz. */
export const QUIZ_PASS_MIN_SCORE = 2;

/** Maximum concurrent active practice quizzes cached in memory. */
export const MAX_ACTIVE_QUIZZES = 200;

/** Expiry window in milliseconds for unsubmitted practice quizzes (30 minutes). */
export const QUIZ_TTL_MS = 30 * 60 * 1000;

/** Maximum hint ladder tier (1: guiding question, 2: worked example, 3: first step). */
export const MAX_HINT_LEVEL = 3;

/** Maximum longest-edge dimension (px) for client-side canvas image compression. */
export const MAX_IMAGE_LONGEST_SIDE = 1280;

/** JPEG export quality (0..1) for client-side canvas image compression. */
export const JPEG_COMPRESSION_QUALITY = 0.8;

/** Allowed MIME types for uploaded image attachments. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** HTTP header carrying the teacher access secret. */
export const TEACHER_ACCESS_HEADER = 'x-teacher-code' as const;

/** HTTP header carrying the HMAC-signed student session token bound to a studentId. */
export const STUDENT_SESSION_HEADER = 'x-student-session' as const;

/** HTTP header returning the server-assigned correlation request ID. */
export const REQUEST_ID_HEADER = 'X-Request-Id' as const;

/** `sessionStorage` key for the verified teacher access code. */
export const TEACHER_CODE_STORAGE_KEY = 'shiksha_teacher_code' as const;

/** `localStorage` key for Light/Night theme preference. */
export const THEME_STORAGE_KEY = 'shiksha_theme' as const;

/** `localStorage` key for accessible root text-size scaling (`base` | `lg` | `xl`). */
export const TEXT_SIZE_STORAGE_KEY = 'shiksha_text_size' as const;

/** Seed student profile identifiers used only for initial store seeding. */
export const SEED_STUDENT_IDS = {
  AARAV: 'STU-MH-104',
  PRIYA: 'STU-TN-208',
  ROHAN: 'STU-UP-312',
  KAVYA: 'STU-GJ-415',
} as const;

/** Seed progress log and alert record identifiers. */
export const SEED_RECORD_IDS = {
  LOG_1: 'log-seed-1',
  LOG_2: 'log-seed-2',
  LOG_3: 'log-seed-3',
  LOG_4: 'log-seed-4',
  ALERT_1: 'alert-seed-1',
} as const;

/** Function-calling tool names registered with Gemini. */
export const TOOL_NAMES = {
  LOG_STUDENT_PROGRESS: 'log_student_progress',
  ALERT_TEACHER_DROPOUT_RISK: 'alert_teacher_dropout_risk',
} as const;

/** Supported student competency assessment levels. */
export const VALID_COMPETENCY_LEVELS = [
  'Mastered',
  'Progressing',
  'Struggling',
] as const;

/** Maximum character length for a logged subject name. */
export const MAX_SUBJECT_CHARS = 100;

/** Maximum character length for a logged topic name. */
export const MAX_TOPIC_CHARS = 140;

/** Maximum character length for a dropout alert reason. */
export const MAX_ALERT_REASON_CHARS = 500;

/** Minimum/maximum length constraints for entity ID parameters. */
export const ID_MIN_LENGTH = 2;
export const ID_MAX_LENGTH = 64;

/** Minimum/maximum length constraints for signed chat session tokens. */
export const SESSION_ID_MIN_LENGTH = 10;
export const SESSION_ID_MAX_LENGTH = 200;

/** Allowed frame ancestors for Content-Security-Policy (supports AI Studio iframe). */
export const CSP_FRAME_ANCESTORS = [
  "'self'",
  'https://aistudio.google.com',
  'https://*.google.com',
  'https://*.usercontent.goog',
] as const;

/** Client-side sentinel message IDs excluded from server chat payloads. */
export const WELCOME_MESSAGE_IDS = {
  STUDENT: 'student-welcome',
  TEACHER: 'teacher-welcome',
} as const;

/** Supported BCP-47 voice input and read-aloud languages for Student Tutor. */
export const SPEECH_LANGUAGE_OPTIONS = [
  { code: 'hi-IN', label: 'हिन्दी (hi-IN)' },
  { code: 'ta-IN', label: 'தமிழ் (ta-IN)' },
  { code: 'mr-IN', label: 'मराठी (mr-IN)' },
  { code: 'en-IN', label: 'English (en-IN)' },
] as const;

/** Fixed number of bullets generated in the Teacher Aide weekly class summary. */
export const WEEKLY_SUMMARY_BULLET_COUNT = 5;

/** Supported regional languages for generating Parent Progress Updates. */
export const PARENT_UPDATE_LANGUAGES = [
  'Hindi',
  'Tamil',
  'Marathi',
  'English',
] as const;
