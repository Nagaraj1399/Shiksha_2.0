import {
  MAX_ALERT_REASON_CHARS,
  MAX_GEMINI_MESSAGES,
  MAX_HINT_LEVEL,
  MAX_SUBJECT_CHARS,
  MAX_TEACHER_CONTEXT_ALERTS,
  MAX_TEACHER_CONTEXT_LOGS,
  MAX_TOPIC_CHARS,
  VALID_COMPETENCY_LEVELS,
} from './config.ts';
import type { CompetencyLevel, DropoutAlert, HintLevel, ProgressLog } from './types.ts';

export {
  MAX_GEMINI_MESSAGES,
  MAX_TEACHER_CONTEXT_ALERTS,
  MAX_TEACHER_CONTEXT_LOGS,
  VALID_COMPETENCY_LEVELS,
};
export {
  BASE_SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
  buildSystemInstruction,
} from './prompts.ts';
export {
  createSeedStore,
  generateInternalStudentId,
  resolveStudentIdByPhone,
} from './seedData.ts';

/**
 * Returns at most the last `limit` items from a conversation message array.
 *
 * @param messages Ordered conversation messages.
 * @param limit Maximum trailing messages to keep (defaults to {@link MAX_GEMINI_MESSAGES}).
 * @returns Capped message slice.
 */
export function sliceRecentMessages<T>(
  messages: T[],
  limit = MAX_GEMINI_MESSAGES
): T[] {
  if (messages.length <= limit) return messages;
  return messages.slice(-limit);
}

/**
 * Merges incoming delta progress logs into an existing list, prepending new
 * entries while deduplicating by record `id`.
 *
 * @param existing Currently cached progress logs.
 * @param incoming Newly created progress logs returned by the API.
 * @returns Deduplicated merged array.
 */
export function mergeProgressLogs(
  existing: ProgressLog[],
  incoming: ProgressLog[]
): ProgressLog[] {
  if (incoming.length === 0) return existing;
  const seen = new Set<string>();
  const merged: ProgressLog[] = [];
  for (const item of [...incoming, ...existing]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

/**
 * Merges incoming delta dropout alerts into an existing list, updating matching
 * alert IDs in place and prepending newly created alerts.
 *
 * @param existing Currently cached dropout alerts.
 * @param incoming New or updated dropout alerts returned by the API.
 * @returns Merged alert array.
 */
export function mergeDropoutAlerts(
  existing: DropoutAlert[],
  incoming: DropoutAlert[]
): DropoutAlert[] {
  if (incoming.length === 0) return existing;
  const incomingById = new Map(incoming.map((a) => [a.id, a]));
  const updatedExisting = existing.map((a) => incomingById.get(a.id) ?? a);
  const existingIds = new Set(existing.map((a) => a.id));
  const brandNew = incoming.filter((a) => !existingIds.has(a.id));
  return [...brandNew, ...updatedExisting];
}

/**
 * Normalizes an arbitrary tool argument into a valid {@link CompetencyLevel},
 * defaulting safely to `'Progressing'`.
 *
 * @param value Untrusted competency value.
 * @returns Normalized {@link CompetencyLevel}.
 */
export function normalizeCompetencyLevel(value: unknown): CompetencyLevel {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'mastered') return 'Mastered';
    if (normalized === 'progressing') return 'Progressing';
    if (normalized === 'struggling') return 'Struggling';
  }
  return 'Progressing';
}

/**
 * Sanitizes model-supplied arguments for `log_student_progress` while always
 * ignoring any model-supplied `student_id` in favor of `enforcedStudentId`.
 *
 * @param rawArgs Untrusted function-call arguments.
 * @param enforcedStudentId Authoritative server-side student ID.
 * @param enforcedHintLevel Optional active hint ladder level (`1`–`3`).
 * @returns Sanitized progress log payload ready for persistence.
 */
