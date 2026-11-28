import Foundation

/// The two downloadable Kokoro model builds. Mirrors android/.../kokoro/KokoroVariant.java (same pinned HF revisions + sha256).
public enum KokoroVariant: String, CaseIterable {
    case fp32
    case int8

    /// Devices with at least this much RAM get the (better sounding) fp32 model.
    public static let fp32MinTotalMem: UInt64 = 3 * 1024 * 1024 * 1024

    public static let tokensName = "tokens.txt"
    public static let tokensSize: Int64 = 687
    public static let tokensSha = "6ebb6bb288f20f3ae8d004d3c2ca27697da27c037d75e81a60e2a6a663f95425"
    public static let lexiconName = "lexicon-us-en.txt"
    public static let lexiconSize: Int64 = 5_956_885
    public static let lexiconSha = "7daaab53a181be9885b853a8582bf1838186317e5dadacbcef9c426d6fa0da14"
    public static let voicesSlicesBytes: Int64 = 2 * 522_240

    public var id: String { rawValue }

    public var dirName: String {
        switch self {
        case .fp32: return "kokoro-multi-lang-v1_0"
        case .int8: return "kokoro-int8-multi-lang-v1_0"
        }
    }

    public var version: String {
        switch self {
        case .fp32: return "kokoro-v1.0-fp32"
        case .int8: return "kokoro-v1.0-int8"
        }
    }

    public var base: String {
        switch self {
        case .fp32: return "https://huggingface.co/csukuangfj/kokoro-multi-lang-v1_0/resolve/f7b96bb6bef5c5da4d3aa4f4e0498fbbf62dc78b/"
        case .int8: return "https://huggingface.co/csukuangfj/kokoro-int8-multi-lang-v1_0/resolve/57adb37fc0e8d4bd430cfc1b8f8c2294945b9af2/"
        }
    }

    public var modelName: String { self == .fp32 ? "model.onnx" : "model.int8.onnx" }
    public var modelSize: Int64 { self == .fp32 ? 325_560_556 : 114_202_993 }
    public var modelSha: String {
        self == .fp32
            ? "b40f62b166ac8164b0627ef48a0b358eda0985e272fb03ef5252e7206305da11"
            : "75635ea3b85a32d00094dcdd61a258aba87c160f7c264c304a7b3ae9d734195e"
    }

    /// Bytes downloaded for a full install of this variant.
    public var totalBytes: Int64 {
        modelSize + Self.tokensSize + Self.lexiconSize + Self.voicesSlicesBytes
    }

    public static func choose(totalMemBytes: UInt64) -> KokoroVariant {
        totalMemBytes >= fp32MinTotalMem ? .fp32 : .int8
    }
}
