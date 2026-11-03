# TASK-0007: Native Reader Proof

- **Role / owner:** Implementer / repository lead
- **Task state:** Integrated
- **Delivery state:** Integrated
- **Risk / reversibility:** Medium; native entry and new isolated local storage, with existing web storage and Release shell preserved
- **Parent objective:** [D-007](../DECISION_INBOX.md#d-007-fully-native-app-iphone-and-ipad-first), accepted through the CEO's 2026-11-02 “ok build” following the proposed SwiftUI reader proof

## Objective

On iPhone and iPad, read the existing KJV corpus through native screens, navigate to a book/chapter/verse, adjust typography, save a private verse note, and return to the same verse after restart. Establish an explicit preservation plan before replacing the hosted-web shell.

## Ownership Boundary

Repository lead is the only writer. May edit `native/ios/ExegesApp/`, `native/ios/Exeges.xcodeproj/`, `native/ios/README.md`; add focused native checks under `native/ios/Tests/` and `native/ios/ExegesUITests/`; update relevant architecture, decisions, operating-system, and coordination documentation. Reference the existing `src/data/bible.json` as a build resource without modifying or duplicating its content. Do not alter the existing web feature changes, sources, proxy, dependencies, signing, identifiers, release script, or CI.

## Dependencies

D-007 platform direction and bounded build approval -> native domain/store and corpus resource -> native UI -> focused checks and simulator evidence -> independent review -> local integration. Existing note/reference and backup contracts inform the preservation plan; no production schema is migrated.

## Interface Contract

- Keep canonical book IDs and one-based chapter/verse references compatible with the web corpus.
- KJV text comes only from the existing corpus; paragraph markers may be displayed without changing the resource. No new content or rights claim.
- Native proof uses a versioned JSON file in a separate Application Support directory. Atomic write succeeds before publishing saved state. Corrupt/unsupported state must not be silently overwritten. Local note deletion requires an explicit action.
- Preserve position as book/chapter/verse and restore scroll to that verse. Chapter movement crosses book boundaries safely; invalid references cannot mutate state.
- Debug defaults to the native proof. Release keeps the hosted-web shell. Existing shell remains accessible during the proof; its website storage is never removed or migrated automatically.
- This slice supports KJV only; it must visibly identify KJV and must not silently claim to honor a prior ESV selection.
- Existing backup version 1 remains unchanged. Document a later additive import, staged data mapping, and validation/rollback gates; no lossy partial import in this proof.

## Acceptance Criteria

- Fresh offline launch can display readable KJV text without website, model, or source fetches.
- Native book/chapter/verse picker and previous/next chapter controls work, including book boundaries and Bible endpoints.
- Reader restores visible verse and selected passage after scrolling, navigation, backgrounding, and process restart.
- Native appearance controls adjust font size and theme with Dynamic Type, safe areas, keyboard, and iPad widths supported.
- A verse has an accessible note action; explicit Save persists nonempty user writing, Cancel preserves it, and explicit Delete removes it. Persistence errors remain visible and do not falsely report success.
- Missing corpus and unreadable/corrupt/incompatible state expose a recovery path without deleting private data.
- Current shell, web storage, uncommitted Mark work, release entry, signing, and deployment behavior remain preserved.
- Existing-data preservation plan distinguishes automatic in-app WebKit migration from user-managed backup import and identifies unsupported features and release gates.

## Verification

- Compile/run focused Swift domain/store checks against the real corpus: navigation, reference validation, atomic persistence/reload, notes/settings, malformed/versioned state, and write failures.
- Unsigned simulator build, plus unsigned Release compilation to verify the shell entry remains buildable.
- Simulator UI journeys on iPhone and iPad: navigation, scroll/resume, note Save/Cancel/Delete/relaunch, typography, theme, keyboard, safe areas, and load/error recovery. Capture screenshots and explicitly identify unavailable device evidence.
- `npm run check`, `git diff --check`, corpus diff inspection, and independent read-only review under TASK-0008. No dependency audit is needed for unchanged dependencies and no release-readiness claim.

## Non-Goals

ESV port, Scripture text search, bookmarks, study/commentary/AI port, reading-path port, sync/accounts, telemetry, automatic migration, full feature parity, new dependencies, corpus provenance resolution, production changes, commit, push, or upload.

## Approval Gates

CEO approval before expanding the proof, changing web contracts/data, enabling the native proof as Release default, importing existing private data, replacing licensed-content services, adding dependencies/AI, signing changes, or external release actions.

## Stop Conditions

Stop and escalate if the corpus must change, private data could be overwritten, existing web work would be lost, a new service/dependency is necessary, or external release is required. Investigate changed evidence after repeated similar failures. Record any simulator/device limitations honestly.

## Required Handoff

Outcome and visible behavior; files/interfaces/data changed; exact checks and results; decisions/assumptions; risks/limitations; integration/migration/release notes; next bounded action.

## Implementation And Integration Handoff (2026-11-02)

- **Outcome:** The Debug app now opens a native SwiftUI KJV reader on iPhone and iPad. Native passage selection, adjacent chapters/book boundaries, in-session passage Back, private verse notes (Save/Cancel/Delete), notes list, font size/theme, Dynamic Type, compact-height layout, and verse-level restart/background recovery are implemented. Scripture loads from the bundled existing corpus without a website request.
- **Changed files/interfaces:** Added `NativeReaderData.swift`, `NativeReaderModel.swift`, `NativeReaderView.swift`; changed the Debug entry in `ExegesApp.swift`; added corpus resource references, shared scheme and native UI test target; added Foundation checks and native UI journeys. Native state is an isolated version-1 JSON document; existing web keys, backup envelope, Bible resource content, ESV/source/model behavior, signing/production identifiers, release script, and deployment workflow remain unchanged. No third-party dependency was added.
- **Data preservation:** [The plan](../../../native/ios/DATA_PRESERVATION.md) inventories existing material, maps compatible references/notes/preferences, distinguishes in-app WebKit extraction from user-selected backup import, and defines additive/staged verification and recovery gates. Actual import/export/migration is not implemented. Existing app material and native preview notes do not sync.
- **Focused verification:** `bash native/ios/Tests/check-reader.sh` passed **34 assertions**, including all 66 books / 1,189 chapters / 31,102 verses, reference and book endpoints, disk round trips, notes/settings, explicit deletion, invalid/future/corrupt state, actual filesystem failures, and no false publication after failed writes. The Reviewer independently repeated this check.
- **Native build evidence:** Unsigned Debug simulator builds and the final generic Release simulator build passed using Xcode 27.0. Release still enters the existing shell. The copied app corpus matches `src/data/bible.json` byte-for-byte. Xcode project plist syntax passed. The only build warning noted was skipped AppIntents metadata extraction because the app has no AppIntents dependency.
- **iPhone evidence:** iPhone 17 / iOS 27.0 simulator: five cases passed in `exeges-native-iphone-verified.xcresult`; the appearance case's native accessibility selector was corrected and passed separately. The final large-text, dark-mode, compact-landscape, and persisted-appearance check passed in `exeges-native-iphone-visual-final.xcresult` (31.963 seconds). This is aggregate passing evidence for six journeys, not a claim that the original full run was green.
- **iPad evidence:** iPad Air 11-inch (M4) / iOS 27.0 simulator: all **six UI tests passed**, zero failures, in `exeges-native-ipad-complete.xcresult` (188.751 seconds). Journeys cover navigation/visible resume, actual short-chapter final-verse scroll/restart, notes and keyboard, empty notes, large text/appearance, missing corpus/retry/recovery, and injected save failures. Later compact-height/tint adjustments were verified with the targeted iPhone run; regular-height reader behavior was unchanged.
- **Other checks:** `npm run check` passed documentation validation, lint, source generation, and web production build. Final documentation/whitespace checks passed after handoff reconciliation. Source generation introduced no tracked corpus/generated-data change. Existing large web chunk warnings remain baseline. Dependency audits were not run: no dependency or release-readiness work was included.
- **Review and repair:** [TASK-0008](0008-review-native-reader-proof.md) returned **Pass with known risk** after resolving the missing notes Done action, hidden sheet errors, initial scroll positioning, final-verse position tracking, dark toolbar contrast, and compact-height reading space. There are no unresolved implementation findings for this proof.
- **Integration:** Locally integrated in the shared checkout; no commit, push, deployment, signing change, TestFlight upload, Release cutover, or website-data migration. The pre-existing dirty Mark-path/web changes are preserved and remain paused in Review.
- **Limits / release gates:** No physical-device or iOS 17 runtime evidence, full VoiceOver audit, or realistic large-data performance check. ESV, Scripture text search, bookmarks, study/source/AI, Mark path, complete transfer/import/export, and sync remain outside this native slice. Corpus provenance/licensing, physical-device upgrade/data continuity, and explicit CEO cutover/release approval remain required before replacing/distributing the app.
- **Next bounded action:** Inspect this native reader on physical iPhone and iPad before accepting the next parity/migration contract.
