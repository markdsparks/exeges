# Exeges Module Map

- **Owner:** Repository lead
- **Status:** Current logical boundaries; proposed physical migration is unapproved
- **Last verified:** 2026-08-19
- **Related plan:** [Operating-system adoption](../operating-system/adoption-plan.md)

Exeges is currently one React/Vite package. These are capability boundaries inside that package, not workspace packages. Preserve the current deployment shape while making interfaces and dependency direction clearer. A path listed under a module is its present implementation area, not blanket permission for a worker to edit it.

## Allowed Dependency Direction

```text
App composition
  -> feature components
  -> UI-facing hooks and integration adapters
  -> domain libraries
  -> committed/generated data contracts

Study presentation
  -> study core
  -> scripture/source contracts
  -> explicit commentary, translation, and local-model adapters

Source tools
  -> source contracts
  -> generated artifacts
```

Domain libraries must not import React components. Feature components should not import another feature's internal component. External-service, persistence, and model details should remain behind explicit adapters. `App.jsx` composes capabilities; it should not become the permanent owner of their internal rules.

## 1. Application Composition

**Purpose:** Bootstrap React and coordinate top-level reader, overlays, history, study, translation, backup, and navigation.

**Current paths:** `src/main.jsx`, `src/App.jsx`, `src/App.css`, `src/index.css`.

**Public interface:** The default `App` component mounted by `main.jsx`.

**Owned data and invariants:** Ephemeral top-level view state and capability composition. URL references take precedence over saved reading position. Composition must preserve browser history, overlays, and the return path from study to reading.

**Allowed dependencies:** Feature components, hooks, and public domain/integration functions. It may wire capabilities together but should not duplicate their validation or persistence rules.

**Verification:** `npm run check`; relevant navigation, reading-position, backup, and personal-thread checks; manual reader/study/back journeys for behavioral changes.

**Architecture review required when:** Adding another cross-feature responsibility, changing routing/history, changing persisted-data orchestration, or moving capability rules into the shell.

## 2. Reader And Navigation

**Purpose:** Display Scripture and move predictably among books, chapters, verses, history entries, and saved reading position.

**Current paths:** `src/components/Reader/`, `src/components/Navigation/`, `src/lib/readerNavigation.js`, `src/lib/readingPosition.js`, `src/hooks/useBibleData.js`.

**Public interface:** Reader/navigation components; `getAdjacentChapters`, `getChapterSwipeIntent`, `shouldConfirmChapterSwipe`; `normalizeReadingPosition`, `parseReadingPosition`, `serializeReadingPosition`, `sameReadingPosition`; `READING_POSITION_STORAGE_KEY`.

**Owned data and invariants:** Canonical book/chapter/verse identity, URL-compatible navigation, confirmed chapter swipes, and the legacy-compatible `exes-position` storage value. A valid URL reference overrides saved position.

**Allowed dependencies:** Scripture data and pure navigation/reference logic. Reader UI may open notes or study through callbacks supplied by composition; it should not own those feature stores.

**Verification:** `npm run bench:reader-navigation`; `npm run bench:reading-position`; `npm run check`; manual mobile scrolling, swipe, safe-area, URL refresh, and back navigation.

**Architecture review required when:** Changing URL shape, storage keys, scroll/resume semantics, gesture thresholds, or KJV loading strategy.

## 3. User Library And Preferences

**Purpose:** Manage private bookmarks, notes, study writing, reading position, theme, font size, translation preference, and user-controlled backup/restore.

**Current paths:** `src/hooks/useBookmarks.js`, `useNotes.js`, `useStudies.js`, `useTheme.js`, `useTranslation.js`; `src/lib/userBackup.js`, `personalStudyThreads.js`; related navigation and note components.

**Public interface:** Hook return contracts; backup constants and `createUserBackup`, `parseUserBackup`, `mergeUserBackup`, `getUserBackupCounts`, `applyUserBackupTransaction`; personal-thread query helpers.

