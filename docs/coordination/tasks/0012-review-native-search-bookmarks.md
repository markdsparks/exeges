# TASK-0012: Independent Native Search And Bookmark Review

- **Role / owner:** Reviewer / independent delegated read-only reviewer
- **Task state:** Integrated
- **Delivery state:** Verified
- **Risk / reversibility:** Read-only; meaningful native retrieval/navigation and private bookmark persistence
- **Parent objective:** [TASK-0011](0011-native-search-bookmarks.md), D-009

## Objective

Independently verify search/bookmark implementation and available evidence against TASK-0011; return actionable findings and a clear verdict.

## Ownership Boundary

Read-only. Inspect new NativeScriptureSearch.swift, NativeBookmarks.swift, NativeReaderToolsView.swift; relevant NativeReaderModel/View additions and Xcode references; new focused checks/UI tests and documentation. No edits or concurrent simulator actions. Existing dirty web/Mark and prior accepted native proof are outside this delta except for integration compatibility.

## Dependencies

TASK-0011 domain/model/UI implemented; focused data checks and simulator cases may still be running at review start. Final verification must be reconciled by lead before integration.

## Interface Contract

Search is local KJV, matching-only, phrase-first, bounded/cancelable with stale-query protection. Bookmarks use a separate atomic versioned file; malformed/failed bookmark state must not erase material or block reading. Navigation/history/notes remain compatible. No migration, service, dependency, or release change.

## Acceptance Criteria

Assess correctness/relevance, async cancellation and stale results, persistence/failure isolation, exact-verse navigation/Back, bookmark discovery/removal, accessibility/layout and state coverage. Confirm unchanged corpus, reader schema, existing release and unrelated work.

## Verification

May run Foundation checks and inspect actual source/diff and `/private/tmp/exeges-native-tools-*` logs/screenshots. Do not run Xcode UI sessions concurrently with lead. State unavailable physical-device evidence honestly.

## Non-Goals

No writing, release/upload, unrelated web/source review or feature-scope expansion.

## Approval Gates

Return findings to lead. Any implementation requires an explicit role/ownership reassignment.

## Stop Conditions

Stop if inspection would touch actual private data, mutate source/external systems, or interfere with verification. Report missing evidence instead of declaring it passed.

## Required Handoff

Pass / Pass with known risk / Fail; prioritized evidence-backed findings with file/line/trigger/impact/repair; checks performed; remaining risks; integration recommendation.

## Initial Findings And Repair (2026-11-02)

Initial verdict: Fail pending repairs and full verification. Independent checks passed 78 assertions. P2 findings: context-menu bookmark write failure was not displayed on the reader; noncanonical keys such as `genesis-01-1` loaded but could not be marked/removed; native search activation hid its toolbar Done action. Repairs add reader bookmark-error display, exact canonical key validation with preservation coverage, and a persistent Return to Reading inset. The updated 81-assertion Foundation suite passed independently. Re-review found no further source issues; UI/Release/final visual evidence remains pending.

A further UI regression reproduced rapid close/reopen failure while results arrived. Moving close ownership to the parent was insufficient; the conditional Group had applied search/task/inset modifiers to changing branches. A persistent full-size ZStack now owns those modifiers, keeping search/controller/action identity stable. The focused replacement/dismiss/reopen test passed, followed by a complete eight-case iPhone pass. Explicit neutral secondary excerpt color still measured below body-text contrast; final Scripture excerpts now use Color.primary, with targeted screenshot checks pending. No retrieval or persistence behavior changed in that final color adjustment.

## Final Independent Review (2026-11-02)

**Pass with known risk. Recommend local integration. No unresolved findings.** All findings are closed: canonical bookmark validation, visible context-menu save failures, reliable search dismissal/reopening, and readable Scripture excerpts. The Reviewer inspected final screenshots on both devices and found clear contrast, usable controls, and appropriate keyboard/sheet layout.

The Reviewer independently ran all 81 Foundation assertions; reconciled the iPhone 8/8 broad pass, iPad six-pass/two keyboard-focus automation failures, and final 3/3 targeted pass on each device after the helper correction; inspected Debug/Release and repository-check evidence, native whitespace, and unchanged corpus/services/workflows/release settings. The final targeted runs cover dark search, large text/bookmarks and query replacement/dismissal. Exact artifacts and durations are in [TASK-0011](0011-native-search-bookmarks.md#integrated-handoff-2026-11-02).

Search relevance/cancellation, exact-verse navigation/Back, bookmark persistence/recovery and reader/notes isolation satisfy local acceptance. Residual uncertainty is physical-device, older-runtime and live VoiceOver behavior. This review authorizes no release. The Reviewer made no source or coordination edits; lead reconciled the record and integrated locally.
