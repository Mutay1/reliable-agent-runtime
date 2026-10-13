# Experiment Log

This log records evidence produced while building the reference implementation. Results below are
local engineering validations, not production or customer metrics.

## 2026-10-12: E001, bounded happy path

- Hypothesis: A deterministic agent can request a registered read tool and produce an evaluated
  terminal result inside a bounded loop.
- Method: Execute a two-step sequence using `orders.get`, then return an expedite recommendation.
- Result: Passed. The runtime recorded start, tool request, tool completion, and finish events.
- Evidence: `tests/runtime.test.ts`, test "executes a bounded read workflow and evaluates the result".
- Decision: Retain the explicit decision loop and audit-event boundary.

## 2026-10-12: E002, write approval boundary

- Hypothesis: A write proposal cannot execute when approval is withheld.
- Method: Propose `orders.refund` with risk `write`; configure the approval policy to reject it.
- Result: Passed. The run terminated as `awaiting_approval` with zero tool cost.
- Evidence: `tests/runtime.test.ts`, test "pauses before a write when approval is withheld".
- Decision: Treat approval as a durable terminal state; document resume as future work.

## 2026-10-12: E003, pre-execution budget enforcement

- Hypothesis: The runtime stops before invoking a tool whose estimated cost exceeds the remaining
  budget.
- Method: Give the run a 10-cent budget and the proposed tool an 11-cent estimate.
- Result: Passed. The run stopped without executing the tool.
- Evidence: `tests/runtime.test.ts`, test "stops before executing a tool that would exceed budget".
- Decision: Keep cost estimation in the tool contract and validate estimates defensively.

## 2026-10-12: E004, concurrent duplicate suppression

- Hypothesis: Two concurrent requests with the same run ID should share one execution.
- Method: Start two promises for `run-1` and count agent decisions.
- Result: Passed. Both callers received the same result and the agent executed once.
- Evidence: `tests/runtime.test.ts`, test "deduplicates concurrent runs with the same id".
- Decision: Retain the in-process in-flight map; require a distributed lease before horizontal scale.

## 2026-10-12: E005, retry after completion

- Hypothesis: A completed run should return its stored terminal result rather than call the agent
  again.
- Method: Execute `run-1` twice against the same run store.
- Result: Passed. The second call returned the stored result and the agent executed once.
- Evidence: `tests/runtime.test.ts`, test "returns a cached terminal result for a retried run".
- Decision: Run IDs are part of the public command contract, not an internal implementation detail.

## Verification summary

- TypeScript strict type-check: passed.
- Automated tests: 5 passed, 0 failed.
- Deterministic example: completed in two steps at a simulated cost of one cent.
- Provider adapter: deliberately deferred until provider and credential strategy are approved.
- PostgreSQL run store: deliberately deferred; required before distributed deployment.
