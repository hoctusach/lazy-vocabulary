---
description: Run the Android e2e flows and fix the flows (not the app) when they fail, then rerun
argument-hint: "[smoke|regression] [appId]"
allowed-tools: Bash(powershell:*), Bash(pwsh:*), Bash(adb:*), Bash(maestro:*), Read, Edit, Write
---
Run `powershell -File .maestro/scripts/e2e-heal.ps1 -Tags <tag> -AppId <appId>` (defaults: smoke, com.hoctusach.lazyvocabulary).
When it ends, report: pass/fail per case number, which flows were edited (`git diff .maestro`), and anything in e2e-results/app-bugs.md.
Never change app source to make a test pass. Do not commit; ask me before committing.
