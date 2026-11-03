# TASK-0011: Native Scripture Search And Bookmarks

- **Role / owner:** Implementer / repository lead
- **Task state:** Integrated
- **Delivery state:** Integrated locally; not shipped
- **Risk / reversibility:** Medium; native search UI and new isolated bookmark document; existing native reader/notes state unchanged
- **Parent objective:** CEO 2026-11-02 directive to wire existing features into native, followed by explicit selection “Search and bookmarks first”

## Objective

Find KJV passages by words/phrase, open a result at its verse and return to the prior reading place; privately save, revisit, and remove verse bookmarks through native screens.

## Ownership Boundary

One writer: lead. May add native search/bookmark domain and UI files under `native/ios/ExegesApp/`, wire them through NativeReaderModel/View and the Xcode project, extend native focused checks/UI tests, and update relevant native/coordination/architecture docs. Preserve unrelated dirty web/Mark work, corpus, services, signing/version/release configuration, existing notes/settings/resume behavior, and web storage. No commit, push, upload, migration, or release is included.

## Dependencies

Native TestFlight reader build 3 + CEO basic-device success report -> search/bookmark contracts -> pure domain and separate bookmark store -> model/native UI -> focused checks/simulator journeys -> independent TASK-0012 review -> local integration.

## Interface Contract

- Canonical existing corpus IDs and one-based references; KJV-only, entirely local. No new source or content.
- Search accepts words/phrase with a meaningful term of at least two normalized characters, ignoring case/punctuation/apostrophe differences. Rank only matching verses; use phrase/all-term/occurrence relevance and existing passage context, with canonical tie order. Return at most 60 hits plus total match count; never show nonmatches due solely to context bonuses.
- Build immutable index once; execute searches away from the main UI, debounce typing, cancel superseded/dismissed work, and never display results for an older query. Search text/results are not persisted or sent to a service.
- Opening a result uses existing native navigation/history and verse scroll recovery. Search navigation errors remain visible in the sheet.
- Bookmarks use a separate version-1 JSON document beside the native reader file. Records map canonical verse keys to nonnegative millisecond timestamps. Missing document starts empty; malformed/future/invalid data fails closed without overwrite. Atomic write precedes publication. Existing reader-state-v1 JSON and web backup keys/schema remain unchanged.
- Bookmark load failure disables bookmark changes and exposes a local retry while Scripture, notes, appearance and resume remain usable. Toggle/removal affects bookmarks only; no note/position mutation. Do not migrate existing web bookmarks.
- Quiet reading stays primary: menu search/bookmark list, verse context action and a bookmark action in the existing verse note sheet, plus a subtle saved marker. The list opens the exact verse and supports explicit removal, empty/error/recovery states.

## Acceptance Criteria

- Native KJV search returns relevant bounded results, handles short/empty/no-match queries, and rejects stale results after typing/closing.
- Opening a hit shows the matching verse; Back restores the original visible passage.
- Reader can add/remove a bookmark, see its marker, reopen it from My Bookmarks after restart, and continue ordinary reading/notes normally.
- Bookmark corruption/write failures are visible and preserve existing data. Reading remains usable when bookmarks cannot load.
- Phone/tablet sheets, keyboard, Dynamic Type, safe areas, scrolling, dismissal and navigation remain usable.
- Existing TestFlight build remains unchanged until a separately authorized release.

## Verification

Extend Foundation checks for real-corpus search normalization/relevance/limits/order/cancellation and bookmark validation/atomic write/reload/failure/corruption/isolation. Native Debug/Release compile; relevant prior reader/navigation/note regressions plus new search/bookmark success/empty/error/recovery/restart/back journeys on iPhone/iPad, including large text/keyboard/screenshots. `npm run check`, docs/whitespace/corpus diff checks, independent TASK-0012 review. Physical-device verification of these additions remains unavailable until later release/testing; prior basic CEO report does not certify new features.

## Non-Goals

