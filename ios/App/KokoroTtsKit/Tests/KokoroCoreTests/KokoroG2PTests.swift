import XCTest
@testable import KokoroCore

/// Mirrors android/app/src/test/java/com/lazy/vocabulary/kokoro/KokoroG2PTest.java (same fixtures, same expectations).
final class KokoroG2PTests: XCTestCase {
    static let mainLex = [
        "a A", "b b i", "c s i", "t t i", "v v i", "h e", "u j u", "s ɛ s", "i ˈ I", "x ɛ k s",
        "one w ʌ n", "two t u", "three θ ɹ i", "four f ɔ ɹ", "five f I v", "six s ɪ k s", "seven s ɛ v ə n",
        "eight A t", "nine n I n", "zero z ɪ ɹ O", "ten t ɛ n", "eleven ɪ l ɛ v ə n", "twelve t w ɛ l v",
        "thirteen θ ɜ ɹ t i n", "fifteen f ɪ f t i n", "eighteen A t i n", "twenty t w ɛ n t i", "ninety n I n t i",
        "nineteen n I n t i n", "hundred h ʌ n d ɹ ə d", "thousand θ W z ə n d", "point p ɔ ɪ n t", "oh O",
        "first f ɜ ɹ s t", "second s ɛ k ə n d", "third θ ɜ ɹ d", "fourth f ɔ ɹ θ", "twentieth t w ɛ n t i ə θ",
        "eighties A t i z", "nineties n I n t i z", "dollars d ɑ l ə ɹ z", "percent p ɚ s ɛ n t",
        "dog d ɔ ɡ", "cat k æ t", "box b ɑ k s", "story s t ɔ ɹ i", "walk w ɔ k", "want w ɑ n t", "stop s t ɑ p",
        "make m A k", "like l I k", "organize ɔ ɹ ɡ ə n I z", "happy h æ p i", "kind k I n d", "color k ʌ l ɚ",
        "book b ʊ k", "shelf ʃ ɛ l f", "somebody s ʌ m b ˌ ɑ d i", "something s ʌ m θ ˌ ɪ ŋ", "for f ɔ ɹ",
        "example ɪ ɡ z ˈ æ m p ə l", "that ð æ t", "the ð i", "dream d ɹ i m", "cafe k æ f ˈ A", "word w ɜ ɹ d",
        "this ð ɪ s", "is ɪ z", "sentence s ɛ n t ə n s", "long l ɔ ŋ", "versus v ɜ ɹ s ə s", "doctor d ɑ k t ɚ",
        "kilograms k ɪ l ə ɡ ɹ æ m z", "et ɛ t", "cetera s ɛ t ɹ ə", "and æ n d", "not n ɑ t",
        "infinitive ɪ n f ˈ ɪ n ɪ t ˌ ɪ v", "possible p ˈ ɑ s ə b ə l", "visible v ˈ ɪ z ə b ə l", "apple ˈ æ p ə l", "hour ˈ W ɚ", "an æ n", "e i", "n ɛ n",
        "hello h ə l ˈ O", "world w ɜ ɹ l d", "good ɡ ʊ d", "day d A", "it ɪ t",
    ].joined(separator: "\n")
    static let tokensTxt = ["; 1", ": 2", ", 3", ". 4", "! 5", "? 6", "— 9", "… 10", "  16"].joined(separator: "\n")

    var g2p: KokoroG2P!

    override func setUp() {
        let main = KokoroG2P.parseLexicon(Self.mainLex)
        let extra = KokoroG2P.parseLexicon("# c\nwindmill wɪndmɪl\nshelf bad")
        var set = Set<UInt32>()
        for v in main.values { v.unicodeScalars.forEach { set.insert($0.value) } }
        for v in extra.values { v.unicodeScalars.forEach { set.insert($0.value) } }
        " ,.;:!?—…ɐ".unicodeScalars.forEach { set.insert($0.value) }
        g2p = KokoroG2P(main: main, extra: extra, allowedCodePoints: set)
    }

    private func one(_ text: String, file: StaticString = #filePath, line: UInt = #line) -> String {
        let r = g2p.phonemize(text)
        XCTAssertTrue(r.oov.isEmpty, "oov: \(r.oov)", file: file, line: line)
        XCTAssertEqual(r.sentences.count, 1, "sentences for \(text): \(r.sentences)", file: file, line: line)
        return r.sentences.first ?? ""
    }

    func testTokensParsing() {
        let s = KokoroG2P.parseTokens(Self.tokensTxt)
        XCTAssertTrue(s.contains(32))
        XCTAssertTrue(s.contains(UInt32(Character(",").asciiValue!)))
    }

    func testCardinals() {
        XCTAssertEqual("twɛnti fɔɹ.", one("24"))
        XCTAssertEqual("θɹi hʌndɹəd.", one("300"))
        XCTAssertEqual("wʌn θWzənd.", one("1,000"))
        XCTAssertEqual("θɹi pɔɪnt fIv.", one("3.5"))
    }

    func testYears() {
        XCTAssertEqual("nIntin nInti.", one("1990"))
        XCTAssertEqual("nIntin O fIv.", one("1905"))
        XCTAssertEqual("twɛnti twɛnti fɔɹ.", one("2024"))
        XCTAssertEqual("tu θWzənd fIv.", one("2005"))
    }

    func testDecadesAndOrdinals() {
        XCTAssertEqual("nIntin nIntiz.", one("1990s"))
        XCTAssertEqual("Atiz.", one("80s"))
        XCTAssertEqual("fɜɹst.", one("1st"))
        XCTAssertEqual("twɛnti fɜɹst.", one("21st"))
        XCTAssertEqual("fɔɹθ.", one("4th"))
    }

