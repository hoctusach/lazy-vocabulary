import Foundation
import CryptoKit
import KokoroCore

/// Thread-safe cancel flag; `onCancel` aborts the in-flight URLSession task.
public final class KokoroCancelFlag {
    private let lock = NSLock()
    private var flag = false
    private var handler: (() -> Void)?
    public init() {}
    public var isCancelled: Bool { lock.lock(); defer { lock.unlock() }; return flag }
    public func cancel() {
        lock.lock(); flag = true; let h = handler; lock.unlock()
        h?()
    }
    func setHandler(_ h: (() -> Void)?) {
        lock.lock(); handler = h; let already = flag; lock.unlock()
        if already { h?() }
    }
}

public struct KokoroDownloadError: Error {
    /// NO_SPACE | NETWORK | CHECKSUM | CANCELLED
    public let code: String
    public let message: String
    public init(_ code: String, _ message: String) { self.code = code; self.message = message }
}

private struct RangeIgnored: Error {}

/// Downloads and verifies the Kokoro model files (pinned Hugging Face revision) into Application Support (excluded from iCloud
/// backup). voices.bin is assembled locally from two HTTP Range slices (af_heart, am_michael); the rest is zeros.
/// Port of KokoroModelStore.java.
public final class KokoroModelStore {
    static let voicesName = "voices.bin"
    static let readyName = "ready"
    static let voicesSize: Int64 = 28_200_960
    static let voicesFullSha = "1c5a5b983d3d50d8586d437a51f3faa2da7919ce76a013c081e65671a3447c29"
    static let sliceLen: Int64 = 522_240

    struct Entry { let name: String; let size: Int64; let sha: String }
    struct Slice { let id: String; let offset: Int64; let sha: String }

    static let slices = [
        Slice(id: "af_heart", offset: 1_566_720, sha: "d583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b"),
        Slice(id: "am_michael", offset: 8_355_840, sha: "1d1f21dd8da39c30705cd4c75d039d265e9bc4a2a93ed09bc9e1b1225eb95ba1"),
    ]

    public let variant: KokoroVariant
    public let dir: URL
    private let files: [Entry]
    private let fm = FileManager.default
    private let stateLock = NSLock()
    private var _downloading = false

    // progress accounting (only touched by the downloading thread)
    private var doneBytes: Int64 = 0
    private var lastEmit = Date.distantPast
    private var listener: ((Int64, Int64, String) -> Void)?

    public init(dir: URL, variant: KokoroVariant) {
        self.dir = dir
        self.variant = variant
        files = [
            Entry(name: variant.modelName, size: variant.modelSize, sha: variant.modelSha),
            Entry(name: KokoroVariant.tokensName, size: KokoroVariant.tokensSize, sha: KokoroVariant.tokensSha),
            Entry(name: KokoroVariant.lexiconName, size: KokoroVariant.lexiconSize, sha: KokoroVariant.lexiconSha),
        ]
    }

    public var totalBytes: Int64 { variant.totalBytes }
    public var modelFile: URL { dir.appendingPathComponent(variant.modelName) }
    public var tokensFile: URL { dir.appendingPathComponent(KokoroVariant.tokensName) }
    public var lexiconFile: URL { dir.appendingPathComponent(KokoroVariant.lexiconName) }
    public var voicesFile: URL { dir.appendingPathComponent(Self.voicesName) }

    public var isDownloading: Bool { stateLock.lock(); defer { stateLock.unlock() }; return _downloading }

    private func size(_ u: URL) -> Int64? {
        guard let a = try? fm.attributesOfItem(atPath: u.path), let n = a[.size] as? NSNumber else { return nil }
        return n.int64Value
    }

    public var isReady: Bool {
        if !fm.fileExists(atPath: dir.appendingPathComponent(Self.readyName).path) { return false }
        for e in files where size(dir.appendingPathComponent(e.name)) != e.size { return false }
        return size(voicesFile) == Self.voicesSize
    }

