import type { AuditEvent, AuditSink, RunResult, RunStore } from "./contracts.js";

export class InMemoryRunStore implements RunStore {
  readonly #runs = new Map<string, RunResult>();

  async get(runId: string): Promise<RunResult | undefined> {
    return this.#runs.get(runId);
  }

  async save(result: RunResult): Promise<void> {
    this.#runs.set(result.runId, structuredClone(result));
  }
}

export class InMemoryAuditSink implements AuditSink {
  readonly events: AuditEvent[] = [];

  async record(event: AuditEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }
}
