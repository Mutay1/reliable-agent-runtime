export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

export type ToolRisk = "read" | "write";

export interface ToolCall {
  id: string;
  tool: string;
  input: Json;
  risk: ToolRisk;
}

export type AgentDecision =
  | { type: "tool_call"; call: ToolCall }
  | { type: "finish"; output: Json };

export interface Observation {
  call: ToolCall;
  output: Json;
  costCents: number;
}

export interface AgentContext {
  task: string;
  step: number;
  observations: readonly Observation[];
  remainingBudgetCents: number;
}

export interface Agent {
  decide(context: AgentContext, signal: AbortSignal): Promise<AgentDecision>;
}

export interface Tool {
  readonly name: string;
  estimateCostCents(input: Json): number;
  execute(input: Json, signal: AbortSignal): Promise<Json>;
}

export interface Evaluator {
  evaluate(task: string, output: Json): Promise<{ accepted: boolean; reason: string }>;
}

export interface ApprovalPolicy {
  approve(call: ToolCall): Promise<{ approved: boolean; reason: string }>;
}

export type RunStatus = "completed" | "rejected" | "awaiting_approval" | "stopped" | "failed";

export interface RunResult {
  runId: string;
  status: RunStatus;
  output?: Json;
  reason: string;
  steps: number;
  costCents: number;
}

export interface RunRequest {
  runId: string;
  task: string;
  maxSteps: number;
  budgetCents: number;
  timeoutMs: number;
}

export interface RunStore {
  get(runId: string): Promise<RunResult | undefined>;
  save(result: RunResult): Promise<void>;
}

export type AuditEvent =
  | { type: "run_started"; runId: string; task: string }
  | { type: "tool_requested"; runId: string; step: number; call: ToolCall }
  | { type: "tool_completed"; runId: string; step: number; callId: string; costCents: number }
  | { type: "run_finished"; runId: string; status: RunStatus; reason: string };

export interface AuditSink {
  record(event: AuditEvent): Promise<void>;
}
