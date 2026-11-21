import { LEARNING_PATH_STEP_COUNT } from './config.ts';
import type {
  ClassHeatmapData,
  HeatmapCell,
  HeatmapTopicColumn,
  LearningPathStep,
  LearningPathStepStatus,
  ProgressLog,
  TeacherStudentProfile,
} from './types.ts';

export {
  detectDirectNumericAnswerLeak,
  extractNumericProblemAnswer,
} from './socraticGuard.ts';
export type { SocraticAnswerGuardResult } from './socraticGuard.ts';

/**
 * Raw learning-path step produced by Gemini before sequential unlock rules
 * are applied against the student's actual progress logs.
 */
export interface RawLearningPathStep {
  subject: string;
  topic: string;
  why: string;
  estimatedMinutes: number;
}

function normalizeTopicKey(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Applies deterministic mastery & sequential-unlock statuses to a 5-step
 * Personalised Learning Path based on the student's actual progress logs.
 *
 * @param rawSteps Steps returned by Gemini's JSON response schema.
 * @param progressLogs Student's progress logs.
 * @returns Normalized 5-step path with deterministic status progression.
 */
export function applyLearningPathStatuses(
  rawSteps: RawLearningPathStep[],
  progressLogs: ProgressLog[]
): LearningPathStep[] {
  const masteredTopics = new Set<string>();
  const attemptedTopics = new Set<string>();

  for (const log of progressLogs) {
    const key = normalizeTopicKey(log.topic);
    attemptedTopics.add(key);
    if (log.competency_level === 'Mastered') {
      masteredTopics.add(key);
    }
  }

  const trimmed = rawSteps.slice(0, LEARNING_PATH_STEP_COUNT);
  let unlockedFrontierAssigned = false;

  return trimmed.map((step, index) => {
    const key = normalizeTopicKey(step.topic);
    const isMastered = masteredTopics.has(key);
    const isAttempted = attemptedTopics.has(key);

    let status: LearningPathStepStatus;
    if (isMastered) {
      status = 'Mastered';
    } else if (!unlockedFrontierAssigned) {
      unlockedFrontierAssigned = true;
      status = isAttempted ? 'In Progress' : 'Unlocked';
    } else {
      status = 'Locked';
    }

    const minutes = Math.max(
      5,
      Math.min(60, Math.round(Number(step.estimatedMinutes) || 15))
    );

    return {
      stepNumber: index + 1,
      subject: step.subject.trim() || 'General',
      topic: step.topic.trim() || `Core Topic ${index + 1}`,
      why: step.why.trim() || 'Builds core state-board mastery for upcoming chapters.',
      estimatedMinutes: minutes,
      status,
    };
  });
}

/**
 * Builds a deterministic students × topics competency heatmap matrix from
 * classroom students and progress logs, taking each student's most recent log
 * for every topic.
 *
 * @param students Class roster.
 * @param progressLogs Classroom progress logs.
 * @returns Structured heatmap columns and per-student rows.
 */
export function buildClassHeatmap(
  students: TeacherStudentProfile[],
  progressLogs: ProgressLog[]
): ClassHeatmapData {
  const topicMap = new Map<string, HeatmapTopicColumn>();
  const sortedLogs = [...progressLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const log of sortedLogs) {
    const key = normalizeTopicKey(log.topic);
    if (!topicMap.has(key)) {
      topicMap.set(key, {
        key,
        subject: log.subject,
        topic: log.topic,
      });
    }
  }

  const topics = Array.from(topicMap.values()).sort((a, b) =>
    `${a.subject}:${a.topic}`.localeCompare(`${b.subject}:${b.topic}`)
  );

  const rows = students.map((student) => {
    const cells: Record<string, HeatmapCell> = {};
    for (const col of topics) {
      const latestLog = sortedLogs.find(
        (log) =>
          log.student_id === student.id && normalizeTopicKey(log.topic) === col.key
      );
      if (latestLog) {
        cells[col.key] = {
          status: latestLog.competency_level,
          hintsUsed: latestLog.hints_used,
          quizScore: latestLog.quiz_score,
          quizTotal: latestLog.quiz_total,
          timestamp: latestLog.timestamp,
        };
      } else {
        cells[col.key] = { status: 'Not Started' };
      }
    }
    return { student, cells };
  });

  return { topics, rows };
}

function escapeCsvField(value: string): string {
  // Neutralize spreadsheet formula injection (=, +, -, @)
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Serializes a {@link ClassHeatmapData} matrix into a formula-safe RFC-4180
 * CSV string suitable for download by teachers.
 *
 * @param heatmap Class mastery heatmap matrix.
 * @returns UTF-8 CSV content string.
 */
export function exportHeatmapToCsv(heatmap: ClassHeatmapData): string {
  const headers = [
    'Student ID',
    'Student Name',
    'Grade',
    'Board',
    ...heatmap.topics.map((t) => `${t.topic} (${t.subject})`),
  ];

  const lines = [headers.map(escapeCsvField).join(',')];

  for (const row of heatmap.rows) {
    const values = [
      row.student.id,
      row.student.name,
      row.student.grade,
      row.student.board,
      ...heatmap.topics.map((col) => {
        const cell = row.cells[col.key];
        if (!cell) return 'Not Started';
        if (typeof cell.quizScore === 'number' && typeof cell.quizTotal === 'number') {
          return `${cell.status} (Quiz ${cell.quizScore}/${cell.quizTotal})`;
        }
        return cell.status;
      }),
    ];
    lines.push(values.map(escapeCsvField).join(','));
  }

  return lines.join('\r\n');
}

/**
 * Splits a generated Teacher Aide lesson plan or worksheet into the main
 * student/teacher content and an optional separate-page Answer Key section.
 *
 * @param markdown Raw Markdown generated by Teacher Aide.
 * @returns Separated `mainContent` and `answerKey` (or `null` when absent).
 */
export function splitPrintableContent(markdown: string): {
  mainContent: string;
  answerKey: string | null;
} {
  const answerKeyPattern =
    /(?:^|\n)(?:#{1,4}\s*|\*\*\s*)(?:Answer\s*Key|Solutions?(?:\s*Key)?|उत्तर\s*कुंजी|விடைக்குறிப்பு)(?=\s|$|:|\*)[^\n]*(?:\n|$)/i;

  const match = answerKeyPattern.exec(markdown);
  if (!match || match.index === undefined) {
    return {
      mainContent: markdown.trim(),
      answerKey: null,
    };
  }

  const mainContent = markdown.slice(0, match.index).trim();
  const answerKeyBody = markdown.slice(match.index + match[0].length).trim();

  if (!answerKeyBody) {
    return {
      mainContent: markdown.trim(),
      answerKey: null,
    };
  }

  return {
    mainContent: mainContent || markdown.trim(),
    answerKey: answerKeyBody,
  };
}