    public var bytesOnDisk: Int64 {
        guard let en = fm.enumerator(at: dir, includingPropertiesForKeys: [.fileSizeKey]) else { return 0 }
        var n: Int64 = 0
        for case let u as URL in en { n += Int64((try? u.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0) }
        return n
    }

    public func delete() { try? fm.removeItem(at: dir) }

    // MARK: download

    /// Blocking. Call from a background queue. Concurrent calls are rejected by the caller (plugin) via isDownloading.
    public func download(cancel: KokoroCancelFlag, progress: @escaping (Int64, Int64, String) -> Void) throws {
        stateLock.lock(); _downloading = true; stateLock.unlock()
        defer { stateLock.lock(); _downloading = false; stateLock.unlock() }
        listener = progress
        doneBytes = 0
        lastEmit = .distantPast
        do {
            try fm.createDirectory(at: dir, withIntermediateDirectories: true)
        } catch {
            throw KokoroDownloadError("NO_SPACE", "Cannot create \(dir.path)")
        }
        try? fm.removeItem(at: dir.appendingPathComponent(Self.readyName))

        var have: Int64 = 0
        for e in files {
            let f = dir.appendingPathComponent(e.name)
            have += size(f) == e.size ? e.size : (size(dir.appendingPathComponent(e.name + ".part")) ?? 0)
        }
        let need = max(0, totalBytes - have) + 8 * 1024 * 1024
        if let free = (try? dir.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]))?.volumeAvailableCapacityForImportantUsage,
           free < need {
            throw KokoroDownloadError("NO_SPACE", "Not enough free storage (need about \(need / (1024 * 1024)) MB)")
        }

