# ADR-0001: Adopt A CEO-Led AI Product Development Operating System

- **Status:** Accepted
- **Date:** 2026-08-19
- **Owner:** CEO
- **Related brief/spec:** Direct CEO adoption directive; [adoption plan](../operating-system/adoption-plan.md); [TASK-0001](../coordination/tasks/0001-adopt-operating-system.md)

## Context

Exeges already had product-specific agent guidance, a charter, product and engineering context, an ADR template, and delivery templates. It lacked one authoritative coordination queue, exact cross-tool roles, complete task contracts, a risk/decision ledger, contractual module boundaries, and a single trustworthy verification entry point. Some source-of-truth and focused-check drift was already present.

Uncontrolled agent activity would be especially risky because the current environment can share one checkout, `main` pushes deploy the web product, the iOS shell consumes that live deployment, private user data is stored locally, and licensed/source-grounded behavior has strict boundaries.

## Decision Drivers

- Keep CEO product and release authority explicit.
- Turn chat direction into durable, traceable objectives, contracts, evidence, and decisions.
- Preserve Exeges's reader-first, privacy, licensing, and grounding constraints.
- Prevent concurrent writers and uncontrolled integration in a shared checkout.
- Distinguish implementation, verification, integration, and shipment.
- Improve modularity incrementally without destabilizing a releasable product.

## Options Considered

### Keep The Existing Lightweight Guidance

Lowest immediate cost, but leaves coordination, task lifecycle, release authority, and module contracts implicit. Documentation and benchmark drift demonstrated that this was insufficient.

### Adopt The Generic Folder Layout And Immediately Restructure Into Workspaces

Creates visible organizational boundaries quickly, but duplicates existing tailored documents, changes many runtime paths, and introduces integration/release risk before contracts are stable.

### Adopt A Tailored Control Layer, Then Migrate Incrementally

Retains existing product-specific sources, adds missing coordination/contracts/checks, makes vendor configuration thin, and proposes a modular target without treating the proposal as migration approval.

## Decision

Adopt the tailored control-layer approach.

- `AGENTS.md` is the shared execution authority beneath the latest CEO instruction.
- Product, architecture, decision, coordination, risk, and task truth lives in repository documentation.
- Delegated roles are exactly Explorer, Implementer, Reviewer, or Integrator; there is one repository lead and integration queue.
- Use one writer in the shared checkout unless isolated environments are deliberately created.
- Every implementation uses a bounded task contract and external evidence.
- Production, destructive, external, infrastructure, and publishing actions remain separately approved.
- The current application stays a single Vite project. Logical boundaries are documented now; material code/package or release-topology migration requires a later CEO-approved phase.

## Consequences

- CEO directives, decisions, risks, task state, and evidence gain durable locations.
- Agents have clearer role, ownership, pause, approval, review, integration, and handoff behavior.
- A unified local check reduces unsupported completion claims.
- The repository gains documentation upkeep; stale coordination state would itself become a risk.
- Parallel writing remains intentionally limited until isolated worktrees exist.
- Physical modularity and CI/release hardening remain future work rather than hidden scope.

## Validation And Reversal

Validate the decision through the TASK-0001 acceptance criteria, standard/full repository checks, configuration parsing, diff review, and independent Reviewer assessment. For future delivery, watch lead time, rework, integration failures, escaped defects, review backlog, and CEO attention per verified outcome—not agent activity or code volume.

The operating layer is reversible by removing its new records/adapters and restoring the prior guide, with no user-data or runtime migration. Reconsider it if coordination overhead consistently exceeds decision/rework savings or if repository/team scale requires a different model. Any physical module or release migration is separately reversible according to its own approved task and ADR.
