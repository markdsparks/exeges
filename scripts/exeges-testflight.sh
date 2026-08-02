#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT="$ROOT/native/ios/Exeges.xcodeproj"
PROJECT_FILE="$PROJECT/project.pbxproj"
EXPORT_OPTIONS="$ROOT/native/ios/ExportOptions-TestFlight.plist"
KEY_PATH="${EXEGES_ASC_KEY_PATH:?Set EXEGES_ASC_KEY_PATH to an App Store Connect API key .p8 file.}"
KEY_ID="${EXEGES_ASC_KEY_ID:?Set EXEGES_ASC_KEY_ID to the App Store Connect API key ID.}"
ISSUER_ID="${EXEGES_ASC_ISSUER_ID:?Set EXEGES_ASC_ISSUER_ID to the App Store Connect issuer ID.}"

versions="$(sed -n 's/.*CURRENT_PROJECT_VERSION = \([0-9][0-9]*\);/\1/p' "$PROJECT_FILE" | sort -u)"
version_count="$(printf '%s\n' "$versions" | sed '/^$/d' | wc -l | tr -d ' ')"

if [[ "$version_count" != "1" ]]; then
  printf 'FAIL  Exeges build numbers do not match:\n%s\n' "$versions" >&2
  exit 1
fi

build="${1:-$versions}"
if [[ "$build" != "$versions" ]]; then
  printf 'FAIL  Requested build %s but the Xcode project is on build %s\n' "$build" "$versions" >&2
  exit 1
fi

if [[ ! -f "$KEY_PATH" ]]; then
  printf 'FAIL  App Store Connect API key not found: %s\n' "$KEY_PATH" >&2
  exit 1
fi

archive="$ROOT/native/ios/build/Exeges-${build}.xcarchive"
export_path="$ROOT/native/ios/build/upload-testflight-${build}"
ipa="$export_path/Exeges.ipa"

printf 'Archiving Exeges build %s...\n' "$build"
xcodebuild \
  -project "$PROJECT" \
  -scheme Exeges \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$archive" \
  archive \
  -allowProvisioningUpdates

printf 'Exporting Exeges build %s for App Store Connect...\n' "$build"
xcodebuild \
	-exportArchive \
	-archivePath "$archive" \
	-exportPath "$export_path" \
	-exportOptionsPlist "$EXPORT_OPTIONS" \
	-allowProvisioningUpdates

if [[ ! -f "$ipa" ]]; then
	printf 'FAIL  Expected exported IPA not found: %s\n' "$ipa" >&2
	exit 1
fi

printf 'Uploading Exeges build %s to TestFlight...\n' "$build"
API_PRIVATE_KEYS_DIR="$(dirname "$KEY_PATH")" \
	xcrun altool \
		--upload-package "$ipa" \
		--api-key "$KEY_ID" \
		--api-issuer "$ISSUER_ID" \
		--output-format json

printf 'PASS  Exeges build %s uploaded to TestFlight\n' "$build"