    func testPluralPossessiveInflections() {
        XCTAssertEqual("dɔɡz.", one("dogs"))
        XCTAssertEqual("bɑksɪz.", one("boxes"))
        XCTAssertEqual("stɔɹiz.", one("stories"))
        XCTAssertEqual("dɔɡz.", one("dog's"))
        XCTAssertEqual("kæts.", one("cat's"))
        XCTAssertEqual("wɔkt.", one("walked"))
        XCTAssertEqual("wɑntɪd.", one("wanted"))
        XCTAssertEqual("stɑpt.", one("stopped"))
        XCTAssertEqual("mAkɪŋ.", one("making"))
        XCTAssertEqual("wɔkɪŋ.", one("walking"))
        XCTAssertEqual("lIkt.", one("liked"))
        XCTAssertEqual("hæpili.", one("happily"))
    }

    func testBritishPrefixCompound() {
        XCTAssertEqual("ɔɹɡənIz.", one("organise"))
        XCTAssertEqual("kʌlɚ.", one("colour"))
        XCTAssertEqual("ˌʌnhæpi.", one("unhappy"))
        XCTAssertEqual("ɹˌiwɔk.", one("rewalk"))
        XCTAssertEqual("bʊkʃɛlf.", one("bookshelf"))
        XCTAssertEqual("wɪndmɪl.", one("windmill"))
    }

    func testFirstLexiconEntryWinsAndMainBeforeExtra() {
        XCTAssertEqual("ʃɛlf.", one("shelf"))
    }

    func testCapsAndDigitSpelling() {
        XCTAssertEqual("ti vi.", one("TV"))
        XCTAssertEqual("bi wʌn.", one("B1"))
        XCTAssertEqual("ti vi.", one("tv"))
    }

    func testOovDetected() {
        let r = g2p.phonemize("hello zorblax world")
        XCTAssertEqual(r.oov, ["zorblax"])
        XCTAssertFalse(r.sentences.isEmpty)
    }

    func testAbbreviations() {
        XCTAssertEqual(one("somebody"), one("sb"))
        XCTAssertEqual(one("something"), one("sth"))
        XCTAssertEqual(one("for example"), one("e.g."))
        XCTAssertEqual(one("doctor"), one("Dr."))
        XCTAssertEqual(one("ten kilograms"), one("10 kg"))
        XCTAssertEqual(one("ten dollars"), one("$10"))
        XCTAssertEqual(one("ten percent"), one("10%"))
    }

    func testSentenceSplitAndPunctuation() {
        let r = g2p.phonemize("Hello world. Good day! Is it good?\nhello")
        XCTAssertEqual(r.sentences.count, 4)
        XCTAssertTrue(r.sentences[0].hasSuffix("."))
        XCTAssertTrue(r.sentences[1].hasSuffix("!"))
        XCTAssertTrue(r.sentences[2].hasSuffix("?"))
        XCTAssertTrue(r.sentences[3].hasSuffix("."))
        XCTAssertEqual("həlˈO, wɜɹld.", one("Hello, world"))
        XCTAssertEqual("kæfˈA.", one("café"))
    }

    func testLongSentencesAreSplit() {
        var sb = ""
        for i in 0..<120 { sb += i % 10 == 9 ? "dog, " : "dog " }
        var r = g2p.phonemize(sb)
        XCTAssertTrue(r.sentences.count > 1)
        for s in r.sentences { XCTAssertLessThanOrEqual(s.unicodeScalars.count, KokoroG2P.maxSentenceCodepoints) }
        r = g2p.phonemize(String(repeating: "dog ", count: 200))
        XCTAssertTrue(r.sentences.count > 1)
        for s in r.sentences { XCTAssertLessThanOrEqual(s.unicodeScalars.count, KokoroG2P.maxSentenceCodepoints) }
    }

    func testArticles() {
        XCTAssertEqual("ɐ dɔɡ.", one("a dog"))
        XCTAssertEqual("ɐ dɔɡ.", one("A dog"))
        XCTAssertEqual("ən ˈæpəl.", one("an apple"))
        XCTAssertEqual("ðə dɔɡ.", one("the dog"))
        XCTAssertEqual("ði ˈæpəl.", one("the apple"))
        XCTAssertEqual("ði ˈWɚ.", one("the hour"))
        XCTAssertEqual("ðə, ˈæpəl.", one("the, apple"))
        XCTAssertEqual("ðə.", one("the."))
    }

    func testAllCapsTokensBypassArticleRule() {
        XCTAssertEqual("æn.", one("AN"))
        XCTAssertEqual("ði.", one("THE"))
    }

    func testInfinitiveAbbreviation() {
        XCTAssertEqual("ɪnfˈɪnɪtˌɪv.", one("inf."))
        XCTAssertEqual("ɪnfˈɪnɪtˌɪv.", one("inf"))
    }

    func testInPrefixAndIbly() {
        XCTAssertEqual("ˌɪnvˈɪzəbəl.", one("invisible"))
        XCTAssertEqual("pˈɑsəbli.", one("possibly"))
        XCTAssertEqual("vˈɪzəbli.", one("visibly"))
        XCTAssertEqual(g2p.phonemize("inxyz").oov.count, 1)
    }

    func testBundledExtraLexiconParses() throws {
        let url = try XCTUnwrap(KokoroResources.extraLexiconURL)
        let m = try KokoroG2P.parseLexicon(fileURL: url)
        XCTAssertGreaterThan(m.count, 1000)
    }
}
