// swift-tools-version: 5.9
import PackageDescription

// Local package that holds the iOS KokoroTts Capacitor plugin (not an npm plugin, so `cap sync` does not manage it).
//  - KokoroCore:       pure Foundation (G2P, post-FX, model variants). Unit-tested without a device.
//  - KokoroTtsNative:  iOS only (Capacitor + AVFoundation + sherpa-onnx). The plugin class `KokoroTtsPlugin`.
//  - SherpaOnnxC:      k2-fsa sherpa-onnx v2.0.2 xcframework (ONNX Runtime statically linked inside). Remote binary target with a
//                      checksum, so no large binary is committed. Keep url/checksum in sync with scripts/ios/fetch-sherpa-onnx.sh.
let package = Package(
    name: "KokoroTtsKit",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        .library(name: "KokoroTtsKit", targets: ["KokoroCore", "KokoroTtsNative"]),
        // Exposed on its own so the app target can "Embed & Sign" the dynamic framework (see App.xcodeproj Embed Frameworks phase).
        .library(name: "SherpaOnnxC", targets: ["SherpaOnnxC"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.6.0"),
    ],
    targets: [
        .binaryTarget(
            name: "SherpaOnnxC",
            url: "https://github.com/k2-fsa/sherpa-onnx/releases/download/xcframework/sherpa-onnx-v2.0.2-ios-shared-onnxruntime-static.xcframework.zip",
            checksum: "9518838219e55716bb565df278b3f32093bb1948cc8a508f7b67989350bf9b25"
        ),
        .target(
            name: "KokoroCore",
            resources: [.copy("Resources/cmudict-extra-us.txt")]
        ),
        .target(
            name: "KokoroTtsNative",
            dependencies: [
                "KokoroCore",
                .product(name: "Capacitor", package: "capacitor-swift-pm", condition: .when(platforms: [.iOS])),
                .product(name: "Cordova", package: "capacitor-swift-pm", condition: .when(platforms: [.iOS])),
                .target(name: "SherpaOnnxC", condition: .when(platforms: [.iOS])),
            ]
        ),
        .testTarget(name: "KokoroCoreTests", dependencies: ["KokoroCore"]),
        .testTarget(
            name: "KokoroTtsNativeTests",
            dependencies: [
                "KokoroTtsNative", "KokoroCore",
                .product(name: "Capacitor", package: "capacitor-swift-pm", condition: .when(platforms: [.iOS])),
                .product(name: "Cordova", package: "capacitor-swift-pm", condition: .when(platforms: [.iOS])),
            ]
        ),
    ]
)
