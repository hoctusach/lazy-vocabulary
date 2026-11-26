<#
 Self-healing e2e loop (Windows). Runs the flows, and when some fail it asks Claude Code to diagnose
 each failure from the report, the failure screenshot and the live screen hierarchy, fix the FLOW
 (selector, wording, wait) if the test is wrong, and run again. App problems are written down, not hidden.
 Usage (PowerShell, repo root, phone connected):
   .\.maestro\scripts\e2e-heal.ps1 -Tags smoke -AppId com.hoctusach.lazyvocabulary
   .\.maestro\scripts\e2e-heal.ps1 -Tags regression -AppId com.hoctusach.lazyvocabulary -MaxRounds 4
 Needs: adb, maestro, node, and the Claude Code CLI (`claude`) on PATH and signed in.
 Review `git diff .maestro` afterwards; nothing is committed for you.
#>
param(
  [string]$Tags = 'smoke',
  [string]$AppId = 'com.lazy.vocabulary',
  [int]$MaxRounds = 3
)
$ErrorActionPreference = 'Continue'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) { throw 'Claude Code CLI not found. Install: npm install -g @anthropic-ai/claude-code, then run: claude' }
$out = Join-Path $root 'e2e-results'

for ($round = 1; $round -le $MaxRounds; $round++) {
  Write-Host "=== Round $round of $MaxRounds ===" -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'run-e2e.ps1') -Tags $Tags -SkipBuild -SkipInstall -AppId $AppId
  if ($LASTEXITCODE -eq 0) { Write-Host "All '$Tags' cases passed in round $round." -ForegroundColor Green; exit 0 }
  if ($round -eq $MaxRounds) { break }

  # Capture what the phone shows right now, for the diagnosis.
  adb shell uiautomator dump /sdcard/lv-window.xml 2>$null | Out-Null
  adb pull /sdcard/lv-window.xml (Join-Path $out 'screen-hierarchy.xml') 2>$null | Out-Null
  adb exec-out screencap -p > (Join-Path $out 'screen-now.png')

  $prompt = @"
The Android e2e run for this repo just failed (round $round of $MaxRounds). App id: $AppId. Tags: $Tags.
Evidence in e2e-results/: report.xml (JUnit), commands-*.json and screenshots-* (Maestro debug output, failure screenshots), logcat.txt, screen-now.png (the phone right now), screen-hierarchy.xml (accessibility tree right now).
Flows are in .maestro/flows and .maestro/common (copied to e2e-results/flows-copy with the app id replaced; edit ONLY the originals in .maestro/).

For every failed flow:
1. Read the failure message and the screenshot. Decide: TEST problem (wrong or changed text/aria-label, missing wait, wrong step order, element hidden behind another) or APP problem (the app really behaves wrongly, for example a wrong passcode is accepted).
2. TEST problem: fix the flow with the smallest change. Prefer the exact text or description you see in screen-hierarchy.xml. Keep the assertion's intent. Never delete or weaken an assertion just to make it pass, never replace it with something always true.
3. APP problem: do NOT edit the flow to hide it. Append a short entry (case number, expected, actual, evidence file) to e2e-results/app-bugs.md.
4. Do not edit anything outside .maestro/ and e2e-results/. Do not run git commit or git push.
Finish with a short table: case number, TEST or APP problem, what you changed.
"@
  claude -p $prompt --allowedTools "Read" "Edit" "Write" "Bash(git diff:*)" "Bash(git status:*)" | Tee-Object -FilePath (Join-Path $out "heal-round-$round.md")
}
Write-Host "Still failing after $MaxRounds rounds. See e2e-results\heal-round-*.md and e2e-results\app-bugs.md" -ForegroundColor Yellow
git --no-pager diff --stat -- .maestro
exit 1
