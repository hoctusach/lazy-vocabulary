import Foundation
import KokoroCore

/// Holds both model stores and decides which one to download / load (port of KokoroModels.java).
public final class KokoroModels {
    public let fp32: KokoroModelStore
    public let int8: KokoroModelStore
    public let preferred: KokoroVariant

    public init(fp32: KokoroModelStore, int8: KokoroModelStore, preferred: KokoroVariant) {
        self.fp32 = fp32
        self.int8 = int8
        self.preferred = preferred
    }

    /// Application Support/kokoro/<variant dir>, excluded from iCloud/iTunes backup (the models are re-downloadable).
    public convenience init(root: URL? = nil, totalMem: UInt64 = ProcessInfo.processInfo.physicalMemory) {
        var base = root ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("kokoro", isDirectory: true)
        try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        var rv = URLResourceValues()
        rv.isExcludedFromBackup = true
        try? base.setResourceValues(rv)
        self.init(
            fp32: KokoroModelStore(dir: base.appendingPathComponent(KokoroVariant.fp32.dirName, isDirectory: true), variant: .fp32),
            int8: KokoroModelStore(dir: base.appendingPathComponent(KokoroVariant.int8.dirName, isDirectory: true), variant: .int8),
            preferred: KokoroVariant.choose(totalMemBytes: totalMem)
        )
    }

    public func store(_ v: KokoroVariant) -> KokoroModelStore { v == .fp32 ? fp32 : int8 }
    public var preferredStore: KokoroModelStore { store(preferred) }

    /// The store to load for speech: fp32 when fully installed, else int8, else nil.
    public var ready: KokoroModelStore? {
        if fp32.isReady { return fp32 }
        if int8.isReady { return int8 }
        return nil
    }

    public var isReady: Bool { ready != nil }
    public var isDownloading: Bool { fp32.isDownloading || int8.isDownloading }
    /// Only the int8 model is installed although this device qualifies for fp32.
    public var upgradeAvailable: Bool { preferred == .fp32 && !fp32.isReady && int8.isReady }
    public var bytesOnDisk: Int64 { fp32.bytesOnDisk + int8.bytesOnDisk }

    public func deleteAll() {
        fp32.delete()
        int8.delete()
    }

    /// The `getStatus` payload (same keys as the Android plugin).
    public func status() -> [String: Any] {
        let r = ready
        let shown = r ?? preferredStore
        return [
            "supported": true,
            "downloaded": r != nil,
            "downloading": isDownloading,
            "bytesOnDisk": bytesOnDisk,
            "downloadSize": preferredStore.totalBytes,
            "version": shown.variant.version,
            "variant": shown.variant.id,
            "upgradeAvailable": upgradeAvailable,
        ]
    }
}
