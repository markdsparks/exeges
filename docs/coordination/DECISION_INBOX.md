# CEO Decision Inbox

- **Maintainer:** Repository lead
- **Updated:** 2026-11-02

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

## D-006: Private Reader Continuity Path

- **Status:** Accepted for local implementation on 2026-08-30
- **CEO directive:** “Think about the next best thing from a product roadmap perspective, external research, based on our product vision, and let's get it built.”
- **Decision:** Add one private, local Mark reading path that gives a reader a coherent next chapter and explicit progress through a complete Gospel story. Preserve reader agency: no schedule, streak, reminder, account, social interaction, generated content, or automatic completion.
- **Rationale:** External signals are recorded in [reader continuity research](../research/2026-08-reader-continuity.md). The intended outcome is a quiet response to the uncertainty of where to begin, without copying a large plan marketplace or making engagement metrics the product.
- **Scope record:** [TASK-0005](tasks/0005-reader-continuity-path.md) may add a compatible private local-progress and backup contract plus reader/navigation UI. It must not add new source, AI, telemetry, account, cloud, schedule, notification, dependency, infrastructure, commit, push, or deployment behavior.
- **Success signal:** In a moderated alpha, a reader can begin Mark, finish a chapter, return later, know the next reading, and still freely leave the path to read or study elsewhere.

## D-007: Fully Native App, iPhone And iPad First

- **Status:** Native iPhone/iPad direction and bounded SwiftUI reader proof accepted on 2026-11-02
- **CEO directive:** “One big thing is transform to fully native app... then let's talk roadmap,” followed by “iPhone and iPad first.”
- **Decision:** Plan the transition from the hosted-web iOS shell to a fully native iPhone/iPad application. Android is outside this first platform scope. Preserve the reader-first mission and existing unfinished work while discussing the roadmap.
- **Adoption plan:** Use SwiftUI for the bounded native reader proof, with an isolated local store and a preservation plan for later compatible import. Validate the existing-data transition before replacing the shell.
- **Implementation approval:** The CEO said “ok build” after the proposed SwiftUI reader proof and data-preservation plan. D-008 subsequently supersedes the initial Debug-only Release restriction for the internal TestFlight beta. [TASK-0007](tasks/0007-native-reader-proof.md) bounds this to a local native reading/navigation/note/resume proof, with a separate local JSON store and no destructive migration. Debug opens the native proof; Release continues to open the existing shell pending parity, migration verification, and release approval.
- **Next decision:** Later feature parity, automatic data migration, AI runtime, licensed-content delivery, and release cutover remain separate decisions. No new service or dependency is authorized.
- **Safeguards:** TASK-0005 remains paused in Review and its local changes must be preserved. No destructive data migration, dependency, infrastructure change, commit, push, TestFlight upload, or production release is authorized.
- **Next inspectable checkpoint:** The locally verified native reader proof and its evidence, followed by real-device inspection and the next bounded parity/migration decision.

## D-008: Native Reader Internal TestFlight Release

- **Status:** Accepted and executed: internal native-reader TestFlight 1.0.0 (3) is available on 2026-11-02
- **CEO directive:** “get a testflight build out, I don't care about any local data for now”
- **Decision:** Make the native reader the Release entry and archive/export/upload 1.0.0 (3) to the existing internal Exeges Testers group. Local-data migration is deferred, not a deletion instruction. Existing data remains untouched.
- **Scope:** [TASK-0009](tasks/0009-native-reader-testflight.md), [ADR-0003](../decisions/0003-native-reader-internal-testflight.md). Includes the native Release entry/build-number change, standard verification/signing, upload, and processing/internal-availability verification. Does not authorize commit, push, Pages deployment, new audiences/invites, public beta, or App Store release.
- **Known limits accepted for this beta:** Native feature parity and migration are incomplete; physical-device testing is the purpose of the beta. Licensing/provenance and broader release readiness remain open rather than claimed resolved.

## D-009: Wire Native Search And Bookmarks First

- **Status:** Accepted for local implementation on 2026-11-02
- **CEO directive:** “basic app seems to be working...let's start getting our other features wired in,” followed by “Search and bookmarks first.”
- **Decision:** Port KJV text search and private verse bookmarks into the native reader. Preserve the existing native reading/note/appearance/resume behavior; keep migration deferred. Native search uses matching verses only, background/cancelable work and bounded results. Bookmarks use a separate local document so the current reader schema stays intact.
- **Scope:** [TASK-0011](tasks/0011-native-search-bookmarks.md). No ESV/study/AI expansion, account/service/dependency, import/export/migration, web change, commit/push, or TestFlight release is included.
- **Success signal:** A reader finds a passage, opens its exact verse, returns to their prior reading place, saves it as a bookmark, and reopens/removes it after restart without losing notes or position.

## D-010: Beauty And Usefulness In Every Feature

- **Status:** Accepted product quality direction on 2026-11-02
- **CEO directive:** “Dont' forget this should be stunning by highly useful, every feature.”
- **Decision:** Every feature must combine visual beauty with substantial usefulness. The lead interprets this as applying to both current and future native features, with Scripture primary. Functional parity or passing technical checks alone do not establish design acceptance.
- **Application:** The [quality bar](../operating-system/product-direction.md#quality-bar-for-every-feature) defines reader-job evidence, deliberate visual craft, coherent native interaction, accessibility and state coverage. Task contracts and reviews must carry these criteria. Current search/bookmarks remain locally integrated; assess polish and usefulness against this bar before the next release candidate is declared ready.
- **Boundary:** Does not authorize a new workflow, architecture, dependency, external service, commit/push or release.

## D-011: Build And Push Native Search And Bookmarks

- **Status:** Accepted for this release on 2026-11-02
- **CEO directive:** “Ok build and push.”
- **Decision:** Build/sign/export/upload native search/bookmarks as 1.0.0 (4) to the existing internal Exeges Testers group after D-010 assessment and release review. Commit/push native source/tests and coherent durable documentation to `codex/native-search-bookmarks`.
- **Scope:** [TASK-0013](tasks/0013-native-search-bookmarks-release.md), independent [TASK-0014](tasks/0014-review-native-search-bookmarks-release.md). The scoped branch preserves paused web implementation and avoids a main push/Pages deployment. Existing identifier/signing/audience and data-preservation boundaries remain unchanged.
- **Limits:** No main merge/deployment, public beta/App Store submission, new invitations, destructive migration, provider/dependency/content expansion, or standing future release approval.

## Deferred Product Decisions

Privacy/persistence promises, editorial/theological breadth, supported AI strategy, and broader release bar remain CEO-reserved in the [project charter](../operating-system/project-charter.md). Move one here when it becomes necessary for the current objective; do not ask the CEO to decide all of them abstractly.
