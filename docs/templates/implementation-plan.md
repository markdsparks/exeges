# Implementation Plan: Title

- **Feature spec:** Link
- **Delivery lead:** Name
- **Related ADRs:** Links or none

## System Understanding

Summarize the existing execution path, ownership boundaries, and constraints that shape the implementation.

## Increments

| Step | Outcome | Owner | Mutable area | Verification | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Small testable result | Agent/lead | Files or module | Exact check | Pending |

Only one agent may own a mutable area at a time. Read-only audits may run in parallel.

## Integration Order

Explain dependencies between increments and when the lead will review and integrate them.

## Quality Gates

- Applicable repository commands
- Manual user journeys and edge states
- Security, privacy, data, licensing, and dependency review
- Independent verifier scope

## Recovery

Describe how to disable, revert, or recover from failure, especially for persisted data or external integrations.

## Escalations

List unresolved CEO decisions or high-risk triggers. Use `None` only after checking the escalation rules in `AGENTS.md`.
