import type { FunctionDeclaration } from '@google/genai';
import type {
  DropoutAlert,
  HintLevel,
  ProgressLog,
  ShikshaStoreState,
  ToolEvent,
} from '../../shared/types.ts';

/**
 * Runtime context passed to every tool handler during a Gemini tool-call turn.
 */
export interface ToolExecutionContext {
  /** Authoritative server-verified student ID (model-supplied IDs are ignored). */
  activeStudentId: string;
  /** Optional server-verified hint ladder tier used during this student turn (1..3). */
  hintLevel?: HintLevel;
  /** Mutable in-memory store state. */
  store: ShikshaStoreState;
  /** ISO-8601 timestamp captured for this tool execution step. */
  nowIso: string;
  /** Accumulator for newly created progress logs returned as delta payload. */
  createdLogs: ProgressLog[];
  /** Accumulator for newly created dropout alerts returned as delta payload. */
  createdAlerts: DropoutAlert[];
}

/**
 * Structured result returned by a tool handler to feed both the Gemini
 * `functionResponse` payload and the client-visible {@link ToolEvent} list.
 */
export interface ToolExecutionResult {
  /** Event record surfaced to the client chat bubble. */
  toolEvent: ToolEvent;
  /** Structured payload passed back to Gemini as the tool's response. */
  functionResponse: Record<string, unknown>;
  /** Whether the handler mutated the in-memory store. */
  mutated: boolean;
}

/**
 * Self-contained registration unit pairing a Gemini {@link FunctionDeclaration}
 * with its server-side execution handler.
 */
export interface ToolDefinition {
  /** Unique function name matching `declaration.name`. */
  name: ToolEvent['name'];
  /** Gemini schema declaration exposed to the model. */
  declaration: FunctionDeclaration;
  /** Executes the tool call against server state and returns a structured result. */
  handler: (
    rawArgs: Record<string, unknown>,
    context: ToolExecutionContext
  ) => ToolExecutionResult;
}

/**
 * Map from tool name to its paired declaration and handler.
 */
export type ToolRegistry = Readonly<Record<string, ToolDefinition>>;
