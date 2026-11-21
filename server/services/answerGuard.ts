import { type Content, type GoogleGenAI, ThinkingLevel } from '@google/genai';
import { GEMINI_MODEL } from '../../shared/config.ts';
import { detectDirectNumericAnswerLeak } from '../../shared/socraticGuard.ts';
import { generateWithTimeout } from './geminiClient.ts';

/**
 * Server-side Socratic Answer Guard. Inspects a draft Student Tutor reply
 * against the student's latest numeric problem prompt and regenerates the reply
 * once if the final numerical answer was revealed directly.
 *
 * @param params Gemini client, conversation contents, system instruction, prompt, draft reply, and timeout.
 * @returns Final safe reply text and whether regeneration was triggered.
 */
export async function applySocraticAnswerGuard(params: {
  ai: GoogleGenAI;
  contents: Content[];
  systemInstruction: string;
  latestUserPrompt: string;
  draftReply: string;
  timeoutMs: number;
}): Promise<{ reply: string; triggered: boolean }> {
  const { ai, contents, systemInstruction, latestUserPrompt, draftReply, timeoutMs } =
    params;

  const guard = detectDirectNumericAnswerLeak(latestUserPrompt, draftReply);
  if (!guard.leaked) {
    return { reply: draftReply, triggered: false };
  }

  const guardContents: Content[] = [
    ...contents,
    { role: 'model', parts: [{ text: draftReply }] },
    {
      role: 'user',
      parts: [
        {
          text: `SOCRATIC GUARD CORRECTION: Your previous draft revealed the final numeric answer (${guard.expectedValue ?? 'numeric result'}). Rewrite your reply in the student's language using ONLY a short Socratic guiding question or first-step hint with an Indian everyday analogy. Do NOT write the final numerical answer anywhere.`,
        },
      ],
    },
  ];

  const guardedResponse = await generateWithTimeout(timeoutMs, (signal) =>
    ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: guardContents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        abortSignal: signal,
      },
    })
  );

  const rewritten = (guardedResponse.text ?? '').trim();
  return {
    reply: rewritten || draftReply,
    triggered: true,
  };
}
