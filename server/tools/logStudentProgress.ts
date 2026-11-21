import { type FunctionDeclaration, Type } from '@google/genai';
import { TOOL_NAMES, VALID_COMPETENCY_LEVELS } from '../../shared/config.ts';
import { validateProgressArgs } from '../../shared/shikshaLogic.ts';
import type { ProgressLog } from '../../shared/types.ts';
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
} from './types.ts';

/**
 * Gemini function declaration for logging a student's topic attempt and
 * assessed competency level.
 */
export const logStudentProgressDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.LOG_STUDENT_PROGRESS,
  description:
    "Logs a student's interaction and competency level for a specific topic. Use this every time a student attempts a problem.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      student_id: {
        type: Type.STRING,
        description: 'The ID of the student.',
      },
      subject: {
        type: Type.STRING,
        description: 'The subject being studied (e.g., Math, Science).',
      },
      topic: {
        type: Type.STRING,
        description: 'The specific topic (e.g., Algebra, Photosynthesis).',
      },
      competency_level: {
        type: Type.STRING,
        enum: [...VALID_COMPETENCY_LEVELS],
        description: 'Competency level assessed during the attempt.',
      },
      frustration_detected: {
        type: Type.BOOLEAN,
        description: 'True if the student seems ready to give up.',
      },
      hints_used: {
        type: Type.INTEGER,
        description:
          'Number of hint-ladder hints used by the student on this problem (0 to 3).',
      },
    },
    required: [
      'student_id',
      'subject',
      'topic',
      'competency_level',
      'frustration_detected',
    ],
  },
};

/**
 * Executes the `log_student_progress` tool call while strictly enforcing the
 * server-side `activeStudentId`.
 *
 * @param rawArgs Untrusted arguments supplied by the model.
 * @param context Server execution context containing store and verified student ID.
 * @returns Tool event and Gemini function response payload.
 */
export function handleLogStudentProgress(
  rawArgs: Record<string, unknown>,
  context: ToolExecutionContext
): ToolExecutionResult {
  const validated = validateProgressArgs(
    rawArgs,
    context.activeStudentId,
    context.hintLevel
  );
  const newLog: ProgressLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...validated,
    timestamp: context.nowIso,
  };

  context.store.progressLogs.unshift(newLog);
  context.createdLogs.unshift(newLog);

  return {
    toolEvent: {
      name: TOOL_NAMES.LOG_STUDENT_PROGRESS,
      args: validated,
      timestamp: context.nowIso,
    },
    functionResponse: {
      status: 'logged',
      entry: newLog,
    },
    mutated: true,
  };
}

/**
 * Tool registry entry for `log_student_progress`.
 */
export const logStudentProgressTool: ToolDefinition = {
  name: TOOL_NAMES.LOG_STUDENT_PROGRESS,
  declaration: logStudentProgressDeclaration,
  handler: handleLogStudentProgress,
};
