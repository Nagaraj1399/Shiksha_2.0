import { type FunctionDeclaration, Type } from '@google/genai';
import { TOOL_NAMES } from '../../shared/config.ts';
import { validateDropoutAlertArgs } from '../../shared/shikshaLogic.ts';
import type { DropoutAlert } from '../../shared/types.ts';
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
} from './types.ts';

/**
 * Gemini function declaration for escalating student dropout risk indicators
 * to the classroom teacher.
 */
export const alertTeacherDropoutRiskDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.ALERT_TEACHER_DROPOUT_RISK,
  description:
    'Sends an immediate alert to the teacher if a student exhibits high dropout risk indicators (e.g., repeated failure on foundational topics, high frustration).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      student_id: {
        type: Type.STRING,
        description: "The student's ID.",
      },
      reason_for_alert: {
        type: Type.STRING,
        description: 'Brief explanation of why the student is at risk.',
      },
    },
    required: ['student_id', 'reason_for_alert'],
  },
};

/**
 * Executes the `alert_teacher_dropout_risk` tool call while strictly enforcing
 * the server-side `activeStudentId`.
 *
 * @param rawArgs Untrusted arguments supplied by the model.
 * @param context Server execution context containing store and verified student ID.
 * @returns Tool event and Gemini function response payload.
 */
export function handleAlertTeacherDropoutRisk(
  rawArgs: Record<string, unknown>,
  context: ToolExecutionContext
): ToolExecutionResult {
  const validated = validateDropoutAlertArgs(rawArgs, context.activeStudentId);
  const newAlert: DropoutAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...validated,
    timestamp: context.nowIso,
    status: 'Active',
  };

  context.store.dropoutAlerts.unshift(newAlert);
  context.createdAlerts.unshift(newAlert);

  return {
    toolEvent: {
      name: TOOL_NAMES.ALERT_TEACHER_DROPOUT_RISK,
      args: {
        student_id: validated.student_id,
      },
      timestamp: context.nowIso,
    },
    functionResponse: {
      status: 'teacher_alerted',
      alert: newAlert,
    },
    mutated: true,
  };
}

/**
 * Tool registry entry for `alert_teacher_dropout_risk`.
 */
export const alertTeacherDropoutRiskTool: ToolDefinition = {
  name: TOOL_NAMES.ALERT_TEACHER_DROPOUT_RISK,
  declaration: alertTeacherDropoutRiskDeclaration,
  handler: handleAlertTeacherDropoutRisk,
};
