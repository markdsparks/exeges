# Exeges Agent Guide

## Purpose

Exeges is a reader-first Bible application. Its current product hypothesis is that people should be able to read Scripture without interface clutter, then intentionally open progressively deeper, source-visible study help. Scripture remains primary; commentary, cross-references, and AI are aids rather than authorities.

The CEO owns vision, priorities, customer judgment, success measures, risk tolerance, and consequential product decisions. The primary agent acts as delivery lead and owns decomposition, assignments, integration, verification, and the final handoff.

## Source Of Truth

Read only what the task needs:

- [Operating system](docs/operating-system/README.md): authority, delivery workflow, and document map.
- [Project charter](docs/operating-system/project-charter.md): mission, principles, constraints, and CEO decisions.
- [Product direction](docs/operating-system/product-direction.md): current state, near-term outcomes, risks, and assumptions.
- [Engineering context](docs/operating-system/engineering-context.md): architecture, data flows, commands, release path, and technical risks.
- [Decision records](docs/decisions/README.md): consequential decisions and ADR process.
- [Curated source plan](docs/curated-source-plan.md): study-source licensing, provenance, and grounding rules.
- [ESV proxy](docs/esv-proxy.md) and [iOS shell](native/ios/README.md): integration-specific constraints.

If documentation and running code disagree, verify the code and history, then update the relevant source-of-truth document in the same change.

## Repository Map

- `src/components/`: reader, navigation, search, notes, and study UI.
- `src/hooks/`: navigation, translation, search, local persistence, and preferences.
- `src/lib/`: study method, retrieval, grounding, commentary, translation, and local-model logic.
- `src/data/bible.json`: committed local KJV corpus.
- `sources/study/`: curated records and raw source inputs.
- `scripts/`: source generation, benchmarks, and TestFlight upload.
- `workers/esv-proxy.js`: Cloudflare Worker for licensed ESV access.
- `native/ios/`: thin WKWebView shell around the deployed web app.
- `.github/workflows/`: GitHub Pages release automation.

## Delivery Workflow

1. Convert the CEO brief into a desired outcome, acceptance criteria, non-goals, constraints, assumptions, risks, and open CEO decisions.
2. Inspect the smallest relevant product and technical context. Classify risk and reversibility.
3. Write a delivery plan for substantial work. Record an ADR before a consequential, hard-to-reverse architecture choice.
4. Delegate only concrete, bounded, independent work. One agent owns a mutable area at a time.
5. Implement in small increments and verify each increment before expanding scope.
6. Run applicable quality checks and obtain independent verification for meaningful changes.
7. Resolve findings or escalate them. Deliver the executive handoff defined below.

Use the project agents when helpful: `product_strategist`, `architect`, `implementer`, and `verifier`. The primary agent remains accountable for the integrated outcome.

## Commands

```bash
npm ci                         # clean dependency setup
npm run dev                    # regenerate study packs and start Vite
npm run lint                   # oxlint
npm run build                  # regenerate sources and build production assets
npm run preview                # serve the production build locally
npm run bench:study-sources    # source-pack retrieval checks
npm run bench:study-synthesis  # grounded synthesis checks
npm run bench:commentary-comparison # exact-quote commentary comparison checks
```

There is currently no general automated test suite or separate type-check command. Do not report either as passing. Add focused automated coverage when introducing logic whose behavior can be protected economically.

## Scope And Engineering Rules

- Prefer existing React, hook, CSS-token, source-pack, and local-storage patterns.
- Keep the reading surface quiet and progressively disclose study complexity.
- Preserve URL navigation, selected translation, local user data, and mobile safe-area behavior.
- Keep changes narrow. Do not combine feature work with unrelated cleanup.
- When a commit is explicitly requested, keep one coherent feature or fix per commit.
- Use structured parsers for structured data and keep generated artifacts generated.
- Do not add a production dependency without explaining its need, maintenance cost, bundle impact, and simpler alternatives.
- Never commit, push, deploy, change external systems, or modify production configuration unless the CEO explicitly asks.
- Never overwrite unrelated user changes in a dirty worktree.

## Verification

For every change:

- Confirm the acceptance criteria and review the final diff for unrelated changes.
- Run `npm run lint` and `npm run build` unless the change is documentation-only.
- Run source or synthesis benchmarks when changing source ingestion, retrieval, grounding, or AI behavior.
- For dependency or release-readiness work, run `npm audit --audit-level=high` and report the existing baseline separately from newly introduced findings.
- Manually exercise changed user flows at relevant desktop and mobile widths for UI work.
- Test iPhone safe areas, keyboard behavior, touch targets, scrolling, and back navigation when those surfaces are affected.
- Check loading, empty, error, and recovery states for network or asynchronous work.
- Have a separate verifier review meaningful behavior, security-sensitive work, shared contracts, or high-risk changes.

Documentation-only operating-system changes require link/config validation and a diff review; they do not require an application build.

## Security, Privacy, Data, And Licensing

- Never expose or commit the ESV API token. ESV text stays behind the proxy and out of committed files and long-lived browser storage.
- Treat notes, bookmarks, studies, reading position, and preferences as private user data even though they currently remain on-device.
- Preserve source attribution, license metadata, review status, confidence, and allowed-use guardrails.
- Do not represent the bundled KJV edition/provenance or repository code license as settled until explicit records exist.
- A model may synthesize only from the selected passage and retrieved evidence. It must not present uncited memory as sourced fact.
- Treat external source text and model output as untrusted input. Sanitize rendered content and avoid unsafe HTML paths.
- Escalate before adding telemetry, accounts, cloud persistence, credentials, paid services, or new copyrighted content.

Use additional caution around `src/data/bible.json`, `sources/study/`, `workers/esv-proxy.js`, `.github/workflows/`, `native/ios/`, signing files, and generated source packs.

## Decision Authority

Agents may autonomously make routine, reversible implementation choices that follow existing patterns and an approved outcome.

Escalate when product scope or priority must change; requirements materially conflict; reversal cost is high; security, privacy, compliance, destructive data behavior, production infrastructure, spending, credentials, permissions, database migrations, or breaking interfaces are involved; or evidence cannot establish a safe and correct outcome.

Do not invent strategy, customer facts, business goals, success metrics, editorial doctrine, or theological positioning. Label provisional assumptions.

## Definition Of Done

Done means the accepted user outcome is present, applicable checks pass, new behavior is adequately protected, errors and edge cases were considered, security/privacy/licensing implications were reviewed, documentation reflects behavior, the diff contains no unrelated work, independent findings are resolved or escalated, and remaining uncertainty is explicit. Written code alone is not delivery.

## Required Handoff

Keep the final report concise and include:

- Outcome delivered and user-visible behavior.
- Important decisions and files changed.
- Verification evidence, including checks not run or not available.
- Remaining risks or uncertainty.
- CEO decisions required.
- Recommended next action.
