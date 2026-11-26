<#
 Windows runner: build the APK, install it, push fixtures, run the Maestro flows, save a report.
 Usage (PowerShell, from the repo root):
   .\.maestro\scripts\run-e2e.ps1 -Tags smoke
   .\.maestro\scripts\run-e2e.ps1 -Tags regression -SkipBuild
   .\.maestro\scripts\run-e2e.ps1 -Tags smoke -SkipBuild -ApkPath C:\path\to\lazy-vocabulary-debug.apk   # no Android SDK needed
   .\.maestro\scripts\run-e2e.ps1 -Tags smoke -SkipBuild -SkipInstall   # APK already installed on the phone
   .\.maestro\scripts\run-e2e.ps1 -Tags smoke -SkipBuild -SkipInstall -AppId com.hoctusach.lazyvocabulary   # test the Play build
   .\.maestro\scripts\run-e2e.ps1 -Tags smoke -IncludePending   # after background playback is merged
 Env: E2E_NICKNAME / E2E_PASSCODE (default: e2e_tester / 123456)
#>
param(
  [string]$Tags = 'smoke',
  [switch]$SkipBuild,
  [switch]$IncludePending,
  [string]$ApkPath = '',
  [switch]$SkipInstall,   # app is already installed on the phone
  [string]$AppId = 'com.lazy.vocabulary'   # package to test, e.g. com.hoctusach.lazyvocabulary (Play build)
)
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
Set-Location $root
$out = Join-Path $root 'e2e-results'
New-Item -ItemType Directory -Force $out | Out-Null

foreach ($tool in 'adb', 'maestro', 'node') {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool is not on PATH" }
}
$devices = (adb devices | Select-String -Pattern '\tdevice$')
if (-not $devices) { throw 'No Android device. Plug in a phone with USB debugging or start an emulator, then check: adb devices' }

if (-not $SkipBuild) {
  if (-not (Test-Path node_modules)) { npm ci }
  npm run build:mobile
  Push-Location android
  .\gradlew.bat assembleDebug
  Pop-Location
}
if (-not $SkipInstall) {
  $apk = if ($ApkPath) { $ApkPath } else { Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk' }
  if (-not (Test-Path $apk)) { throw "APK not found: $apk (run without -SkipBuild, or install the app on the phone and use -SkipInstall)" }
  adb install -r $apk
}
& (Join-Path $PSScriptRoot 'push-fixtures.ps1')

$nick = if ($env:E2E_NICKNAME) { $env:E2E_NICKNAME } else { 'e2e_tester' }
$pass = if ($env:E2E_PASSCODE) { $env:E2E_PASSCODE } else { '123456' }
$flowRoot = '.maestro'
if ($AppId -ne 'com.lazy.vocabulary') {
  # Run a temporary copy of the flows that targets the other package.
  $flowRoot = Join-Path $out 'flows-copy'
  if (Test-Path $flowRoot) { Remove-Item -Recurse -Force $flowRoot }
  Copy-Item -Recurse '.maestro' $flowRoot
  Get-ChildItem $flowRoot -Recurse -Filter *.yaml | ForEach-Object {
    (Get-Content $_.FullName -Raw).Replace('com.lazy.vocabulary', $AppId) | Set-Content $_.FullName -NoNewline
  }
}
$args = @('test', $flowRoot, '--include-tags', $Tags,
  '-e', "NICKNAME=$nick", '-e', "PASSCODE=$pass",
  '--format', 'junit', '--output', (Join-Path $out 'report.xml'),
  '--debug-output', $out)
if (-not $IncludePending) { $args += @('--exclude-tags', 'pending') }
maestro @args
$code = $LASTEXITCODE
if ($code -ne 0) {
  adb logcat -d -t 500 | Out-File (Join-Path $out 'logcat.txt') -Encoding utf8
  Write-Host "FAILED. Report and logcat are in $out"
} else {
  Write-Host "PASSED. Report is in $out"
}
$stamp = Get-Date -Format 'yyyy-MM-dd'
$commit = (git rev-parse --short HEAD)
$dev = (adb shell getprop ro.product.model).Trim() + ', Android ' + (adb shell getprop ro.build.version.release).Trim()
node .maestro/scripts/make-report.mjs --out "reports/e2e-android-$stamp.md" --junit (Join-Path $out 'report.xml') --device $dev --commit $commit
exit $code
