# TASK-0008: Independent Native Reader Proof Review

- **Role / owner:** Reviewer / delegated read-only reviewer
- **Task state:** Integrated
- **Delivery state:** Integrated
- **Risk / reversibility:** Read-only; meaningful native interaction and private-data behavior require independent verification
- **Parent objective:** [TASK-0007](0007-native-reader-proof.md) and D-007

## Objective

Independently review the bounded native reader implementation, preservation plan, and available verification evidence against TASK-0007. Return actionable findings and Pass, Pass with known risk, or Fail.

## Ownership Boundary

Read-only. Inspect new native reader/data/model/UI/tests, the iOS project/shared scheme, entry change, native README/preservation plan, ADR-0002, and related coordination updates. No edits. Existing dirty web/Mark-path changes are preserved and outside this review except for compatibility evidence.

## Dependencies

TASK-0007 implementation and focused native-data checks; Debug simulator build passed; UI and Release checks may still be running when review starts. Repository lead reconciles final evidence before integration.

## Interface Contract

Review the actual source and diff against the TASK-0007 interfaces and accepted ADR. No new product intent or architecture may be introduced by the Reviewer. Tests may use isolated temporary storage; do not mutate real app data or run concurrent simulator sessions.

## Acceptance Criteria

Check scope, native behavior, reference/navigation correctness, restart recovery, save failure handling, note privacy/data integrity, accessibility/layout risks, error/recovery paths, web/Release compatibility, and migration-plan accuracy. Verify that the unchanged corpus and release/signing controls remain preserved.

## Verification

Read the actual changes and surrounding contracts. May run `bash native/ios/Tests/check-reader.sh` and read Xcode/UI-test logs under `/private/tmp/exeges-native-*`. Coordinate any additional native UI verification with the lead. Treat unavailable physical-device/migration evidence explicitly.

## Non-Goals

No implementation, edits, feature expansion, deployment, commit, push, or unrelated web review.

## Approval Gates

Return findings to the lead; any writing assignment requires a new role and ownership contract.

## Stop Conditions

Stop if verification would touch real private data, require external actions, or conflict with the lead's active simulator work. Report missing evidence rather than treating it as a pass.

## Required Handoff

Clear verdict; prioritized findings with file/line evidence, trigger/impact and repair recommendation; checks performed; residual risks; integration recommendation.

## Initial Review And Repairs (2026-11-02)

Initial verdict: **Fail pending fixes and UI evidence**. Independent source review and 33 original Foundation assertions passed, and both Debug and Release compiled. The Reviewer identified three P2 items: the My Notes sheet lacked a working Done action; note-list navigation failures hid the save error behind the sheet; and selected/restored visible-verse behavior lacked passing evidence.

Repairs attach the notes title/toolbar to navigation content and show save failures inside the notes sheet. A DEBUG-only, UUID-isolated write-failure fixture exercises failed note-list navigation and note Save without affecting actual private data. Unique passage-option identifiers removed ambiguous background-number test matches. Subsequent screenshots established a real initial-scroll defect: Mark 4 was selected correctly, but the viewport remained at verse 1. The reader now issues an explicit scroll after the chapter enters layout and avoids persisting the initial viewport over the requested verse.

Focused iPhone navigation/restart/back/background rerun passed with actual saved-verse visibility assertions (`exeges-native-iphone-navigation-4.xcresult`). Complete iPhone/iPad evidence and final independent re-review are still required before integration.

A second review identified a real final-verse deadlock: when the requested verse could not reach the top because scrolling clamped at chapter end, `pendingVerse` suppressed subsequent position updates. A failing Genesis 1:31 scenario reproduced it. Viewport-derived trailing space, accounting for the verse row's 44-point minimum height, now permits the final verse to reach the resume anchor. The actual short-chapter journey (Psalms 117:2 -> scroll to verse 1 -> relaunch with verse 1 visible) passed on iPhone.

Visual review also found insufficient contrast for the fixed brown toolbar tint in dark appearance. The tint now adapts to dark paper; specified tint/paper contrast is 8.81:1 dark and 5.59:1 light. In compact height the redundant chapter heading is omitted so very large reading text has room below the passage toolbar. Final targeted layout screenshots/checks and final review remain prerequisites to integration.

## Final Review Handoff (2026-11-02)

**Pass with known risk — ready for local integration of the bounded proof.** No unresolved source findings remain. The independent Reviewer inspected the final source and evidence, reran all 34 Foundation assertions, confirmed whitespace/corpus/release controls, and verified six passing iPad cases plus aggregate passing iPhone evidence and the final targeted dark/large-text/landscape case. The notes, scrolling, final-verse, contrast, and compact-height findings are resolved.

The Reviewer explicitly retained physical-device accessibility/performance, actual upgrade/data continuity, full migration/import/export, corpus provenance/licensing, and explicit CEO cutover/release authorization as later gates. Simulator evidence does not establish those. The repository lead accepted the review and integrated the bounded proof locally without committing or releasing.
