# Project Charter

## Mission

Help people read Scripture with sustained attention and, when they choose, pursue deeper understanding through passage-first, source-visible assistance that supports rather than replaces their judgment.

## Target Users

**Known:** Exeges began as a personal and family reader and is tested primarily as a mobile reading experience.

**Provisional assumption:** The emerging user is a serious lay reader who wants thoughtful study help without the complexity of professional Bible software or an opaque AI answer.

**CEO decision needed:** Define the primary customer and whether this remains a family tool, becomes a consumer product, or serves another audience.

## Customer Problem

**Provisional:** Bible apps often force a choice between clean reading and tool-heavy study. Exeges is testing whether a reader can keep the text central, express their own observation or question, and progressively open trustworthy context without losing their place or interpretive agency.

## Product Principles

1. Scripture is the primary surface and primary evidence.
2. Reading stays quiet; depth is intentional and progressively disclosed.
3. Encourage the reader's observation and judgment before offering synthesis.
4. Show sources, attribution, uncertainty, and the limits of a claim.
5. Commentary and AI assist interpretation; they are not presented as authorities.
6. Protect the reverent, immersive visual character of the reading experience.
7. Prefer local/private and low-infrastructure behavior where it is reliable.
8. Respect translation and source licenses at ingestion, storage, display, and synthesis boundaries.

## Current Strategic Goals

These are provisional until the CEO sets priorities:

- Prove that the reader-to-deeper-study journey feels simpler and more helpful than a separate study workspace.
- Make related Scripture, commentary, and grounded questions trustworthy, inspectable, and easy to navigate.
- Establish evaluation and quality coverage before expanding AI or source breadth.
- Stabilize mobile web and iOS testing sufficiently to learn from real readers.

## Explicit Non-Goals

Unless the CEO changes direction, Exeges is not currently trying to be:

- A reduced clone of professional research software with every lexical and scholarly tool.
- A generic Bible chatbot that answers from untraceable model memory.
- A social feed or engagement-maximization product.
- A host for unlicensed modern translations or commentary corpora.
- A cloud collaboration platform before the user and data promise is decided.
- A vector or ontology platform before structured retrieval is shown to be insufficient.

## Success Measures

No business or product measures are established in the repository. The CEO must define a small initial set. Candidate categories, not adopted metrics, are:

- Readers can complete the core read-to-explore journey without help.
- Readers understand which words are Scripture, source text, and generated synthesis.
- Grounded answers are supported by displayed evidence and avoid material unsupported claims.
- Mobile reading and navigation remain stable through repeated real-device use.
- Testers choose to return for reading or study and can explain the product's value.

## Constraints

- ESV access is licensed and must remain behind a private proxy; ESV text cannot be committed or retained long-term.
- KJV, notes, bookmarks, studies, position, and settings are currently local to the device/browser.
- GitHub Pages hosts the web app; the iOS release shell loads that hosted app.
- Public commentary and OpenBible data require correct attribution and license treatment.
- The bundled KJV corpus lacks a committed edition/provenance record, and the repository lacks a code `LICENSE` file.
- On-device WebGPU model loading is experimental and has shown reliability and quality limits on iPhone.
- The project has no general automated test suite, account system, analytics, or formal editorial review system.

## Open Questions

- What single user and job should the next release serve?
- What product promise should Exeges make about privacy, persistence, and backup?
- What level of theological breadth or editorial stance is intended?
- What role, if any, should on-device or cloud AI have in the supported experience?
- What release stage and evidence are required before broader distribution?

## Decisions Reserved For The CEO

- Product identity, target customer, positioning, priorities, and success measures.
- Addition or removal of a major user workflow or product promise.
- Editorial doctrine, approved source classes, and theological positioning.
- Data ownership, accounts, sync, telemetry, retention, and privacy promises.
- AI delivery strategy and acceptable quality/risk envelope.
- Translation licensing strategy and paid or external service commitments.
- Confirmation and documentation of the code license and bundled KJV provenance/rights.
- Production infrastructure, spending, credentials, permissions, and release policy.
- High-cost migrations, destructive data changes, and breaking public interfaces.
