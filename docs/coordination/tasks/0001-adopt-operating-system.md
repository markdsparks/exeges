# TASK-0001: Adopt AI Product Development Operating System

- **Role / owner:** Implementer / repository lead
- **Task state:** Integrated
- **Delivery state:** Integrated
- **Risk / reversibility:** Medium; broad repository governance/tooling surface, but local and reversible with no runtime behavior or external-state change intended
- **Parent objective:** CEO directive dated 2026-08-19 to transform the repository using the supplied AI Product Development Operating System
- **Independent review:** [TASK-0002](0002-review-operating-system-adoption.md)

## Objective

Make Exeges operable through one durable CEO-led control system with explicit authority, bounded roles/tasks, current coordination state, module and contract visibility, reliable verification, independent review, and clear separation of integration from production release.

## Ownership Boundary

May change `AGENTS.md`, tracked `.codex/` agent adapters, `.nvmrc`, `README.md`, `package.json`, `package-lock.json` only if needed for scripts, `scripts/check`, documentation-check tooling, `docs/`, and the stale expected object in `scripts/bench-personal-study-threads.mjs`.

Must not change application runtime behavior, `src/` implementation, persisted data, source corpora, generated source content except deterministic verification output, `.github/workflows/`, Worker behavior, native code/signing, external systems, or production configuration.

### Contract Amendment 2026-08-19

The first Reviewer correctly found that `.nvmrc` was omitted from the enumerated mutable boundary even though the audit recommended one machine-readable Node version and the implementation added it. Before remediation continued, the repository lead explicitly amended the accepted boundary to include `.nvmrc`. This reversible tooling-file addition remains inside the parent directive, adds no dependency or runtime behavior, and is recorded here rather than silently treated as previously authorized.

## Dependencies

- Direct CEO adoption directive and supplied operating-system brief.
- Read-only documentation, architecture, and tooling audits.
- Existing project charter, product direction, engineering context, source plan, and integration documents.
- Existing production behavior and focused checks as the implementation baseline.

## Interface Contract

- Root `AGENTS.md` is the cross-tool execution authority.
- Shared product, architecture, decision, coordination, and task truth lives under `docs/`.
- Delegated roles are exactly Explorer, Implementer, Reviewer, or Integrator; the repository lead is not a delegated role.
- Only the lead updates shared coordination state and the integration queue.
- One writer is permitted in the shared checkout.
- `npm run check` validates documentation links, lint, and production build.
- `npm run check:full` additionally runs all eight local focused benchmark scripts after required source generation.
- `Implemented`, `Verified`, `Integrated`, and `Shipped` remain distinct states.
- A `main` push is a production action and is not authorized by this task.

## Acceptance Criteria

- Authority order, CEO message/interruption protocol, roles, writer isolation, task planning, approval envelope, bounded evidence loop, escalation, release states, and required handoffs are durable and internally consistent.
- `STATUS`, `DECISION_INBOX`, `RISKS`, and task records provide one authoritative coordination view.
- Current logical modules and critical shared contracts document purpose, interfaces, data/invariants, allowed dependencies, checks, and review triggers.
- An incremental target and migration sequence is proposed without moving product code or implying architecture approval.
- Codex role adapters are thin and match the exact four roles.
- Documentation accurately reflects Tyndale study notes and the Node 24 / `npm ci` Pages workflow.
- The stale personal-study-thread expectation matches the intended privacy fields already returned by production.
- Standard and full repository checks pass without unintended tracked generator drift.
- A fresh-context Reviewer returns `Pass` or all blocking findings are resolved and rechecked.

## Verification

- `npm run check:docs`
- Parse every tracked `.codex/*.toml` file with Python's standard `tomllib`.
- `npm run check`
- `npm run check:full`
- `git diff --check`
- Inspect `git status --short` and the final diff for unrelated/generated changes.
- Independent Reviewer assessment against this contract and actual evidence.

## Non-Goals

- Product feature or visible UI change.
- Physical monorepo/workspace migration or broad refactor.
- CI/release, Worker, Pages, TestFlight, native, signing, credential, or external-system change.
- New dependency, source corpus, account, telemetry, cloud persistence, or product strategy.
- Commit, push, publication, or deployment.

## Approval Gates

Pause for CEO approval before material directory/package restructuring, shared runtime contract changes, production workflow/infrastructure changes, destructive actions, external actions, commit/push/deploy, or any expansion beyond this reversible operating layer.

## Stop Conditions

Stop and escalate if sources of truth materially conflict, the worktree contains unrelated user edits, a shared runtime contract must change, verification reveals a broader product defect that cannot be isolated to the stated benchmark expectation, or completion requires production/external action.

## Required Handoff

- Outcome delivered.
- Files/modules/interfaces/dependencies changed.
- Exact checks and results.
- Decisions and assumptions.
- Risks and limitations.
- Integration and deployment notes.
- Recommended next bounded action.

## Evidence And Handoff

### Outcome Delivered

The repository now has a tailored shared operating authority, exact delegated roles, durable coordination/decision/risk/task state, logical module and shared-contract maps, a gated migration proposal, thin Codex adapters, and standard/full verification commands. No product runtime, persisted contract, production workflow, external system, or live release was changed.

### Changes

- Governance and shared sources: `AGENTS.md`, operating-system docs, ADR-0001, coordination records, architecture/contracts, and templates.
- Tool adapters: Explorer, Implementer, Reviewer, and Integrator TOML files; four-thread capacity retained for one writer plus read-only agents.
- Verification: `.nvmrc`, package commands, `scripts/check`, local Markdown link validation, and a generation prehook for standalone study-synthesis checks.
- Baseline repair: personal-study-thread expected output now includes the existing translation/redaction fields.
- Dependencies and runtime interfaces changed: none.

### Verification

- `npm run check:docs`: passed after remediation; 28 Markdown files and 72 local links.
- Five tracked `.codex/*.toml` files parsed successfully with Python `tomllib`.
- `npm run check`: passed documentation, lint, source generation, and production build.
- `npm run check:full`: passed the standard gate and all eight local focused benchmarks.
- `git diff --check`: passed.
- Source generation produced no tracked drift in `src/data/generatedStudySourceChunks.js` or `package-lock.json`.
- Post-review remediation rechecks passed TOML parsing, shell/Node syntax, `git diff --check`, `npm run check:full`, and all eight benchmarks.
- Independent TASK-0002 re-review found no remaining blocking issues and returned `Pass with known risk`.
- Browser/mobile, Worker, native, network, and release checks: not run because their behavior was outside this task and unchanged.

### Decisions And Assumptions

- The direct CEO instruction accepts the reversible operating layer and ADR-0001.
- The physical modular-monorepo layout remains a proposal, not approval to migrate.
- A `main` push is treated as production; no standing deployment approval was inferred.
- One writer is assumed necessary while agents share this checkout.

### Risks And Limitations

- Documentation does not yet enforce import boundaries.
- CI still deploys after only its existing build step; changing that production workflow awaits explicit scope/approval.
- Product objective, release approval policy, and license/provenance decisions remain in the CEO inbox.
- The production build retains its existing large-chunk warning.

### Integration Notes

The repaired changes are accepted into the local integration base. They are not committed, pushed, published, deployed, or shipped. The initial review's four governance findings were resolved and independently rechecked. No migration or release ordering is required for runtime behavior.

### Recommended Next Action

Ask the CEO to decide D-001 before opening the next product feature objective. Keep physical modularization deferred until a product task needs the approved boundary phase.
