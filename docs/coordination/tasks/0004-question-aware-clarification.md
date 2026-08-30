# TASK-0004: Question-Aware Passage Clarification

- **Role / owner:** Implementer / repository lead
- **Task state:** Review
- **Delivery state:** Implemented
- **Risk / reversibility:** Medium; reader-study interaction and existing local observation intent change, but no new storage schema, source, model, network contract, or release is permitted
- **Parent objective:** D-005, accepted by the CEO on 2026-08-24: make one saved reader question the fast, trustworthy entry to deeper study

## Objective

Let a reader explicitly save a question from a study thread, then open a clarification-first view that reuses that exact question, leads with a passage-first answer and inspectable evidence, and leaves broader research material as deliberate deeper options.

## Ownership Boundary

May change `src/App.jsx`, `src/components/Study/StudyThread.jsx`, scoped `src/styles/study.css`, focused benchmarks that protect existing study-thread persistence, and product/coordination records.

May reuse only the existing normalized observation `type` field (`question` or `note`). Must preserve all existing local-storage keys and object shapes, legacy observations, backup behavior, selected translation, URLs, source and model boundaries, source attribution, and the reader-return behavior.

Must not change source ingestion, commentary provider behavior, source selection/comparison algorithms, model prompts/runtime, Worker/native/CI configuration, dependencies, accounts, telemetry, sync, persistent remote source excerpts, generated answers, external systems, or release state.

## Dependencies

- Shipped reader reflection loop in TASK-0003.
- Existing `useStudies` observation normalization and personal-thread persistence contract.
- Existing deterministic passage-question grounding and source-inspection paths.

## Interface Contract

- Existing observations lacking an explicit `question` type remain reader thoughts and open the existing broad Explore path.
- A reader chooses “Clarify this question” explicitly; that action persists the existing observation as `type: question`, reuses its exact text, and opens clarification without a second entry step.
- A question-aware clarification uses the existing deterministic passage-question grounding and its existing source/citation display. It does not create a new model request or persist an answer/source text.
- The selected question is retained only as existing private local study writing; all Save, edit, delete, error, Escape, overlay-close, return-to-reading, URL, translation, and backup invariants remain compatible.

## Acceptance Criteria

- A reader can choose between saving a reflection and clarifying a question from the same quiet writing surface.
- Choosing question clarification stores `type: question`, enters the clarification view with the exact question already present, and automatically gathers the existing deterministic starting point without retyping.
- Clarification presents passage context and the answer/evidence before the source picker, related-passage list, background notes, full commentary, or optional local model.
- A non-question thought retains the existing Explore behavior and is never silently treated as a question.
- Existing saved question observations reopen as question-aware clarification; legacy/note observations remain readable, editable, removable, and source-explorable.
- The flow stays usable at desktop and narrow mobile widths, including loading, no-evidence, source failure, keyboard Escape, overlay-close, and return-to-reading paths.

## Verification

- `npm run lint`
- `npm run build`
- `npm run bench:personal-study-threads`
- Relevant study-source and question-grounding benchmark(s), if the inspected contracts identify one.
- Manual desktop and 390px mobile: save a question, verify no retyping and automatic clarification; save a thought and verify ordinary Explore; reopen each thread; verify return, Escape, source loading/error, and no horizontal overflow.
- Review final diff for storage compatibility, source/model boundary preservation, accidental answer persistence, scope, and accessibility. Obtain independent review before integration.

## Non-Goals

- A chatbot, conversational history, arbitrary-topic answers, answer editing, or persistent generated/source content.
- New commentary or cross-reference data, source ranking, model behavior, account/sync/telemetry work, or professional-study tooling.
- Expanding legacy StudyMode.
- Commit, push, deployment, or any external-state change.

## Approval Gates

Pause for CEO approval before changing local storage or backup schemas, source/model/network contracts, source selection behavior, new dependencies, accounts, telemetry, external systems, commit, push, or deployment.

## Stop Conditions

Stop and escalate if the existing observation type cannot safely distinguish a question from a thought, automatic clarification needs a source/model contract change, compatible reopen behavior cannot be preserved, or a concise clarification requires expanding the product scope beyond this task.

## Required Handoff

- Outcome delivered and reader-visible behavior.
- Files, modules, interfaces, and compatibility guarantees changed.
- Exact automated, browser, mobile, loading/error, and review evidence.
- Decisions, assumptions, risks, limits, and unrun checks.
- Integration state, release status, and recommended next bounded action.

## Implementation Handoff (2026-08-24)

- **Outcome delivered:** The study thread now lets a reader save a reflection or explicitly choose **Clarify this question**. Questions are stored with the existing `type: question` intent, reopen directly into clarification, retain their exact wording, and automatically request the existing deterministic, passage-first starting point. Its inspectable sources come before related Scripture, comparison, background, full commentary, and optional local AI. Ordinary thoughts retain the prior broad Explore sequence.
- **Changed boundary:** `src/App.jsx` passes only the existing observation type to the existing persistence path. `src/components/Study/StudyThread.jsx` adds question-aware presentation and reuses existing grounding, source, cancellation, close, return, and local-model contracts. No storage key or object shape, source/provider behavior, model behavior, network call, dependency, external system, or release setting changed.
- **Evidence:** `npm run check:full` passed (documentation links, lint, production build, reader navigation, reading position, backup, personal-thread, public-commentary, source-pack, synthesis, and commentary-comparison checks); `git diff --check` passed. Independent re-review returned **Pass with known risk** after evidence-before-AI and ordinary-Explore ordering remediations.
- **Known limit:** The local browser-control runtime had no available browser target, so the desktop/390px interaction, focus/overflow, and simulated source-failure journey remain unverified. The Vite build retains the repository's pre-existing large-chunk warning.
- **Integration/release:** Local implementation is ready for browser verification. No commit, push, deployment, or other external action was performed or authorized.
- **Recommended next bounded action:** Exercise the saved-question and ordinary-thought journeys in a desktop browser and at 390px, including failure/recovery and return-to-reading; then request a specific commit/push authorization only if the CEO wants a release candidate.
