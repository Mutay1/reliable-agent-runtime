# Operational Runbook

## Service objectives

Initial objectives should be set during the assistive stage and refined with observed traffic:

- availability for recommendations;
- p95 time to first useful recommendation;
- maximum cost per accepted recommendation;
- zero duplicate write effects;
- zero unauthorized tool executions.

Safety objectives take precedence over availability. Failing closed is acceptable when authority or
input provenance cannot be established.

## Required dashboards

- runs by terminal status and workflow version;
- step, latency, and cost distributions;
- tool calls, errors, retries, and timeouts;
- approval requests, age, acceptance, and rejection;
- evaluator score and operator edit/override rate;
- duplicate-suppression events;
- model, prompt, tool-schema, and evaluation-set versions.

## Alerts

Page immediately for:

- any unauthorized or duplicate write effect;
- a sustained spike in unsafe evaluator results;
- suspected customer-data exposure;
- loss of audit-event persistence.

Create a working-hours alert for:

- cost or latency above the agreed ceiling;
- tool-error or timeout rate above baseline;
- approval backlog age above the operating target;
- a material fall in operator acceptance.

## Incident response

### Runaway loop or cost spike

1. Disable the affected workflow or model version.
2. Revoke write-tool access if the cause is uncertain.
3. Preserve run IDs, prompt hashes, tool inputs, and provider request identifiers.
4. Confirm runtime budgets were enforced and identify any bypass.
5. Replay affected cases offline before re-enabling.

### Incorrect or unsafe recommendation

1. Stop promotion to later rollout stages.
2. Identify the exact model, prompt, tool schema, and source facts.
3. Determine whether the failure came from missing context, model reasoning, tool data, or policy.
4. Add a redacted regression case to the held-out evaluation process.
5. Ship a fix only after both the new case and the existing suite pass.

### Duplicate external effect

1. Disable the specific write tool.
2. Identify all calls sharing the run, call, and external idempotency keys.
3. Reconcile customer or operational state with the source system.
4. Fix the weakest idempotency boundary before re-enabling writes.

### Model provider outage

1. Fail the run without attempting write tools.
2. Retry only within the configured budget and deadline.
3. Use another provider only if that adapter has independently passed the release gate.
4. Route urgent cases to the existing human workflow.

## Rollback

The fastest rollback is a workflow kill switch that prevents new runs. Model, prompt, and tool-schema
versions should be independently selectable so the team can revert one layer without redeploying
the entire service. Pending approvals from a disabled version must be invalidated or re-evaluated.

## Post-incident questions

- What user or business outcome was affected?
- Which boundary should have contained the failure?
- Did we have the evidence needed to reconstruct the run?
- Did an alert detect the issue, or did a person?
- Which evaluation case, policy, or operational control prevents recurrence?
- Should this capability be simplified, constrained, or retired?
