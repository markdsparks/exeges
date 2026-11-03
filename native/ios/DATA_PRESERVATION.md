# Native Reader Data Preservation Plan

- **Status:** Plan for later migration; no existing user data imported by the native proof
- **Owner:** Repository lead; CEO approves any migration and release cutover
- **Related decision:** [ADR-0002](../../docs/decisions/0002-native-reader-proof.md)

## Current Proof Boundary

Debug and Release open a KJV-only native reader under the authorized internal beta cutover in [ADR-0003](../../docs/decisions/0003-native-reader-internal-testflight.md). The CEO deferred local-data transfer for this beta; existing data is left untouched. The native reader can open Existing Exeges to access its current features and saved material. It neither clears WebKit website data nor reads/writes browser local-storage keys. Switching surfaces is not sync: native proof notes and reading position are separate from the existing app.

The proof stores a version-1 Codable JSON document at `Application Support/NativeReader/reader-state-v1.json` inside the existing app container. Fields are `version`, `position`, `fontSize`, `theme`, and `notes`. Notes use canonical `bookId-chapter-verse` keys and `{ text, updatedAt }` with millisecond timestamps. The native file is not the existing web backup format and is not currently exported. Saves use atomic replacement and iOS file protection; an unsupported/corrupt document blocks writes instead of resetting it. Keep the same bundle identifier and app container during the eventual upgrade. Uninstalling remains destructive to local app data.

TASK-0011 adds an independent bookmark document: `{ version: 1, bookmarks: { canonicalVerseKey: millisecondTimestamp } }`. A corrupt/future bookmark document is left untouched and disables bookmark changes, with local retry; it does not block the reader/note document. Older native build 3 ignores the separate bookmark file rather than rewriting it. Search index/results/query remain memory-only and require no data transfer.

## Compatibility Inventory

| Existing saved material | Native proof handling | Required before cutover |
| --- | --- | --- |
| `exeges-notes` strings or `{ text, updatedAt }` | Separate native notes use compatible IDs and object fields | Normalize legacy strings; additive import with local-note conflict protection; verify counts/content and cancellation |
| `exes-position` with optional legacy verse | Native uses the same canonical IDs with required chapter/verse | Validate against corpus; use verse 1 only for valid chapter-only records; offer an explicit starting place when both stores have positions |
| `exes-font-size`, `exes-theme` | Same supported sizes and `auto`/`light`/`dark` values in the native document | Import supported preferences without discarding source settings; handle unavailable values explicitly |
| Translation preference | Proof is explicitly labeled KJV; existing preference is untouched | Add ESV via approved licensed boundary before promising translation parity; never silently convert saved ESV preference to KJV |
| Bookmarks | Local native bookmark behavior uses separate `NativeReader/bookmarks-v1.json`; existing web material is not imported | Validate an additive import/conflict policy and canonical keys; preserve the source store |
| Studies and personal study threads | Kept in website storage/backup; not displayed natively | Preserve user writing, question intent, observations, selections, privacy flags, IDs, and timestamps; retain ESV redaction guardrails |
| Mark reading-path progress | Existing local work is preserved, paused in Review | Verify current web contract; port explicit chapter progression and backup merge rules without automatic completion |
| Backup envelope `exeges-user-backup`, version 1 | No import/export in this proof | Preserve existing version-1 parser/limits/redaction behavior; support all material before calling a restore complete |

## Two Distinct Transfer Paths

1. **Upgrade within this iOS app:** A later bounded migration can read the existing origin's WebKit data in the same installed app container. It must confirm the correct data store and origin and inventory what is present; it cannot assume access to Safari/other browsers. Read-only extraction precedes a dry-run report and staged native write. Do not remove website data after transfer.
2. **Another browser/device:** The reader exports the existing version-1 backup and explicitly selects it in the native app. File selection is required; the native app must not promise it can read another app/browser's private storage. Use a complete validated import, not a notes-only restore that silently drops studies/bookmarks/path progress.

Neither path is implemented or implicitly approved here. No account, cloud service, telemetry, or sync is introduced.

## Migration And Release Gates

- Agree on complete feature/data coverage and conflict policy before accepting a migration contract. The baseline is additive restore with local notes winning same-passage conflicts; report conflicts rather than silently overwriting them.
- Exercise empty, malformed, oversized, old/future-version, duplicate, conflicting, and interrupted imports against fixtures. Reject unsupported files without partial mutation.
- Snapshot source material and stage/validate destination before atomically committing a migration. Record an idempotent migration receipt only after success. Preserve unknown/future data or reject the import explicitly.
- Verify user writing, IDs, counts, selected translation, reading place, and supported preferences after restart. Review licensed source text handling and ensure ESV wording is not persisted through migration/backup.
- Provide native export/recovery before readers rely on the new store. Test downgrade/recovery: the current shell cannot display native-only proof notes, so do not promise automatic rollback sync.
- Test the actual upgrade on physical iPhone and iPad with representative private data, explicit reader consent where needed, and independent review. Simulator proof alone is insufficient.
- Resolve corpus provenance and relevant translation/source licensing before broader distribution. KJV reuse in this internal proof makes no new provenance or licensing claim.
- D-008 / ADR-0003 authorize the native Release entry and one internal TestFlight upload with migration deferred. Complete transfer and broader-distribution gates remain future work. Commit, push, later signing/service changes, and future uploads retain their approval gates.
