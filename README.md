# Exeges

Exeges is a reader-first Bible application built with React and Vite. It keeps Scripture visually primary and lets a reader intentionally move into notes, related passages, attributed commentary and study notes, and source-grounded study help.

The product is currently an internal alpha. Its original family-reader purpose and its emerging broader study audience have not yet been resolved into a final market promise.

## Start Here

- [Project operating system](docs/operating-system/README.md)
- [Project charter](docs/operating-system/project-charter.md)
- [Product direction](docs/operating-system/product-direction.md)
- [Engineering context](docs/operating-system/engineering-context.md)
- [Current coordination status](docs/coordination/STATUS.md)
- [Module and contract map](docs/architecture/MODULES.md)
- [Curated source plan](docs/curated-source-plan.md)

## Current Product

- Complete local KJV text and remotely loaded ESV through a private proxy.
- Immersive chapter reading, search, bookmarks, notes, saved studies, and chapter navigation.
- Reader-first study threads opened from a verse or phrase.
- Related Scripture resolved in the selected translation where available.
- An explicit Explore view with reader-selected public-domain commentary and CC BY-SA Tyndale study notes, distinct emphases, and exact-quote evidence for examining possible disagreement.
- Grounded passage questions assembled from passage context, related Scripture, and scoped commentary excerpts.
- Experimental on-device language-model synthesis, kept optional behind source-visible grounding.
- GitHub Pages web distribution and a thin iOS TestFlight shell.

User state is stored in browser local storage. There are no accounts, cloud sync, analytics, or general automated test suite today.

## Local Development

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm run check
npm run check:full
```

See [engineering context](docs/operating-system/engineering-context.md) for architecture, data flows, release paths, and known risks.

## Licensing

Bible translations and study sources retain their own licenses and attribution requirements. In particular, do not commit or redistribute ESV text; Exeges accesses it through the licensed API proxy described in [docs/esv-proxy.md](docs/esv-proxy.md).

The earlier README described the application code as MIT, but no `LICENSE` file or provenance record for the bundled KJV corpus is present. Treat both as unresolved release-readiness items until the CEO confirms them and the repository records the result.
