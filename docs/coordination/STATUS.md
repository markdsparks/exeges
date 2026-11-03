# Coordination Status

- **Maintainer:** Repository lead
- **Updated:** 2026-11-02
- **Current objective delivery state:** Source published and build 4 upload accepted; Apple availability verification blocked; build 3 remains confirmed shipped
- **Current task phase:** TASK-0013 blocked on Apple status verification (direct status HTTP 500); no further implementation or upload queued
- **Quality direction:** D-010 beauty/usefulness assessment completed in TASK-0013/0014. Coherent native beta and concrete reader utility verified; broad search noise and maximum-text density remain known polish limits for device feedback.
- **Release state:** Build4 upload accepted (delivery ef092896-8f6f-4048-9d51-772da04d73af); Apple processing/internal availability pending. Native source pushed as ad24615 to codex/native-search-bookmarks. Build3 remains available; main/GitHub Pages unchanged.

## Current Objective

The CEO reports the basic native app is working and directs wiring in existing features, explicitly choosing **search and bookmarks first**. TASK-0011 / D-009 are locally integrated after checks and independent TASK-0012 review. The subsequent “Ok build and push” directive authorizes TASK-0013 / D-011: assess D-010 quality, publish internal TestFlight build 4 and push native source/documentation to a scoped codex branch. Migration and paused web work remain deferred; no main/Pages deployment is included.

The prior CEO directive authorized an internal native-reader TestFlight build and defers local-data migration. TASK-0009 / D-008 / ADR-0003 make native reading the Release entry for 1.0.0 (3), using the existing internal Exeges Testers group. No deletion, GitHub Pages deployment, commit, or push is included.

