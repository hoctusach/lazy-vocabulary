---
description: Build the Android app, install it on the connected device and run the Maestro e2e flows
argument-hint: "[smoke|regression] [--include-pending]"
allowed-tools: Bash(powershell:*), Bash(pwsh:*), Bash(adb:*), Bash(maestro:*), Read
---
Run the Android end-to-end tests for this repo on the connected device. Tag: $ARGUMENTS (default: smoke).

1. Run `adb devices`. If no device is listed, stop and say so.
2. Run `powershell -File .maestro/scripts/run-e2e.ps1 -Tags <tag>` (add `-IncludePending` only if asked). On Linux/macOS use `pwsh` instead of `powershell`.
3. Read `e2e-results/report.xml`. Report a table: flow name (it starts with the case number, e.g. `#9`), PASS or FAIL, and for each FAIL the one-line cause. If `e2e-results/logcat.txt` exists, quote the relevant lines.
4. Do not edit app code or flows unless asked. If a flow fails because a selector text changed, say which line to update.
