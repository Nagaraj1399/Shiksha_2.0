import crypto from 'node:crypto';
import { ThinkingLevel, Type } from '@google/genai';
import {
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  PRACTICE_QUIZ_QUESTION_COUNT,
} from '../../shared/config.ts';
import type {
  PracticeQuiz,
  PublicStudentProfile,
  QuizQuestion,
} from '../../shared/types.ts';
import { generateWithTimeout, getGeminiClient } from './geminiClient.ts';

/**
 * Generates a 3-question multiple-choice mastery practice quiz in the student's
 * preferred language using Gemini's structured JSON `responseSchema`.
 *
 * @param params Verified student profile, subject, topic, and optional timeout.
 * @returns Complete server-side {@link PracticeQuiz} including answer keys and explanations.
 */
export async function generatePracticeQuiz(params: {
  student: PublicStudentProfile;
  subject: string;
  topic: string;
  timeoutMs?: number;
}): Promise<PracticeQuiz> {
  const { student, subject, topic, timeoutMs = GEMINI_TIMEOUT_MS } = params;
  const ai = getGeminiClient();

  const prompt = `Generate a ${PRACTICE_QUIZ_QUESTION_COUNT}-question multiple-choice mastery check quiz for an Indian state-board student:
Student Grade & Board: ${student.grade}, ${student.board}
Preferred Language: ${student.preferredLanguage}
Subject: ${subject}
Topic: ${topic}

Rules:
- Write the questions, options, and explanations clearly in ${student.preferredLanguage}.
- Return exactly ${PRACTICE_QUIZ_QUESTION_COUNT} questions.
- Each question must have exactly 4 distinct options and a valid 0-based correctIndex (0, 1, 2, or 3).
- Every explanation MUST include a relatable local Indian everyday example (such as cricket, chapati/roti sharing, local sabzi mandi/markets, farming, mangoes, trains, or festivals) to reinforce why the correct option works.`;

  const response = await generateWithTimeout(timeoutMs, (signal) =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: {
                    type: Type.STRING,
                    description: 'Multiple-choice question stem.',
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exactly 4 answer choices.',
                  },
                  correctIndex: {
                    type: Type.INTEGER,
                    description: '0-based index of the correct option (0..3).',
                  },
                  explanation: {
                    type: Type.STRING,
                    description:
                      'Clear explanation using a relatable local Indian everyday example showing why the correct option is right.',
                  },
                },
                required: ['question', 'options', 'correctIndex', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: signal,
      },
    })
  );

  const rawJson = (response.text ?? '').trim();
  const parsed = JSON.parse(rawJson) as {
    questions?: Array<{
      question?: string;
      options?: string[];
      correctIndex?: number;
      explanation?: string;
    }>;
  };

  if (
    !Array.isArray(parsed.questions) ||
    parsed.questions.length < PRACTICE_QUIZ_QUESTION_COUNT
  ) {
    throw new Error('Gemini returned an invalid practice quiz payload.');
  }

  const questions: QuizQuestion[] = parsed.questions
    .slice(0, PRACTICE_QUIZ_QUESTION_COUNT)
    .map((q, idx) => {
      const opts = Array.isArray(q.options)
        ? q.options.map((o) => String(o).trim())
        : [];
      if (opts.length < 4) {
        throw new Error('Quiz question did not include 4 options.');
      }
      const correctIndex = Math.max(
        0,
        Math.min(3, Math.round(Number(q.correctIndex) || 0))
      );
      return {
        id: `q-${idx + 1}`,
        question: String(q.question ?? '').trim(),
        options: [opts[0], opts[1], opts[2], opts[3]],
        correctIndex,
        explanation:
          String(q.explanation ?? '').trim() ||
          'Review the core concept step by step to verify this answer.',
      };
    });

  return {
    quizId: `quiz_${crypto.randomBytes(8).toString('hex')}`,
    studentId: student.id,
    subject,
    topic,
    language: student.preferredLanguage,
    questions,
  };
}
