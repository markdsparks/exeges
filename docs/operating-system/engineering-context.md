# Engineering Context

## System Architecture

Exeges is a React 19 single-page application built by Vite 8 and hosted under the `/exeges/` GitHub Pages base path. It has no application backend. A Cloudflare Worker proxies licensed ESV API calls, public commentary is fetched at runtime, and an optional Web Worker runs on-device WebLLM synthesis. A native iOS WKWebView shell loads the hosted web app.

## Components And Boundaries

- `src/App.jsx`: top-level navigation, translation, overlays, study-thread state, and reader orchestration.
- `src/components/Reader` and `Navigation`: Scripture display and movement through books, chapters, and reference history.
- `src/components/Search` and `Notes`: focused user workflows around the reader.
- `src/components/Study`: current reader-first thread plus legacy guided-study UI.
- `src/hooks`: UI-facing state and persistence boundaries.
- `src/lib`: pure or service-like translation, source retrieval, grounding, audit, commentary, and synthesis logic.
- `src/data/bible.json`: full local KJV corpus; large and sensitive to accidental churn.
- `sources/study`, `scripts`, and generated packs: source ingestion and static retrieval substrate.
- `workers/esv-proxy.js`: only approved boundary for browser ESV access.
- `native/ios`: native shell, signing configuration, and TestFlight workflow.

`src/lib` should own data transformation and grounding rules; components should own presentation and interaction. Hooks bridge persistent/browser state to the UI. Keep licensed or network-specific behavior behind its existing adapter.

## Important Data Flows

### Reading And Persistence

The local KJV corpus loads into browser memory. Book/chapter navigation updates the URL hash. The app stores a validated local reading position containing book, chapter, and the verse nearest the reader's reading line; legacy book/chapter positions are accepted and upgraded as a reader continues. A valid URL reference always takes precedence over that local resume state. Notes, bookmarks, studies, translation, theme, and font preferences persist in local storage only.

Readers can export a versioned JSON backup of that private local data and restore it from the menu. Restore is additive: local notes win conflicts, bookmarks and distinct observations are combined, and a backup's reading place and preferences are restored when present. Licensed ESV wording, ESV responses, study source packs, and local-model assets are never exported. This is user-managed portability, not account sync or automatic recovery.

### ESV

The selected reference goes from the browser to the configured ESV Worker URL. The Worker adds the secret API token, calls the ESV API, normalizes passage/search results, and returns them to the app. ESV text must not enter committed source packs or long-lived storage.

### Grounded Study

The selected verse or phrase establishes local passage context. Retrieval adds curated/OpenBible records only when their own passage anchor matches the selected reference or chapter, plus resolved related Scripture and on-demand commentary excerpts. `commentaryComparison.js` creates a deterministic extractive overview and a bounded comparison packet. Passage questions return a deterministic, passage-first starting point before a reader may opt into a local model pass. The optional local model is dynamically loaded only after a reader explicitly requests that pass, a local draft, or a commentary comparison. Commentary-comparison groups are accepted only when every group is supported by exact quotations from multiple named commentary cards; other local drafts remain clearly labeled experimental second passes alongside their retrieved source material.

### Source Generation

Committed curated records and raw OpenBible input are validated and transformed into a bundled fallback plus ignored, versioned static chapter packs. `predev` and `prebuild` regenerate those artifacts.

## External Dependencies

- Crossway ESV API through the Cloudflare Worker.
- HelloAO Bible API for public-domain commentary delivery.
- OpenBible.info cross-reference data.
- GitHub Pages and Actions for web release.
- Apple Developer/App Store Connect for TestFlight.
- WebGPU and `@mlc-ai/web-llm` for optional local synthesis.

External availability, licensing, payload shape, and attribution are part of each integration contract. Do not silently replace a source or service.

## Local Development

Use the Node version compatible with the lockfile and Vite 8; CI currently uses Node 25.

```bash
npm ci
npm run dev
```

The source ZIP at `sources/study/raw/openbible-cross-references.zip` and the host `unzip` utility are required by the current predev/prebuild pipeline. Those hooks regenerate source artifacts, including a tracked JavaScript fallback, so inspect the worktree before and after running them. The local app normally runs at `http://localhost:5173`.

## Testing Strategy And Command Matrix

| Change | Required checks |
| --- | --- |
| Documentation or agent config only | Validate links/config syntax; inspect diff |
| React, hooks, styles, general UI | `npm run lint`; `npm run build`; manual affected journey at desktop and mobile widths |
| Search, navigation, persistence, translation | Above plus focused success, empty, error, refresh, and back-navigation checks; run the relevant focused benchmark such as `npm run bench:reading-position` or `npm run bench:user-backup` |
| Source schema, ingestion, or retrieval | `npm run lint`; `npm run build`; `npm run bench:study-sources` |
| Grounding, audit, prompt, or synthesis | `npm run lint`; `npm run build`; relevant source, synthesis, and commentary-comparison benchmarks; inspect representative raw evidence and output |
| Dependency or release readiness | Above as applicable; `npm audit --audit-level=high`; `npm audit --omit=dev`; review lockfile and license impact |
| Worker | Local request/response and CORS/error-path checks; never use a real token in committed fixtures |
| Native iOS shell | Web checks plus Xcode build and relevant real-device behavior; TestFlight upload only when explicitly authorized |

There is no general test runner, unit-test suite, end-to-end suite, separate type checker, coverage target, or CI lint gate. Add focused tests alongside risky new logic rather than claiming nonexistent coverage.

## Deployment Path

A push to `main` triggers `.github/workflows/deploy-pages.yml`, installs dependencies, builds with the configured `VITE_ESV_PROXY_URL`, and deploys `dist/` to GitHub Pages. The iOS release app loads that URL, so normal web deploys alter its behavior without a new native binary. Native-shell or App Store metadata changes use `scripts/exeges-testflight.sh` and require signing credentials and explicit authorization.

## Known Technical Risks And Debt

- No automated regression suite or pre-merge CI quality gate beyond the production build.
- CI uses `npm install` rather than the stricter lockfile-only `npm ci`.
- The current dependency audit reports two high-severity build-chain advisories through Vite (`nanoid` and `postcss`); production dependencies audit clean.
- `App.jsx` and the legacy `StudyMode.jsx` are large, stateful ownership hotspots.
- Legacy guided-study code remains despite the reader-first product pivot.
- Browser local storage still has no automatic sync, migration, or quota strategy. Versioned user-managed export/restore is available, but recovery remains dependent on a reader keeping their backup file.
- The KJV corpus and WebLLM produce large download/memory pressure; iOS WebGPU has crashed during model loading.
- Runtime commentary depends on a third-party API with no documented availability contract.
- The ESV Worker needs an explicit production security and licensing review for origin policy, abuse/rate controls, input bounds, logging, caching, error disclosure, and required attribution/link behavior.
- Generated source packs are ignored, making reproducibility dependent on the committed raw input and generator behavior.
- Imported sources do not yet have committed checksums and exact license/provenance manifests; the bundled KJV has no committed edition/source record.
- The web app has no content security policy, and the iOS web view does not yet enforce an explicit host/scheme allowlist.
- The repository has no `LICENSE` file even though its former README described the application code as MIT.
- Source/editorial review is not yet a formal workflow; hand-reviewed coverage is small.
- No analytics or structured feedback pipeline exists to validate product outcomes.
