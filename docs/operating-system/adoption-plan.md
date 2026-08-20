# AI Product Development Operating System Adoption

- **Owner:** Repository lead
- **Decision owner:** CEO
- **Status:** Governance adoption approved; material code migration proposed
- **Audit date:** 2026-08-19
- **Related decision:** [ADR-0001](../decisions/0001-ai-product-development-operating-system.md)
- **Task:** [TASK-0001](../coordination/tasks/0001-adopt-operating-system.md)

## Desired Outcome

Exeges can be operated as a controlled AI-assisted software organization: CEO intent is authoritative, every implementation traces to an approved outcome and bounded contract, independent work may proceed safely, integration and release are distinct, and claims of completion are backed by durable evidence.

## Initial Audit

The initial checkout was clean on `main` at `a62f498`, matching `origin/main`, with no stash, extra branch, or additional worktree. Ignored local dependencies, generated study packs, build output, native build products, and local Claude permissions were present and must be preserved unless deliberately regenerated.

The repository already had strong tailored foundations:

- CEO authority, product principles, risk gates, verification expectations, and final handoff rules in `AGENTS.md`.
- A project charter, product direction, engineering context, ADR process, and delivery templates.
- Healthy broad dependency direction from components and hooks into domain libraries and data.
- Focused assertion scripts for navigation, reading position, private backup, personal study threads, sources, commentary, grounding, and synthesis.
- A reproducible Pages build and a documented iOS delivery path.

Material gaps found:

- No authoritative coordination state, dependency queue, decision inbox, risk register, or complete task contract.
- Agent roles differed from the required Explorer, Implementer, Reviewer, and Integrator model, and vendor adapters repeated shared truth.
- The single shared checkout had no explicit one-writer rule.
- No unified repository check command existed; one focused check had drifted from its production contract.
- Module boundaries were descriptive rather than contractual or enforced.
- Product and engineering documentation had drifted from current source and CI behavior.
- Commit, push, deployment, and standing release authority were ambiguous even though every `main` push deploys the web app consumed by iOS.
- Consequential implemented constraints had no accepted ADR history.

## Phase 1: Reversible Operating Layer

This phase is authorized by the CEO's direct adoption directive and does not restructure application code or alter production systems.

Acceptance criteria:

- `AGENTS.md` records the authority hierarchy, CEO interaction and interruption behavior, exact delegated roles, writer isolation, lifecycle states, approval envelope, evidence loop, and escalation protocol.
- Durable coordination files answer what is active, what is queued, which decisions need the CEO, which risks are active, and how tasks are contracted.
- Current logical modules document purpose, interface, owned data, invariants, allowed dependencies, checks, and architecture-review triggers.
- Tool-specific agent files are thin adapters to shared repository truth.
- One command validates documentation, lint, and production build; a full form runs all local focused checks from a clean-checkout-safe sequence.
- Known source-of-truth and focused-check drift found by the audit is repaired.
- An independent Reviewer verifies the adoption diff and evidence.
- No product code is moved, no dependency is added, no release workflow is changed, and nothing is committed, pushed, or deployed without separate approval.

## Repository Control Target

The tailored Exeges names remain authoritative; duplicative `VISION`, `PRINCIPLES`, `ROADMAP`, and `SYSTEM` files are not created merely to match generic folder names.

```text
AGENTS.md

docs/
  operating-system/
    README.md
    project-charter.md
    product-direction.md
    engineering-context.md
    adoption-plan.md
  architecture/
    MODULES.md
    contracts/
  decisions/
  coordination/
    STATUS.md
    DECISION_INBOX.md
    RISKS.md
    tasks/
  templates/

scripts/
  check
```

Vendor adapters may point into this structure but cannot become the only source of product, architecture, contract, or task truth.

## Dependency Graph

```text
read-only audit
  ├─> governance and role alignment ─> coordination state ─┐
  ├─> module and contract map ────────────────────────────┼─> unified checks
  └─> baseline drift repair ──────────────────────────────┘        │
                                                                  v
                                                       independent review
                                                                  │
                                                                  v
                                                         CEO checkpoint
                                                                  │
                               ┌──────────────────────────────────┴─────────┐
                               v                                            v
                    keep current structure                     approve one migration phase
                                                                        │
                                                                        v
                                                        enforce boundaries before moving code
```

