import type {
  Agent,
  ApprovalPolicy,
  AuditSink,
  Evaluator,
  Observation,
  RunRequest,
  RunResult,
  RunStore,
  Tool,
} from "./contracts.js";

export interface RuntimeDependencies {
  agent: Agent;
  tools: readonly Tool[];
  evaluator: Evaluator;
  approvals: ApprovalPolicy;
  runs: RunStore;
  audit: AuditSink;
}

export class AgentRuntime {
  readonly #agent: Agent;
  readonly #tools: ReadonlyMap<string, Tool>;
  readonly #evaluator: Evaluator;
  readonly #approvals: ApprovalPolicy;
  readonly #runs: RunStore;
  readonly #audit: AuditSink;
  readonly #inFlight = new Map<string, Promise<RunResult>>();

  constructor(dependencies: RuntimeDependencies) {
    this.#agent = dependencies.agent;
    this.#tools = new Map(dependencies.tools.map((tool) => [tool.name, tool]));
    this.#evaluator = dependencies.evaluator;
    this.#approvals = dependencies.approvals;
    this.#runs = dependencies.runs;
    this.#audit = dependencies.audit;
  }

  async run(request: RunRequest): Promise<RunResult> {
    validateRequest(request);

    const completed = await this.#runs.get(request.runId);
    if (completed) return completed;

    const active = this.#inFlight.get(request.runId);
    if (active) return active;

    const execution = this.#execute(request).finally(() => {
      this.#inFlight.delete(request.runId);
    });
    this.#inFlight.set(request.runId, execution);
    return execution;
  }

  async #execute(request: RunRequest): Promise<RunResult> {
    await this.#audit.record({ type: "run_started", runId: request.runId, task: request.task });

    const observations: Observation[] = [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("run timed out")), request.timeoutMs);

    try {
      for (let step = 1; step <= request.maxSteps; step += 1) {
        const spent = observations.reduce((total, observation) => total + observation.costCents, 0);
        const decision = await this.#agent.decide({
          task: request.task,
          step,
          observations,
          remainingBudgetCents: request.budgetCents - spent,
        }, controller.signal);

        if (decision.type === "finish") {
          const evaluation = await this.#evaluator.evaluate(request.task, decision.output);
          return this.#finish({
            runId: request.runId,
            status: evaluation.accepted ? "completed" : "rejected",
            output: decision.output,
            reason: evaluation.reason,
            steps: step,
            costCents: spent,
          });
        }

        const { call } = decision;
        await this.#audit.record({ type: "tool_requested", runId: request.runId, step, call });

        const tool = this.#tools.get(call.tool);
        if (!tool) {
          return this.#finish({
            runId: request.runId,
            status: "failed",
            reason: `unknown tool: ${call.tool}`,
            steps: step,
            costCents: spent,
          });
        }

        if (call.risk === "write") {
          const approval = await this.#approvals.approve(call);
          if (!approval.approved) {
            return this.#finish({
              runId: request.runId,
              status: "awaiting_approval",
              reason: approval.reason,
              steps: step,
              costCents: spent,
            });
          }
        }

        const estimatedCost = tool.estimateCostCents(call.input);
        if (!Number.isSafeInteger(estimatedCost) || estimatedCost < 0) {
          throw new Error(`tool ${tool.name} returned an invalid cost estimate`);
        }
        if (spent + estimatedCost > request.budgetCents) {
          return this.#finish({
            runId: request.runId,
            status: "stopped",
            reason: `budget limit would be exceeded by ${tool.name}`,
            steps: step,
            costCents: spent,
          });
        }

        const output = await tool.execute(call.input, controller.signal);
        observations.push({ call, output, costCents: estimatedCost });
        await this.#audit.record({
          type: "tool_completed",
          runId: request.runId,
          step,
          callId: call.id,
          costCents: estimatedCost,
        });
      }

      const spent = observations.reduce((total, observation) => total + observation.costCents, 0);
      return this.#finish({
        runId: request.runId,
        status: "stopped",
        reason: "maximum steps reached",
        steps: request.maxSteps,
        costCents: spent,
      });
    } catch (error) {
      const reason = controller.signal.aborted
        ? "run timed out"
        : error instanceof Error ? error.message : "unknown runtime error";
      const spent = observations.reduce((total, observation) => total + observation.costCents, 0);
      return this.#finish({
        runId: request.runId,
        status: "failed",
        reason,
        steps: observations.length,
        costCents: spent,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  async #finish(result: RunResult): Promise<RunResult> {
    await this.#runs.save(result);
    await this.#audit.record({
      type: "run_finished",
      runId: result.runId,
      status: result.status,
      reason: result.reason,
    });
    return result;
  }
}

function validateRequest(request: RunRequest): void {
  if (!request.runId.trim()) throw new Error("runId is required");
  if (!request.task.trim()) throw new Error("task is required");
  if (!Number.isSafeInteger(request.maxSteps) || request.maxSteps < 1) {
    throw new Error("maxSteps must be a positive integer");
  }
  if (!Number.isSafeInteger(request.budgetCents) || request.budgetCents < 0) {
    throw new Error("budgetCents must be a non-negative integer");
  }
  if (!Number.isSafeInteger(request.timeoutMs) || request.timeoutMs < 1) {
    throw new Error("timeoutMs must be a positive integer");
  }
}
