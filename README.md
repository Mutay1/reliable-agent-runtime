# Reliable Agent Runtime

A small reference implementation of the control plane around an autonomous agent. The interesting
part of an agent system is not the model call by itself. It is the operational boundary that makes
the model useful and safe in production.

This runtime demonstrates:

- deterministic run IDs and deduplication for safe retries;
- bounded execution through step, cost, and time limits;
- explicit human approval before write-capable tools run;
- dependency-injected agents, tools, evaluators, storage, and audit sinks;
- terminal-output evaluation rather than assuming every model answer is useful;
- structured audit events for operations and post-incident analysis;
- tests covering success, approval, budget, concurrency, and retry behaviour.

The repository is also a small agent-engineering case study. The documentation records the
problem selection, alternatives considered, evaluation gates, operational failure modes, and the
experiments used to validate the implementation. That context is as important as the code because
an autonomous agent is a product and operations decision, not only a model integration.

## Documentation map

- [Agent opportunity assessment](docs/agent-opportunity-assessment.md)
- [ADR 0001: use a thin provider-neutral control plane](docs/adr/0001-provider-neutral-control-plane.md)
- [ADR 0002: model approval as a durable state](docs/adr/0002-durable-approval-state.md)
- [Evaluation and retirement plan](docs/evaluation-plan.md)
- [Experiment log](docs/experiment-log.md)
- [Threat model](docs/threat-model.md)
- [Operational runbook](docs/runbook.md)
- [Example execution trace](docs/example-execution-trace.json)

The example uses a deterministic agent so the control-plane behaviour can be tested without API
keys or a network connection. A production adapter could implement the same `Agent` interface with
OpenAI, Claude, Grok, or a self-hosted model.

## Architecture

```text
Run request
    |
    v
AgentRuntime --> Agent adapter --> tool decision or final answer
    |                |
    |                v
    |          model provider
    |
    +--> approval policy --> tool registry --> internal or third-party API
    |
    +--> evaluator
    +--> run store
    +--> audit sink
```

The runtime owns policy and lifecycle. Model adapters decide what to do, but cannot bypass budgets,
approvals, tool registration, evaluation, or audit logging.

## Run locally

Requires Node.js 22 and pnpm 10.

```bash
pnpm install
pnpm check
pnpm test
pnpm example
```

## Design notes

### Why return `awaiting_approval`?

Approval is modeled as a terminal state for the current attempt instead of holding a process open.
That makes it straightforward to persist, notify an operator, and resume with a new idempotent run.

### Why estimate tool cost before execution?

The runtime must stop before performing an unaffordable action. Real adapters can combine model
token estimates, third-party API prices, and internal capacity units behind the same interface.

### What would change in production?

- PostgreSQL-backed run and audit stores with leases for distributed workers;
- an outbox for reliable event publication;
- encrypted tool credentials and per-agent authorization;
- OpenTelemetry traces and service-level metrics;
- durable approval and resume flows;
- adversarial evaluation sets and rollout gates for model or prompt changes.

## Scope

This repository intentionally focuses on orchestration and reliability. It is not an agent framework,
does not hide model-provider SDKs, and does not execute arbitrary code.
