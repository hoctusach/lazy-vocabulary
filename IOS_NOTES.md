# iOS notes: "Scan text" (FB-66)

Status: **Android only today.** iOS is not wired and nothing here was built or run on iOS. This file lists what adding it needs.
The design goal is that **no shared TypeScript changes**: every platform detail lives in `src/features/scan-text/nativeScan.ts`
(the only module that imports Capacitor / ML Kit). Shared code talks to `ScanAdapter`, `TranslationAdapter` and `MeaningProvider`.

## What already works on iOS without code
`nativeScan.ts` registers its adapters when `Capacitor.isNativePlatform()` is true, and the three plugins
(`@capacitor/camera`, `@capacitor-mlkit/text-recognition`, `@capacitor-mlkit/translation`, all pinned, Capacitor 8) share one
JS API across Android and iOS. After `npm run build:mobile` and `npx cap sync ios` (never from `docs/`, see CLAUDE.md / FB-28)
the same JS adapter runs on iOS. Only the native project needs work:

## 1. Info.plist permission strings (`ios/App/App/Info.plist`)
| Key | When needed | Suggested text |
| --- | --- | --- |
| `NSCameraUsageDescription` | **Required** (Take photo uses the camera) | "Lazy Vocabulary uses the camera to read words from a photo. The photo stays on your device." |
| `NSPhotoLibraryUsageDescription` | Required by `@capacitor/camera` for the gallery source on current plugin versions; keep it so App Review does not reject a missing string | "Lazy Vocabulary reads text from a photo you pick. Photos are not uploaded." |
| `NSPhotoLibraryAddUsageDescription` | **Not needed**: we pass `saveToGallery: false` and never write to the library | n/a |

Add the strings in EN and VI (`InfoPlist.strings`) to keep the app's EN/VI copy consistent.

## 2. PHPicker vs Capacitor Camera
`@capacitor/camera` 8 uses `PHPickerViewController` for `CameraSource.Photos` on iOS 14+, which runs out of process and **does not
ask for photo-library access** (the user only shares the photos they pick). Keep the plugin: it covers camera and picker with one
call, so `pickImage` needs no iOS branch. A custom PHPicker plugin is only worth it if the camera plugin's limits bite
(for example multi-image scans). Native Android uses the system picker/intents the same way (no runtime permission).

## 3. ML Kit pods
* `@capacitor-mlkit/text-recognition` pulls `GoogleMLKit/TextRecognition` **plus the Chinese, Devanagari, Japanese and Korean pods** (`~> 8.0.0`);
  `@capacitor-mlkit/translation` pulls `GoogleMLKit/Translate`. `pod install` does this automatically through `Package.swift` / the podspecs.
* Minimum iOS: the plugin podspecs say 15.0 and the Xcode project is 15.0, but recent ML Kit pods require a higher floor (15.5 at the time of
  writing, **verify at `pod install`**) and need Xcode 15+, arm64 simulators are supported by the 8.x pods. Raise `IPHONEOS_DEPLOYMENT_TARGET` if CocoaPods says so.
* Size: on Android we exclude the non-Latin script packs in `android/app/build.gradle`. CocoaPods cannot drop a dependency of a plugin podspec, so
  to trim iOS either patch the plugin with `patch-package` (remove the four script pods and the `case` that creates their options) or accept the
  extra size and measure it in an App Store thinned build. Keep `INSTALLED_SCRIPTS` in `nativeScan.ts` in line with what is really linked.
* The JS adapter is the same code: `TextRecognition.processImage({ path, script })` and the `Translation.*` calls. The `path` returned by the camera
  plugin is a `file://` URI that the iOS plugin accepts. If a particular iOS version returns only `webPath`, handle it inside `nativeScan.ts` (`photo.path ?? photo.webPath` is already used).
* Do not run the recognizer on the main thread for very large images; the plugin already does the work off the main thread.

## 4. Model download and App Review
* Text recognition models ship inside the pods (no download). **Translation language packs (~30 MB each) download on first use**, behind our own prompt
  ("language pack ... may use mobile data") and an indeterminate progress bar. Apple only cares that downloads are user-initiated, clearly described, and
  not executable code (they are ML data). Do not start the download silently.
