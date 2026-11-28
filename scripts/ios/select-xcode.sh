#!/usr/bin/env bash
# CI helper: Capacitor 8's prebuilt iOS binaries are built with Xcode 26 (Swift 6.2), so select the newest Xcode 26.x on the runner.
set -euo pipefail
X=$(ls -d /Applications/Xcode_26*.app 2>/dev/null | sort -V | tail -1 || true)
if [ -z "$X" ]; then echo "No Xcode 26 found. Installed:"; ls -d /Applications/Xcode*; exit 1; fi
sudo xcode-select -s "$X/Contents/Developer"
xcodebuild -version
xcrun swift --version
