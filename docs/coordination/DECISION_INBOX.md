# CEO Decision Inbox

- **Maintainer:** Repository lead
- **Updated:** 2026-08-19

Only decisions requiring CEO judgment belong here. Routine reversible implementation choices stay within accepted task contracts. A decision is not approval for a later destructive, external, infrastructure, or production action unless the recorded scope says so explicitly.

## D-001: Primary Reader And Read-To-Explore Job

- **Status:** Accepted for local implementation on 2026-08-19
- **CEO directive:** “Ok build it,” following the recommended serious-lay-reader read-to-explore objective.
- **Decision:** Prioritize the serious lay reader testing a clean “read -> record my thought/question -> inspect evidence -> return to reading” journey before expanding sources, AI, or expert tools.
- **Success signal:** In a manual alpha scenario, a reader can complete the whole loop and return to the same passage without asking how to proceed. Tester feedback remains the validation for usefulness and trustworthiness.
- **Scope record:** [TASK-0003](tasks/0003-reader-reflection-loop.md) implements the smallest local guidance gap only. This does not authorize source expansion, new AI behavior, accounts, telemetry, infrastructure work, release, commit, push, or deployment.

## D-002: Production Push Approval Policy

- **Status:** Decision required before the next push to `main`
- **Why now:** A `main` push automatically deploys GitHub Pages, and the iOS shell loads that hosted app. The repository previously contained ambiguous language about standing user-test deployment authority.
- **Options:** Require approval immediately before every production push; or grant standing approval for a precisely defined class of verified changes with scope, safeguards, and revocation conditions.
- **Smallest decision:** State which policy applies to future production changes. A standing-policy choice must be recorded with its exact terms before it authorizes any action; this inbox item does not itself authorize a current push.
- **Recommendation:** Require per-push approval until a non-deploying validation workflow and explicit release gate exist.
- **Impact if deferred:** Local work may continue, but the default is per-action approval and nothing should be pushed to `main` without it.

## D-003: Next Architecture Phase

- **Status:** Proposed; not blocking current adoption
- **Why now:** Logical boundaries are documented, but enforcement is convention-based and orchestration hotspots remain. The supplied operating system requires CEO approval before material restructuring.
- **Options:** Keep conventions only; add lightweight import/public-interface checks in the existing tree; or approve a staged workspace-package migration.
- **Smallest decision:** When the next feature crosses a documented boundary, approve or reject Phase 2 of the [adoption plan](../operating-system/adoption-plan.md): current-tree boundary enforcement without moving product code.
- **Recommendation:** Approve only that lightweight phase when demanded by product work. Do not start a standalone monorepo migration now.
- **Impact if deferred:** Current delivery can continue with serialized ownership, but boundary drift remains possible.

## D-004: Code License And Bundled KJV Provenance

- **Status:** Decision/evidence needed before broader distribution or license claims
- **Why now:** The repository has no `LICENSE` file and no committed edition/source record for `src/data/bible.json`.
- **Smallest decision:** Confirm the intended code license and provide or authorize verification of the KJV corpus's exact source, edition, and redistribution basis.
- **Recommendation:** Treat both as unresolved and make no public license/provenance claim until evidence is recorded.
- **Impact if deferred:** Internal development can continue; release-readiness and redistribution claims remain constrained.

## D-005: Question-Aware Passage Clarification

- **Status:** Accepted for local implementation on 2026-08-24
- **CEO directive:** “Ok build,” following the product recommendation to make one reader question the organizing object for fast, trustworthy depth.
- **Decision:** An explicitly saved reader question may enter a passage-first clarification view automatically. That view leads with the passage and a deterministic evidence-backed starting point; broader source comparison, full commentary, and optional local AI remain progressively disclosed.
- **Scope record:** [TASK-0004](tasks/0004-question-aware-clarification.md) may change the reader-thread UI and use the existing observation `type` field to preserve question intent. It must not add new sources, AI behavior, accounts, telemetry, sync, persistent remote source excerpts or generated answers, new dependencies, infrastructure changes, commit, push, or deployment.
- **Success signal:** In a moderated alpha scenario, a reader can write one question, receive a useful first clarification without retyping it, inspect why it is supported, and return to Scripture without being led through a research dashboard.

## Deferred Product Decisions

Privacy/persistence promises, editorial/theological breadth, supported AI strategy, and broader release bar remain CEO-reserved in the [project charter](../operating-system/project-charter.md). Move one here when it becomes necessary for the current objective; do not ask the CEO to decide all of them abstractly.