        for e in files {
            let f = dir.appendingPathComponent(e.name)
            if size(f) == e.size, sha256(f, 0, e.size) == e.sha {
                doneBytes += e.size
                emit(e.name, force: true)
                continue
            }
            try? fm.removeItem(at: f)
            let part = dir.appendingPathComponent(e.name + ".part")
            do {
                try fetch(variant.base + e.name, part: part, expected: e.size, rangeOffset: -1, label: e.name, cancel: cancel)
            } catch is RangeIgnored {
                throw KokoroDownloadError("NETWORK", "unexpected range response")
            }
            try verifyAndMove(part, f, e.size, e.sha)
        }
        try fetchVoices(cancel)
        emit(Self.voicesName, force: true)
        if !fm.createFile(atPath: dir.appendingPathComponent(Self.readyName).path, contents: Data()) {
            throw KokoroDownloadError("NO_SPACE", "Cannot write marker")
        }
    }

    private func voicesVerified() -> Bool {
        if size(voicesFile) != Self.voicesSize { return false }
        for s in Self.slices where sha256(voicesFile, s.offset, Self.sliceLen) != s.sha { return false }
        return true
    }

    private func fetchVoices(_ cancel: KokoroCancelFlag) throws {
        if voicesVerified() {
            doneBytes += 2 * Self.sliceLen
            return
        }
        let assembled = dir.appendingPathComponent(Self.voicesName + ".tmp")
        try? fm.removeItem(at: assembled)
        guard fm.createFile(atPath: assembled.path, contents: nil), let out = try? FileHandle(forWritingTo: assembled) else {
            throw KokoroDownloadError("NO_SPACE", "Cannot create voices.bin.tmp")
        }
        defer { try? out.close() }
        do { try out.truncate(atOffset: UInt64(Self.voicesSize)) } catch { throw KokoroDownloadError("NO_SPACE", "Cannot size voices.bin.tmp") }
        for s in Self.slices {
            let part = dir.appendingPathComponent("\(Self.voicesName).\(s.id).part")
            do {
                try fetch(variant.base + Self.voicesName, part: part, expected: Self.sliceLen, rangeOffset: s.offset, label: Self.voicesName, cancel: cancel)
            } catch is RangeIgnored {
                try? fm.removeItem(at: part)
                try fetchFullVoices(cancel)
                try? fm.removeItem(at: assembled)
                return
            }
            if sha256(part, 0, Self.sliceLen) != s.sha {
                try? fm.removeItem(at: part)
                throw KokoroDownloadError("CHECKSUM", "Checksum mismatch for voice \(s.id)")
            }
            do {
                let data = try Data(contentsOf: part)
                try out.seek(toOffset: UInt64(s.offset))
                try out.write(contentsOf: data)
            } catch {
                throw KokoroDownloadError("NO_SPACE", "Cannot write voice slice: \(error.localizedDescription)")
            }
            try? fm.removeItem(at: part)
        }
        try? out.close()
        try? fm.removeItem(at: voicesFile)
        do { try fm.moveItem(at: assembled, to: voicesFile) } catch {
            throw KokoroDownloadError("NO_SPACE", "Cannot move voices.bin into place")
        }
    }

    /// Fallback when the CDN ignores Range: download the whole voices.bin (28 MB) and verify its sha256.
    private func fetchFullVoices(_ cancel: KokoroCancelFlag) throws {
        let part = dir.appendingPathComponent(Self.voicesName + ".full.part")
        do {
            try fetch(variant.base + Self.voicesName, part: part, expected: Self.voicesSize, rangeOffset: -1, label: Self.voicesName, cancel: cancel)
        } catch is RangeIgnored {
            throw KokoroDownloadError("NETWORK", "unexpected range response")
        }
        try? fm.removeItem(at: voicesFile)
        try verifyAndMove(part, voicesFile, Self.voicesSize, Self.voicesFullSha)
    }

    private func verifyAndMove(_ part: URL, _ dest: URL, _ expected: Int64, _ sha: String) throws {
        if size(part) != expected || sha256(part, 0, expected) != sha {
            try? fm.removeItem(at: part)
            throw KokoroDownloadError("CHECKSUM", "Checksum mismatch for \(dest.lastPathComponent)")
        }
        try? fm.removeItem(at: dest)
        do { try fm.moveItem(at: part, to: dest) } catch {
            throw KokoroDownloadError("NO_SPACE", "Cannot move \(dest.lastPathComponent) into place")
        }
    }

    /// Fetch `expected` bytes into `part`, resuming from its length. rangeOffset >= 0 requests the slice
    /// [rangeOffset, rangeOffset+expected) of the remote file (206 required, RangeIgnored on 200).
    private func fetch(_ url: String, part: URL, expected: Int64, rangeOffset: Int64, label: String, cancel: KokoroCancelFlag) throws {
        var partLen = size(part) ?? 0
        if partLen > expected {
            try? fm.removeItem(at: part)
            partLen = 0
        }
        if partLen == expected {
            doneBytes += expected
            emit(label, force: false)
            return
        }
        let base = rangeOffset >= 0 ? rangeOffset : 0
        let wantRange = rangeOffset >= 0 || partLen > 0
        guard let u = URL(string: url) else { throw KokoroDownloadError("NETWORK", "bad url") }
        var req = URLRequest(url: u)
        req.setValue("identity", forHTTPHeaderField: "Accept-Encoding") // byte ranges must match the raw file
        req.setValue("LazyVocabulary-iOS", forHTTPHeaderField: "User-Agent")
        if wantRange { req.setValue("bytes=\(base + partLen)-\(base + expected - 1)", forHTTPHeaderField: "Range") }
        let job = FetchJob(request: req, part: part, startLen: partLen, expected: expected, ranged: rangeOffset >= 0, cancel: cancel) { [weak self] n in
            self?.doneBytes += n
            self?.emit(label, force: false)
        }
        doneBytes += partLen
        try job.run()
        if job.rangeIgnored { throw RangeIgnored() }
        if size(part) != expected { throw KokoroDownloadError("NETWORK", "Truncated download (\(size(part) ?? 0)/\(expected))") }
    }

    private func emit(_ file: String, force: Bool) {
        guard let l = listener else { return }
        let now = Date()
        if !force && now.timeIntervalSince(lastEmit) < 0.25 { return }
        lastEmit = now
        l(min(doneBytes, totalBytes), totalBytes, file)
    }

    func sha256(_ f: URL, _ offset: Int64, _ length: Int64) -> String {
        guard let h = try? FileHandle(forReadingFrom: f) else { return "" }
        defer { try? h.close() }
        do {
            try h.seek(toOffset: UInt64(offset))
            var hasher = SHA256()
            var left = length
            while left > 0 {
                let chunk = try h.read(upToCount: Int(min(1 << 20, left))) ?? Data()
                if chunk.isEmpty { return "" }
                hasher.update(data: chunk)
                left -= Int64(chunk.count)
            }
            return hasher.finalize().map { String(format: "%02x", $0) }.joined()
        } catch {
            return ""
        }
    }
}

