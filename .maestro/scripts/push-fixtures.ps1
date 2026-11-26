# Copies the import fixtures to the phone's Download folder.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
foreach ($f in Get-ChildItem (Join-Path $here '..\fixtures') -File) {
  adb push $f.FullName "/sdcard/Download/$($f.Name)"
}
