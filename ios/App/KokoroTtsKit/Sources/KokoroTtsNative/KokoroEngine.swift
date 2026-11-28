#if os(iOS)
import Foundation
import AVFoundation
import UIKit
import KokoroCore
import SherpaOnnxC

/// Loads Kokoro lazily, phonemizes (KokoroG2P), synthesizes sentence by sentence with sherpa-onnx and streams the audio through
/// AVAudioEngine / AVAudioPlayerNode (port of KokoroEngine.java). One utterance at a time; a new speak() interrupts the old one.
public final class KokoroEngine {
    public static let sampleRate = 24000
    private static let idleReleaseSeconds: TimeInterval = 600

    public typealias Completion = (_ interrupted: Bool, _ errorCode: String?, _ message: String?, _ oov: [String]?) -> Void

    private let models: KokoroModels
    private let worker = DispatchQueue(label: "kokoro-engine", qos: .userInitiated)
    private let jobLock = NSLock()
    private var current: Job?
    private var idleItem: DispatchWorkItem?

    // Touched only on the worker queue
    private var tts: OpaquePointer?
    private var g2p: KokoroG2P?
    private var loadedFrom: KokoroVariant?

    public init(models: KokoroModels) {
        self.models = models
        NotificationCenter.default.addObserver(self, selector: #selector(onMemoryWarning), name: UIApplication.didReceiveMemoryWarningNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(onInterruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
    }

    deinit { NotificationCenter.default.removeObserver(self) }

    public var isSpeaking: Bool {
        jobLock.lock(); defer { jobLock.unlock() }
        return current.map { !$0.isFinished } ?? false
    }

    public func speak(text: String, sid: Int, speed: Float, completion: @escaping Completion) {
        let job = Job(engine: self, completion: completion)
        jobLock.lock()
        current?.cancel()
        current = job
        jobLock.unlock()
        cancelIdleTimer()
        worker.async { [weak self] in
            job.run(text: text, sid: sid, speed: speed)
            self?.scheduleIdleRelease()
        }
    }

    public func stop() {
        jobLock.lock(); let j = current; jobLock.unlock()
        j?.cancel()
    }

    /// Stops speech and frees the model (async).
    public func release() {
        stop()
        worker.async { [weak self] in self?.doRelease() }
    }

    /// Same as release() but waits for completion (used before deleting the model files).
    public func releaseBlocking() {
        stop()
        worker.sync { doRelease() }
    }

    @objc private func onMemoryWarning() {
        if isSpeaking { return }
        worker.async { [weak self] in
            guard let self = self, !self.isSpeaking else { return }
            self.doRelease()
        }
    }

    @objc private func onInterruption(_ n: Notification) {
        // phone call / Siri / another app took the audio session: end the utterance (JS treats it as a finished word)
        guard let raw = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
        stop()
    }

    private func doRelease() {
        if let t = tts { SherpaOnnxDestroyOfflineTts(t) }
        tts = nil
        g2p = nil
        loadedFrom = nil
    }

    private func cancelIdleTimer() {
        idleItem?.cancel()
        idleItem = nil
    }

    private func scheduleIdleRelease() {
        idleItem?.cancel()
        let item = DispatchWorkItem { [weak self] in
            guard let self = self, !self.isSpeaking else { return }
            self.doRelease()
        }
        idleItem = item
        worker.asyncAfter(deadline: .now() + Self.idleReleaseSeconds, execute: item)
    }

    private func ensureLoaded() throws {
        guard let store = models.ready else { throw EngineError("NOT_DOWNLOADED", "Kokoro voices are not downloaded") }
        if tts != nil && g2p != nil && loadedFrom == store.variant { return }
        doRelease()
        let main = try KokoroG2P.parseLexicon(fileURL: store.lexiconFile)
        guard let extraURL = KokoroResources.extraLexiconURL else { throw EngineError("ENGINE_ERROR", "Bundled lexicon is missing") }
        let extra = try KokoroG2P.parseLexicon(fileURL: extraURL)
        let tokens = KokoroG2P.parseTokens(try String(contentsOf: store.tokensFile, encoding: .utf8))

        // C strings must outlive SherpaOnnxCreateOfflineTts
        let model = strdup(store.modelFile.path), voices = strdup(store.voicesFile.path), tokensPath = strdup(store.tokensFile.path), provider = strdup("cpu")
        defer { free(model); free(voices); free(tokensPath); free(provider) }
        var cfg = SherpaOnnxOfflineTtsConfig()
        cfg.model.kokoro.model = UnsafePointer(model)
        cfg.model.kokoro.voices = UnsafePointer(voices)
        cfg.model.kokoro.tokens = UnsafePointer(tokensPath)
        cfg.model.provider = UnsafePointer(provider)
        cfg.model.num_threads = Int32(max(2, min(4, ProcessInfo.processInfo.activeProcessorCount / 2)))
        cfg.model.debug = 0
        cfg.max_num_sentences = 1
        guard let created = SherpaOnnxCreateOfflineTts(&cfg) else {
            throw EngineError("ENGINE_ERROR", "Voice engine could not load the model")
        }
        tts = created
        g2p = KokoroG2P(main: main, extra: extra, allowedCodePoints: tokens)
        loadedFrom = store.variant
    }

    struct EngineError: Error {
        let code: String
        let message: String
        init(_ c: String, _ m: String) { code = c; message = m }
    }

    // MARK: job

    private final class Job {
        unowned let engine: KokoroEngine
        let completion: Completion
        private let lock = NSLock()
        private var cancelled = false
        private var finished = false
        private var audio: AVAudioEngine?
        private var player: AVAudioPlayerNode?
        private let slots = DispatchSemaphore(value: 2)
        private let played = DispatchGroup()

        init(engine: KokoroEngine, completion: @escaping Completion) {
            self.engine = engine
            self.completion = completion
        }

        var isCancelled: Bool { lock.lock(); defer { lock.unlock() }; return cancelled }
        var isFinished: Bool { lock.lock(); defer { lock.unlock() }; return finished }

        func cancel() {
            lock.lock(); cancelled = true; let p = player; let a = audio; lock.unlock()
            p?.stop()
            a?.stop()
            slots.signal(); slots.signal(); slots.signal()
            finish(interrupted: true, code: nil, message: nil, oov: nil)
        }

        func finish(interrupted: Bool, code: String?, message: String?, oov: [String]?) {
            lock.lock()
            if finished { lock.unlock(); return }
            finished = true
            lock.unlock()
            completion(interrupted, code, message, oov)
        }

        func run(text: String, sid: Int, speed: Float) {
            if isCancelled { return }
            do {
                guard engine.models.isReady else { throw EngineError("NOT_DOWNLOADED", "Kokoro voices are not downloaded") }
                try engine.ensureLoaded()
                if isCancelled { return }
                let res = engine.g2p!.phonemize(text)
                if !res.oov.isEmpty {
                    finish(interrupted: false, code: "OOV", message: "Unknown words: \(res.oov)", oov: res.oov)
                    return
                }
                if res.sentences.isEmpty {
                    finish(interrupted: false, code: nil, message: nil, oov: nil)
                    return
                }
                try play(res.sentences, sid: sid, speed: speed)
            } catch let e as EngineError {
                if !isCancelled { finish(interrupted: false, code: e.code, message: e.message, oov: nil) }
            } catch {
                if !isCancelled { finish(interrupted: false, code: "ENGINE_ERROR", message: error.localizedDescription, oov: nil) }
            }
        }

        private func play(_ sentences: [String], sid: Int, speed: Float) throws {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .spokenAudio, options: [])
            try session.setActive(true)

            let format = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: Double(KokoroEngine.sampleRate), channels: 1, interleaved: false)!
            let ae = AVAudioEngine()
            let pn = AVAudioPlayerNode()
            ae.attach(pn)
            ae.connect(pn, to: ae.mainMixerNode, format: format)
            lock.lock()
            if cancelled { lock.unlock(); return }
            audio = ae
            player = pn
            lock.unlock()
            try ae.start()
            pn.play()
            defer {
                pn.stop()
                ae.stop()
                lock.lock(); player = nil; audio = nil; lock.unlock()
            }

            let fx = KokoroPostFx(sampleRate: KokoroEngine.sampleRate) // fresh filter state per utterance
            let gap = [Float](repeating: 0, count: KokoroEngine.sampleRate * 150 / 1000)
            for (i, s) in sentences.enumerated() {
                if isCancelled { break }
                var samples = try engine.synthesize(phonemes: s, sid: sid, speed: speed)
                fx.process(&samples)
                if i < sentences.count - 1 { samples.append(contentsOf: gap) }
                if isCancelled { break }
                guard let buf = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(samples.count)) else {
                    throw EngineError("ENGINE_ERROR", "Cannot allocate an audio buffer")
                }
                buf.frameLength = AVAudioFrameCount(samples.count)
                samples.withUnsafeBufferPointer { src in
                    buf.floatChannelData![0].update(from: src.baseAddress!, count: samples.count)
                }
                // at most 2 buffers queued: synthesis stays about one sentence ahead of playback
                while slots.wait(timeout: .now() + 0.1) == .timedOut { if isCancelled { break } }
                if isCancelled { break }
                played.enter()
                pn.scheduleBuffer(buf, completionCallbackType: .dataPlayedBack) { [weak self] _ in
                    self?.slots.signal()
                    self?.played.leave()
                }
            }
            if !isCancelled {
                while played.wait(timeout: .now() + 0.05) == .timedOut { if isCancelled { break } }
            }
            if isCancelled { return } // cancel() already resolved the call
            finish(interrupted: false, code: nil, message: nil, oov: nil)
        }
    }

    /// Runs on the worker queue (called from Job.play).
    fileprivate func synthesize(phonemes: String, sid: Int, speed: Float) throws -> [Float] {
        guard let tts = tts else { throw EngineError("ENGINE_ERROR", "Voice engine is not loaded") }
        let cps: [Int32] = phonemes.unicodeScalars.map { Int32(bitPattern: $0.value) }
        let lens: [Int32] = [Int32(cps.count)]
        var out: [Float] = []
        cps.withUnsafeBufferPointer { cpBuf in
            lens.withUnsafeBufferPointer { lenBuf in
                var gc = SherpaOnnxGenerationConfig()
                gc.silence_scale = 0.2
                gc.speed = speed
                gc.sid = Int32(sid)
                gc.phoneme_codepoints = cpBuf.baseAddress
                gc.phoneme_codepoints_lens = lenBuf.baseAddress
                gc.phoneme_codepoints_num_sentences = 1
                if let a = SherpaOnnxOfflineTtsGenerateWithConfig(tts, "x", &gc, nil, nil) {
                    let n = Int(a.pointee.n)
                    if n > 0, let p = a.pointee.samples { out = Array(UnsafeBufferPointer(start: p, count: n)) }
                    SherpaOnnxDestroyOfflineTtsGeneratedAudio(a)
                }
            }
        }
        if out.isEmpty { throw EngineError("ENGINE_ERROR", "The voice engine produced no audio") }
        return out
    }
}
#endif
