#!/usr/bin/env bash
# Prints the UDID of an available simulator: pick-sim.sh iPhone|iPad  (prefers "Pro" iPhones / "13-inch" iPads, newest first)
set -euo pipefail
KIND="${1:-iPhone}"
LIST=$(xcrun simctl list devices available | grep -E "^\s+$KIND" || true)
PICK=$(printf '%s\n' "$LIST" | grep -E "Pro|13-inch" | tail -1)
[ -n "$PICK" ] || PICK=$(printf '%s\n' "$LIST" | tail -1)
printf '%s\n' "$PICK" | grep -oE '[0-9A-F]{8}-[0-9A-F-]{27}'
