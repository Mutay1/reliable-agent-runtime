# Agent Opportunity Assessment

## Context

This case study assumes a commerce and manufacturing platform that receives customer orders,
validates submitted artwork, produces physical goods, ships them, and resolves customer issues.
The exercise deliberately uses only public, generic domain assumptions. It does not model or claim
access to any company's private systems or data.

## Selection criteria

An initial agent should have:

1. a frequent and expensive manual workflow;
2. clear source-of-truth systems and bounded tools;
3. an outcome that can be measured within days, not quarters;
4. a safe read-only or approval-gated rollout path;
5. enough historical cases to build an evaluation set.

## Candidate agents

| Candidate | Work performed | Primary value | Principal risk | First release | Success metric |
| --- | --- | --- | --- | --- | --- |
| Order exception agent | Correlates order, production, and shipping events; recommends the next action | Faster resolution and fewer stalled orders | Incorrect remediation or customer promise | Read-only recommendation | Median time to resolution and operator acceptance |
| Artwork preflight agent | Identifies likely print or format problems and requests corrections | Fewer production failures and less manual review | Rejecting valid artwork | Shadow classification | Recall on confirmed production-blocking defects |
| Customer resolution agent | Retrieves customer and order context and proposes a bounded remedy | Lower handling time and more consistent responses | Unauthorized refund or disclosure | Draft-only response | Resolution time, edit rate, and reopen rate |
| Creator growth agent | Analyzes store and campaign performance and proposes experiments | Higher conversion and repeat sales | Unhelpful or repetitive recommendations | Recommendation only | Experiment acceptance and incremental conversion |
| Production scheduling agent | Recommends queue changes based on capacity and deadlines | Better throughput and on-time delivery | Disrupting production priorities | Simulation only | On-time completion and queue stability |

## Decision

Start with the **order exception agent**.

It offers the best combination of measurable value, bounded tools, frequent feedback, and a safe
rollout. The first version reads order and event data and recommends an action to an operator. It
cannot refund, reprint, change an address, or contact a customer. Write capabilities are introduced
one at a time after the read-only version meets its quality gate.

## Initial tool contract

| Tool | Risk | Purpose | Required control |
| --- | --- | --- | --- |
| `orders.get` | Read | Retrieve canonical order state | Field-level data minimization |
| `production.timeline` | Read | Retrieve manufacturing events | Tenant and order authorization |
| `shipping.track` | Read | Retrieve carrier events | Timeout, retry, and stale-data marker |
| `orders.expedite` | Write | Request expedited handling | Human approval and idempotency key |
| `orders.reprint` | Write | Create a replacement production job | Human approval, reason, and audit record |
| `customers.notify` | Write | Send an approved customer update | Template constraint and human approval |

## Non-goals

- Replacing support or operations staff.
- Allowing a model to call arbitrary URLs, execute code, or discover tools dynamically.
- Automating refunds, reprints, or customer communication in the first release.
- Optimizing model sophistication before the workflow produces measurable business value.
