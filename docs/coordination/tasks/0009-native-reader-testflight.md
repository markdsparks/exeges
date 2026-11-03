# TASK-0009: Native Reader Internal TestFlight Build

- **Role / owner:** Integrator / repository lead
- **Task state:** Shipped
- **Delivery state:** Shipped
- **Risk / reversibility:** Medium; changes native Release entry and uploads an internal beta; existing website data is left untouched
- **Parent objective:** CEO directive on 2026-11-02: “get a testflight build out, I don't care about any local data for now”

## Objective

Make Exeges 1.0.0 (3) available to the existing internal Exeges Testers group through TestFlight, opening the native KJV reader by default. Defer existing-data migration for this beta.

## Ownership Boundary

One writer: repository lead. May update `native/ios/ExegesApp/ExegesApp.swift`, build numbers in the existing Xcode project, native release/preservation documentation, and relevant architecture/coordination/decision records. Use the existing signing, bundle identifier, App Store Connect app, export options, and upload workflow. Do not alter unfinished web/Mark work, Bible/source content, dependencies, proxy, CI, or private stored material. No commit/push or Pages deployment is authorized.

## Dependencies

TASK-0007 integrated + TASK-0008 passed with known risk -> native Release entry/build number -> archive/configuration verification and independent release review -> signed archive/export/upload -> Apple processing and existing internal group availability.

## Interface Contract

- NativeReaderView is the root in Debug and Release; Existing Exeges remains available in the preview menu.
- Build number 3 is consistent across app configurations; marketing version remains 1.0.0 and bundle ID remains `app.exeges.ios`.
- Keep all DEBUG-only UI-test fixtures excluded from Release. Do not reset, clear, or migrate website/native private data. The CEO's local-data direction defers transfer, not an instruction to delete it.
- Upload an internal-only TestFlight artifact using the existing `Exeges Testers` group; do not create audiences, invite new people, enable public links, or submit an App Store release.
- Credentials/signing remain outside source. Inspect the archive and Apple processing state before claiming beta availability.

## Acceptance Criteria

- Signed iPhone/iPad Release archive opens the native KJV reader and carries version 1.0.0 (3), original identifier and proper distribution profile.
- Existing corpus is bundled unchanged; source/AI/web feature expansion remains excluded.
- Applicable checks and independent review pass; unavailable real-device/older-runtime evidence is explicit.
- Upload is accepted by Apple and processing is checked. Distinguish uploaded/processing from ready for internal testing.
- Existing internal TestFlight group can access the build once processing completes.

## Verification

`bash native/ios/Tests/check-reader.sh`; `npm run check`; `npm audit --audit-level=high`; `npm audit --omit=dev`; Release simulator smoke evidence as applicable; archive Info.plist, resource and signing inspection; independent read-only review; upload output; authenticated App Store Connect build/beta/group status. Reuse the six iPhone/iPad journeys from TASK-0007 because no reader behavior is changed. Do not call unavailable physical-device coverage passed.

## Non-Goals

Migration/import/export, existing-data recovery, full native feature parity, ESV/study/AI/Mark ports, new dependencies, public beta/App Store launch, invites, web deployment, commit, or push.

## Approval Gates

The latest CEO directive specifically authorizes this native internal TestFlight build and defers local-data transfer. It supersedes the prior Debug-only restriction for this beta. Broader distribution, destructive data actions, new audiences, unrelated infrastructure/dependencies, and source/content changes need separate approval.

## Stop Conditions

Escalate actual missing signing/credentials, archive/validation failures, Apple agreement/access blocks, rejected upload/processing, new security findings affecting the shipped native artifact, or a required expansion outside this beta scope. Do not expose credentials or retry unchanged failures without diagnosis.

## Required Handoff

Visible beta behavior and version/build; changed files and release decision; checks/review/archive/upload/processing evidence; material limits; distribution status/link; recommended next device check.

## Release Preparation Evidence (2026-11-02)

- Unconditional native Release root and consistent build 3; original marketing version, identifier, signing, export configuration and script preserved.
- `bash native/ios/Tests/check-reader.sh`: 34 assertions passed. `npm run check`: documentation, lint, source generation and web build passed. Release-configuration simulator native navigation/visible-resume/restart test: one case passed (31.873 seconds), with DEBUG fixtures excluded.
- `npm audit --audit-level=high`: four high advisories in the unchanged web development toolchain (`nanoid`, `postcss`, `source-map-js`, `vite`), zero critical. `npm audit --omit=dev`: zero vulnerabilities. No npm libraries/web build are packaged into the native reader; these advisories remain separate web-tooling debt, not newly introduced dependencies in this beta.
- Signed archive and internal-only export passed. Archive/exported IPA strict/deep signature verification succeeded with the Mac's trust services. Exeges App Distribution profile and entitlements match `22PRZ6YK2P.app.exeges.ios`, debugging disabled, beta reporting enabled, profile expires 2027-08-02.
- Package identity: 1.0.0 (3), iOS 17 minimum, iPhone and iPad device families; unchanged corpus; no DEBUG fixture strings, test bundles or key files. Exported IPA size 1,843,562 bytes; SHA-256 `93bcb03054c42a58b7228a36ff9fe703e7b938eb7791a7200036cb0a2af7c73a`.
- TASK-0010 independent release review: Pass with known risk; signature trust limitation in the Reviewer's restricted environment reconciled by the Integrator's successful final checks.
- Upload accepted by Apple with no errors; delivery ID `12334340-0fa0-408b-944b-198352243c60`. Processing and existing internal tester availability are being checked; upload success is not yet a claim of availability.

## Release Handoff (2026-11-02)

- **Outcome shipped:** Exeges **1.0.0 (3)** is available as an internal TestFlight beta to the existing **Exeges Testers** group. It opens the native KJV reader with passage navigation, local verse notes, typography/theme, and resume behavior. Existing-data transfer is deferred, and no stored material was deleted.
- **Apple verification:** Upload tool exited 0; processing state **VALID**, internal build state **IN_BETA_TESTING**, external state **NOT_APPLICABLE**, expired **false**. The existing internal group lists this exact build and retains access to all builds. No group, audience, invitation, public link, or App Store release was created.
- **Build / delivery ID:** `12334340-0fa0-408b-944b-198352243c60`; App Store Connect app `6797324515`. [TestFlight administration](https://appstoreconnect.apple.com/apps/6797324515/testflight/ios).
- **Files / decisions:** `ExegesApp.swift` makes the native reader unconditional; both app build settings increment to 3. ADR-0003 / D-008 record the explicit internal-release authorization and migration deferral. Relevant current-state documents are updated; release signing/export script and unrelated web/Mark work remain preserved.
- **Verification:** Signed archive/export, package inspection and signature checks, independent review, 34 domain assertions, standard repository gate, Release native navigation/visible-resume/restart smoke, and final documentation/whitespace checks passed. Prior iPhone/iPad native journey evidence is retained under TASK-0007. Current audit reports four high web development-tool advisories and zero production dependency vulnerabilities; no such packages are bundled in the native artifact.
- **Limits:** Native ESV, Scripture search, bookmarks, study/commentary/AI, Mark path, and complete import/export/migration are not in this beta. Physical-device/older-runtime behavior and broader licensing/provenance readiness remain open; this internal beta enables device feedback. No commit, push, GitHub Pages deployment, or public App Store release occurred.
- **Recommended next action:** Open TestFlight, update Exeges to 1.0.0 (3), and check native passage navigation, writing a note, and reopening on physical iPhone/iPad.
