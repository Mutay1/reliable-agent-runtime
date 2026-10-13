import { describe, expect, it, vi } from "vitest";
import type { Agent, AgentDecision, Json, ToolCall } from "../src/contracts.js";
import { InMemoryAuditSink, InMemoryRunStore } from "../src/memory.js";
import { AgentRuntime } from "../src/runtime.js";

const request = {
  runId: "run-1",
  task: "resolve an order exception",
  maxSteps: 3,
  budgetCents: 10,
  timeoutMs: 500,
};

describe("AgentRuntime", () => {
  it("executes a bounded read workflow and evaluates the result", async () => {
    const agent = sequenceAgent([
      toolDecision({ id: "call-1", tool: "orders.get", input: { orderId: "42" }, risk: "read" }),
      { type: "finish", output: { action: "expedite" } },
    ]);
    const audit = new InMemoryAuditSink();
    const runtime = makeRuntime({ agent, audit });

    const result = await runtime.run(request);

    expect(result).toEqual({
      runId: "run-1",
      status: "completed",
      output: { action: "expedite" },
      reason: "useful output",
      steps: 2,
      costCents: 2,
    });
    expect(audit.events.map((event) => event.type)).toEqual([
      "run_started",
      "tool_requested",
      "tool_completed",
      "run_finished",
    ]);
  });

  it("pauses before a write when approval is withheld", async () => {
    const write = toolDecision({ id: "call-2", tool: "orders.refund", input: { orderId: "42" }, risk: "write" });
    const runtime = makeRuntime({
      agent: sequenceAgent([write]),
      approvals: { async approve() { return { approved: false, reason: "operator review required" }; } },
    });

    const result = await runtime.run(request);

    expect(result.status).toBe("awaiting_approval");
    expect(result.reason).toBe("operator review required");
    expect(result.costCents).toBe(0);
  });

  it("stops before executing a tool that would exceed budget", async () => {
    const runtime = makeRuntime({
      agent: sequenceAgent([
        toolDecision({ id: "call-3", tool: "orders.get", input: {}, risk: "read" }),
      ]),
      toolCost: 11,
    });

    const result = await runtime.run(request);

    expect(result.status).toBe("stopped");
    expect(result.reason).toContain("budget limit");
  });

  it("deduplicates concurrent runs with the same id", async () => {
    const decide = vi.fn(async (): Promise<AgentDecision> => ({ type: "finish", output: { ok: true } }));
    const runtime = makeRuntime({ agent: { decide } });

    const [first, second] = await Promise.all([runtime.run(request), runtime.run(request)]);

    expect(first).toEqual(second);
    expect(decide).toHaveBeenCalledTimes(1);
  });

  it("returns a cached terminal result for a retried run", async () => {
    const decide = vi.fn(async (): Promise<AgentDecision> => ({ type: "finish", output: { ok: true } }));
    const runtime = makeRuntime({ agent: { decide } });

    await runtime.run(request);
    await runtime.run(request);

    expect(decide).toHaveBeenCalledTimes(1);
  });
});

function makeRuntime(options: {
  agent: Agent;
  audit?: InMemoryAuditSink;
  approvals?: { approve(call: ToolCall): Promise<{ approved: boolean; reason: string }> };
  toolCost?: number;
}): AgentRuntime {
  return new AgentRuntime({
    agent: options.agent,
    tools: [
      {
        name: "orders.get",
        estimateCostCents: () => options.toolCost ?? 2,
        async execute(input: Json) { return { input, status: "delayed" }; },
      },
      {
        name: "orders.refund",
        estimateCostCents: () => 3,
        async execute() { return { refunded: true }; },
      },
    ],
    evaluator: { async evaluate() { return { accepted: true, reason: "useful output" }; } },
    approvals: options.approvals ?? { async approve() { return { approved: true, reason: "approved" }; } },
    runs: new InMemoryRunStore(),
    audit: options.audit ?? new InMemoryAuditSink(),
  });
}

function sequenceAgent(decisions: readonly AgentDecision[]): Agent {
  let index = 0;
  return {
    async decide() {
      const decision = decisions[index];
      if (!decision) throw new Error("agent decision sequence exhausted");
      index += 1;
      return decision;
    },
  };
}

function toolDecision(call: ToolCall): AgentDecision {
  return { type: "tool_call", call };
}
