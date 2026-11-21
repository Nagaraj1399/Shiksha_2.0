import { ThinkingLevel, Type } from '@google/genai';
import {
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  LEARNING_PATH_STEP_COUNT,
} from '../../shared/config.ts';
import {
  applyLearningPathStatuses,
  type RawLearningPathStep,
} from '../../shared/educationLogic.ts';
import type {
  LearningPathStep,
  ProgressLog,
  PublicStudentProfile,
} from '../../shared/types.ts';
import { generateWithTimeout, getGeminiClient } from './geminiClient.ts';

/**
 * Generates a personalised 5-step learning path for a student using Gemini's
 * structured JSON `responseSchema`, then applies deterministic mastery and
 * sequential-unlock rules from the student's actual progress logs.
 *
 * @param params Verified student profile, progress logs, and optional timeout.
 * @returns Five ordered {@link LearningPathStep} items with unlock statuses.
 */
export async function generateLearningPath(params: {
  student: PublicStudentProfile;
  progressLogs: ProgressLog[];
  timeoutMs?: number;
}): Promise<LearningPathStep[]> {
  const { student, progressLogs, timeoutMs = GEMINI_TIMEOUT_MS } = params;
  const ai = getGeminiClient();

  const logSummary =
    progressLogs.length > 0
      ? progressLogs
          .slice(0, 12)
          .map(
            (l) =>
              `- ${l.subject} | ${l.topic} | ${l.competency_level}${l.frustration_detected ? ' (frustrated)' : ''}${typeof l.hints_used === 'number' && l.hints_used > 0 ? ` (${l.hints_used} hints)` : ''}`
          )
          .join('\n')
      : '- No prior topic logs yet.';

  const prompt = `Create a personalised ${LEARNING_PATH_STEP_COUNT}-step learning path for an Indian state-board student:
Student: ${student.name} (${student.grade}, ${student.board}, Preferred Language: ${student.preferredLanguage})

Recent Progress Logs:
${logSummary}

Rules:
- Return exactly ${LEARNING_PATH_STEP_COUNT} ordered study steps aligned with ${student.grade} ${student.board} Math and Science.
- Put any already Mastered topics from the logs first (preserving their exact topic name so mastery unlocks the next step), followed by Struggling or Progressing topics needing reinforcement, and then natural next curriculum topics.
- Each "why" must be a brief, encouraging 1-sentence reason tailored to this student.
- Each "estimatedMinutes" must be an integer between 10 and 30.`;

  const response = await generateWithTimeout(timeoutMs, (signal) =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  subject: {
                    type: Type.STRING,
                    description: 'Subject name such as Math or Science.',
                  },
                  topic: {
                    type: Type.STRING,
                    description: 'Concise curriculum topic title.',
                  },
                  why: {
                    type: Type.STRING,
                    description:
                      'One encouraging sentence explaining why this step matters.',
                  },
                  estimatedMinutes: {
                    type: Type.INTEGER,
                    description: 'Estimated study duration in minutes (10 to 30).',
                  },
                },
                required: ['subject', 'topic', 'why', 'estimatedMinutes'],
              },
            },
          },
          required: ['steps'],
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: signal,
      },
    })
  );

  const rawJson = (response.text ?? '').trim();
  const parsed = JSON.parse(rawJson) as { steps?: RawLearningPathStep[] };
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Gemini returned an invalid learning path payload.');
  }

  return applyLearningPathStatuses(parsed.steps, progressLogs);
}
