# TASK-0006: Local Commentary Comparison Reliability

- **Role / owner:** Implementer / repository lead
- **Task state:** Shipped
- **Delivery state:** Shipped
- **Risk / reversibility:** Low; adjusts an existing on-device completion deadline while preserving the established worker lifecycle, evidence contract, cancellation, and fallback
- **Parent objective:** CEO bug report on 2026-08-30: “The local model comparison still doesn’t work.”

## Objective

Allow an explicitly requested local commentary comparison enough bounded time to complete its already permitted evidence-checked JSON response on slower supported devices.

## Ownership Boundary

May change `src/lib/localStudySynthesis.js`, `scripts/bench-commentary-comparison.mjs`, and this task/coordination record.

Must preserve the existing local model, lazy explicit invocation, single-worker lifecycle, cancellation control, evidence-card scope, exact-quotation audit, source-visible fallback, privacy boundary, dependencies, and release configuration. TASK-0005's uncommitted reader-continuity work remains paused and must not be changed or integrated by this task.

## Dependencies

- Existing local-model runtime and commentary-comparison contract.
- The CEO-provided failure state, whose text maps to the comparison generation deadline.

## Interface Contract

- Local comparison remains explicit, experimental, lazy, bounded, cancelable, and limited to reader-selected commentary cards.
- A timeout still interrupts generation, clears the worker/engine, and retains the selected excerpts for inspection and retry.
- The change does not alter model/provider choice, source selection, prompt evidence scope, accepted comparison structure, citation/quotation audit, or device capability detection.

## Acceptance Criteria

- A valid comparison completion is not canceled by the former 20-second per-completion limit merely because it is generating the already allowed response on a slower device.
- Comparison work still has a finite deadline and remains stoppable from the existing UI.
- Timeout, completion-before-deadline, cancellation, retry, and quotation-validation behavior remain covered by the focused benchmark.

## Verification

- `npm run bench:commentary-comparison`
- `npm run lint`
- `npm run build`
- `npm run check:full`
- Review the final diff for model/evidence/worker-boundary preservation and obtain independent review.
- Exercise a real supported WebGPU browser comparison, including progress, stop, completion, timeout, and retry, when a browser target is available.

## Non-Goals

- New model/provider, device support, bundle/loading strategy, source, prompt evidence boundary, audit rule, persistence, telemetry, dependency, or UI redesign.
- Removing the deadline, hiding the source fallback, committing, pushing, or deploying.

## Approval Gates

Pause for CEO approval before changing model/provider, device support, bundle/loading strategy, source or prompt/audit contracts, privacy behavior, dependencies, commit, push, deployment, or external systems.

## Stop Conditions

Stop and escalate if the deadline adjustment cannot preserve bounded/cancelable operation; real-device evidence instead shows a WebGPU crash, model-load failure, or unsupported-device condition; or a durable model/runtime contract change is required.

## Required Handoff

- Outcome and reader-visible behavior.
- Exact files and runtime invariant changes.
- Automated, browser/device, and independent-review evidence.
- Remaining risks, release state, and recommended next bounded action.

## Implementation Handoff (2026-08-30)

- **Outcome delivered:** A local commentary comparison now has a 60-second, still-cancelable per-completion deadline instead of 20 seconds. This accommodates its existing request shape—up to three excerpts and a permitted 220-token, quotation-checked JSON response—without removing the finite failure path.
- **Changed boundary:** `src/lib/localStudySynthesis.js` changes only the commentary-completion time budget. `scripts/bench-commentary-comparison.mjs` now also proves a bounded completion resolves before its deadline. Explicit invocation, one-active-run protection, Stop behavior, worker/engine cleanup, selected-source filtering, prompt evidence scope, JSON normalization, quotation audit, retry behavior, privacy, dependencies, and release configuration are unchanged.
- **Evidence:** `npm run bench:commentary-comparison`, `npm run lint`, `npm run build`, `git diff --check`, and `npm run check:full` passed. The full gate passed documentation links, lint, the production build, and all eight focused benchmarks. Independent review returned **Pass with known risk** and separately confirmed the focused benchmark, lint, documentation links, whitespace, and a production build.
- **Known limit:** No supported WebGPU browser/device target is connected here. A real slow-device completion, Stop, timeout, retry, and worker-cleanup journey remains unverified. The production build retains its pre-existing large-chunk warning.
- **Integration/release:** The isolated runtime repair was committed as `8b442b0` under the CEO's specific 2026-08-31 push authorization. It contains only the runtime deadline and focused benchmark; TASK-0005 remains paused and separate in the same worktree.
- **Recommended next bounded action:** Exercise the comparison with two and three excerpts on the reported device, including Stop and retry. If it succeeds, request a specific commit/push authorization for this repair only; if it reaches the new deadline or crashes, retain the visible progress/error state and investigate the device/runtime path rather than expanding the model contract.