**Owned data and invariants:** Existing local-storage keys and saved object shapes; additive restore; local notes win conflicts; bookmarks and distinct observations combine; restore is transactional; ESV wording and selections are excluded from exported long-lived data; invalid or oversized backups fail safely.

**Allowed dependencies:** Pure normalization/reference helpers and translation identifiers. UI consumes hook APIs; backup code must not reach into rendered components.

**Verification:** `npm run bench:user-backup`; `npm run bench:personal-study-threads`; `npm run bench:reading-position`; `npm run check`; manual export, invalid import, conflict, rollback, and cross-device restore flows when behavior changes.

**Architecture review required when:** Changing keys or schemas, conflict policy, backup format/version, ESV redaction, storage location, sync/accounts, retention, or privacy promises.

## 4. Scripture And Translation Access

**Purpose:** Expose local KJV content and remote ESV passage/search access without leaking credentials or persisting licensed text.

**Current paths:** `src/data/bible.json`, `src/lib/translations.js`, `chapterTranslation.js`, `src/hooks/useBibleSearch.js`, `useTranslation.js`, `workers/esv-proxy.js`.

**Public interface:** `TRANSLATIONS`, `DEFAULT_TRANSLATION_ID`, `getTranslationById`, `getEsvProxyUrl`; `createLocalChapter`, `loadTranslationChapter`; search hook results; the Worker's query/JSON response contract described in [the contract registry](contracts/README.md).

**Owned data and invariants:** KJV is local; ESV requests cross the Worker; the API token never reaches the browser; ESV text is not committed, backed up, or stored long-term; translation identity stays explicit in UI and saved user writing.

**Allowed dependencies:** Scripture/reference contracts and explicit network adapters. Study code may request chapter text through the adapter, not call the ESV API directly.

**Verification:** `npm run check`; focused KJV/ESV success, setup-needed, empty, error, abort, refresh, and search checks; Worker request/CORS/error checks without real tokens in fixtures.

**Architecture review required when:** Adding a translation, changing proxy payloads or providers, caching/persistence, licensing or attribution, origin/rate/logging policy, or secret handling.

## 5. Study Core And Grounding

**Purpose:** Turn a selected passage and the reader's own observation/question into passage-first, source-visible evidence and bounded deterministic or optional model-assisted output.

**Current paths:** `src/lib/studyMethod.js`, `backgroundGuides.js`, `localStudyGrounding.js`, `studySynthesisRequest.js`, `groundedStudyDraft.js`, `localStudyDraftAudit.js`, `passageQuestion.js`, `commentaryComparison.js`; `src/components/Study/`.

**Public interface:** Selection/reference helpers; grounding retrieval; synthesis request construction; deterministic draft and audit; passage-question packet construction; commentary selection, overview, request, and normalization functions.

**Owned data and invariants:** The selected passage is primary. Retrieval must remain anchored to the requested passage/scope. Every sourced claim retains source identity and inspectable evidence. Deterministic results precede optional model passes. Comparison groups require exact quotations from multiple named selected sources; unsupported model claims are rejected or downgraded.

**Allowed dependencies:** Scripture/reference contracts, source contracts, commentary adapter, and optional model adapter. Presentation may call study interfaces; core logic must not depend on React or browser overlays.

**Verification:** Study-source, study-synthesis, commentary-comparison, public-commentary, and personal-thread benchmarks; `npm run check`; representative evidence/output inspection; mobile/desktop Explore and return-to-reading journeys.

**Architecture review required when:** Changing evidence schemas, retrieval scope, prompt/audit contracts, citation validation, editorial rules, source classes, supported AI behavior, or the legacy/current study relationship.

## 6. Commentary Adapter

**Purpose:** Fetch, normalize, identify, attribute, and temporarily cache public-domain commentary and open-licensed Tyndale study notes from HelloAO.

**Current paths:** `src/lib/publicCommentary.js`; commentary portions of `commentaryComparison.js` and study presentation.

