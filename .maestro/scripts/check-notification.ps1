# Case #30 / #31: reads the playback notification (shown on the lock screen too).
$out = adb shell dumpsys notification --noredact | Select-String -Pattern 'com.lazy.vocabulary' -Context 0,25
if ($out -match 'Playing in the background' -or $out -match 'Paused') {
  Write-Host 'PASS: playback notification found'; exit 0
}
Write-Host 'FAIL: no playback notification from com.lazy.vocabulary'; exit 1
