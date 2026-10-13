import type { Agent, AgentContext, AgentDecision, Json, Tool } from "./contracts.js";
import { InMemoryAuditSink, InMemoryRunStore } from "./memory.js";
import { AgentRuntime } from "./runtime.js";

class OrderSupportAgent implements Agent {
  async decide(context: AgentContext): Promise<AgentDecision> {
    if (context.observations.length === 0) {
      return {
        type: "tool_call",
        call: { id: "lookup-order", tool: "orders.get", input: { orderId: "SM-1042" }, risk: "read" },
      };
    }

    const order = context.observations[0]?.output ?? null;
    return { type: "finish", output: { recommendation: "expedite", order } };
  }
}

class OrderLookup implements Tool {
  readonly name = "orders.get";
  estimateCostCents(): number { return 1; }
  async execute(input: Json): Promise<Json> {
    return { ...(isObject(input) ? input : {}), status: "delayed", promisedDays: 5 };
  }
}

const audit = new InMemoryAuditSink();
const runtime = new AgentRuntime({
  agent: new OrderSupportAgent(),
  tools: [new OrderLookup()],
  evaluator: {
    async evaluate(_task, output) {
      return { accepted: isObject(output) && "recommendation" in output, reason: "recommendation is actionable" };
    },
  },
  approvals: { async approve() { return { approved: false, reason: "writes require human approval" }; } },
  runs: new InMemoryRunStore(),
  audit,
});

const result = await runtime.run({
  runId: "demo-1",
  task: "Recommend the next action for delayed order SM-1042",
  maxSteps: 4,
  budgetCents: 10,
  timeoutMs: 2_000,
});

console.log(JSON.stringify({ result, audit: audit.events }, null, 2));

function isObject(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
