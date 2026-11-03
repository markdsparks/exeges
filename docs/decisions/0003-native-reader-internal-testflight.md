# ADR-0003: Publish The Native Reader As An Internal TestFlight Beta

- **Status:** Accepted for this internal beta
- **Date:** 2026-11-02
- **Owner:** CEO
- **Related brief/spec:** [TASK-0009](../coordination/tasks/0009-native-reader-testflight.md), [ADR-0002](0002-native-reader-proof.md)

## Context

The native reader proof passed independent review and simulator verification. ADR-0002 kept Release opening the existing web shell until a separate cutover decision. The CEO now directs: “get a testflight build out, I don't care about any local data for now.” Existing App Store Connect configuration has one internal Exeges Testers group with access to all builds.

## Decision Drivers

Get the native reading experience onto physical iPhone/iPad for testing; avoid delaying this internal beta for data migration or full feature parity; preserve existing data without a destructive reset; retain established signing and internal distribution.

## Options Considered

- Continue only local simulator work: does not meet the explicit TestFlight directive.
- Upload the unchanged Release entry: would open the old web shell and fail the intended native test.
- Make native reading the Release root and publish an internal beta: chosen.

## Decision

For 1.0.0 (3), NativeReaderView becomes the root in both Debug and Release. This supersedes ADR-0002's Debug-only entry restriction for the internal beta. Defer migration/import/export and accept the current KJV reading/notes/appearance/navigation scope. Leave existing website and native data untouched; Existing Exeges remains available from the menu. Use the existing app identifier, signing, export configuration, and internal Exeges Testers audience. Do not publish an App Store release or alter GitHub Pages.

## Consequences

Testers can assess real-device native behavior. Existing material is not automatically transferred into native reading, and ESV/study/AI/search/bookmarks/path parity is incomplete. Prior physical-device evidence gaps motivate this beta; they are not retroactively marked verified. Corpus provenance/licensing and broader release readiness remain open and are not represented as resolved.

## Validation And Reversal

Run release checks and independent review, inspect the signed archive, upload with the existing workflow, and verify Apple's processing/internal beta state. If a follow-up build needs the existing shell root, restore that entry in a separately authorized build; no website data has been cleared. Distribution of this beta is authorized by the latest directive; future uploads and broader release retain their approval gates.