**Public interface:** `PUBLIC_COMMENTARY_SOURCES`, `cleanPublicCommentaryText`, `loadPublicCommentary`.

**Owned data and invariants:** Every source retains label, type, coverage, license, attribution, source link, and license link where applicable. Tyndale is labeled study notes and CC BY-SA 4.0, not public-domain historical commentary. Network text is cleaned before display and is not added to persistent study packs.

**Allowed dependencies:** Fetch and pure normalization. Study core consumes normalized findings; UI does not construct source metadata independently.

**Verification:** `npm run bench:public-commentary`; `npm run bench:commentary-comparison`; network success, partial availability, empty, abort, and error states when behavior changes.

**Architecture review required when:** Adding/replacing a source or provider, bulk importing text, changing attribution/license display, caching persistently, or treating a source as editorial authority.

## 7. Local Model Runtime

**Purpose:** Run optional, explicitly requested on-device synthesis while keeping model loading lazy, bounded, cancelable, and subordinate to supplied evidence.

**Current paths:** `src/lib/localStudyModels.js`, `localStudySynthesis.js`, `src/workers/studySlm.worker.js`.

**Public interface:** Capability/model lookup, deadline/cancellation functions, draft parsers/normalizers, and the two explicit synthesis entry points.

**Owned data and invariants:** No model load before explicit reader action; one bounded worker/engine lifecycle; deadlines and cancellation; supplied evidence only; experimental labeling; deterministic audit of returned structures.

**Allowed dependencies:** Study request/evidence contracts and WebLLM adapter. Product components use explicit synthesis functions and must provide source-visible fallback behavior.

**Verification:** `npm run bench:study-synthesis`; `npm run bench:commentary-comparison`; runtime loading, cancellation, timeout, retry, refusal, invalid output, and memory recovery checks on supported devices.

**Architecture review required when:** Changing model/provider, bundle/loading behavior, device support, privacy promise, prompt evidence boundary, runtime cost, or supported-product status.

## 8. Study Source Pipeline

**Purpose:** Validate curated/raw records and generate deterministic bundled fallback data plus versioned static chapter packs.

**Current paths:** `sources/study/`, `scripts/import-openbible-cross-references.mjs`, `build-study-source-pack.mjs`, `src/data/studySourcePacks.js`, `generatedStudySourceChunks.js`, ignored `public/study-packs/`.

**Public interface:** SourcePack records and metadata documented in [the curated source plan](../curated-source-plan.md); `STUDY_SOURCES`, `STUDY_SOURCE_PACK_VERSION`, and `STUDY_SOURCE_CHUNKS`.

**Owned data and invariants:** Valid source IDs, route IDs, references, delivery modes, license/attribution, confidence, review status, and allowed use; ESV text excluded; generation deterministic from committed inputs; OpenBible bulk records stay out of the JavaScript fallback.

**Known exception:** Nine hand-authored chunks in `src/data/studySourcePacks.js` bypass SourcePack v2 generation and omit some required provenance/review fields. Preserve compatibility, do not add to the bypass, and move them through the validated path only in an approved contract task.

**Allowed dependencies:** Structured input parsers and source-contract definitions. Runtime study logic consumes generated/public interfaces rather than raw imports.

**Verification:** `npm run bench:study-sources`; `npm run build`; generated-diff inspection; provenance/license review for source changes.

**Architecture review required when:** Changing schema/version, generation/delivery strategy, source registry, licensing/allowed use, adding copyrighted content, or bypassing validated ingestion.

## 9. Platform And Release

**Purpose:** Build and distribute the web app, protect the ESV boundary, and wrap the approved hosted experience for iOS.

**Current paths:** `vite.config.js`, `.github/workflows/deploy-pages.yml`, `workers/esv-proxy.js`, `native/ios/`, `scripts/exeges-testflight.sh`.

