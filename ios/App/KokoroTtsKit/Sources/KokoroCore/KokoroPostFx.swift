import Foundation

/// Post-processing for Kokoro output (port of KokoroPostFx.java): notch filters at sr/5 and sr/2.5, +4 dB make-up gain,
/// soft limiter and edge fades. One instance per utterance (filter state carries across sentences).
public final class KokoroPostFx {
    public static let sampleRate = 24000
    public static let notchQ = 8.0
    public static let gainDb = 4.0
    public static let kneeStart: Float = 0.8
    public static let ceiling: Float = 0.98
    public static let fadeMs = 5

    private static let gain = pow(10.0, gainDb / 20.0)

    private struct Biquad {
        let b0, b1, b2, a1, a2: Double
        var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0

        init(freq: Double, q: Double, sr: Int) {
            let w0 = 2.0 * Double.pi * freq / Double(sr)
            let alpha = sin(w0) / (2.0 * q)
            let c = cos(w0)
            let a0 = 1.0 + alpha
            b0 = 1.0 / a0
            b1 = -2.0 * c / a0
            b2 = 1.0 / a0
            a1 = -2.0 * c / a0
            a2 = (1.0 - alpha) / a0
        }

        mutating func step(_ input: Float) -> Float {
            let x = Double(input)
            let y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1; x1 = x; y2 = y1; y1 = y
            return Float(y)
        }

        mutating func reset() { x1 = 0; x2 = 0; y1 = 0; y2 = 0 }
    }

    private var notches: [Biquad]
    private let sr: Int

    public init(sampleRate: Int = KokoroPostFx.sampleRate) {
        sr = sampleRate
        notches = [
            Biquad(freq: Double(sampleRate) / 5.0, q: Self.notchQ, sr: sampleRate),
            Biquad(freq: Double(sampleRate) / 2.5, q: Self.notchQ, sr: sampleRate),
        ]
    }

    public func reset() {
        for i in notches.indices { notches[i].reset() }
    }

    public func notch(_ buf: inout [Float]) {
        for i in buf.indices {
            var v = buf[i]
            for n in notches.indices { v = notches[n].step(v) }
            buf[i] = v
        }
    }

    public static func gainAndLimit(_ buf: inout [Float]) {
        for i in buf.indices { buf[i] = limit(Float(Double(buf[i]) * gain)) }
    }

    public static func limit(_ x: Float) -> Float {
        if x.isNaN { return 0 }
        let a = abs(x)
        if a <= kneeStart { return x }
        let room = ceiling - kneeStart
        var y = kneeStart + room * Float(tanh(Double((a - kneeStart) / room)))
        if y > ceiling { y = ceiling }
        return x < 0 ? -y : y
    }

    public static func fade(_ buf: inout [Float], sampleRate: Int, ms: Int) {
        let n = min(sampleRate * ms / 1000, buf.count / 2)
        if n > 0 {
            for i in 0..<n {
                let g = Float(i) / Float(n)
                buf[i] *= g
                buf[buf.count - 1 - i] *= g
            }
        }
        if !buf.isEmpty {
            buf[0] = 0
            buf[buf.count - 1] = 0
        }
    }

    public func process(_ sentence: inout [Float]) {
        notch(&sentence)
        Self.gainAndLimit(&sentence)
        Self.fade(&sentence, sampleRate: sr, ms: Self.fadeMs)
    }
}
