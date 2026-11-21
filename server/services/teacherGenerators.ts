import { ThinkingLevel, Type } from '@google/genai';
import {
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  WEEKLY_SUMMARY_BULLET_COUNT,
} from '../../shared/config.ts';
import type {
  DropoutAlert,
  ParentUpdateLanguage,
  ParentUpdateResponse,
  ProgressLog,
  PublicStudentProfile,
} from '../../shared/types.ts';
import { generateWithTimeout, getGeminiClient } from './geminiClient.ts';

/**
 * Generates a concise 5-bullet weekly classroom summary for teachers from the
 * current roster, progress logs, and active dropout alerts using Gemini's
 * structured JSON `responseSchema`.
 *
 * @param params Class roster, recent progress logs, dropout alerts, and optional timeout.
 * @returns Array of up to 5 actionable weekly summary bullets.
 */
export async function generateWeeklyClassSummary(params: {
  students: PublicStudentProfile[];
  progressLogs: ProgressLog[];
  dropoutAlerts: DropoutAlert[];
  timeoutMs?: number;
}): Promise<string[]> {
  const {
    students,
    progressLogs,
    dropoutAlerts,
    timeoutMs = GEMINI_TIMEOUT_MS,
  } = params;
  const ai = getGeminiClient();

  const studentNames = new Map(students.map((s) => [s.id, `${s.name} (${s.grade})`]));
  const logLines =
    progressLogs.length > 0
      ? progressLogs
          .slice(0, 25)
          .map(
            (l) =>
              `- ${studentNames.get(l.student_id) ?? l.student_id}: ${l.subject} / ${l.topic} -> ${l.competency_level}${typeof l.hints_used === 'number' && l.hints_used > 0 ? ` (${l.hints_used} hints)` : ''}${l.frustration_detected ? ' [frustrated]' : ''}`
          )
          .join('\n')
      : '- No student progress logs recorded yet this week.';

  const activeAlerts = dropoutAlerts
    .filter((a) => a.status === 'Active')
    .slice(0, 10)
    .map(
      (a) =>
        `- ${studentNames.get(a.student_id) ?? a.student_id}: ${a.reason_for_alert}`
    )
    .join('\n');

  const prompt = `You are Shiksha-Agent Teacher Aide for an Indian state-board school.
Generate a crisp, practical weekly class summary with EXACTLY ${WEEKLY_SUMMARY_BULLET_COUNT} concise bullet points for the teacher.

Students tracked: ${students.length}
Recent Progress Logs:
${logLines}

Active Dropout Alerts:
${activeAlerts || '- None'}

Rules:
- Return exactly ${WEEKLY_SUMMARY_BULLET_COUNT} short, scannable bullets (1 sentence each).
- Highlight mastered wins, struggling topics needing whole-class revision, high hint-ladder usage, any active dropout alert requiring gentle 1-on-1 support, and one concrete classroom action for next week.
- Do not include raw phone numbers or invented metrics.`;

  const response = await generateWithTimeout(timeoutMs, (signal) =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bullets: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: 'One concise weekly classroom insight or action bullet.',
              },
            },
          },
          required: ['bullets'],
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: signal,
      },
    })
  );

  const rawJson = (response.text ?? '').trim();
  const parsed = JSON.parse(rawJson) as { bullets?: unknown[] };
  const cleaned = Array.isArray(parsed.bullets)
    ? parsed.bullets.map((b) => String(b).trim()).filter(Boolean)
    : [];

  if (cleaned.length === 0) {
    throw new Error('Gemini returned an invalid weekly class summary payload.');
  }

  return cleaned.slice(0, WEEKLY_SUMMARY_BULLET_COUNT);
}

/**
 * Generates a warm 4–5 line parent progress update in the parent's chosen
 * Indian regional language (Hindi, Tamil, Marathi, or English) mentioning one
 * strength and one area to practise at home.
 *
 * @param params Target student profile, their progress logs, chosen language, and optional timeout.
 * @returns Structured {@link ParentUpdateResponse} for teacher preview & manual copy.
 */
export async function generateParentUpdate(params: {
  student: PublicStudentProfile;
  progressLogs: ProgressLog[];
  language: ParentUpdateLanguage;
  timeoutMs?: number;
}): Promise<ParentUpdateResponse> {
  const { student, progressLogs, language, timeoutMs = GEMINI_TIMEOUT_MS } = params;
  const ai = getGeminiClient();

  const logLines =
    progressLogs.length > 0
      ? progressLogs
          .slice(0, 15)
          .map(
            (l) =>
              `- ${l.subject} / ${l.topic}: ${l.competency_level}${typeof l.hints_used === 'number' && l.hints_used > 0 ? ` (${l.hints_used} hints)` : ''}${l.frustration_detected ? ' [needed extra encouragement]' : ''}`
          )
          .join('\n')
      : '- Just started regular practice sessions this week.';

  const prompt = `Write a short, warm, respectful parent progress update message for an Indian state-board school teacher to share with a parent.

Student: ${student.name} (${student.grade}, ${student.board})
Target Language: ${language} (write naturally in ${language} script — Devanagari for Hindi/Marathi, Tamil script for Tamil, or clear warm English for English).

Student's Recent Progress Logs:
${logLines}

Rules:
- Keep "message" strictly 4 to 5 short lines long (easy for a parent to read on a phone).
- Warm, encouraging, respectful tone (e.g., Namaste / Vanakkam / Namaskar).
- Mention ONE clear strength or effort shown by ${student.name}.
- Mention ONE gentle, practical area to practise for 10 minutes at home.
- Never include technical jargon, internal IDs, or harsh labels like "dropout risk".`;

  const response = await generateWithTimeout(timeoutMs, (signal) =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description:
                'Warm 4 to 5 line progress update written in the target regional language.',
            },
            strength: {
              type: Type.STRING,
              description: 'Short label of one strength highlighted in the message.',
            },
            practiceArea: {
              type: Type.STRING,
              description: 'Short label of one home-practice area suggested.',
            },
          },
          required: ['message', 'strength', 'practiceArea'],
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: signal,
      },
    })
  );

  const rawJson = (response.text ?? '').trim();
  const parsed = JSON.parse(rawJson) as {
    message?: string;
    strength?: string;
    practiceArea?: string;
  };
  const message = String(parsed.message ?? '').trim();
  if (!message) {
    throw new Error('Gemini returned an empty parent update message.');
  }

  return {
    studentId: student.id,
    studentName: student.name,
    language,
    message,
    strength: String(parsed.strength ?? '').trim() || 'Steady effort in class practice',
    practiceArea:
      String(parsed.practiceArea ?? '').trim() ||
      '10 minutes of daily revision at home',
  };
}
