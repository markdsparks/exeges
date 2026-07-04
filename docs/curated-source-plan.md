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

## Engineering Shape

Raw curated source records live in `sources/study/curated-records.json`.
Run `npm run build:study-sources` to regenerate:

- `src/data/generatedStudySourceChunks.js` for the current bundled fallback path.
- `public/study-packs/v1/manifest.json` plus chapter/global JSON shards for future static or object-storage loading.

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

Cloudflare roles should stay simple:

- R2: canonical versioned JSON/source-pack blobs.
- D1: optional source registry and import job metadata if we need admin workflows.
- KV: tiny manifests or feature flags only, not the corpus.
- Vectorize: later, after we have evaluation sets proving semantic retrieval helps more than well-structured per-chapter packs.

Do not store full ESV text in source packs. ESV should continue through the licensed API/proxy path; source packs may store references, public-domain/open-licensed context, method notes, and curated non-ESV claims.

The retrieval layer can run fully local. A future on-device SLM should only synthesize from the selected passage context plus retrieved source chunks, and should return structured fields for context, meaning, guardrail, citations, and confidence.

`src/lib/studySynthesisRequest.js` defines the model-facing request shape. The important constraint is that a model receives an observation, a route, and retrieved source chunks. It should not browse freely or answer from uncited memory.

`src/lib/localStudySynthesis.js` is the experimental on-device synthesis adapter. It lazy-loads WebLLM only after the user taps the local draft action, uses a small WebGPU model, and asks for structured output from the grounded packet.