export function validateProgressArgs(
  rawArgs: Record<string, unknown>,
  enforcedStudentId: string,
  enforcedHintLevel?: HintLevel
): Omit<ProgressLog, 'id' | 'timestamp'> {
  const subject =
    typeof rawArgs.subject === 'string' && rawArgs.subject.trim().length > 0
      ? rawArgs.subject.trim().slice(0, MAX_SUBJECT_CHARS)
      : 'General';
  const topic =
    typeof rawArgs.topic === 'string' && rawArgs.topic.trim().length > 0
      ? rawArgs.topic.trim().slice(0, MAX_TOPIC_CHARS)
      : 'Core Practice';
  const competency_level = normalizeCompetencyLevel(rawArgs.competency_level);
  const frustration_detected = Boolean(rawArgs.frustration_detected);
  const rawHints =
    typeof rawArgs.hints_used === 'number' && Number.isFinite(rawArgs.hints_used)
      ? Math.round(rawArgs.hints_used)
      : 0;
  const clampedModelHints = Math.max(0, Math.min(MAX_HINT_LEVEL, rawHints));
  const hints_used = Math.max(clampedModelHints, enforcedHintLevel ?? 0);

  return {
    student_id: enforcedStudentId,
    subject,
    topic,
    competency_level,
    frustration_detected,
    hints_used,
  };
}

/**
 * Sanitizes model-supplied arguments for `alert_teacher_dropout_risk` while
 * always enforcing the server-side `enforcedStudentId`.
 *
 * @param rawArgs Untrusted function-call arguments.
 * @param enforcedStudentId Authoritative server-side student ID.
 * @returns Sanitized dropout alert payload ready for persistence.
 */
export function validateDropoutAlertArgs(
  rawArgs: Record<string, unknown>,
  enforcedStudentId: string
): Omit<DropoutAlert, 'id' | 'timestamp' | 'status'> {
  const reason =
    typeof rawArgs.reason_for_alert === 'string' &&
    rawArgs.reason_for_alert.trim().length > 0
      ? rawArgs.reason_for_alert.trim().slice(0, MAX_ALERT_REASON_CHARS)
      : 'Repeated difficulty and elevated frustration detected during practice.';

  return {
    student_id: enforcedStudentId,
    reason_for_alert: reason,
  };
}

/**
 * Filters progress logs by competency level and case-insensitive search query
 * across student ID, subject, and topic.
 *
 * @param logs Full progress log array.
 * @param competencyFilter Active competency tab (`'All'` or a specific level).
 * @param searchQuery Free-text search query.
 * @returns Filtered progress logs.
 */
export function filterProgressLogs(
  logs: ProgressLog[],
  competencyFilter: 'All' | CompetencyLevel,
  searchQuery: string
): ProgressLog[] {
  const q = searchQuery.trim().toLowerCase();
  return logs.filter((log) => {
    if (competencyFilter !== 'All' && log.competency_level !== competencyFilter) {
      return false;
    }
    if (!q) return true;
    return (
      log.student_id.toLowerCase().includes(q) ||
      log.subject.toLowerCase().includes(q) ||
      log.topic.toLowerCase().includes(q)
    );
  });
}

/**
 * Aggregates attempt counts, competency breakdown, frustration flags, and
 * active dropout alerts for a single student.
 *
 * @param logs Progress logs to summarize.
 * @param alerts Dropout alerts to count.
 * @param studentId Target student ID.
 * @returns Per-student competency and alert summary.
 */
export function computeStudentSummary(
  logs: ProgressLog[],
  alerts: DropoutAlert[],
  studentId: string
): {
  totalAttempts: number;
  masteredCount: number;
  progressingCount: number;
  strugglingCount: number;
  frustrationCount: number;
  activeAlertCount: number;
} {
  const studentLogs = logs.filter((l) => l.student_id === studentId);
  const studentActiveAlerts = alerts.filter(
    (a) => a.student_id === studentId && a.status === 'Active'
  );

  return {
    totalAttempts: studentLogs.length,
    masteredCount: studentLogs.filter((l) => l.competency_level === 'Mastered').length,
    progressingCount: studentLogs.filter((l) => l.competency_level === 'Progressing')
      .length,
    strugglingCount: studentLogs.filter((l) => l.competency_level === 'Struggling')
      .length,
    frustrationCount: studentLogs.filter((l) => l.frustration_detected).length,
    activeAlertCount: studentActiveAlerts.length,
  };
}