ESV, study/commentary/AI, reference-query parser or advanced search syntax, Mark path, web/native data transfer, export/sync, analytics, new dependency/provider/content, major reader redesign, commit/push/upload.

## Approval Gates

CEO has explicitly selected search/bookmarks within native parity work. Escalate source/translation/model/service changes, destructive or incompatible migration, major new workflow, dependencies, and any release/external action. Keep the existing reader schema unchanged by using the separate bookmark store.

## Stop Conditions

Stop if query processing requires network/provider work, bookmark persistence could overwrite reader/web data, existing corpus must change, background results cannot be made cancellation-safe, or scope expands into unapproved study/translation/migration/release work.

## Required Handoff

Outcome and visible behavior; files/interfaces/storage changed; exact checks/review and evidence; assumptions/decisions; risks/unverified states; local integration/release notes; next bounded action.

## Integrated Handoff (2026-11-02)

Native Search Scripture and My Bookmarks are wired into the reader. Search opens the exact verse and Back restores the prior visible passage. Bookmarks can be saved from a verse context menu or note sheet, reopened after restart, and removed from the list. Empty, no-match, retry, failed-save and large-text states are covered. The final persistent search container fixes close/reopen behavior while results change; Scripture excerpts use the primary text color in light/dark appearance.

New implementation files: `NativeScriptureSearch.swift`, `NativeBookmarks.swift`, and `NativeReaderToolsView.swift`. Integration touches NativeReaderModel/View, Xcode source references, Foundation/UI checks, and native/architecture/coordination documentation. No dependency was added. Bookmark storage is separate and atomic; reader-state-v1, web data, corpus, signing and build version are unchanged. Search admits verses matching at least one meaningful term, ranks exact phrase/all terms first, and caps the displayed list at 60 while showing the total.

Verification evidence:

- Foundation checks: 81 assertions passed, independently repeated by TASK-0012. Covers all 31,102 verses, matching/relevance/order/limits/cancellation and bookmark validation, reload, failed writes, isolation and corrupt/future-file preservation.
- Native Debug and final Release builds passed. Final Release log: `/private/tmp/exeges-native-tools-release-verified.log`.
- iPhone 17 / iOS 27: broad eight-case run passed 8/8 in 206.340s; `/private/tmp/exeges-native-tools-iphone-final.xcresult`.
- iPad Air 11 / iOS 27: broad run passed six of eight cases in 209.071s; two failed because the automation did not refocus the search field after clearing it. The helper now re-taps the field before typing; assertions were retained. `/private/tmp/exeges-native-tools-ipad-final.xcresult` records that initial result.
- Final targeted runs passed 3/3 on both iPhone (79.104s) and iPad (88.298s), covering dark search/open/Back/empty recovery, light accessibility-size search/bookmarks, and rapid replacement/close/reopen. These cover both previously failed iPad cases. Final bundles: `/private/tmp/exeges-native-tools-iphone-visual.xcresult` and `/private/tmp/exeges-native-tools-ipad-visual.xcresult`. This is aggregate journey coverage, not a claim of a single green eight-case iPad run.
- Final screenshots in `/private/tmp/exeges-native-tools-iphone-final-images` and `/private/tmp/exeges-native-tools-ipad-final-images` inspected by lead and Reviewer: readable Scripture, persistent close action, usable sheet/keyboard/scrolling at normal and accessibility text sizes.
- `npm run check` passed (documentation links, lint, source generation, web production build). Documentation and whitespace checks passed; corpus and unrelated web/Mark work remain unchanged by this task.
- Independent [TASK-0012](0012-review-native-search-bookmarks.md): **Pass with known risk**, no unresolved findings; local integration recommended.

Physical-device, older-runtime and live VoiceOver behavior remain unverified. Existing data migration/export/sync remain deferred. No commit, push, upload, release or external configuration change occurred; shipped TestFlight remains 1.0.0 (3). The next bounded action is a separately authorized internal TestFlight build for device inspection before choosing the next parity feature.
