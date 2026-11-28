#if os(iOS)
import Foundation
import Capacitor
import Network
import UIKit
import KokoroCore

/// Capacitor plugin "KokoroTts": same JS API as the Android plugin (getStatus, getNetwork, download, cancelDownload,
/// deleteModel, speak, stop, release; events downloadProgress / downloadState). Registered from the app target
/// (see SceneDelegate.swift) because it is not an npm plugin.
@objc(KokoroTtsPlugin)
public class KokoroTtsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KokoroTtsPlugin"
    public let jsName = "KokoroTts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getNetwork", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "download", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelDownload", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteModel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "release", returnType: CAPPluginReturnPromise),
    ]

    private lazy var models = KokoroModels()
    private lazy var engine = KokoroEngine(models: models)
    private let io = DispatchQueue(label: "kokoro-io", qos: .userInitiated, attributes: .concurrent)
    private let cancelLock = NSLock()
    private var cancelFlag = KokoroCancelFlag()

    private func log(_ s: String) { NSLog("[kokoro] %@", s) }

    @objc func getStatus(_ call: CAPPluginCall) {
        io.async { call.resolve(self.models.status()) }
    }

    @objc func getNetwork(_ call: CAPPluginCall) {
        io.async {
            let monitor = NWPathMonitor()
            let sem = DispatchSemaphore(value: 0)
            var result: NWPath?
            monitor.pathUpdateHandler = { p in
                if result == nil { result = p; sem.signal() }
            }
            monitor.start(queue: DispatchQueue(label: "kokoro-net"))
            _ = sem.wait(timeout: .now() + 1.5)
            monitor.cancel()
            let connected = result?.status == .satisfied
            // cellular / personal hotspot (isExpensive) and Low Data Mode (isConstrained) count as metered
            let metered = result.map { $0.isExpensive || $0.isConstrained } ?? true
            call.resolve(["connected": connected, "metered": metered])
        }
    }

    @objc func download(_ call: CAPPluginCall) {
        let cancel = KokoroCancelFlag()
        cancelLock.lock(); cancelFlag = cancel; cancelLock.unlock()
        io.async {
            self.state("downloading", nil)
            // keep going for a short while if the user leaves the app mid-download; resume handles the rest
            var bg = UIBackgroundTaskIdentifier.invalid
            DispatchQueue.main.sync {
                bg = UIApplication.shared.beginBackgroundTask(withName: "kokoro-download") {}
            }
            defer {
                if bg != .invalid { DispatchQueue.main.async { UIApplication.shared.endBackgroundTask(bg) } }
            }
            do {
                let target = self.models.preferredStore
                if self.models.isDownloading {
                    call.reject("A download is already running", "NETWORK")
                    return
                }
                if !target.isReady {
                    try target.download(cancel: cancel) { done, total, file in
                        self.notifyListeners("downloadProgress", data: ["downloaded": done, "total": total, "file": file])
                    }
                }
                if target.isReady && target.variant == .fp32 && self.models.int8.bytesOnDisk > 0 {
                    // fp32 is complete and verified: drop the superseded int8 model
                    self.engine.releaseBlocking()
                    self.models.int8.delete()
                }
                self.state("done", nil)
                call.resolve(self.models.status())
            } catch let e as KokoroDownloadError {
                self.log("download failed: \(e.code) \(e.message)")
                self.state("error", e.code)
                call.reject(e.message, e.code)
            } catch {
                self.log("download failed: \(error.localizedDescription)")
                self.state("error", "NETWORK")
                call.reject(error.localizedDescription, "NETWORK")
            }
        }
    }

    private func state(_ s: String, _ error: String?) {
        var d: [String: Any] = ["state": s]
        if let e = error { d["error"] = e }
        notifyListeners("downloadState", data: d)
    }

    @objc func cancelDownload(_ call: CAPPluginCall) {
        cancelLock.lock(); let c = cancelFlag; cancelLock.unlock()
        c.cancel()
        call.resolve()
    }

    @objc func deleteModel(_ call: CAPPluginCall) {
        io.async {
            self.cancelLock.lock(); let c = self.cancelFlag; self.cancelLock.unlock()
            c.cancel()
            self.engine.releaseBlocking()
            self.models.deleteAll()
            call.resolve(self.models.status())
        }
    }

    @objc func speak(_ call: CAPPluginCall) {
        let text = call.getString("text") ?? ""
        let voice = call.getString("voice") ?? "af_heart"
        let speedIn = call.getDouble("speed") ?? 1.0
        let speed = Float(max(0.5, min(2.0, speedIn)))
        let sid = voice == "am_michael" ? 16 : 3
        if !models.isReady {
            call.reject("Kokoro voices are not downloaded", "NOT_DOWNLOADED")
            return
        }
        engine.speak(text: text, sid: sid, speed: speed) { interrupted, code, message, oov in
            if let code = code {
                var data: [String: Any] = [:]
                if let oov = oov { data["oov"] = oov }
                self.log("speak error \(code): \(message ?? "")")
                call.reject(message ?? code, code, nil, data)
            } else {
                call.resolve(["interrupted": interrupted])
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        engine.stop()
        call.resolve()
    }

    @objc func release(_ call: CAPPluginCall) {
        engine.release()
        call.resolve()
    }
}
#endif
