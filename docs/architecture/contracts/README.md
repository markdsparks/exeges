# Shared Contract Registry

- **Owner:** Repository lead; implementation owners maintain the relevant contract through an accepted task
- **Status:** Documents current compatibility boundaries
- **Last verified:** 2026-08-19

These are the shared contracts whose changes can affect more than one Exeges capability. The linked implementation and focused checks establish present behavior; this registry explains the invariant and approval boundary. A task may clarify a contract, but it may not silently redefine one.

## Reference And Navigation

**Consumers:** App composition, reader, search, notes, studies, related Scripture, backup, and URL history.

**Interface:** `{ bookId, chapterNum, verseNum }` for saved reading position; book name/id plus positive chapter/verse values for visible references; URL references outrank saved position.

**Invariants:** Invalid saved positions are ignored. Legacy book/chapter-only positions remain readable. Back/forward navigation must restore a coherent passage. Chapter swipe requires an intentional, confirmed gesture.

**Implementation:** `src/lib/readingPosition.js`, `readerNavigation.js`, `src/App.jsx`, `src/components/Reader/ChapterReader.jsx`.

**Checks:** `npm run bench:reading-position`, `npm run bench:reader-navigation`.

**Approval boundary:** URL or persisted-key changes, destructive position migration, and materially different navigation behavior require an explicit plan; persisted-schema changes require CEO approval.

## Private User Data And Backup

**Consumers:** Bookmark, note, study, preference, translation, reading-position, sidebar, and backup flows.

**Interface:** Existing local-storage keys and hook return contracts; backup envelope `format: "exeges-user-backup"`, version `1`, timestamp, and normalized `data` payload.

**Invariants:** Data remains on-device unless the user exports it. Restore is additive and transactional. Local notes win same-passage conflicts; bookmarks and distinct observations combine. Licensed ESV wording and selections are redacted from exports while the user's own writing remains. Invalid, unsupported, or oversized input fails without partial application.

**Implementation:** `src/hooks/useBookmarks.js`, `useNotes.js`, `useStudies.js`, `useTheme.js`, `useTranslation.js`; `src/lib/userBackup.js`, `readingPosition.js`, `personalStudyThreads.js`.

**Checks:** `npm run bench:user-backup`, `npm run bench:personal-study-threads`, `npm run bench:reading-position`.

**Approval boundary:** Storage keys, schema/migration, conflict policy, cloud persistence, accounts, retention, telemetry, and privacy promises require CEO approval.

## Translation And ESV Proxy

**Consumers:** Reader translation, related-passage loading, and ESV search.

**Interface:** The browser sends a bounded `reference` or search query to the configured proxy. Passage responses expose normalized verses and copyright metadata; clients expose explicit ready, missing, unsupported, setup-needed, and error behavior.

**Invariants:** The ESV token exists only in the Worker environment. The browser never calls the licensed ESV API directly. ESV text is not committed, included in generated source packs, or persisted in long-lived user backup data. Source and translation identity remain visible.

**Implementation:** `src/lib/translations.js`, `chapterTranslation.js`, `src/hooks/useBibleSearch.js`, `workers/esv-proxy.js`; details in [the ESV proxy document](../../esv-proxy.md).

**Checks:** `npm run check` plus focused client/Worker fixtures and CORS, input, empty, error, and abort paths when this contract changes.

**Approval boundary:** Provider, request/response shape, caching, logging, origin/rate policy, secret handling, licensing, or deployment changes require architecture/security review and CEO approval where infrastructure or license behavior changes.

## Study Source Pack

**Consumers:** Static source retrieval, deterministic study drafts, source-visible UI, and source benchmarks.

**Interface:** Versioned records with stable IDs, route IDs, terms, references, text, delivery, source metadata, license, attribution, confidence, review status, and allowed use. Delivery is either bundled fallback or versioned static chapter pack.

**Invariants:** Structured input is validated before generation. Retrieval remains passage/scope anchored. Generated output is deterministic from committed inputs. ESV text is excluded. Source identity and licensing survive retrieval and display. Bulk OpenBible data is delivered in static packs rather than the JavaScript fallback.

**Known exception:** Nine hand-authored runtime chunks in `src/data/studySourcePacks.js` currently bypass the SourcePack v2 generator and omit parts of its provenance/review metadata. Do not expand that bypass. Moving those records through the validated path is tracked debt, not current compliance.

**Implementation:** `sources/study/`, `scripts/import-openbible-cross-references.mjs`, `build-study-source-pack.mjs`, `src/data/studySourcePacks.js`, `generatedStudySourceChunks.js`; policy in [the curated source plan](../../curated-source-plan.md).

**Checks:** `npm run bench:study-sources`, `npm run build`, and generated-diff inspection.

**Approval boundary:** New source classes, copyrighted content, schema/version, delivery strategy, provenance/allowed-use rules, or unvalidated bypasses require source/licensing review and, when consequential, CEO approval.

## Grounded Study And Optional Synthesis

**Consumers:** Reader-first Study Thread, legacy Study Mode, passage questions, commentary comparison, and local model runtime.

**Interface:** A selected passage/observation plus scoped evidence becomes a synthesis request. Deterministic assembly is the default. Optional model functions accept only the supplied request/evidence and return structures that are normalized and audited before display.

**Invariants:** Scripture is primary. Every source finding remains named and inspectable. The model does not silently add memory as sourced fact. Local synthesis is explicit, lazy, experimental, bounded, and cancelable. Commentary comparison operates only on the reader-selected sources; each accepted group uses exact quotations from multiple named cards, and unsupported disagreement/reason claims are rejected or downgraded.

**Implementation:** `src/lib/localStudyGrounding.js`, `studySynthesisRequest.js`, `groundedStudyDraft.js`, `localStudyDraftAudit.js`, `passageQuestion.js`, `commentaryComparison.js`, `localStudySynthesis.js`.

**Checks:** `npm run bench:study-sources`, `npm run bench:study-synthesis`, `npm run bench:commentary-comparison`, `npm run bench:public-commentary`.

**Approval boundary:** Evidence shape, retrieval scope, prompt/audit boundary, supported model/provider, source/editorial policy, or user-facing authority claims require architecture/product review and CEO approval when they change the product promise.

## Release Contract

**Consumers:** GitHub Pages, browser users, and the iOS WKWebView shell.

**Interface:** A push to `main` triggers the Pages workflow; its `dist/` result becomes the hosted web app. The iOS shell loads that hosted URL, so a web deployment changes the iOS experience without a new native binary.

**Invariants:** `Implemented`, `Verified`, and `Integrated` do not mean `Shipped`. Before a production push, workflow/infrastructure change, or TestFlight upload, the Integrator must confirm either per-action CEO approval given immediately before it or a still-valid standing approval that explicitly covers it. No standing production approval is currently recorded. Signing and secrets remain external.

**Implementation:** `.github/workflows/deploy-pages.yml`, `vite.config.js`, `native/ios/`, `scripts/exeges-testflight.sh`.

**Checks:** `npm run check`; release-readiness audits; preview/smoke testing; Xcode and device checks for native changes.

**Approval boundary:** Trigger, permissions, environment protection, hosted URL/channel, Worker deployment, signing, or TestFlight behavior changes require the applicable per-action or recorded standing CEO authorization before live action and an ADR for consequential topology changes.
