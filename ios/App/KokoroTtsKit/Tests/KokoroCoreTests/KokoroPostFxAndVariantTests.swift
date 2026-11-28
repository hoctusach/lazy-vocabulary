import XCTest
@testable import KokoroCore

final class KokoroPostFxTests: XCTestCase {
    let sr = 24000

    func sine(_ freq: Double, _ amp: Double, _ n: Int) -> [Float] {
        (0..<n).map { Float(amp * sin(2 * Double.pi * freq * Double($0) / Double(sr))) }
    }

    func rms(_ b: [Float], from: Int) -> Double {
        var s = 0.0
        for i in from..<b.count { s += Double(b[i]) * Double(b[i]) }
        return (s / Double(b.count - from)).squareRoot()
    }

    func notchDb(_ freq: Double) -> Double {
        let input = sine(freq, 0.3, sr)
        var out = input
        KokoroPostFx().notch(&out)
        return 20 * log10(rms(out, from: 4000) / rms(input, from: 4000))
    }

    func testNotchesAttenuateArtifactTones() {
        XCTAssertLessThan(notchDb(4800), -20)
        XCTAssertLessThan(notchDb(9600), -20)
    }

    func testNotchPassesSpeechBand() {
        XCTAssertEqual(notchDb(1000), 0, accuracy: 1.0)
        XCTAssertEqual(notchDb(300), 0, accuracy: 1.0)
    }

    func testMakeUpGainIsAboutFourDb() {
        let input = sine(1000, 0.1, sr)
        var out = input
        KokoroPostFx.gainAndLimit(&out)
        XCTAssertEqual(20 * log10(rms(out, from: 0) / rms(input, from: 0)), 4.0, accuracy: 0.1)
    }

    func testLimiterNeverExceedsCeiling() {
        for x: Float in [0, 0.5, 0.8, 0.81, 1, 2, 10, 1e9, .infinity, -0.9, -3, -1e9, .nan] {
            XCTAssertLessThanOrEqual(abs(KokoroPostFx.limit(x)), 0.98, "x=\(x)")
        }
        var loud = sine(1000, 5.0, sr)
        KokoroPostFx().process(&loud)
        for x in loud { XCTAssertLessThanOrEqual(abs(x), 0.98) }
        XCTAssertEqual(KokoroPostFx.limit(0.5), 0.5)
        XCTAssertGreaterThan(KokoroPostFx.limit(0.9), 0.8)
    }

    func testFadesStartAndEndAtZero() {
        var b = [Float](repeating: 0.5, count: sr / 2)
        KokoroPostFx.fade(&b, sampleRate: sr, ms: 5)
        XCTAssertEqual(b[0], 0)
        XCTAssertEqual(b[b.count - 1], 0)
        XCTAssertEqual(b[b.count / 2], 0.5)
        XCTAssertGreaterThan(b[60], b[10])
        var tiny: [Float] = [1]
        KokoroPostFx.fade(&tiny, sampleRate: sr, ms: 5)
        XCTAssertEqual(tiny[0], 0)
        var empty: [Float] = []
        KokoroPostFx.fade(&empty, sampleRate: sr, ms: 5)
    }

    func testProcessedSentenceEdgesAreZero() {
        var b = sine(500, 0.6, sr / 4)
        KokoroPostFx().process(&b)
        XCTAssertEqual(b[0], 0)
        XCTAssertEqual(b[b.count - 1], 0)
    }

    func testResetClearsFilterState() {
        let fx = KokoroPostFx()
        var a = sine(1000, 0.5, 2000)
        fx.notch(&a)
        fx.reset()
        var x = sine(1000, 0.5, 100)
        var y = x
        fx.notch(&x)
        KokoroPostFx().notch(&y)
        XCTAssertEqual(x, y)
    }
}

final class KokoroVariantTests: XCTestCase {
    let gib: UInt64 = 1024 * 1024 * 1024

    func testChoosesByTotalMemory() {
        XCTAssertEqual(KokoroVariant.choose(totalMemBytes: 0), .int8)
        XCTAssertEqual(KokoroVariant.choose(totalMemBytes: 2 * gib), .int8)
        XCTAssertEqual(KokoroVariant.choose(totalMemBytes: 3 * gib - 1), .int8)
        XCTAssertEqual(KokoroVariant.choose(totalMemBytes: 3 * gib), .fp32)
        XCTAssertEqual(KokoroVariant.choose(totalMemBytes: 8 * gib), .fp32)
    }

    func testDownloadSizes() {
        XCTAssertEqual(KokoroVariant.fp32.totalBytes, 332_562_608)
        XCTAssertEqual(KokoroVariant.int8.totalBytes, 121_205_045)
    }
}
