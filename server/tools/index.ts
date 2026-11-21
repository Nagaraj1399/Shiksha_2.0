import type { FunctionDeclaration } from '@google/genai';
import { alertTeacherDropoutRiskTool } from './alertTeacherDropoutRisk.ts';
import { logStudentProgressTool } from './logStudentProgress.ts';
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolExecutionResult,
  ToolRegistry,
} from './types.ts';

const REGISTERED_TOOLS: readonly ToolDefinition[] = [
  logStudentProgressTool,
  alertTeacherDropoutRiskTool,
];

/**
 * Central tool registry mapping `{ toolName -> { declaration, handler } }`.
 * Eliminates manual `if/else` branching when dispatching Gemini function calls.
 */
export const TOOL_REGISTRY: ToolRegistry = Object.freeze(
  Object.fromEntries(REGISTERED_TOOLS.map((tool) => [tool.name, tool]))
);

/**
 * Returns the array of Gemini {@link FunctionDeclaration} objects for all
 * registered student tools.
 *
 * @returns Array of Gemini tool declarations.
 */
export function getToolDeclarations(): FunctionDeclaration[] {
  return Object.values(TOOL_REGISTRY).map((entry) => entry.declaration);
}

/**
 * Looks up and executes a registered tool by name.
 *
 * @param name Function name requested by Gemini.
 * @param rawArgs Untrusted arguments supplied by the model.
 * @param context Server execution context.
 * @returns Execution result, or `null` if the requested tool name is unknown.
 */
export function executeRegisteredTool(
  name: string | undefined,
  rawArgs: Record<string, unknown>,
  context: ToolExecutionContext
): ToolExecutionResult | null {
  if (!name || !Object.prototype.hasOwnProperty.call(TOOL_REGISTRY, name)) {
    return null;
  }
  return TOOL_REGISTRY[name].handler(rawArgs, context);
}

export type { ToolDefinition, ToolExecutionContext, ToolExecutionResult, ToolRegistry };
