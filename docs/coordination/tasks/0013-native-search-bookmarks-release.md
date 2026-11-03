# TASK-0013: Native Search And Bookmark Internal Release

- **Role / owner:** Integrator / repository lead
- **Task state:** In progress
- **Delivery state:** In progress
- **Risk / reversibility:** Medium; signed internal beta and source branch publication; previous beta remains available
- **Parent objective:** CEO 2026-11-02 directive “Ok build and push,” following native search/bookmarks and D-010 quality direction

## Objective

Publish native search/bookmarks as Exeges 1.0.0 (4) to the existing internal Exeges Testers group, and push its source/documents to a scoped `codex/` branch. Keep the live website and paused web implementation unchanged.

## Ownership Boundary

One writer: lead. May increment both native app build numbers to 4, update native/coordination/product records, build/sign/export/upload through the existing workflow, and commit/push native source/tests plus durable project documentation to `codex/native-search-bookmarks`. Preserve unrelated dirty web/Mark implementation. No merge/push to main, Pages deployment, new audience, public release, new dependency/content/provider, migration, or private-data deletion.

## Dependencies

TASK-0011 local integration + TASK-0012 review -> D-010 usefulness/visual assessment -> build 4 and current release checks -> TASK-0014 independent review + signed package inspection -> upload -> Apple processing/internal access -> final source/documentation commit/push.

## Interface Contract

Keep version 1.0.0, identifier `app.exeges.ios`, existing signing identity/profile/export options and internal-only audience. Both app configurations use build 4. Native root remains unconditional. Search/bookmarks use accepted local contracts; reader data and corpus are unchanged. Exclude DEBUG fixtures, tests, credentials and build products from the artifact/source commit. Push a feature branch so native release does not deploy the website or ship paused web work.

## Acceptance Criteria

- Assess actual usefulness and visual/native craft against D-010 using existing real-corpus journeys and final iPhone/iPad screenshots; disclose limitations rather than equating checks with design acceptance.
- Relevant existing feature evidence remains applicable; Foundation/repository checks and security baseline reconciled, signed archive/export identity/corpus/profile/fixture inspection passes, independent review passes.
- Apple accepts build 4, processing is VALID, internal beta state/access for the existing group is confirmed before reporting availability.
- Native source/tests and coherent documentation are committed/pushed to the scoped branch; unrelated web code remains uncommitted and main/Pages untouched.

## Verification

Reuse TASK-0011 iPhone 8/8 broad and iPad six broad plus final 3/3 per-device evidence: only build metadata changes. Re-run Foundation and `npm run check`; both npm audits; inspect final signed archive/IPA, metadata, entitlements, unchanged corpus, absence of DEBUG fixtures/test bundles/keys; independent TASK-0014 review and quality assessment; inspect staged files/secrets, verify branch remote SHA and Apple API processing/group access. Physical-device, older-runtime and live VoiceOver behavior remain unverified; this internal beta enables device inspection.

## Non-Goals

Feature expansion/redesign, search syntax/reference parser, web deployment, Mark implementation release, migration/export/sync, dependency fixes, new audiences/invites/public links, App Store release.

## Approval Gates

D-011 records this specific internal build/upload and scoped commit/push authorization. No standing release approval is created. Escalate actual release failures, new native security risks, missing credentials or required out-of-scope changes. No additional confirmation is needed for the authorized actions after checks/review pass.

## Stop Conditions

Stop on artifact identity/content mismatch, invalid signing, rejected upload/processing, missing access, unresolved review findings, accidental private-data exposure, or need to include paused web code/deploy main.

## Required Handoff

Version/build and visible behavior; D-010 assessment; exact checks/review/artifact/processing/access evidence; commit/branch/remote verification; preserved work and limits; one next device-testing action.

## Quality And Release Preparation (2026-11-02)

Lead and independent Reviewer assessed usefulness separately from technical checks. Exact-phrase recall places John 3:16 and Psalms 23:1 first; real UI journeys demonstrate exact-verse opening, Back to prior visible Scripture, bookmark save/restart/reopen/removal and failure recovery. Offline search and private bookmark persistence add concrete reader utility without interrupting ordinary reading.

Final normal/dark and accessibility-size/light iPhone/iPad screenshots show serif Scripture, clear reference hierarchy, strong primary-text contrast, restrained warm actions and coherent native sheets. Close/Done actions remain reachable with keyboard/large text. This establishes coherent, usable internal-beta craft; it does not establish subjective CEO delight or claim complete visual excellence from screenshots alone.

Known quality limits: accepted broad OR/substring admission can report very large totals and include weaker nonphrase hits after the first exact match; these totals count matching verses, not phrase occurrences. At maximum accessibility text size the count/header and return action occupy much of the phone viewport, although scrolling and result selection pass. Search-reference parsing, advanced syntax and further layout/relevance refinements are outside this build; prioritize device feedback before the next bounded polish change. Physical-device, older-runtime and live VoiceOver checks remain outstanding.

Current release checks: 81 Foundation assertions passed (independently repeated); standard repository gate passed. npm audit reports the unchanged four high web development-tool advisories and zero production vulnerabilities. Signed archive and internal-only export succeeded; archive and exported IPA strict/deep signatures succeeded with the Mac trust services. The Reviewer's restricted trust environment reproduces the prior TASK-0010 trust limitation; lead's successful final signature/entitlement verification reconciles it.

Artifact: version1.0.0/build4, original identifier, iOS17 minimum, iPhone/iPad families, Exeges App Distribution profile expiring 2027-08-02. Corpus SHA-256 `91aeab361abd47e3d795eeb453cabad432c0657ca625f26871de7336b555a08f` is identical to the repository; DEBUG fixtures/test bundles/key files absent. IPA 1,966,520bytes; SHA-256 `9861d1397cac9c71e48c0f4ae4dc5bc125d5c90141e5b67d420573291fcd852a`. Evidence: `/private/tmp/exeges-testflight-4-archive.log`, `exeges-testflight-4-export.log`, `exeges-testflight-4-artifact.json`. Staged-source documentation links passed in an isolated index snapshot; only native source/tests and documentation are staged, no paused web code or build products.

Final build4 Release-configuration search/open/exact verse/Back/short/no-match recovery smoke passed1/1 in31.149s with DEBUG fixtures excluded. Evidence: `/private/tmp/exeges-testflight-4-release-smoke.log` and matching `.xcresult`. Independent TASK-0014 returned **Pass with known risk**, no unresolved release blockers; usefulness/visual limits are explicitly retained above. Upload follows that review and package inspection; availability is not claimed until Apple processing/group checks pass.