**Public interface:** Vite `/exeges/` build output, configured ESV proxy URL, GitHub Pages URL, iOS shell navigation/loading behavior, and the authorized TestFlight command.

**Owned data and invariants:** A `main` push deploys Pages; the iOS Existing Exeges fallback loads that mutable hosted app, while default native reading is bundled; credentials/signing stay outside source; TestFlight upload and infrastructure changes require explicit approval.

**Allowed dependencies:** Production artifacts from the web build and explicitly configured endpoints. Release automation must not become a source of product intent.

**Verification:** `npm run check`; preview/smoke checks; dependency audits for release readiness; Worker checks; Xcode build and real-device behavior for native changes.

**Architecture review required when:** Changing build base, workflow triggers/permissions, Pages approval policy, Worker deployment, native host/scheme policy, release channel, signing, or App Store behavior.

## 10. Native Reader Proof

**Purpose:** Prove native iPhone/iPad Scripture reading, navigation, a private note, appearance, and restart recovery under [ADR-0002](../decisions/0002-native-reader-proof.md), without replacing the current release.

**Current paths:** `native/ios/ExegesApp/NativeReaderData.swift`, `NativeReaderModel.swift`, `NativeReaderView.swift`; native `Tests/` and `ExegesUITests/`.

**Public interface:** Canonical book/chapter/verse references; unchanged KJV corpus decoded as a build resource; version-1 native reader state; explicit save/delete/navigation/appearance operations. Debug and Release open native reading under ADR-0003; Existing Exeges remains a hosted fallback.

**Owned data and invariants:** Separate Application Support state document; validated references, font/theme and note records; atomic persistence before publishing success; unreadable/future data left untouched; website storage never cleared or migrated. The native document is not a web backup and does not change its version or keys. See [the preservation plan](../../native/ios/DATA_PRESERVATION.md).

**Allowed dependencies:** Apple SwiftUI/Foundation and the existing corpus resource. Pure native data/session code has no UI or website-storage dependency. No new service, model runtime, account, analytics, or third-party dependency.

**Verification:** Foundation corpus/store checks, Debug/Release builds, iPhone/iPad UI journeys, screenshots, independent review, and real-device evidence before release. Native tests supplement the existing web checks.

**Architecture review required when:** Changing storage version, importing website/backup data, adding ESV/study/AI, changing the Release entry or release topology, adding a persistence/service dependency, or extending the privacy promise. Current proof approval does not authorize those later phases.

## 11. Native Search And Bookmarks

**Purpose:** Restore local Scripture discovery and private verse recall in the native reader under [TASK-0011](../coordination/tasks/0011-native-search-bookmarks.md).

**Paths / interfaces:** `NativeScriptureSearch.swift` owns immutable index, normalization, phrase-first matching, bounded response, and cancellation. `NativeBookmarks.swift` owns canonical verse-key/timestamp records, separate versioned atomic storage and mutations. `NativeReaderToolsView.swift` owns native search/bookmark sheets; NativeReaderModel coordinates loading/navigation and explicit save failures.

**Invariants:** KJV corpus unchanged; no request or source text persisted; no query network/telemetry; no context-only nonmatches; no stale-query UI; maximum 60 displayed hits with honest total; existing verse/history contract. Separate bookmark storage cannot overwrite native reader/web data; malformed/noncanonical/future state fails closed without blocking reading. Bookmark failure is visible in the originating screen, including verse context menus.

**Dependencies / checks:** Apple Foundation/SwiftUI and native reader reference/corpus contracts only. Foundation search/bookmark checks, iPhone/iPad success/empty/error/retry/keyboard/large-text/back/restart journeys, build and independent review. No release, imported private data, translation/provider or model change is included.

## Migration Rule

First add evidence and compatibility-preserving public interfaces in the current tree. Move a capability into a package only after its interface and dependency direction are stable, the move has a bounded task contract, and the CEO has approved that material phase. Do not migrate merely to make the folder tree resemble a generic monorepo.
