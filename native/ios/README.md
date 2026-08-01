# Exeges iOS

Exeges is a thin native shell around the deployed web app. Release builds load
`https://markdsparks.github.io/exeges/`, so normal web changes continue to ship
through GitHub Pages. Create a new TestFlight build only for native-shell,
signing, icon, or App Store metadata changes.

## One-time App Store setup

Create an iOS app record in App Store Connect with:

- Name: `Exeges`
- Bundle ID: `app.exeges.ios`
- SKU: `exeges-ios`
- Primary language: English (U.S.)

The Apple developer team must register the same App ID and have a valid Apple
Distribution certificate available on this Mac. The Xcode project uses team
`22PRZ6YK2P` and automatic signing for the single app target.

## TestFlight upload

Set an App Store Connect API key and run:

```sh
EXEGES_ASC_KEY_PATH=/absolute/path/AuthKey_XXXX.p8 \
EXEGES_ASC_KEY_ID=XXXX \
EXEGES_ASC_ISSUER_ID=your-issuer-id \
scripts/exeges-testflight.sh
```

The script archives build `1` and uploads it for internal TestFlight testing.
Increment `CURRENT_PROJECT_VERSION` in `Exeges.xcodeproj/project.pbxproj` before
each later upload.