* ML Kit Translate downloads models from Google servers: the request contains no user text. Offline use after the packs are present.
* Free Dictionary API (English meaning provider) is a plain HTTPS request carrying the selected word. It is the only network call of the flow.

## 5. Privacy Nutrition Label / privacy policy
* Photos and recognized text are processed **on device** and are not uploaded or stored by us (only the word the user saves is written locally, same as manual add).
* The selected word (not the sentence, not the photo) is sent to the dictionary provider. Declare under *Data Collected*: usually **none linked to the user**; if you
  choose to be conservative: "Search History"/"Other User Content", **not linked to identity, not used for tracking**. Update the policy text to say that
  a looked-up word is sent to a third-party dictionary and that translation models are downloaded from Google (ML Kit).
* Google ML Kit may include its own SDK privacy manifest / required-reason API declarations; check the generated `PrivacyInfo.xcprivacy` report in Xcode's privacy report before submitting.
* The daily scan counter is local (`lazyVoca.scan.daily.v1`), no account data.

## 6. Generic naming and adding languages / scripts later
Nothing in UI copy or flow names a language ("Scan text", "Look up meaning"). To add a learning language:
1. Register a `LanguageProfile` (`src/features/scan-text/languages.ts`): `code`, OCR `script` (`latin | chinese | devanagari | japanese | korean`), `meaningProviderIds`, optional lemmatizer name.
2. Register a `MeaningProvider` for it (`meaning.ts` interface; the English one is `englishDictionary.ts`). The app's own words are always tried first; morphology rules are per language.
3. Android: delete the matching `exclude` line in `android/app/build.gradle`; iOS: the pod is already linked. Add the script id to `INSTALLED_SCRIPTS` in `nativeScan.ts`.
4. Change `getLearningLanguage()` to read the user's choice. Translation then runs `learning language -> device language` automatically (`planTranslation`), and is skipped when they match.
Tokenizing and sentence splitting use `Intl.Segmenter` with the profile's language code, so scripts without spaces (ja, zh, th) select by word segments.

## 7. Checklist for the iOS port
1. `npm run build:mobile && npx cap sync ios` (from `capacitor-www/`, never `docs/`); `pod install`.
2. Add the Info.plist strings (section 1), EN + VI.
3. Run on a device: camera, gallery pick, OCR of a printed paragraph, translation pack download on a Vietnamese-language device.
4. App Store Connect: privacy labels and policy text (section 5), review notes mentioning the on-demand language packs.

# iOS notes: Kokoro natural voices (FB-75) and Apple voices (FB-76)

* Code: `ios/App/KokoroTtsKit` (local SwiftPM package, not managed by `cap sync`). `KokoroCore` = pure Foundation (G2P, PostFx, variants, bundled
  `cmudict-extra-us.txt`), `KokoroTtsNative` = iOS plugin (download, engine, Capacitor plugin). Keep it behaviour-identical to `android/.../kokoro/*`;
  the Swift tests mirror `KokoroG2PTest/PostFxTest/VariantTest`. Pinned HF revisions, sizes and sha256 live in `KokoroVariant.swift` / `KokoroModelStore.swift`
  and must change together with the Kotlin/Java constants.
* sherpa-onnx: remote `binaryTarget` (v2.0.2 `ios-shared-onnxruntime-static`: one dynamic `SherpaOnnxC.framework` with ONNX Runtime inside; chosen over
  `ios-static` because it needs no separate onnxruntime xcframework and no link-order flags). Bump url + checksum in `Package.swift` and
  `scripts/ios/fetch-sherpa-onnx.sh` together (a test checks they match). The app target embeds it (Embed Frameworks phase in `App.xcodeproj`).
* The plugin is not an npm plugin: `SceneDelegate.swift` uses `LazyBridgeViewController` to `registerPluginInstance(KokoroTtsPlugin())`.
* Apple voices (FB-76): `src/services/speech/appleVoices.ts` (order Ava premium > Evan > Nathan enhanced), hint in `AppleVoiceHint.tsx` (`lv_apple_voice_hint_seen`).
* CI: `.github/workflows/ios.yml` (Xcode 26 via `scripts/ios/select-xcode.sh`), `ios-testflight.yml` (disabled by secrets guard), `codemagic.yaml`.
