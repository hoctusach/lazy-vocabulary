#!/usr/bin/env bash
# Pre-fetches + verifies the pinned sherpa-onnx iOS xcframework (k2-fsa, Apache-2.0; ONNX Runtime is statically linked inside).
#
# Why this exists: ios/App/KokoroTtsKit/Package.swift declares the SAME zip as a remote SPM `binaryTarget` with a checksum, so
# Xcode / xcodebuild download it by themselves on package resolution (nothing large is committed). This script
#   1. downloads the zip into scripts/ios/.cache (gitignored) and verifies its sha256 (fails loudly on a mismatch),
#   2. checks that Package.swift pins the same url + checksum (so the two never drift),
#   3. with --extract, unpacks it to scripts/ios/.cache/SherpaOnnxC.xcframework (useful for inspecting headers / offline work).
# Usage: scripts/ios/fetch-sherpa-onnx.sh [--extract]
set -euo pipefail

VERSION="v2.0.2"
NAME="sherpa-onnx-${VERSION}-ios-shared-onnxruntime-static.xcframework.zip"
URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/xcframework/${NAME}"
SHA256="9518838219e55716bb565df278b3f32093bb1948cc8a508f7b67989350bf9b25"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CACHE="$ROOT/scripts/ios/.cache"
PKG="$ROOT/ios/App/KokoroTtsKit/Package.swift"
mkdir -p "$CACHE"

sha_of() { if command -v shasum >/dev/null; then shasum -a 256 "$1" | cut -d' ' -f1; else sha256sum "$1" | cut -d' ' -f1; fi; }

if [ ! -f "$CACHE/$NAME" ] || [ "$(sha_of "$CACHE/$NAME")" != "$SHA256" ]; then
  echo "Downloading $NAME"
  curl -fL --retry 3 -o "$CACHE/$NAME" "$URL"
fi
GOT="$(sha_of "$CACHE/$NAME")"
if [ "$GOT" != "$SHA256" ]; then
  echo "sha256 mismatch for $NAME: expected $SHA256, got $GOT" >&2
  rm -f "$CACHE/$NAME"
  exit 1
fi
echo "OK sha256 $SHA256"

grep -q "$URL" "$PKG" && grep -q "$SHA256" "$PKG" || { echo "Package.swift does not pin $URL / $SHA256" >&2; exit 1; }
echo "OK Package.swift pins the same url + checksum"

if [ "${1:-}" = "--extract" ]; then
  rm -rf "$CACHE/SherpaOnnxC.xcframework"
  unzip -q "$CACHE/$NAME" -d "$CACHE"
  echo "Extracted to $CACHE/SherpaOnnxC.xcframework"
fi
