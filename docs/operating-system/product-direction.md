# Product Direction

- **Owner:** CEO for priority; repository lead for evidence and upkeep
- **Status:** Current-state facts, accepted reader outcome, and accepted native iPhone/iPad platform direction; bounded SwiftUI reader proof locally integrated; later migration roadmap proposed
- **Last verified against repository:** 2026-11-02

## Current Strategic Direction

On 2026-11-02 the CEO directed a transition to a fully native application and confirmed iPhone and iPad first. The CEO then approved the proposed bounded SwiftUI reader proof. TASK-0007 and ADR-0002 cover native KJV reading, navigation, notes, appearance, isolated local persistence, and restart recovery. Data migration, AI runtime, full feature parity, and Release cutover remain outside that approval; see [D-007](../coordination/DECISION_INBOX.md#d-007-fully-native-app-iphone-and-ipad-first).

The reader-first mission remains the organizing principle. The existing Mark-path implementation is preserved and paused in Review, not shipped. The prior assumption that a hosted-web shell is sufficient is superseded as the target direction; the existing shell remains a menu fallback after the native-root internal beta cutover approved in D-008 / ADR-0003.

## Quality Bar For Every Feature

The CEO explicitly requires every feature to be **visually stunning and highly useful** ([D-010](../coordination/DECISION_INBOX.md#d-010-beauty-and-usefulness-in-every-feature)). Functional parity and passing checks are necessary but do not establish this quality bar. It applies to existing surfaces and each native addition, including search and bookmarks.

- **Useful:** Define the reader's job and show that the feature makes it easier. Review relevance, clarity, discoverability, effort, and return to reading through realistic journeys, rather than counting controls or features.
- **Beautiful:** Use deliberate typography, spacing, hierarchy, color, and restrained motion consistent with the immersive reader. Native controls must form a coherent Exeges experience on both iPhone and iPad.
- **Effortless and inclusive:** Check touch/keyboard behavior, accessibility text sizes, contrast, safe areas, scrolling, and loading/empty/error/recovery states. Important actions must remain clear and reachable.
- **Proven:** Include visual evidence and a usefulness assessment in acceptance and review. State missing physical-device or accessibility evidence explicitly. Technical checks alone must not be reported as design acceptance.

Polish must support reading and understanding. Major workflow or architecture changes and releases still require their applicable approvals.

## Current Product State

Separately from the released alpha, the local Debug iOS app now has a native SwiftUI KJV reader proof: passage navigation, private verse notes, appearance, and verse-level resume. It has passed simulator verification and independent review. The CEO subsequently authorized a native-reader internal TestFlight beta with local-data transfer deferred; Debug and Release now open native reading, while Existing Exeges in the menu preserves access to the hosted app. The internal beta 1.0.0 (3) is available to Exeges Testers with Apple processing and group access verified. Full parity and migration remain incomplete. See [TASK-0007](../coordination/tasks/0007-native-reader-proof.md).

Exeges is an internal alpha distributed on the web and through a thin iOS TestFlight shell. The current experience includes:

- Immersive local KJV reading and remotely loaded ESV.
- Search, bookmarks, verse notes, saved studies, verse-level resume reading, themes, typography preferences, and private local backup/restore.
- Header-based book, chapter, and verse navigation, plus confirmation-based touch navigation between adjacent chapters.
- Reader-first study threads opened from selected Scripture.
- Personal study threads that preserve the reader's own takeaway, reopen at the selected passage, and remain visible as a subtle reading marker and a private thread list.
- Related passages resolved to readable Bible text in the selected translation when available.
- Public-domain Matthew Henry, Calvin, Jamieson-Fausset-Brown, and Keil & Delitzsch commentary plus CC BY-SA Tyndale Open Study Notes, loaded on demand with source-specific attribution and licensing.
- An explicit Explore view that leads with passage context, lets the reader choose one to three source voices, and progressively discloses raw excerpts.
- Optional grounded comparison of commentary agreement and distinct emphasis, with exact quotations for examining possible disagreement and evidence-supported reasons for differences.
- Passage questions grounded in selected text, retrieved source records, related Scripture, and scoped commentary excerpts.
- Optional experimental on-device synthesis using WebLLM, loaded only after a reader explicitly requests a local draft or commentary comparison. Passage questions first receive a deterministic, passage-first starting point, with a local pass available as a separate opt-in.

An older guided Observe/Interpret/Apply implementation remains in the codebase, but the visible product direction has shifted toward simpler reader-first study threads. This residue should not be expanded without an explicit product decision.

## Near-Term Outcomes

The first outcome is accepted for the current learning cycle. The others remain provisional and should be reprioritized by the CEO:

1. A reader can start a coherent, complete Gospel story and return to the next chapter without an account, schedule, or performance pressure.
2. A reader can tap Scripture, record a thought or question, inspect progressively deeper evidence, and return to reading without confusion.
3. Every generated or assembled answer makes its supporting Scripture and commentary easy to inspect and distinguishes source text from synthesis.
4. Core reading, search, study, and navigation journeys have repeatable regression coverage and real-device checks.
5. Tester feedback can answer whether the reader-first study proposition is useful and trustworthy before source or AI expansion.

## Roadmap Themes

- **Reading integrity:** typography, mobile layout, navigation history, translation consistency, offline/error behavior, and local-data safety.
- **Progressive depth:** a simple default answer with optional raw Scripture, commentary, source details, and follow-up questions.
- **Trustworthy grounding:** source coverage, provenance, passage-first retrieval, citation validation, and evaluation cases across biblical genres.
- **AI with evidence:** deterministic behavior first; model synthesis only where it improves tested outcomes and can be constrained and inspected.
- **Quality and learning:** automated logic coverage, browser/mobile journeys, structured tester feedback, and a clear release bar.

## Known Product Risks

- The identity conflict between a private family reader and a broader study product can produce incoherent scope.
- Study depth can recreate the cognitive load of professional tools and damage the reading experience.
- Fluent synthesis can overstate weak, old, disputed, or irrelevant source material.
- Source coverage is uneven: large cross-reference coverage coexists with a very small hand-reviewed source corpus.
- On-device model loading can exhaust mobile resources or produce low-quality answers.
- Local data can still be lost or fail to follow a reader across devices when they do not keep and restore a backup file.
- The hosted-web iOS shell couples TestFlight behavior to the current GitHub Pages deployment.
- No analytics or defined measures currently show whether the product improves reading or study.

## Assumptions Requiring Validation

- Serious lay readers value a clean reader with optional depth more than a separate guided study mode.
- Asking for the reader's thought first improves agency rather than adding friction.
- Visible citations and raw sources increase trust and help users judge an answer.
- Curated per-passage retrieval can deliver enough relevance before semantic/vector retrieval is necessary.
- Historical commentary and clearly labeled open-licensed study notes are useful when named, attributed, inspectable, and balanced by context and caution.
- Local AI offers enough privacy or responsiveness benefit to justify its mobile cost and quality limits.
- The native transition can improve the reading experience enough to justify a second implementation and data-migration work; this requires a real-device reader proof before broad feature porting.

## Current Alpha Slice

**Provisional implementation hypothesis.** A reader should be able to protect their private reading life without leaving the reading experience for an account or a cloud setup. The menu exposes a compact “Backup & restore” path that exports notes, bookmarks, study writing, reading place, reading-path progress, and preferences; licensed ESV wording is omitted. Restore is deliberately additive and preserves an existing local note when two copies contain one at the same passage.

This is intentionally a reading-integrity investment, not another study surface or a promise of sync. The qualitative success signal is that testers can move their saved material to another browser/device or recover after a browser reset without uncertainty about what will be overwritten.

## Next Product Decision

The CEO reports basic native reading works and has explicitly selected native **search and bookmarks first**. TASK-0011 restores those existing capabilities and is locally integrated after Foundation/iPhone/iPad checks and independent TASK-0012 review (Pass with known risk). The later “Ok build and push” directive authorizes TASK-0013 / D-011 to publish internal build4 and its native source/documents on a scoped branch after D-010 assessment and independent release review. Physical-device, older-runtime and live VoiceOver checks remain outstanding. Migration remains deferred; study/source/AI and ESV parity remain subsequent bounded decisions.

The bounded native reader proof is locally integrated with simulator checks, independent review, and a data-preservation plan. The next checkpoint is physical-device reading/accessibility/performance; the later parity/migration roadmap remains for discussion. The previously authorized Mark path remains valid and locally implemented, but paused pending its outstanding verification and the native roadmap discussion. Its scope remains one explicit, chapter-sized Mark path—not a plan marketplace, daily schedule, streak, reminder, account, social feature, generated devotional, source expansion, or AI expansion. The external rationale is recorded in [reader continuity research](../research/2026-08-reader-continuity.md).
