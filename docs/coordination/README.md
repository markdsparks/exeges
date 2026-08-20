# Coordination Control

- **Owner:** Repository lead
- **Status:** Authoritative shared coordination state
- **Last verified:** 2026-08-19

This directory is the single repository-level view of current work. The CEO should be able to ask what is active, blocked, ready, risky, or waiting for a decision without reading agent transcripts.

Only the repository lead edits shared files in this directory. A worker may update an individual task record only when its contract grants that ownership; otherwise it returns the required handoff and the lead reconciles state.

## Files

- [STATUS.md](STATUS.md): current objective, dependency graph, task states, integration queue, evidence, and resource position.
- [DECISION_INBOX.md](DECISION_INBOX.md): only choices that require CEO authority, with impact, options, and the smallest decision needed.
- [RISKS.md](RISKS.md): active product, architecture, security, licensing, delivery, and process risks with owners and triggers.
- [tasks/](tasks/README.md): accepted task contracts and their durable handoffs.

## Task States

- `Blocked`: cannot safely advance until a recorded dependency, decision, or external condition changes.
- `Ready`: contract and dependencies are settled and the task may be assigned.
- `In progress`: an owner is actively executing the contract.
- `Review`: implementation is complete enough for independent assessment or integration checks.
- `Integrated`: accepted into the integration base or explicitly ready there; not necessarily released.
- `Shipped`: the approved release condition has been met.

Use `Proposed`, `Approved`, `Implemented`, and `Verified` inside a task or executive handoff when finer delivery-state detail is useful. Never use `Shipped` for local, uncommitted, unpushed, or merely integrated work.

## Update Triggers

The lead updates coordination state when a directive is interpreted, an objective or priority changes, a task moves state, an interface is settled, an assumption or risk changes materially, a CEO decision is needed or made, review changes integration readiness, work is interrupted, or a release condition is met.

Every status update must remain traceable to an approved objective, task contract, decision, or evidence source. Remove resolved items from the active view only after preserving relevant history in a task handoff or ADR.

## Interruption Handling

When the CEO pauses, redirects, or cancels work, mark affected tasks and queue entries before assigning new writing work. Preserve reusable artifacts and state which work remains valid. `Pause all` prohibits edits, merges, deployments, destructive/external actions, and new writing assignments; read-only status collection may continue.