## Proposed Modular Target

The current single Vite package can remain the integration base while logical capabilities become explicit. A future multi-package layout is an option, not a foregone conclusion:

```text
apps/web
  app-shell
  features/reader
  features/library
  features/study

packages/scripture-core
packages/user-library
packages/study-core
packages/source-contracts
packages/esv-client
packages/commentary-client
packages/local-study-runtime

services/esv-proxy
tools/study-sources
native/ios
```

Allowed direction would be:

```text
web features -> capability public interfaces -> scripture/source contracts
study core   -> scripture core + source contracts
web features -> explicit ESV/commentary/local-model adapters
source tools -> source contracts
native shell -> approved web release
```

No feature should import another feature's internals; the app shell should compose public interfaces. A physical workspace migration is justified only if convention and lightweight checks prove insufficient.

## Proposed Incremental Migration

Each phase remains separately scoped, reversible where practical, and releasable:

1. **Restore and preserve a trusted baseline.** Keep the unified local gate green and ensure generated inputs are prepared before dependent checks.
2. **Enforce current-tree boundaries.** Add public entry points and a small import-direction check without moving runtime files.
3. **Centralize shared contracts.** Consolidate persisted user-data normalizers, ESV fixtures/validation, source schemas/registry, and explicit source-loading states while preserving compatibility exports.
4. **Reduce orchestration hotspots.** Extract reader coordination from `App.jsx` and current-study coordination from `StudyThread.jsx`; freeze legacy `StudyMode.jsx` behind one adapter until its product future is decided.
5. **Promote stable capabilities only if useful.** Move pure scripture, user-library, and study-core modules into workspace packages one at a time, keeping root commands and Vite output stable.
6. **Harden release topology separately.** Address ESV Worker configuration/security, Pages approval policy, and iOS release-channel coupling only through approved infrastructure tasks.

## Approval Gates

CEO approval is required before:

- Treating the proposed workspace layout as approved or beginning material directory restructuring.
- Removing or materially changing the legacy guided-study journey or its stored data.
- Changing storage keys, persisted schemas, backup compatibility, or privacy/persistence promises.
- Changing the ESV proxy's infrastructure, origin policy, abuse controls, caching, logging, or licensing behavior.
- Changing the `main`-to-production workflow or the iOS shell's live-hosted-web coupling.
- Turning local AI from an experiment into a supported product promise.
- Adding a material runtime dependency, paid service, account system, telemetry, or cloud persistence.
- Recording a code license or KJV provenance/rights conclusion.

## Non-Goals

- No broad application rewrite or premature package/workspace migration.
- No product-feature change.
- No removal of legacy study data or behavior.
- No CI, Worker, Pages, TestFlight, signing, or live-infrastructure mutation.
- No new external service, credential, dependency, data source, or copyrighted corpus.
- No commit, push, publication, or deployment as part of local adoption.

## Risks And Validation

- Coordination files can become stale; only the lead updates them and every meaningful handoff includes state reconciliation.
- Documentation is not enforcement; the next approved phase should add the smallest useful boundary check before code moves.
- A single working checkout prevents parallel writers; use one writer until isolated worktrees exist.
- The proposed physical module target may add overhead without product value; validate logical boundaries first.
- A green local check does not replace browser/mobile, Worker, native, security, or human product validation when those areas change.

## CEO Checkpoint

Phase 1 enters independent review after it is `Implemented` and its local gates pass. It is ready for CEO review only after the Reviewer passes the repaired diff, the repository lead integrates it, the task state is `Integrated`, and the delivery state has reached `Verified` or `Integrated`. The smallest next architecture decision is whether to approve only Phase 2—lightweight boundary enforcement in the current tree. The repository lead recommends approving that phase only when the next product task crosses one of the documented boundaries; do not start a standalone monorepo migration now.
