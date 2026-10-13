# ADR 0002: Model Human Approval as a Durable Run State

- Status: Accepted
- Date: 2026-10-12
- Owners: Agent platform engineering

## Context

Write-capable tools can create customer or operational effects. Approval may arrive minutes or
hours after an agent proposes an action. Holding an HTTP request, promise, or worker open during
that interval makes deployment, recovery, and duplicate prevention fragile.

## Options considered

1. Keep the worker blocked until an operator responds.
2. Let the model decide whether approval is necessary.
3. End the attempt in an `awaiting_approval` state and resume through a new idempotent command.

## Decision

Choose option 3.

The runtime classifies each registered tool as read or write. A write proposal is persisted with its
arguments, policy result, and audit context. The active attempt terminates as `awaiting_approval`.
An approval service later creates a resumable command using the original run and call identifiers.

The sample stops at the durable state boundary. It does not yet implement the approval service or
resume command.

## Consequences

- No worker or network request must remain alive while a person decides.
- Deployments cannot silently discard pending approvals.
- Idempotency can be enforced at both run and tool-call boundaries.
- Approval user experience and resume semantics require additional application code.
- The policy, not the model, remains the authority on which actions require approval.