/// One streaming HTTP GET into a `.part` file (appending when resuming). Blocks the calling thread until done.
private final class FetchJob: NSObject, URLSessionDataDelegate {
    private let request: URLRequest
    private let part: URL
    private let startLen: Int64
    private let expected: Int64
    private let ranged: Bool
    private let cancel: KokoroCancelFlag
    private let onBytes: (Int64) -> Void
    private let sem = DispatchSemaphore(value: 0)
    private var handle: FileHandle?
    private var got: Int64
    private var failure: KokoroDownloadError?
    private(set) var rangeIgnored = false
    private var task: URLSessionDataTask?

    init(request: URLRequest, part: URL, startLen: Int64, expected: Int64, ranged: Bool, cancel: KokoroCancelFlag, onBytes: @escaping (Int64) -> Void) {
        self.request = request
        self.part = part
        self.startLen = startLen
        self.expected = expected
        self.ranged = ranged
        self.cancel = cancel
        self.onBytes = onBytes
        got = startLen
    }

    func run() throws {
        let cfg = URLSessionConfiguration.ephemeral
        cfg.timeoutIntervalForRequest = 30
        cfg.timeoutIntervalForResource = 6 * 3600
        let q = OperationQueue()
        q.maxConcurrentOperationCount = 1
        let session = URLSession(configuration: cfg, delegate: self, delegateQueue: q)
        let t = session.dataTask(with: request)
        task = t
        cancel.setHandler { t.cancel() }
        t.resume()
        sem.wait()
        cancel.setHandler(nil)
        session.finishTasksAndInvalidate()
        try? handle?.close()
        if cancel.isCancelled { throw KokoroDownloadError("CANCELLED", "Download cancelled") }
        if let f = failure { throw f }
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        var append = false
        if code == 206 {
            append = true
        } else if code == 200 {
            if ranged { rangeIgnored = true; completionHandler(.cancel); return }
            got = 0 // server ignored resume: restart this file
        } else {
            if code == 416 { try? FileManager.default.removeItem(at: part) }
            failure = KokoroDownloadError("NETWORK", "HTTP \(code)")
            completionHandler(.cancel)
            return
        }
        do {
            if !append || !FileManager.default.fileExists(atPath: part.path) {
                FileManager.default.createFile(atPath: part.path, contents: nil)
                got = 0
            }
            let h = try FileHandle(forWritingTo: part)
            if append { try h.seekToEnd() }
            handle = h
        } catch {
            failure = KokoroDownloadError("NO_SPACE", "Cannot open \(part.lastPathComponent)")
            completionHandler(.cancel)
            return
        }
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        if cancel.isCancelled { dataTask.cancel(); return }
        let room = expected - got
        let slice = Int64(data.count) > room ? data.prefix(Int(max(0, room))) : data
        if slice.isEmpty { return }
        do {
            try handle?.write(contentsOf: slice)
        } catch {
            let m = error.localizedDescription.lowercased()
            failure = KokoroDownloadError(m.contains("space") ? "NO_SPACE" : "NETWORK", error.localizedDescription)
            dataTask.cancel()
            return
        }
        got += Int64(slice.count)
        onBytes(Int64(slice.count))
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let e = error, failure == nil, !rangeIgnored, !cancel.isCancelled {
            failure = KokoroDownloadError("NETWORK", e.localizedDescription)
        }
        sem.signal()
    }
}
