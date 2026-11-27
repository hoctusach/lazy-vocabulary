import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const PLIST = 'ios/App/App/Info.plist';
const PBX = 'ios/App/App.xcodeproj/project.pbxproj';

/** Value of a top-level string key in the plist. */
const plistString = (xml: string, key: string) =>
  xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`))?.[1];
const plistArray = (xml: string, key: string) => {
  const block = xml.match(new RegExp(`<key>${key}</key>\\s*<array>([\\s\\S]*?)</array>`))?.[1] ?? '';
  return [...block.matchAll(/<string>([^<]*)<\/string>/g)].map((m) => m[1]);
};

describe('[FB-67] iOS Info.plist (static, no simulator)', () => {
  const xml = read(PLIST);

  it('[FB-67] keeps the mic + speech strings and adds camera + photo library strings (scan-to-import)', () => {
    expect(plistString(xml, 'NSMicrophoneUsageDescription')).toMatch(/microphone/i);
    expect(plistString(xml, 'NSSpeechRecognitionUsageDescription')).toMatch(/speech recognition/i);
    expect(plistString(xml, 'NSCameraUsageDescription')).toMatch(/camera/i);
    expect(plistString(xml, 'NSPhotoLibraryUsageDescription')).toMatch(/photo/i);
    for (const k of ['NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription', 'NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'NSUserTrackingUsageDescription']) {
      expect((plistString(xml, k) ?? '').length, k).toBeGreaterThan(20); // Apple rejects empty/placeholder purpose strings
    }
  });

  it('[FB-67] background audio mode is enabled (hands-free listening with the screen locked)', () => {
    expect(plistArray(xml, 'UIBackgroundModes')).toContain('audio');
  });

  it('[FB-67] ATT purpose string, AdMob app id (Google test id until replaced) and SKAdNetwork are present', () => {
    expect(plistString(xml, 'NSUserTrackingUsageDescription')).toBeTruthy();
    expect(plistString(xml, 'GADApplicationIdentifier')).toMatch(/^ca-app-pub-\d{16}~\d{10}$/);
    expect(xml).toContain('cstr6suwn9.skadnetwork');
  });

  it('[FB-67] display name, no armv7 requirement, export-compliance key, URL scheme kept', () => {
    expect(plistString(xml, 'CFBundleDisplayName')).toBe('Lazy Vocabulary');
    expect(plistArray(xml, 'UIRequiredDeviceCapabilities')).toEqual(['arm64']);
    expect(xml).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
    expect(xml).toContain('<string>lazyvocabulary</string>');
  });

  it('[FB-67] iPad supports all four orientations; iPhone has no upside-down; not full-screen-only', () => {
    expect(plistArray(xml, 'UISupportedInterfaceOrientations~ipad').sort()).toEqual([
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
    ]);
    expect(plistArray(xml, 'UISupportedInterfaceOrientations')).not.toContain('UIInterfaceOrientationPortraitUpsideDown');
    expect(xml).not.toContain('UIRequiresFullScreen'); // iPad multitasking (Split View) stays available
  });
});

describe('[FB-67] ios/ Xcode project sanity', () => {
  const pbx = read(PBX);

  it('[FB-67] universal: every app build configuration targets iPhone + iPad (1,2), no iPhone-only value', () => {
    const fams = [...pbx.matchAll(/TARGETED_DEVICE_FAMILY = "?([\d,]+)"?;/g)].map((m) => m[1]);
    expect(fams.length).toBeGreaterThanOrEqual(2); // Debug + Release
    for (const f of fams) expect(f).toBe('1,2');
  });

  it('[FB-67] bundle id com.hoctusach.lazyvocabulary in Debug and Release; capacitor appId/appName match', () => {
    const ids = [...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    for (const id of ids) expect(id).toBe('com.hoctusach.lazyvocabulary');
    const cap = read('capacitor.config.ts');
    expect(cap).toMatch(/appId:\s*['"]com\.hoctusach\.lazyvocabulary['"]/);
    expect(cap).toMatch(/appName:\s*['"]Lazy Vocabulary['"]/);
  });

  it('[FB-67] iOS 15+ deployment target and Info.plist wired to the target', () => {
    for (const m of pbx.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);/g)) expect(parseFloat(m[1])).toBeGreaterThanOrEqual(15);
    expect(pbx).toContain('INFOPLIST_FILE = App/Info.plist');
  });

  it('[FB-67] web bundle for the shell is capacitor-www, never docs/ (FB-28)', () => {
    expect(read('capacitor.config.ts')).toMatch(/webDir:\s*['"]capacitor-www['"]/);
  });
});

describe('[FB-67] iOS brand assets (not the stock Capacitor placeholders)', () => {
  const dir = 'ios/App/App/Assets.xcassets';
  const png = (p: string) => readFileSync(resolve(process.cwd(), p));
  const size = (b: Buffer) => ({ w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] });

  it('[FB-67] App Store icon is 1024x1024 opaque RGB (no alpha) and is the sloth brand logo, not the Capacitor default', () => {
    const icon = png(`${dir}/AppIcon.appiconset/AppIcon-512@2x.png`);
    expect(size(icon)).toEqual({ w: 1024, h: 1024, colorType: 2 }); // 2 = RGB, 6 would be RGBA
    expect(icon.length).toBeGreaterThan(100 * 1024); // the stock placeholder is a ~60 KB line drawing
    expect(JSON.parse(read(`${dir}/AppIcon.appiconset/Contents.json`)).images[0]).toMatchObject({ size: '1024x1024', idiom: 'universal' });
  });

  it('[FB-67] splash images are the 2732x2732 brand splash used by the launch storyboard', () => {
    const files = JSON.parse(read(`${dir}/Splash.imageset/Contents.json`)).images.map((i: { filename: string }) => i.filename);
    expect(files.length).toBe(3);
    for (const f of files) expect(size(png(`${dir}/Splash.imageset/${f}`))).toMatchObject({ w: 2732, h: 2732 });
    expect(read('ios/App/App/Base.lproj/LaunchScreen.storyboard')).toContain('image="Splash"');
  });
});

describe('[FB-67] CI + plan for the no-Mac build path', () => {
  it('[FB-67] GitHub Actions builds an unsigned simulator app with no secrets and never builds into docs/', () => {
    const y = read('.github/workflows/ios.yml');
    expect(y).toContain('macos-');
    expect(y).toContain('-sdk iphonesimulator');
    expect(y).toContain('CODE_SIGNING_ALLOWED=NO');
    expect(y).toContain('--outDir capacitor-www');
    expect(y).toContain('npx cap sync ios');
    expect(y).not.toContain('cap add ios');
    expect(y).not.toMatch(/\$\{\{\s*secrets\./);
    expect(y).not.toMatch(/npm run build(?!:)/);
  });

  it('[FB-67] codemagic.yaml has simulator + TestFlight workflows, signing only by reference (no secrets)', () => {
    const y = read('codemagic.yaml');
    expect(y).toContain('ios-simulator:');
    expect(y).toContain('ios-testflight:');
    expect(y).toContain('bundle_identifier: com.hoctusach.lazyvocabulary');
    expect(y).toContain('--outDir capacitor-www');
    expect(y).not.toContain('cap add ios');
    expect(y).not.toMatch(/BEGIN (RSA |EC )?PRIVATE KEY|\.p8|\.p12|-----BEGIN/);
    expect(y).not.toMatch(/ca-app-pub-(?!3940256099942544)\d{16}/); // no real AdMob id committed
  });

  it('[FB-67] IOS_PLAN.md carries the naming decision, early name reservation and the 13" iPad screenshots', () => {
    const p = read('IOS_PLAN.md');
    expect(p).toContain('exactly `Lazy Vocabulary`');
    expect(p).toContain('Lazy Vocab');
    expect(p).toMatch(/Reserve the app name in App Store Connect the same day/);
    expect(p).toContain('Learn words in any language');
    expect(p).toMatch(/iPad 13" screenshots/);
    expect(p).toMatch(/6\.9"/);
    expect(p).toMatch(/6\.5"/);
    for (const t of ['$99', 'Privacy', 'Age rating', 'pro_unlock', 'ATT', 'Codemagic', 'GitHub Actions', 'Review notes']) expect(p, t).toContain(t);
    // "Learn words in any language" must fit Apple's 30-character subtitle limit
    expect('Learn words in any language'.length).toBeLessThanOrEqual(30);
    expect(existsSync(resolve(process.cwd(), 'ios/App/App.xcodeproj/project.pbxproj'))).toBe(true);
  });
});
