# Product Direction

## Current Product State

Exeges is an internal alpha distributed on the web and through a thin iOS TestFlight shell. The current experience includes:

- Immersive local KJV reading and remotely loaded ESV.
- Search, bookmarks, verse notes, saved studies, reading position, themes, and typography preferences.
- Reader-first study threads opened from selected Scripture.
- Personal study threads that preserve the reader's own takeaway, reopen at the selected passage, and remain visible as a subtle reading marker and a private thread list.
- Related passages resolved to readable Bible text in the selected translation when available.
- Public-domain Matthew Henry, Calvin, Jamieson-Fausset-Brown, and Keil & Delitzsch commentary loaded on demand with attribution.
- An explicit Explore view that leads with passage context, a multi-commentary overview, and progressively disclosed raw excerpts.
- Optional grounded comparison of commentary agreement and distinct emphasis, with exact quotations for examining possible disagreement and evidence-supported reasons for differences.
- Passage questions grounded in selected text, retrieved source records, related Scripture, and scoped commentary excerpts.
- Optional experimental on-device synthesis using WebLLM.

An older guided Observe/Interpret/Apply implementation remains in the codebase, but the visible product direction has shifted toward simpler reader-first study threads. This residue should not be expanded without an explicit product decision.

## Near-Term Outcomes

These outcomes are provisional and should be reprioritized by the CEO:

1. A reader can tap Scripture, record a thought or question, inspect progressively deeper evidence, and return to reading without confusion.
2. Every generated or assembled answer makes its supporting Scripture and commentary easy to inspect and distinguishes source text from synthesis.
3. Core reading, search, study, and navigation journeys have repeatable regression coverage and real-device checks.
4. Tester feedback can answer whether the reader-first study proposition is useful and trustworthy before source or AI expansion.

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
- Local-only user data can be lost and cannot follow a reader across devices.
- The hosted-web iOS shell couples TestFlight behavior to the current GitHub Pages deployment.
- No analytics or defined measures currently show whether the product improves reading or study.

## Assumptions Requiring Validation

- Serious lay readers value a clean reader with optional depth more than a separate guided study mode.
- Asking for the reader's thought first improves agency rather than adding friction.
- Visible citations and raw sources increase trust and help users judge an answer.
- Curated per-passage retrieval can deliver enough relevance before semantic/vector retrieval is necessary.
- Public-domain historical commentary is useful when clearly named and balanced by context and caution.
- Local AI offers enough privacy or responsiveness benefit to justify its mobile cost and quality limits.
- A thin hosted-web iOS shell is sufficient for the current learning stage.

## Next Product Decision

The next brief should name one primary user, one read-to-explore job, and one observable success signal. That decision should precede further expansion of commentary, AI, ontology, or expert-study features.
