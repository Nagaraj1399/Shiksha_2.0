import { type Content, type Part, ThinkingLevel } from '@google/genai';
import {
  GEMINI_MAX_TOOL_STEPS,
  GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
} from '../../shared/config.ts';
import { FEW_SHOT_EXAMPLES } from '../../shared/prompts.ts';
import type {
  AgentMode,
  DropoutAlert,
  HintLevel,
  ProgressLog,
  ShikshaStoreState,
  ToolEvent,
} from '../../shared/types.ts';
import { executeRegisteredTool, getToolDeclarations } from '../tools/index.ts';
import { applySocraticAnswerGuard } from './answerGuard.ts';
import { generateWithTimeout, getGeminiClient } from './geminiClient.ts';

/**
 * Builds the Gemini `contents` payload by prepending few-shot examples and
 * attaching optional inline image bytes to the latest user turn.
 *
 * @param params Conversation messages, active agent mode, and optional image attachment.
 * @returns Ordered Gemini {@link Content} turns.
 */
export function buildGeminiContents(params: {
  mode: AgentMode;
  messages: Array<{ role: 'user' | 'assistant'; text: string }>;
  imageBase64?: string;
  imageMimeType?: string;
}): Content[] {
  const { mode, messages, imageBase64, imageMimeType } = params;
  const contents: Content[] = FEW_SHOT_EXAMPLES.map((ex) => ({
    role: ex.role,
    parts: [{ text: ex.text }],
  }));

  const cleanedBase64 = imageBase64 ? imageBase64.replace(/\s+/g, '') : undefined;

  messages.forEach((msg, index) => {
    const isLastUser = index === messages.length - 1 && msg.role === 'user';
    const parts: Part[] = [];
    if (isLastUser && cleanedBase64 && imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: cleanedBase64,
        },
      });
    }
    if (msg.text && msg.text.trim().length > 0) {
      parts.push({ text: msg.text.trim() });
    } else if (isLastUser && cleanedBase64) {
      parts.push({
        text:
          mode === 'teacher'
            ? 'Please analyze this uploaded syllabus photo and suggest a structured teaching plan.'
            : 'Please help me understand the problem shown in this photo using guiding questions.',
      });
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }
  });

  return contents;
}

/**
 * Result returned after completing the Gemini generation, tool-call loop, and
 * server-side Socratic answer guard check.
 */
export interface GeminiChatLoopResult {
  /** Final natural-language reply from Shiksha-Agent. */
  reply: string;
  /** Tool events executed during the turn. */
  toolEvents: ToolEvent[];
  /** Newly created progress logs during the turn (delta). */
  createdLogs: ProgressLog[];
  /** Newly created dropout alerts during the turn (delta). */
  createdAlerts: DropoutAlert[];
  /** Whether any tool mutated the backing store. */
  storeMutated: boolean;
  /** Whether the server-side Socratic answer guard regenerated a leaked reply. */
  answerGuardTriggered: boolean;
}

/**
 * Executes the Gemini `generateContent` request, registry-driven function
 * calling loop, and server-side Socratic answer guard (regenerating once if a
 * student-mode reply reveals the final numeric answer).
 *
 * @param params Mode, verified student ID, system instruction, initial contents, and store state.
 * @returns Final reply text, tool events, delta mutations, and answer-guard status.
 */
export async function runGeminiChatLoop(params: {
  mode: AgentMode;
  activeStudentId?: string;
  hintLevel?: HintLevel;
  latestUserPrompt?: string;
  systemInstruction: string;
  contents: Content[];
  store: ShikshaStoreState;
  timeoutMs?: number;
}): Promise<GeminiChatLoopResult> {
  const {
    mode,
    activeStudentId,
    hintLevel,
    latestUserPrompt,
    systemInstruction,
    contents,
    store,
    timeoutMs = GEMINI_TIMEOUT_MS,
  } = params;

  const ai = getGeminiClient();
  const studentTools =
    mode === 'student' ? [{ functionDeclarations: getToolDeclarations() }] : undefined;

  const toolEvents: ToolEvent[] = [];
  const createdLogs: ProgressLog[] = [];
  const createdAlerts: DropoutAlert[] = [];
  let finalReply = '';
  let storeMutated = false;
  let answerGuardTriggered = false;

  for (let step = 0; step < GEMINI_MAX_TOOL_STEPS; step++) {
    const response = await generateWithTimeout(timeoutMs, (signal) =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config: {
          systemInstruction,
          tools: studentTools,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          abortSignal: signal,
        },
      })
    );

    const candidateContent = response.candidates?.[0]?.content;
    const functionCalls = response.functionCalls;

    if (
      mode === 'student' &&
      activeStudentId &&
      functionCalls &&
      functionCalls.length > 0 &&
      candidateContent
    ) {
      contents.push(candidateContent);
      const responseParts: Part[] = [];

      for (const call of functionCalls) {
        const rawArgs = (call.args ?? {}) as Record<string, unknown>;
        const result = executeRegisteredTool(call.name, rawArgs, {
          activeStudentId,
          hintLevel,
          store,
          nowIso: new Date().toISOString(),
          createdLogs,
          createdAlerts,
        });

        if (result) {
          if (result.mutated) {
            storeMutated = true;
          }
          toolEvents.push(result.toolEvent);
          responseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: result.functionResponse,
            },
          });
        }
      }

      if (responseParts.length > 0) {
        contents.push({
          role: 'user',
          parts: responseParts,
        });
        continue;
      }
    }

    finalReply = (response.text ?? '').trim();
    break;
  }

  if (mode === 'student' && finalReply && latestUserPrompt) {
    const guarded = await applySocraticAnswerGuard({
      ai,
      contents,
      systemInstruction,
      latestUserPrompt,
      draftReply: finalReply,
      timeoutMs,
    });
    finalReply = guarded.reply;
    answerGuardTriggered = guarded.triggered;
  }

  if (!finalReply) {
    finalReply =
      mode === 'student'
        ? 'Main aapke saath hoon! Chaliye is sawal ko ek chhote step se shuru karte hain — aapko sabse pehle kaunsa hissa mushkil lag raha hai?'
        : 'I have prepared the classroom context. Could you share which grade level or board syllabus focus you would like next?';
  }

  return {
    reply: finalReply,
    toolEvents,
    createdLogs,
    createdAlerts,
    storeMutated,
    answerGuardTriggered,
  };
}
