# TASK-0010: Review Native TestFlight Release

- **Role / owner:** Reviewer / independent read-only reviewer
- **Task state:** Integrated
- **Delivery state:** Integrated
- **Risk / reversibility:** Read-only review of a consequential native release entry/version change
- **Parent objective:** [TASK-0009](0009-native-reader-testflight.md), directly authorized internal TestFlight beta

## Objective

Confirm the release delta delivers native reading in TestFlight without changing data, signing identity, audience, content, web deployment, or unrelated work.

## Ownership Boundary

Read-only review of TASK-0009, ADR-0003, `ExegesApp.swift`, Xcode version settings, native release docs, and available release-check/archive evidence. Existing reader implementation is accepted under TASK-0007/0008. No edits, uploads, account mutations, or concurrent simulator work.

## Dependencies

Accepted TASK-0007/0008 -> CEO internal beta directive -> TASK-0009 root/version delta and verification. Archive may be pending at initial review; integrator must check final artifact before upload.

## Interface Contract

Native root in Release; unchanged marketing version/identifier/signing; new build 3; DEBUG-only test fixtures excluded; no migration/deletion; current internal audience only. No commit/push or Pages deployment.

## Acceptance Criteria

Actual entry/version diff matches intent. Prior feature checks remain applicable. Release checks and known risks are accurately reported. Credentials remain external; final archive/version/profile/corpus inspection is a required upload prerequisite.

## Verification

Inspect actual source/settings/diff and relevant logs under `/private/tmp/exeges-testflight-*`. May run focused read-only checks. Do not invoke upload, modify credentials, or interfere with active Xcode verification.

## Non-Goals

No implementation or broader product/website review, new feature scope, migration, or external communication.

## Approval Gates

Return findings and verdict to repository lead. No external mutations authorized for Reviewer.

## Stop Conditions

Report missing evidence, privacy/signing/audience/content changes, or mismatched artifact assumptions. Do not mark unavailable device evidence passed.

## Required Handoff

Pass / Pass with known risk / Fail; actionable prioritized findings; inspected evidence; remaining release limitations and artifact gates.

## Final Review (2026-11-02)

**Pass with known risk.** The Reviewer found no source/configuration findings. Native root is unconditional, both app configurations use 1.0.0 (3), the distribution identity/identifier/export options are unchanged, and no migration/deletion or DEBUG fixture leakage was found. Independently repeated 34 Foundation assertions and whitespace checks passed. Archive identity, device families, corpus, profile and signed entitlements match the contract.

The Reviewer's restricted certificate trust lookup returned CSSMERR_TP_NOT_TRUSTED; the Integrator repeated strict/deep signature verification with the Mac's trust services and it succeeded for both the archive and exported IPA. The distribution profile is Exeges App Distribution, expires 2027-08-02, and debugging is disabled. The final exported IPA was inspected for version/identifier, identical corpus, absence of fixture strings/test bundles/key files, and checksum stability before upload. A Release-configuration native navigation/visible-resume/restart simulator test also passed.

Remaining limits are physical-device/older-runtime behavior, deferred migration, incomplete feature parity, and unresolved corpus provenance/licensing for broader distribution. No new audiences, public App Store release, or web deployment are included. Apple processing and internal group availability remain integrator acceptance checks after upload.
