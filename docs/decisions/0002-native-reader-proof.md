# ADR-0002: Stage A Native iPhone And iPad Reader Proof

- **Status:** Accepted for the bounded local proof
- **Date:** 2026-11-02
- **Owner:** CEO for native direction and first build; lead for reversible implementation details
- **Related brief/spec:** [D-007](../coordination/DECISION_INBOX.md#d-007-fully-native-app-iphone-and-ipad-first), [TASK-0007](../coordination/tasks/0007-native-reader-proof.md)

## Context

The current iOS app is a SwiftUI host for a WKWebView loading GitHub Pages. Reader data lives in website storage; native screens cannot treat it as an existing Swift data store. The CEO requested a fully native app, confirmed iPhone/iPad first, then approved the proposed first reader build with a data-preservation plan.

## Decision Drivers

Quiet Scripture-first reading; real native interactions; recoverable private data; a reviewable first proof; no production cutover before verification; no new service or dependency.

## Options Considered

- Keep extending the hosted-web shell: preserves behavior but does not deliver the approved native direction.
- Port all features at once: larger unverified scope, especially data migration, source delivery, and experimental AI.
- Stage a native reader proof: provides an inspectable reading experience while preserving the existing app and data.

## Decision

Use SwiftUI for the native reader proof inside the existing iOS project. Decode the unchanged local KJV corpus as an app resource. Use a small versioned Codable JSON document in a separate Application Support directory for position, native notes, and appearance. Atomic writes must succeed before a save is reflected; corrupt/future-version data fails closed without deletion. A database framework is unnecessary for this bounded document; revisit with later data/import requirements.

Debug opens native reading. Release continues opening the existing web shell; no release topology, signing, identifier, deployment, or TestFlight change. Keep the shell accessible during development. Do not migrate or clear website data. Existing backup version 1 and web keys remain unchanged. Document the compatibility mapping and later additive migration gates before cutover.

## Consequences

- The first build proves native Scripture reading, navigation, a note, typography, and resume across restart.
- Content records, canonical references, and behavior expectations remain reusable; React UI and browser-specific storage/model code are not native implementations.
- This proof supports KJV only and does not provide feature parity, ESV, study, sync, or automatic transfer. It is not ready to replace the current release.
- Existing KJV provenance and licensing questions remain unresolved; internal reuse makes no new redistribution claim. External distribution requires the existing licensing/release gates.

## Validation And Reversal

Exercise native data logic and real-corpus fixtures, simulator builds and iPhone/iPad journeys, then independent review. Physical-device accessibility, performance, and migration evidence are release gates. The Release entry and website data remain intact, so the proof can be revised or withdrawn without a destructive migration.
