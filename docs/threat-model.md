# Threat Model

## Assets

- Customer and order data.
- Credentials used by internal and third-party tools.
- The authority to change orders, issue remedies, or contact customers.
- Audit history and evaluation data.
- Model, tool, and infrastructure budgets.

## Trust boundaries

- User or case content entering the model context.
- Model output entering the runtime.
- Runtime calls entering internal and third-party tools.
- Operator approvals entering the resume flow.
- Provider responses and telemetry leaving controlled infrastructure.

## Threats and controls

| Threat | Example | Primary controls |
| --- | --- | --- |
| Prompt injection | Order text asks the agent to reveal credentials or call another tool | Treat content as data, fixed tool allowlist, schema validation, least-privilege credentials |
| Excessive agency | Model attempts an unapproved refund or customer message | Read/write classification, policy-owned approval, bounded tool scopes |
| Data exfiltration | Sensitive fields are sent to a model or external tool | Field minimization, provider policy, egress controls, redacted audit events |
| Replay or duplicate effect | A retry creates two reprints | Run and tool-call idempotency keys, durable result store, tool-side uniqueness |
| Cost exhaustion | Model loops or repeatedly calls an expensive tool | Step, time, and cost budgets enforced outside the model |
| Hallucinated capability | Model names an unregistered tool | Registry lookup fails closed and records the event |
| Compromised tool | A third-party API returns malicious or misleading content | Output schema validation, provenance, timeouts, circuit breakers, no implicit instruction following |
| Evaluation gaming | Prompt changes overfit the test set | Held-out production-like set, versioning, distribution review, periodic refresh |
| Approval spoofing | A forged event resumes a write | Authenticated operator identity, signed command, separation of duties, immutable audit trail |
| Model drift | Provider update changes behaviour | Pinned versions where possible, canary release, continuous evaluation, rollback |

## Residual risks

- No evaluation set captures every live ambiguity.
- Human approvers can make mistakes or habituate to recommendations.
- Tool-side authorization defects cannot be corrected by the agent runtime alone.
- Provider behaviour and availability can change outside the application's release cycle.

The production design should assume model output is untrusted, tool effects are consequential, and
human approval reduces risk but does not eliminate it.
