# TASK-0005: Private Reader Continuity Path

- **Role / owner:** Implementer / repository lead
- **Task state:** Review
- **Delivery state:** Implemented
- **Risk / reversibility:** Medium; introduces one private local-progress record and backup compatibility path, but no account, source, model, network, or release change is permitted
- **Parent objective:** D-006, accepted through the CEO's 2026-08-30 directive to research the next reader-first outcome and build it

## Objective

Help a reader who wants a coherent place to begin read Mark as one complete story, one chapter at a time, and return privately to the next unread chapter without turning the reader into a habit dashboard.

## Ownership Boundary

May add a local reading-path domain module and hook; change `src/App.jsx`, `src/components/Navigation/Sidebar.jsx`, a scoped reader/navigation component and styles, `src/lib/userBackup.js`, `src/components/Navigation/BackupPanel.jsx`, focused benchmark scripts, and product/coordination/research records.

Must preserve existing URL navigation, reading-position behavior, selected translation, local notes/studies/bookmarks, backup compatibility, mobile safe areas, and reader-return behavior. One active path only; it must be private local data.

Must not alter Bible text or translations, add sources or study material, introduce a model request, schedule/reminder, streak, account, social feature, telemetry, notification, dependency, worker/native/CI configuration, external system, commit, push, or deployment.

## Dependencies

- PR-01 and PR-02, including their reader-return and local-data contracts.
- Existing reading-position and backup transaction behavior.
- Research rationale in [2026-08 reader continuity](../../research/2026-08-reader-continuity.md).

## Interface Contract

- A path record is normalized, version-tolerant private local data: a known path id, explicit completed-chapter count, and safe timestamps. Invalid or unknown records are ignored rather than rendered.
- The initial catalog contains exactly one canonical sequence: Mark chapters 1–16. Starting/restarting it begins at Mark 1; reading is never auto-marked from scroll position.
- The reader explicitly marks only the currently offered path chapter as read. The action advances to the next canonical chapter; the last action completes the path without a new route or generated content.
- Export and restore preserve compatible path progress. On restore, an existing local active path is never replaced by a different imported path; matching paths retain the furthest valid progress.
- Ordinary reader navigation, chapter swipes, bookmarks, notes, studies, resume position, and a reader without a path retain their current behavior.

## Acceptance Criteria

- A reader without a path can start “Read Mark as one story” from a quiet navigation surface and is taken to Mark 1.
- An active path clearly identifies its next chapter and can resume it after a reload; it does not require an account or date-based schedule.
- At the current path chapter, an explicit action marks that chapter read and takes the reader to the next one; the final chapter produces a completed state.
- A reader can restart the path deliberately and can still browse, search, save a thought/question, or use ordinary next/previous chapter navigation without changing completion accidentally.
- Path data validates defensively and round-trips through export/restore while preserving existing data; the defined active-path merge rule holds.
- The quiet reader surface remains usable at desktop and 390px widths, with keyboard access, no horizontal overflow, and unchanged return/resume behavior.

## Verification

- Add and run a focused reading-path domain benchmark covering catalog validation, explicit progression, completion, restart, and invalid data.
- Update and run backup coverage for path export, parse, merge, and restore transaction behavior.
- Run `npm run lint`, `npm run check`, and `git diff --check`.
- Manually exercise first start, reload/resume, advance, completion, restart, ordinary navigation, backup/restore, keyboard, desktop, and 390px mobile journeys.
- Obtain independent final review before local integration.

## Non-Goals

- A general plan marketplace, topical plans, daily dates, reminders, notifications, streaks, badges, sharing, accountability, accounts, cloud sync, or analytics.
- Any new theology, devotional content, source, commentary, AI, or study workflow.
- Automatic reading completion inferred from scrolling or time spent.
- Commit, push, deployment, or other external action.

## Approval Gates

Pause for CEO approval before a second path, a configurable/custom path, a schema incompatible with existing backups, any scheduling or notification behavior, account/sync/telemetry work, external content, dependency, commit, push, or deployment.

## Stop Conditions

Stop and escalate if private progress cannot be backed up and restored safely, the path requires an implicit reading-completion heuristic, the UI displaces the Bible text or normal navigation, or the work expands into a plan catalog, schedule, source, or social product.

## Required Handoff

- Outcome delivered and reader-visible behavior.
- Files, modules, interfaces, schemas, and dependencies changed.
- Checks performed and exact results.
- Decisions and assumptions.
- Risks and limitations.
- Integration and deployment notes.
- Recommended next bounded action.

## Implementation Handoff (2026-08-30)

- **Outcome delivered:** The sidebar now offers one quiet **Read Mark as one story** starting point. It sends the reader to Mark 1, preserves the next unread chapter privately across reloads, and shows a bottom-of-chapter action to mark only the offered chapter read and continue. Mark 16 completes the path in place. A reader may restart deliberately and may otherwise navigate, study, bookmark, search, or resume normally without changing progress.
- **Changed boundary:** Added `src/lib/readingPath.js` and `src/hooks/useReadingPath.js`; added sidebar and end-of-chapter path presentation; integrated the record through `src/App.jsx`; included it in the existing backup/restore transaction and updated backup copy. The record is one normalized local object (`id`, `completedChapters`, `startedAt`, `updatedAt`) under a new private local-storage key. Matching backup imports keep furthest progress; a different imported path cannot replace a current local path. No Scripture text, source, AI, network, account, schedule, notification, telemetry, dependency, worker/native/CI, or release behavior changed.
- **Evidence:** `npm run check:full` passed after the final cleanup: documentation links, lint, production build, reader navigation, reading position, new reading-path coverage, backup, personal-thread, public-commentary, source-pack, synthesis, and commentary-comparison checks. `git diff --check` passed. Independent review returned **Pass with known risk**.
- **Known limit:** No browser target is connected in this environment, so first start, reload, advance, completion, restart, restore, focus order, overflow, source behavior around the new surface, and 390px layout are not interactively verified. The Vite build retains its existing large-chunk warning.
- **Integration/release:** Local implementation is ready for manual browser verification. No commit, push, deployment, or other external action was performed for TASK-0005.
- **Recommended next bounded action:** Manually exercise the complete Mark path and a backup/restore at desktop and 390px; then request a specific commit/push authorization only if the CEO wants a release candidate.
