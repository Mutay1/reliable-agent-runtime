# Evaluation and Retirement Plan

## Objective

Determine whether the order exception agent reduces resolution time without increasing incorrect
actions, customer harm, or operational cost.

The agent is not successful merely because it produces plausible text. It must improve a business
outcome under explicit safety and cost constraints.

## Evaluation set

Create a versioned set of anonymized historical order exceptions covering:

- delayed production;
- missing or contradictory carrier events;
- invalid or changed delivery addresses;
- artwork failures;
- duplicate orders;
- cases where no action is appropriate;
- ambiguous cases that should be escalated.

Each case includes the source facts, acceptable actions, prohibited actions, escalation expectation,
and the reason supplied by an experienced operator. The production set must not appear in prompts,
few-shot examples, or developer testing.

## Metrics

### Quality

- exact or policy-equivalent action accuracy;
- unsafe-action rate;
- required-escalation recall;
- unsupported-claim rate;
- operator acceptance without edits;
- case reopen rate.

### Business outcome

- median and p90 time to resolution;
- manual minutes per resolved exception;
- number of orders stalled beyond the service target;
- customer contacts required per resolution.

### Operations

- p50 and p95 run latency;
- model and tool cost per accepted recommendation;
- tool error and retry rates;
- approval wait time;
- duplicate-effect count;
- incidents attributable to the agent.

## Release gates

| Stage | Capability | Entry gate | Exit gate |
| --- | --- | --- | --- |
| Offline | Historical cases only | Evaluation set reviewed by operations | Quality target met with zero prohibited actions |
| Shadow | Reads live cases, output hidden | Offline gate and production observability | Stable latency/cost and no data-access violations |
| Assistive | Operator sees recommendation | Shadow review and training | Acceptance and resolution-time improvement sustained |
| Approved write | Agent proposes one bounded write | Tool-specific rollback and idempotency tested | Low rejection and zero duplicate effects |
| Autonomous | Only explicitly allowlisted low-risk actions | Executive risk acceptance | Continuous quality and business gates remain green |

Exact numeric thresholds should be agreed with operations before a stage begins. They should not be
selected after observing results.

## Model and prompt experiments

Change one major variable at a time where practical. Record:

- model and version;
- system prompt hash;
- tool schema version;
- evaluation-set version;
- sampling configuration;
- result distribution, not only averages;
- latency and cost;
- regressions by case type.

Promote a change only when it improves the target metric without breaking a safety gate.

## Retirement criteria

Disable or remove an agent when any of the following persists after an agreed remediation window:

- no statistically or operationally meaningful improvement over the human baseline;
- cost per accepted outcome exceeds the approved ceiling;
- operators routinely ignore or rewrite recommendations;
- a simpler rule or product change solves the problem more reliably;
- the source process changes enough that the evaluation set is no longer representative;
- safety, privacy, or data-access violations cannot be controlled acceptably.

Retirement is a normal product decision, not an engineering failure.
