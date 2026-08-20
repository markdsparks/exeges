# TASK-0003: Clarify the Reader Reflection Loop

- **Role / owner:** Implementer / repository lead
- **Task state:** Integrated
- **Delivery state:** Integrated
- **Risk / reversibility:** Low; copy, layout, and existing-dialog actions only, with no storage-schema or source/retrieval change
- **Parent objective:** D-001, accepted by the CEO on 2026-08-19: make the serious-lay-reader “read -> record my thought/question -> inspect evidence -> return to reading” journey coherent before expanding sources, AI, or expert tools

## Objective

Make the existing verse study thread visibly communicate its reader-first sequence and give a reader an explicit, reliable way to return to the passage from each stage.

## Ownership Boundary

May change `src/components/Study/StudyThread.jsx`, its scoped rules in `src/styles/study.css`, focused study-thread regression coverage if justified, and the related product/coordination records.

Must not change `src/lib/` retrieval or grounding behavior, persistence schemas or storage keys, source packs or licenses, `StudyMode`, navigation URLs, dependencies, Worker/native/CI configuration, external systems, or release state.

## Dependencies

- D-001 acceptance recorded in `docs/coordination/DECISION_INBOX.md`.
- Existing `StudyThread` persistence and modal-close behavior.
- Operating-system integration evidence in TASK-0001 and TASK-0002.

## Interface Contract

- A thread opened from a verse still starts on the reader’s own writing view.
- “Explore sources” retains the existing source/retrieval behavior and never requires saving a thought before exploration.
- “Return to reading” only closes the study dialog; it must preserve the existing passage, URL, selected translation, and local data.
- Existing save, edit, delete, error, keyboard Escape, and overlay-close behavior remain compatible.

## Acceptance Criteria

- The dialog presents the three-part path: reader thought, source exploration, and return to reading; the active phase is clear without dominating Scripture or source content.
- The writing prompt welcomes either a thought or a question and explains that it can be refined after source exploration.
- Each reflection and exploration state exposes a visible “Return to reading” control that closes the dialog without navigation or data mutation.
- A reader may still explore with no saved thought, and existing personal threads remain readable and editable.
- The changed journey works at desktop and narrow mobile widths, with Escape, overlay-close, and keyboard controls preserved.

## Verification

- `npm run lint`
- `npm run build`
- `npm run bench:personal-study-threads`
- Manual desktop and narrow-mobile journey: open a verse, write/save a thought, explore sources, return; then repeat source exploration without a thought; reopen a saved thread and return.
- Review final diff for scope, local-data, source/AI, keyboard, and URL regressions; obtain independent review before integration.

## Non-Goals

- New study methods, prompts, source material, model output, or AI controls.
- Forcing a reader to write before seeing sources.
- Changing the historical guided-study surface.
- Adding analytics, accounts, sync, external services, or a production release.

## Approval Gates

Pause for CEO approval before changing persistence, retrieval/grounding, source licensing, navigation, dependencies, external systems, commit, push, or deployment.

## Stop Conditions

Stop and escalate if a coherent return action requires navigation or persistence changes, a source/AI behavior change, a new dependency, a privacy promise, or a broader product decision.

## Required Handoff

- Outcome delivered and user-visible behavior.
- Files and interfaces changed.
- Exact automated and manual evidence.
- Assumptions, risks, limitations, and approval boundaries.
- Independent-review result and recommended next bounded action.

## Evidence And Handoff

### Outcome Delivered

The existing study thread now makes its three-part reader-first path explicit: form a thought or question, explore sources without being forced to save, then return to the same reading surface. A visible labeled return control is persistent in the dialog header, with contextual return controls retained near the next action.

### Files And Interfaces Changed

- `src/components/Study/StudyThread.jsx`: clarified the path, writing language, source-exploration label, visible return controls, and active-path accessibility state.
- `src/styles/study.css`: added compact path, persistent-header action, and contextual return-control styling.
- Product/coordination records: recorded the CEO-approved objective, task boundary, acceptance evidence, and local integration state.

No persistence schema, storage key, retrieval/grounding behavior, source selection, navigation URL, translation behavior, dependency, Worker/native/CI configuration, external system, or release state changed.

### Verification

- `npm run lint`: passed.
- `npm run bench:personal-study-threads`: passed.
- `npm run build`: passed; existing large-chunk warning remains.
- `npm run check:docs`: passed (29 Markdown files, 72 local links).
- `git diff --check`: passed.
- Manual local desktop: opening a verse exposes the path and prompt; source exploration works without saving; a labeled return action closes the dialog and preserves the passage URL; Escape also closes it; no console warnings/errors appeared.
- Manual local mobile at 390 × 844: path, tabs, and persistent return control were visible; dialog bounds were 0–390 with no horizontal overflow; the return action closed the dialog; viewport was reset afterward.
- Independent Reviewer re-review: `Pass with known risk`. The initial finding that Explore’s return control was below long source content was remediated by the persistent header action. The Reviewer’s local browser session was unavailable for its final visual repeat; lead browser evidence above covers that exact pass.

### Assumptions, Risks, And Limits

- The approved success signal remains a manual alpha journey and tester feedback, not telemetry or a quantitative metric.
- The current source list may still be long; the persistent return control now remains available while it scrolls.
- No real local user thought was saved or deleted during browser verification. Existing persistence wiring was unchanged and its focused benchmark passed.

### Integration And Next Action

TASK-0003 is integrated locally only. It is not committed, pushed, deployed, or shipped. The next bounded action is a short serious-lay-reader alpha test of this journey, then a CEO decision on whether to deepen the same loop or shift product priority.
