# ADR 0001: Use a Thin Provider-Neutral Control Plane

- Status: Accepted
- Date: 2026-10-12
- Owners: Agent platform engineering

## Context

The order exception agent must coordinate a model, internal tools, approvals, evaluation, budgets,
and audit records. The architecture should make unsafe actions difficult, support controlled model
experiments, and remain understandable to engineers outside an AI-specialist team.

## Decision drivers

- Explicit safety and authorization boundaries.
- Deterministic tests without calling a model provider.
- Provider portability across Claude, OpenAI, Grok, and self-hosted models.
- Auditable decisions and tool effects.
- Low conceptual overhead for the first production workflow.
- A migration path to durable distributed execution when scale requires it.

## Options considered

### 1. Put orchestration inside provider-specific model code

The model adapter would own prompting, tool execution, retry behaviour, and completion.

Benefits:

- fastest initial prototype;
- direct access to provider-specific agent features;
- few internal abstractions.

Costs:

- policy becomes coupled to one provider;
- tests require network calls or extensive SDK mocking;
- authorization and budget checks can be bypassed accidentally;
- changing models also changes orchestration behaviour.

### 2. Adopt a general agent framework immediately

Use a graph or multi-agent framework to model decisions, tools, memory, and checkpoints.

Benefits:

- built-in orchestration concepts;
- integrations with model and observability providers;
- fast experimentation with complex graphs.

Costs:

- framework semantics become part of the production contract;
- safety boundaries can be obscured by callbacks and implicit state;
- unnecessary complexity for a single bounded workflow;
- harder to distinguish our policy from framework behaviour during incidents.

### 3. Build a thin provider-neutral control plane

Define small ports for agent decisions, tools, approval, evaluation, storage, and audit events. Keep
policy in an explicit runtime and implement providers as adapters.

Benefits:

- policy remains visible and testable;
- deterministic unit tests cover control flow without an LLM;
- providers and tools can change independently;
- safety checks apply regardless of model behaviour.

Costs:

- we own lifecycle code and its tests;
- provider-specific capabilities require explicit adapters;
- durable scheduling, distributed leases, and resumability must be added deliberately.

## Decision

Choose option 3 for the first workflow.

The runtime owns step, time, and cost limits; tool registration; approval checks; terminal
evaluation; idempotency; and audit events. An agent adapter may propose an action, but it cannot
execute an unregistered tool or bypass runtime policy.

## Consequences

- Model upgrades can be evaluated without rewriting the control plane.
- Tool effects remain behind typed interfaces and explicit risk levels.
- Initial delivery favors clarity over feature breadth.
- If workflows require days-long waits, fan-out, or many concurrent actors, reassess whether the
  runtime should execute on a durable workflow engine such as Temporal rather than recreating one.

## Revisit triggers

- More than three workflows require custom lifecycle logic.
- Runs routinely wait longer than one process lifetime.
- Recovery requires cross-service compensation or complex fan-out.
- Framework adoption demonstrably reduces code without weakening policy visibility or tests.
