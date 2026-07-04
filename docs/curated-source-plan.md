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
Run `npm run build:study-sources` to regenerate `src/data/generatedStudySourceChunks.js`.

Each source chunk should include:

- `id`
- `sourceId`
- `title`
- `routeIds`
- `terms`
- `references`
- `text`
- source metadata: label, URL, license, attribution needs

The retrieval layer can run fully local. A future on-device SLM should only synthesize from the selected passage context plus retrieved source chunks, and should return structured fields for context, meaning, guardrail, citations, and confidence.

`src/lib/studySynthesisRequest.js` defines the model-facing request shape. The important constraint is that a model receives an observation, a route, and retrieved source chunks. It should not browse freely or answer from uncited memory.