Get current on Exeges and propose a staged transition to a fully native app, starting with iPhone and iPad, then settle the product roadmap. The CEO confirmed that platform scope and approved the bounded SwiftUI reader proof on 2026-11-02; [D-007](DECISION_INBOX.md#d-007-fully-native-app-iphone-and-ipad-first) records the accepted first build and later migration/release boundaries.

The existing comparison repair remains shipped with real-device verification outstanding under [TASK-0006](tasks/0006-local-commentary-comparison-reliability.md). [TASK-0005](tasks/0005-reader-continuity-path.md) remains locally implemented and paused in Review; its accepted reader-continuity objective, research, and uncommitted changes remain intact. [TASK-0007](tasks/0007-native-reader-proof.md) is locally integrated after independent review; the existing shell remains available in the menu and all unfinished web work remains preserved.

## Dependency Graph And Task State

| ID | Outcome | Owner | State | Dependencies | Next checkpoint |
| --- | --- | --- | --- | --- | --- |
| OS-01 | Audit repository, documentation, architecture, tooling, and in-progress work | Explorers / lead | Integrated | CEO directive | Findings reconciled into plan |
| OS-02 | Align authority, roles, lifecycle, interruption, approval, and handoff rules | Lead / Implementer | Integrated | OS-01 | Complete |
| OS-03 | Create coordination state, task contract, decisions, and risk register | Lead / Implementer | Integrated | OS-01, OS-02 interfaces | Complete |
| OS-04 | Document current module/contracts map and gated migration sequence | Lead / Implementer | Integrated | OS-01 | CEO architecture checkpoint |
| OS-05 | Add unified checks and repair baseline drift | Lead / Implementer | Integrated | OS-01, check interface | Complete |
| OS-06 | Independently review the adoption contract and actual diff | Reviewer | Integrated | OS-02 through OS-05 implemented | Passed with known risk |
| OS-07 | Resolve review findings and rerun integration evidence | Lead / Implementer | Integrated | Initial OS-06 findings | Complete |
| PR-01 | Clarify the reader reflection -> sources -> return loop | Lead / Implementer | Shipped | D-001 accepted; OS-01 through OS-07 | Alpha journey feedback before prioritizing another product slice |
| PR-02 | Make saved questions the fast passage-clarification path | Lead / Integrator | Shipped | D-005 accepted; PR-01 | GitHub Pages deployment run `33296068960` succeeded; browser/mobile gap remains recorded in the task handoff |
| PR-03 | Make one complete Gospel story easy to start and continue privately | Lead / Implementer | Review (paused) | D-006 accepted; PR-01, PR-02 | Desktop and narrow-mobile Mark-path/backup journey evidence before local integration is declared complete |
| PR-04 | Let the existing local commentary comparison finish within a still-bounded runtime budget | Lead / Integrator | Shipped | Existing local-model/commentary contract; CEO failure report | CEO device test of completion, Stop, timeout, and retry |
| NA-01 | Native KJV reading, passage navigation, notes, appearance, and restart recovery | Lead / Integrator | Integrated | D-007 and ADR-0002 accepted | Physical-device inspection before next parity/migration contract |
| NA-02 | Native reader available to existing internal TestFlight testers | Lead / Integrator | Shipped | D-008; TASK-0007/0008; TASK-0010 review | CEO physical-device reading/note/reopen feedback |
| NA-03 | Find and privately bookmark Scripture through native screens | Lead / Integrator | Integrated | D-009; TASK-0007/0009; TASK-0012 review | Separately authorized TestFlight build and physical-device inspection |
| NA-04 | Internal build 4 plus native source publication | Lead / Integrator | Blocked | D-011; TASK-0013/0014 checks and review passed | Upload and branch push succeeded; verify Apple processing/group availability after status service recovers |

## Authoritative Integration Queue

1. TASK-0013: build 4/release checks, D-010 assessment, TASK-0014 review, signed artifact inspection, upload and native/docs branch push complete. Remaining: Apple processing/internal availability verification; direct status service returned HTTP 500 and the build list has not yet exposed build 4. No re-upload queued. TASK-0011 remains integrated; paused web code stays uncommitted.
2. Retain PR-04 real-device comparison checks as outstanding evidence: completion, Stop, timeout, and retry.
3. Keep PR-03 paused in Review. Its existing desktop/mobile Mark-path and backup checks remain prerequisites to any future integration or release; decide how to reuse its behavior in the native plan.

Only the repository lead may reorder this queue. D-011 authorizes this build 4 internal upload and native/docs commit/push to `codex/native-search-bookmarks`. No main/Pages deployment, paused web release, CI change or future release is authorized.

## Evidence So Far

- TASK-0011 native search/bookmarks: 81 Foundation assertions passed independently; Debug/Release builds passed; iPhone broad 8/8 passed. iPad broad six passed and two automation keyboard-focus failures were corrected, then final targeted 3/3 passed on each device. Final light/dark and accessibility-size screenshots passed independent inspection. TASK-0012: Pass with known risk, no unresolved findings. Physical-device, older-runtime and live VoiceOver checks remain unavailable. See TASK-0011 for exact artifacts and aggregate-run limits.
- Initial tracked worktree was clean on `main` at `a62f498`, matching `origin/main`.
- Three independent read-only audits covered documentation/coordination, architecture/contracts, and tooling/agent adapters.
- All pre-existing Markdown links resolved at audit time.
- Lint and seven focused benchmark scripts passed during audit.
- `bench:personal-study-threads` exposed a stale expected object after privacy fields were added to the production contract; the bounded expectation repair is included and now passes.
- `npm run check` passed: Markdown links, lint, source regeneration, and Vite production build.
- `npm run check:full` passed the standard gate plus all eight focused benchmarks, including the repaired personal-study-thread contract.
- All five tracked Codex TOML files parsed with Python's standard `tomllib`.
- `git diff --check` passed and source generation caused no tracked generated-file drift.
- Initial independent review returned `Fail` on four governance-record issues: inconsistent standing-approval language, circular lifecycle states, undeclared `.nvmrc` ownership, and mixed roles in one task record. Runtime/tooling acceptance criteria passed. The four record issues are under bounded remediation.
- The bounded repair now uses one authorization model, separates task/delivery states, documents the `.nvmrc` amendment, and gives the Reviewer a separate TASK-0002 contract. Post-repair link validation passed for 28 Markdown files / 72 local links; TOML, shell/Node syntax, whitespace, full build, all eight benchmarks, and generated-drift checks passed.
- Independent re-review found no remaining blocking issues and recommended `Pass with known risk`. The known risks—Node 24 not independently exercised, unvalidated hand-authored SourcePack records, unenforced module boundaries, build-only production CI, and unresolved licensing/provenance decisions—are recorded and outside the unchanged runtime surface.
- D-001 was accepted through the CEO’s 2026-08-19 directive to build the recommended serious-lay-reader journey. TASK-0003 makes the existing reflection -> source exploration -> return loop explicit without changing sources, AI, persistence, navigation, dependencies, or release configuration.
- TASK-0003 verification passed lint, its focused persistence benchmark, production build, documentation links, whitespace check, desktop and 390px mobile browser journeys, and independent re-review. The initial review found Explore’s labeled return action below the long source content; remediation placed it persistently in the dialog header. The build retains its existing large-chunk warning.
- D-005 authorizes a local-only, question-aware clarification iteration. It may use the existing observation type to preserve question intent, but it may not add a data schema, persist source/generative output, expand AI or source behavior, or release without a separate CEO approval.
- TASK-0004 implementation is complete in the local worktree: an explicit **Clarify this question** action preserves the existing `question` intent, automatically starts the existing deterministic passage-question flow, and shows inspectable sources before optional AI or deeper research. Notes retain the prior broad Explore ordering. The full quality gate and independent re-review passed; manual desktop/390px and source-failure journeys remain unverified because this environment has no browser target.
- Commit `4567ff7` was pushed to `main`; GitHub Actions run `32320568257` completed the Pages build and deployment successfully.
- Commit `882a093` was pushed to `main`; GitHub Actions run `33296068960` completed the question-aware clarification deployment successfully. The previously recorded manual browser gap remains a known risk, not a claim of browser verification.
- External roadmap research identified continuity of coherent reading as the next product gap. D-006 accepts one private Mark path, deliberately excluding a plan catalog, dates, notifications, streaks, accounts, social features, source growth, and AI expansion.
- TASK-0005 implementation is complete in the local worktree: the reader can explicitly start Mark, mark only the offered chapter read, continue privately, complete or restart, and include compatible progress in backup/restore. The full quality gate and independent review passed; interactive desktop/390px and restore journeys remain unverified because no browser target is connected.
- The CEO-reported comparison error maps directly to the former 20-second commentary-generation deadline. That deadline is inconsistent with a request containing up to three excerpts and a permitted 220-token, quotation-checked JSON response; TASK-0006 raises only this finite deadline while retaining explicit invocation, cancellation, engine cleanup, source scope, and audit rules.
- TASK-0006 focused benchmark, lint, production build, `git diff --check`, and `npm run check:full` passed. Independent review returned Pass with known risk: no supported WebGPU browser/device is connected for the required real-device journey.
- Commits `8b442b0` and `24d6799` were pushed under the CEO's specific 2026-08-31 authorization. GitHub Actions run `33438261622` completed the Pages build and deployment successfully. The known real-device verification gap remains explicit.

## Resource Position

- Active product writer: none; TASK-0013 upload/source publication complete, Apple status verification blocked. TASK-0011 is locally integrated; PR-04 awaits device evidence and PR-03 remains paused in Review.
- Exploration: current code, native shell, local data boundaries, and prior handoffs inspected on 2026-11-02.
- Review backlog: none; TASK-0014 quality/release review passed with known risk and no unresolved blockers. TASK-0012 feature review, TASK-0010 release delta review and TASK-0008 proof review also passed with known risk.
- Preserved work: the checkout contains existing uncommitted PR-03 implementation and coordination changes; they have not been discarded or committed.
- External actions: D-011 build 4 upload and native/docs scoped branch push executed. No new upload/action queued; read-only Apple processing/group verification remains. Main/Pages and paused web code remain unchanged. Material new cost: none.

## Shipped Since Previous Brief

- Native KJV reader internal TestFlight **1.0.0 (3)** on 2026-11-02: Apple processing VALID, internal state IN_BETA_TESTING, existing Exeges Testers group lists the build. See TASK-0009.

- Commit `4567ff7`: the operating-system layer and TASK-0003 reader reflection loop. GitHub Pages deployment run `32320568257` succeeded.
- Commit `882a093`: TASK-0004 question-aware passage clarification. GitHub Pages deployment run `33296068960` succeeded.

## CEO Checkpoint

Build4 upload and scoped source push succeeded after D-010 assessment, checks and independent review. Apple has not yet listed build 4; its direct status endpoint returned HTTP 500. Availability is unconfirmed, with no additional CEO approval needed for read-only rechecking. Physical iPhone/iPad and live VoiceOver inspection are the next CEO checkpoint once Apple confirms availability. Data migration remains deferred and existing material was not cleared. The next parity slice, later migration, broader distribution and future release actions remain separate decisions.

Release evidence is recorded in [TASK-0009](tasks/0009-native-reader-testflight.md); independent review in [TASK-0010](tasks/0010-review-native-testflight.md). Simulator coverage does not claim physical-device or older-runtime verification. Current dependency audit found four high web development-tool advisories and no production dependency vulnerabilities; no npm/web build is bundled in the native reader.
