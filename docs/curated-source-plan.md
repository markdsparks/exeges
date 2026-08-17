# Curated Study Sources

This is the source plan for Exeges study grounding. The core rule: the model is never the authority. The authority order is passage context, curated source chunks, then cautious synthesis.

## Initial Source Candidates

- Easton's Bible Dictionary: public-domain Bible dictionary. Useful for people, places, and terms, but it is old enough that claims should stay modest and should not be treated as current scholarship.
- Smith's Bible Dictionary: public-domain Bible dictionary. Similar use case and similar age caution.
- OpenBible.info Cross References: cross-reference dataset based primarily on public-domain sources such as Treasury of Scripture Knowledge, with site content licensed CC BY unless otherwise indicated.
- OpenBible.info Bible Geocoding Data: place/geography dataset licensed CC BY 4.0, useful for place disambiguation and geography helpers.

## Not Yet Approved

- BibleHub pages: useful for browsing, but not approved for bulk import.
- Modern lexicons and study Bible notes: likely copyrighted or restrictively licensed unless explicitly licensed.
- ESV text: use only through the existing licensed API/proxy path; do not import full text into source packs.

## Explorer Commentary

The Explorer gathers one passage-scoped excerpt from each available public-domain commentary. When more than one source is available, it presents their shared attention and distinct emphases before the raw source text. With one source, it presents a named perspective without implying consensus or disagreement. This is reader-visible source material, not automatically trusted authority: a user may inspect it, make a note, and decide how it bears on the passage.

- Matthew Henry Bible Commentary: public-domain text, delivered at runtime by the HelloAO Bible API.
- John Calvin's Commentaries: public-domain text, delivered at runtime by the HelloAO Bible API where available.
- Jamieson-Fausset-Brown: public-domain text, delivered at runtime by the HelloAO Bible API.
- Keil & Delitzsch: public-domain Old Testament commentary, delivered at runtime by the HelloAO Bible API.
- Tyndale Open Study Notes: modern English study notes, book introductions, profiles, and theme articles, delivered at runtime by the HelloAO Bible API. The original work is attributed to Tyndale House Publishers and licensed CC BY-SA 4.0. It is shown as **Study notes**, not historical commentary; its attribution and license link are rendered alongside every displayed excerpt, including model-comparison evidence.

The UI preserves each source's attribution and source link. It loads only the current chapter after the reader opens Explore; it does not bulk-import the corpus into GitHub Pages assets. A separate progressively disclosed control still lets the reader inspect one full commentary at a time. Pulpit Commentary remains a future import after we identify and audit a reliable structured source.

The default overview is deterministic and extractive. It may describe shared terms and show one representative passage from each selected source, but it does not infer direct disagreement or an author's reason for differing. The reader chooses one to three source voices; a two-source pair is suggested, with Tyndale preferred when it matches the passage. When the reader explicitly requests a deeper comparison, the optional on-device model receives only that selected set and may group agreement and distinct emphasis using exact quotations from at least two named source cards. A model-suggested disagreement is conservatively shown as a difference of emphasis until a deterministic contradiction check exists. Claims about why sources differ use a constrained reason category and are downgraded to unclear unless the supplied excerpts contain supporting evidence.

The passage-question helper may assemble a temporary, attributed evidence packet only after a user asks a focused question. It includes the selected passage context, a small set of resolved related Scriptures, and one scoped excerpt from each available commentary source. The response exposes every excerpt it used. Raw commentary is not added to the persistent study-source packs and does not silently shape the default curated draft.

## Engineering Shape

Hand-curated source records live in `sources/study/curated-records.json`.
Large source inputs live under `sources/study/raw/` and generate ignored import artifacts under `sources/study/imported/`.
Run `npm run build:study-sources` to regenerate:

- `src/data/generatedStudySourceChunks.js` for the current bundled fallback path.
- `public/study-packs/v1/manifest.json` plus chapter/global JSON shards for future static or object-storage loading.

The first large import is OpenBible.info Cross References:

- Source file: `sources/study/raw/openbible-cross-references.zip`.
- Import command: `npm run import:openbible-crossrefs -- --input=sources/study/raw/openbible-cross-references.zip`.
- Build behavior: `npm run build:study-sources` imports the ZIP, then rebuilds the bundled fallback and static packs.
- Scope: one static-only source record per OpenBible source verse, using the top voted cross-reference targets from the 344,799 imported edges.
- Delivery: imported OpenBible records are `delivery: "static"` so they appear in chapter shards but stay out of the JavaScript bundle.

Each SourcePack v2 record should include:

- `id`
- `sourceId`
- `title`
- `routeIds`
- `terms`
- `references`
- `text`
- `license`
- `attribution`
- `sourceUrl`
- `confidence`: `low`, `medium`, or `high`
- `reviewStatus`: `draft`, `reviewed`, or `needs-review`
- `allowedUse`: the model-facing guardrail for how this source may be used

The generator validates these fields and shards records by parseable Bible references. Records with no specific reference become `global.json` method/background cards. Records that reference multiple chapters are duplicated into each relevant chapter shard so a future loader can request only `global.json` and the current chapter pack.

## Storage Path

Use this order:

1. Keep the current bundled JS path for the small test corpus.
2. Move runtime retrieval to static chapter packs under `public/study-packs/v1/` once the corpus grows beyond what we want in the JavaScript bundle.
3. Promote the same `study-packs/v1` tree to Cloudflare R2 when the corpus becomes too large for GitHub Pages assets or needs independent source-pack updates.

`public/study-packs/` and `sources/study/imported/` are generated and ignored. CI and local builds recreate them from committed source files before Vite builds the app.

Cloudflare roles should stay simple:

- R2: canonical versioned JSON/source-pack blobs.
- D1: optional source registry and import job metadata if we need admin workflows.
- KV: tiny manifests or feature flags only, not the corpus.
- Vectorize: later, after we have evaluation sets proving semantic retrieval helps more than well-structured per-chapter packs.

Do not store full ESV text in source packs. ESV should continue through the licensed API/proxy path; source packs may store references, public-domain/open-licensed context, method notes, and curated non-ESV claims.

The retrieval layer can run fully local. A future on-device SLM should only synthesize from the selected passage context plus retrieved source chunks, and should return structured fields for context, meaning, guardrail, citations, and confidence.

`src/lib/studySynthesisRequest.js` defines the model-facing request shape. The important constraint is that a model receives an observation, a route, and retrieved source chunks. It should not browse freely or answer from uncited memory.

`src/lib/localStudySynthesis.js` is the experimental on-device synthesis adapter. It lazy-loads WebLLM only after the user explicitly requests a local draft, a local passage-answer pass, or a commentary comparison; it uses a small WebGPU model and asks for structured output from the grounded packet.

`src/lib/commentaryComparison.js` owns passage-level commentary selection, the extractive overview, comparison request construction, and deterministic validation of model-produced comparison groups. Run `npm run bench:commentary-comparison` when changing this contract.
