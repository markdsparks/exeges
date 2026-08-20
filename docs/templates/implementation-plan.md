# Implementation Plan: Title

- **Feature spec:** Link
- **Delivery lead:** Name
- **Related ADRs:** Links or none
- **Approved parent objective:** Link or quoted directive
- **Overall state:** Proposed, Approved, In progress, Implemented, Verified, Integrated, or Shipped

## System Understanding

Summarize the existing execution path, ownership boundaries, and constraints that shape the implementation.

## Dependency Graph

Show prerequisite tasks and settled interfaces. A compact diagram or explicit dependency list is sufficient. Put only dependency-ready work into the queue.

## Increments

| ID | Outcome | Role / owner | Mutable area | Dependencies | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Small testable result | Implementer / name | Files or module | Completed task or none | Exact check | Ready |

Use `Blocked`, `Ready`, `In progress`, `Review`, `Integrated`, or `Shipped`. Only one agent may own a mutable area at a time. Do not use concurrent writers in one checkout; read-only audits may run in parallel.

Every writing increment needs a separate accepted [task contract](task-contract.md).

## Integration Order

Explain dependencies, the single authoritative queue, when the Reviewer assesses each increment, and when the Integrator runs cross-module checks.

## CEO Checkpoints And Approval Gates

Name the smallest product, architecture, data, security, cost, external, destructive, or production decisions required and the point at which work must stop.

## Quality Gates

- Applicable repository commands
- Manual user journeys and edge states
- Security, privacy, data, licensing, and dependency review
- Independent Reviewer scope

## Recovery

Describe how to disable, revert, or recover from failure, especially for persisted data or external integrations.

## Escalations

List unresolved CEO decisions or high-risk triggers. Use `None` only after checking the escalation rules in `AGENTS.md`.
