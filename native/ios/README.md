# Exeges iOS

The staged native transition begins with a SwiftUI KJV reader for iPhone and iPad. **Debug and Release now open the native KJV reader**, following the CEO-authorized internal TestFlight cutover in [ADR-0003](../../docs/decisions/0003-native-reader-internal-testflight.md). The existing hosted app remains available from the menu at `https://markdsparks.github.io/exeges/`. No automatic data migration or deletion occurs.

## Current Internal Beta

**1.0.0 (3)** was uploaded and processed on 2026-11-02. Apple reports `VALID` / `IN_BETA_TESTING`, and the existing internal **Exeges Testers** group lists the build. Open TestFlight to update. Local-data migration is deferred for this beta; no data was cleared. Evidence and limits are in [TASK-0009](../../docs/coordination/tasks/0009-native-reader-testflight.md).

## Local Search And Bookmark Additions

Native KJV text search and private verse bookmarks are implemented locally under [TASK-0011](../../docs/coordination/tasks/0011-native-search-bookmarks.md); they are **not yet in the shipped build 3**. Search finds words/phrases offline, opens the exact verse, and uses normal passage Back. Typing is cancelable and stale results stay hidden; exact phrases lead and at most 60 matches are displayed with the total count. Queries are not stored or sent to a service.

Use Search Scripture or My Bookmarks from the reader menu. Touch and hold a verse, or tap it and use Bookmark Verse. Bookmarks can reopen their verse, be removed by swipe/context action, and survive restart. They live in a separate atomic `NativeReader/bookmarks-v1.json` file; the reader/note document stays unchanged. Invalid bookmark data is left untouched, with a retry surface that does not block reading. No existing web data is imported.

## Native Reader Proof

Included: offline KJV from the unchanged committed corpus; book/chapter/verse selection; adjacent-chapter navigation and passage back history; font size/theme with Dynamic Type; private verse notes with explicit save/cancel/delete; and verse-level reading position restored across restart. Notes, appearance, and position are saved atomically in a separate versioned local document. The preview's menu opens Existing Exeges for the current app and its saved material.

Not yet included natively: ESV, study/source/AI features, Mark-path progress, data import/export, or sync. This is a deliberately bounded internal beta, not a feature-complete replacement. See [the data preservation plan](DATA_PRESERVATION.md), [ADR-0002](../../docs/decisions/0002-native-reader-proof.md), and [TASK-0007](../../docs/coordination/tasks/0007-native-reader-proof.md).

## Local Verification

Run the Foundation-only corpus/navigation/persistence checks on this Mac:

```sh
bash native/ios/Tests/check-reader.sh
```

Open `native/ios/Exeges.xcodeproj`, choose the shared `Exeges` scheme, and run Debug on an iPhone/iPad simulator. UI tests use a separate UUID-named storage directory and do not reset the reader's real data. From the repository root:

```sh
xcodebuild -project native/ios/Exeges.xcodeproj -scheme Exeges \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /private/tmp/exeges-native-build CODE_SIGNING_ALLOWED=NO build

xcodebuild -project native/ios/Exeges.xcodeproj -scheme Exeges \
  -destination 'platform=iOS Simulator,name=YOUR_SIMULATOR_NAME' \
  -derivedDataPath /private/tmp/exeges-native-build \
  -parallel-testing-enabled NO -collect-test-diagnostics never CODE_SIGNING_ALLOWED=NO test
```

Real-device reading, accessibility, performance, and eventual upgrade migration remain broader release gates; the authorized internal beta enables that testing with migration deferred. Web changes still ship through GitHub Pages and affect Existing Exeges in the menu, while the native reader is bundled in the binary. Native code must be distributed through an explicitly authorized native release.

## One-time App Store setup

Create an iOS app record in App Store Connect with:

- Name: `Exeges`
- Bundle ID: `app.exeges.ios`
- SKU: `exeges-ios`
- Primary language: English (U.S.)

The Apple developer team must register the same App ID and have a valid Apple
Distribution certificate and `Exeges App Distribution` provisioning profile
available on this Mac. The Xcode project uses team `22PRZ6YK2P`; Debug uses
automatic signing and Release uses manual signing.

## TestFlight upload

Set an App Store Connect API key and run:

```sh
EXEGES_ASC_KEY_PATH=/absolute/path/AuthKey_XXXX.p8 \
EXEGES_ASC_KEY_ID=XXXX \
EXEGES_ASC_ISSUER_ID=your-issuer-id \
scripts/exeges-testflight.sh
```

The script reads the current build number from the Xcode project, verifies that
all configurations agree, then archives and uploads that exact build for
TestFlight testing. Inspect the current value and increment every
`CURRENT_PROJECT_VERSION` entry in `Exeges.xcodeproj/project.pbxproj` before a
later upload.

Uploading changes an external system and is never a routine verification step.
Run the script only with explicit CEO authorization.
