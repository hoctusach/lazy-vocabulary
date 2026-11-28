import XCTest
@testable import KokoroTtsNative
import KokoroCore
#if os(iOS)
import Capacitor
#endif

/// The plugin's `getStatus` payload comes from KokoroModels.status(); these tests exercise it against a temp directory.
final class KokoroModelsTests: XCTestCase {
    var root: URL!

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent("kokoro-test-\(UUID().uuidString)")
    }

    override func tearDownWithError() throws { try? FileManager.default.removeItem(at: root) }

    func testStatusWhenNothingDownloaded() {
        let m = KokoroModels(root: root, totalMem: 4 * 1024 * 1024 * 1024)
        let s = m.status()
        XCTAssertEqual(s["supported"] as? Bool, true)
        XCTAssertEqual(s["downloaded"] as? Bool, false)
        XCTAssertEqual(s["downloading"] as? Bool, false)
        XCTAssertEqual(s["variant"] as? String, "fp32")
        XCTAssertEqual(s["version"] as? String, "kokoro-v1.0-fp32")
        XCTAssertEqual(s["downloadSize"] as? Int64, 332_562_608)
        XCTAssertEqual(s["upgradeAvailable"] as? Bool, false)
        XCTAssertEqual(s["bytesOnDisk"] as? Int64, 0)
    }

    func testLowMemoryDevicePrefersInt8() {
        let m = KokoroModels(root: root, totalMem: 2 * 1024 * 1024 * 1024)
        XCTAssertEqual(m.status()["variant"] as? String, "int8")
        XCTAssertEqual(m.status()["downloadSize"] as? Int64, 121_205_045)
    }

    func testPartialInstallIsNotReady() throws {
        let m = KokoroModels(root: root, totalMem: 4 * 1024 * 1024 * 1024)
        try FileManager.default.createDirectory(at: m.fp32.dir, withIntermediateDirectories: true)
        FileManager.default.createFile(atPath: m.fp32.dir.appendingPathComponent("ready").path, contents: Data())
        FileManager.default.createFile(atPath: m.fp32.dir.appendingPathComponent("tokens.txt").path, contents: Data("x".utf8))
        XCTAssertFalse(m.isReady)
        XCTAssertEqual(m.status()["downloaded"] as? Bool, false)
        m.deleteAll()
        XCTAssertEqual(m.bytesOnDisk, 0)
    }

    func testBackupExclusion() throws {
        _ = KokoroModels(root: root, totalMem: 4 * 1024 * 1024 * 1024)
        let v = try root.resourceValues(forKeys: [.isExcludedFromBackupKey])
        XCTAssertEqual(v.isExcludedFromBackup, true)
    }

    #if os(iOS)
    func testPluginExposesTheAndroidApi() {
        let names = Set(KokoroTtsPlugin().pluginMethods.map { $0.name })
        XCTAssertEqual(names, ["getStatus", "getNetwork", "download", "cancelDownload", "deleteModel", "speak", "stop", "release"])
        XCTAssertEqual(KokoroTtsPlugin().jsName, "KokoroTts")
    }
    #endif
}
