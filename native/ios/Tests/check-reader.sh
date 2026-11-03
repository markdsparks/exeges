#!/bin/bash
set -euo pipefail
repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
check_dir="$(mktemp -d "${TMPDIR:-/private/tmp}/exeges-reader-check.XXXXXX")"
trap 'rm -rf "$check_dir"' EXIT
swiftc -module-cache-path "$check_dir/modules" \
  "$repo_root/native/ios/ExegesApp/NativeReaderData.swift" \
  "$repo_root/native/ios/ExegesApp/NativeScriptureSearch.swift" \
  "$repo_root/native/ios/ExegesApp/NativeBookmarks.swift" \
  "$repo_root/native/ios/Tests/NativeReaderChecks.swift" \
  -o "$check_dir/check-reader"
"$check_dir/check-reader" "$repo_root/src/data/bible.json"
