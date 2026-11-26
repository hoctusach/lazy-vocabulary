# Emulator only (needs root): moves the device date one day forward so the next app open
# counts as the first open of a new day. Turn auto time back on afterwards.
adb root | Out-Null
adb shell settings put global auto_time 0
$tomorrow = (Get-Date).AddDays(1).ToUniversalTime().ToString('MMddHHmmyyyy.ss')
adb shell date $tomorrow
Write-Host 'Device date moved forward one day. Restore with: adb shell settings put global auto_time 1'
