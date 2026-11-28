import Foundation

// Port of android/.../kokoro/KokoroG2P.java. Lexicon-based English grapheme-to-phoneme conversion producing Kokoro
// (misaki-style US) phoneme strings. No espeak-ng (GPL). Behaviour must stay identical to the Java version: see
// Tests/KokoroCoreTests/KokoroG2PTests.swift (mirrors KokoroG2PTest.java).

private func rx(_ pattern: String, ci: Bool = false) -> NSRegularExpression {
    // Patterns are compile-time constants: a failure here is a programming error.
    return try! NSRegularExpression(pattern: pattern, options: ci ? [.caseInsensitive] : [])
}

private func fullRange(_ s: String) -> NSRange { NSRange(location: 0, length: (s as NSString).length) }

private func replaceAll(_ re: NSRegularExpression, in s: String, with template: String) -> String {
    return re.stringByReplacingMatches(in: s, options: [], range: fullRange(s), withTemplate: template)
}

private func replaceAll(_ re: NSRegularExpression, in s: String, _ fn: (NSTextCheckingResult, NSString) -> String) -> String {
    let ns = s as NSString
    var out = ""
    var last = 0
    for m in re.matches(in: s, options: [], range: NSRange(location: 0, length: ns.length)) {
        out += ns.substring(with: NSRange(location: last, length: m.range.location - last))
        out += fn(m, ns)
        last = m.range.location + m.range.length
    }
    out += ns.substring(from: last)
    return out
}

private func group(_ m: NSTextCheckingResult, _ ns: NSString, _ i: Int) -> String? {
    let r = m.range(at: i)
    return r.location == NSNotFound ? nil : ns.substring(with: r)
}

private func has(_ set: String, _ c: Unicode.Scalar) -> Bool { set.unicodeScalars.contains(c) }

public final class KokoroG2P {
    public static let maxSentenceCodepoints = 400

    public struct Result {
        public let sentences: [String]
        public let oov: [String]
    }

    private let main: [String: String]
    private let extra: [String: String]
    private let allowed: Set<UInt32>?
    private var cache: [String: String?] = [:]

    public init(main: [String: String], extra: [String: String]?, allowedCodePoints: Set<UInt32>?) {
        self.main = main
        self.extra = extra ?? [:]
        self.allowed = allowedCodePoints
    }

    // MARK: loading

    /// `word p h o n e m e s` (or `word phonemes`); '#' comments; keys lowercased; first occurrence wins.
    public static func parseLexicon(_ text: String) -> [String: String] {
        var map = [String: String](minimumCapacity: 1 << 17)
        text.enumerateLines { line, _ in
            guard let first = line.unicodeScalars.first, first != "#" else { return }
            let scalars = line.unicodeScalars
            guard let sp = scalars.firstIndex(where: { $0.properties.isWhitespace }), sp != scalars.startIndex else { return }
            let key = String(scalars[scalars.startIndex..<sp]).lowercased()
            var ph = String.UnicodeScalarView()
            for c in scalars[sp...] where !c.properties.isWhitespace { ph.append(c) }
            if ph.isEmpty { return }
            if map[key] == nil { map[key] = String(ph) }
        }
        return map
    }

    public static func parseLexicon(fileURL: URL) throws -> [String: String] {
        return parseLexicon(try String(contentsOf: fileURL, encoding: .utf8))
    }

    /// tokens.txt: `<symbol> <id>` per line; the symbol may itself be a space. Returns the first code point of each symbol.
    public static func parseTokens(_ text: String) -> Set<UInt32> {
        var set = Set<UInt32>()
        text.enumerateLines { line, _ in
            let scalars = Array(line.unicodeScalars)
            guard let idx = scalars.lastIndex(of: " "), idx > 0 else { return }
            set.insert(scalars[0].value)
        }
        return set
    }

    // MARK: public API

    public func phonemize(_ text: String?) -> Result {
        var sentences: [String] = []
        var oov: [String] = []
        guard let text = text else { return Result(sentences: [], oov: []) }
        let t = Self.expandNumbers(Self.expandAbbreviations(Self.normalize(text)))
        var cur = String.UnicodeScalarView()
        var hasWord = false
        var theEnd = -1 // cur.count right after an appended "ðə" awaiting the next word
        let ns = t as NSString
        for m in Self.token.matches(in: t, options: [], range: NSRange(location: 0, length: ns.length)) {
            let tok = ns.substring(with: m.range)
            let c = tok.unicodeScalars.first!
            if c == "\n" {
                hasWord = Self.flush(&cur, hasWord, ".", &sentences)
                theEnd = -1
            } else if c.value < 128 && (c.properties.isAlphabetic || (c.value >= 48 && c.value <= 57)) {
                var ph = Self.articlePhonemes(tok)
                let isThe = ph != nil && ph == Self.the
                if ph == nil { ph = resolveToken(tok) }
                guard let phonemes = ph else {
                    let l = tok.lowercased()
                    if !oov.contains(l) { oov.append(l) }
                    continue
                }
                if theEnd > 0 && theEnd == cur.count && Self.startsWithVowel(phonemes) {
                    let idx = cur.index(cur.startIndex, offsetBy: theEnd - 1)
                    cur.replaceSubrange(idx...idx, with: ["i"])
                }
                if cur.count > 0 { cur.append(" ") }
                cur.append(contentsOf: phonemes.unicodeScalars)
                theEnd = isThe ? cur.count : -1
                hasWord = true
            } else if c == "." || c == "!" || c == "?" || c == "…" {
                hasWord = Self.flush(&cur, hasWord, String(c), &sentences)
                theEnd = -1
            } else if c == "," || c == ";" || c == ":" || c == "—" {
                if hasWord && !Self.endsWithPunct(cur) { cur.append(c) }
            }
            // quotes, parentheses, stray symbols: dropped
        }
        _ = Self.flush(&cur, hasWord, ".", &sentences)
        var out: [String] = []
        for s in sentences { out.append(contentsOf: Self.splitLong(filterAllowed(s))) }
        return Result(sentences: out, oov: oov)
    }

    private static let the = "ðə"

    /// Function words whose lexicon entries are letter names. ALL-CAPS tokens (initialisms) are left alone.
    private static func articlePhonemes(_ tok: String) -> String? {
        if tok.unicodeScalars.count >= 2 && tok == tok.uppercased() { return nil }
        switch tok.lowercased() {
        case "a": return "ɐ"
        case "an": return "ən"
        case "the": return the
        default: return nil
        }
    }

    static func startsWithVowel(_ ph: String) -> Bool {
        for c in ph.unicodeScalars {
            if c == "ˈ" || c == "ˌ" || c == " " { continue }
            return has("aeiouAIOWYæɑɒɔəɛɜɪʊʌɐɚɝᵻ", c)
        }
        return false
    }

    // MARK: normalization

    private static let token = rx("[A-Za-z0-9]+(?:'[A-Za-z]+)*(?:(?<=[sS])'(?![A-Za-z0-9]))?|[.!?…,;:—\\n]")

    static func normalize(_ text: String) -> String {
        var s = text.precomposedStringWithCompatibilityMapping
        s = s.replacingOccurrences(of: "‘", with: "'").replacingOccurrences(of: "’", with: "'")
            .replacingOccurrences(of: "‛", with: "'").replacingOccurrences(of: "′", with: "'")
        s = s.replacingOccurrences(of: "“", with: "\"").replacingOccurrences(of: "”", with: "\"")
        s = s.replacingOccurrences(of: "–", with: " — ").replacingOccurrences(of: "—", with: " — ")
        s = replaceAll(rx("\\.{2,}"), in: s, with: "…")
        s = s.decomposedStringWithCanonicalMapping
        s = replaceAll(rx("\\p{M}+"), in: s, with: "")
        s = s.precomposedStringWithCanonicalMapping
        s = s.replacingOccurrences(of: "\r", with: "\n")
        s = replaceAll(rx("[ \\t\\u00A0]+"), in: s, with: " ")
        s = replaceAll(rx(" ?\\n ?"), in: s, with: "\n")
        return s.trimmingCharacters(in: CharacterSet(charactersIn: " \t\n\r"))
    }

    private static let abbreviations: [(NSRegularExpression, String)] = [
        ("\\bsb\\b", "somebody"),
        ("\\bsth\\b", "something"),
        ("\\be\\.g\\.?", "for example"),
        ("\\bi\\.e\\.?", "that is"),
        ("\\bvs\\b\\.?", "versus"),
        ("\\bdr\\.", "doctor"),
        ("\\bmr\\.", "mister"),
        ("\\bmrs\\.", "missus"),
        ("\\bms\\.", "miz"),
        ("\\badj\\.", "adjective"),
        ("\\binf\\b\\.?", "infinitive"),
        ("\\bkg\\b", "kilograms"),
        ("\\bkm\\b", "kilometers"),
        ("\\bcm\\b", "centimeters"),
    ].map { (rx($0.0, ci: true), $0.1) }
    private static let etcEnd = rx("\\betc\\.(?=\\s+\\p{Lu}|\\s*$)", ci: true)
    private static let etc = rx("\\betc\\.?", ci: true)
    private static let acronymDots = rx("\\b(?:[A-Za-z]\\.){2,}")
    private static let dollars = rx("\\$\\s?(\\d[\\d,]*(?:\\.\\d+)?)")
    private static let percent = rx("%")
    private static let intraDot = rx("(?<=[A-Za-z])\\.(?=[A-Za-z])")

    static func expandAbbreviations(_ input: String) -> String {
        var s = replaceAll(etcEnd, in: input, with: "et cetera.")
        s = replaceAll(etc, in: s, with: "et cetera")
        for (re, to) in abbreviations { s = replaceAll(re, in: s, with: to) }
        // U.S. / U.K. style: spell the letters
        s = replaceAll(acronymDots, in: s) { m, ns in
            let letters = ns.substring(with: m.range).replacingOccurrences(of: ".", with: "")
            return letters.map { String($0).uppercased() }.joined(separator: " ").uppercased()
        }
        s = replaceAll(dollars, in: s, with: "$1 dollars")
        s = replaceAll(percent, in: s, with: " percent")
        s = s.replacingOccurrences(of: "&", with: " and ")
        s = replaceAll(intraDot, in: s, with: " ")
        return s
    }

    // MARK: numbers

    private static let ones = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
                               "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
    private static let tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
    private static let decades = ["", "tens", "twenties", "thirties", "forties", "fifties", "sixties", "seventies", "eighties", "nineties"]

    private static let decadeYear = rx("(?<![A-Za-z0-9])(1[0-9]|20)(\\d)0s\\b")
    private static let decadeShort = rx("(?<![A-Za-z0-9])(\\d)0s\\b")
    private static let ordinalRe = rx("(?<![A-Za-z0-9])(\\d{1,9})(?:st|nd|rd|th)\\b", ci: true)
    private static let number = rx("(?<![A-Za-z0-9])(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(\\d+))?(?![A-Za-z0-9])")

    static func expandNumbers(_ input: String) -> String {
        var s = replaceAll(decadeYear, in: input) { m, ns in
            let century = Int(group(m, ns, 1)!)!
            let dec = Int(group(m, ns, 2)!)!
            if dec == 0 { return century == 20 ? " two thousands " : " " + cardinal(century) + " hundreds " }
            return " " + (century == 20 ? "twenty" : cardinal(century)) + " " + decades[dec] + " "
        }
        s = replaceAll(decadeShort, in: s) { m, ns in
            let d = Int(group(m, ns, 1)!)!
            return " " + (d == 0 ? "hundreds" : decades[d]) + " "
        }
        s = replaceAll(ordinalRe, in: s) { m, ns in " " + ordinal(Int(group(m, ns, 1)!)!) + " " }
        s = replaceAll(number, in: s) { m, ns in
            let intPart = group(m, ns, 1)!
            let frac = group(m, ns, 2)
            let commas = intPart.contains(",")
            let digits = intPart.replacingOccurrences(of: ",", with: "")
            if let frac = frac { return " " + numberWords(digits) + " point " + digitWords(frac) + " " }
            if !commas && digits.count == 4 {
                let n = Int(digits)!
                if (n >= 1100 && n <= 1999) || (n >= 2010 && n <= 2099) { return " " + yearWords(n) + " " }
            }
            return " " + numberWords(digits) + " "
        }
        return s
    }

    static func digitWords(_ digits: String) -> String {
        var parts: [String] = []
        for c in digits.unicodeScalars where c.value >= 48 && c.value <= 57 { parts.append(ones[Int(c.value) - 48]) }
        return parts.joined(separator: " ")
    }

    /// Cardinal for digit strings; leading zeros or > 999,999,999 are read digit by digit.
    static func numberWords(_ digits: String) -> String {
        if digits.count > 9 || (digits.count > 1 && digits.hasPrefix("0")) { return digitWords(digits) }
        return cardinal(Int(digits)!)
    }

    static func cardinal(_ n: Int) -> String {
        if n < 20 { return ones[n] }
        if n < 100 { return tens[n / 10] + (n % 10 == 0 ? "" : " " + ones[n % 10]) }
        if n < 1000 { return ones[n / 100] + " hundred" + (n % 100 == 0 ? "" : " " + cardinal(n % 100)) }
        if n < 1_000_000 { return cardinal(n / 1000) + " thousand" + (n % 1000 == 0 ? "" : " " + cardinal(n % 1000)) }
        return cardinal(n / 1_000_000) + " million" + (n % 1_000_000 == 0 ? "" : " " + cardinal(n % 1_000_000))
    }

    static func ordinal(_ n: Int) -> String {
        if n > 999_999_999 { return digitWords(String(n)) }
        let c = cardinal(n)
        let chars = Array(c)
        var sp = -1
        for (i, ch) in chars.enumerated() where ch == " " || ch == "-" { sp = i }
        let head = String(chars[0..<(sp + 1)])
        let last = String(chars[(sp + 1)...])
        let o: String
        switch last {
        case "one": o = "first"
        case "two": o = "second"
        case "three": o = "third"
        case "five": o = "fifth"
        case "eight": o = "eighth"
        case "nine": o = "ninth"
        case "twelve": o = "twelfth"
        default: o = last.hasSuffix("y") ? String(last.dropLast()) + "ieth" : last + "th"
        }
        return head + o
    }

    static func yearWords(_ n: Int) -> String {
        if n >= 2000 && n <= 2009 { return n == 2000 ? "two thousand" : "two thousand " + ones[n - 2000] }
        let hi = n / 100
        let lo = n % 100
        let h = cardinal(hi)
        if lo == 0 { return h + " hundred" }
        if lo < 10 { return h + " oh " + ones[lo] }
        return h + " " + cardinal(lo)
    }

    // MARK: word resolution

    private func resolveToken(_ tok: String) -> String? {
        var hasDigit = false
        for c in tok.unicodeScalars where c.value >= 48 && c.value <= 57 { hasDigit = true }
        if hasDigit { return spellOut(tok) }
        let lower = tok.lowercased()
        let n = tok.unicodeScalars.count
        let allCaps = n >= 2 && n <= 5 && tok == tok.uppercased() && !tok.contains("'")
        if let cached = cache[lower], !allCaps { return cached }
        var r = resolve(lower, 0)
        if r == nil && allCaps { r = spellOut(lower) }
        if !allCaps { cache[lower] = .some(r) }
        return r
    }

    /// Letter by letter using the lexicon's single-letter entries; digits via digit words.
    private func spellOut(_ s: String) -> String? {
        var parts: [String] = []
        for sc in s.unicodeScalars {
            let c = String(sc).lowercased()
            let v = c.unicodeScalars.first!.value
            var ph: String?
            if v >= 48 && v <= 57 { ph = lookup(Self.ones[Int(v) - 48]) }
            else if v >= 97 && v <= 122 { ph = lookup(c) }
            else if c == "'" { continue }
            else { ph = nil }
            guard let p = ph else { return nil }
            parts.append(p)
        }
        if parts.isEmpty { return nil }
        return parts.joined(separator: " ")
    }

    private func lookup(_ w: String) -> String? { main[w] ?? extra[w] }

    private static func hasVowelLetter(_ w: String) -> Bool {
        return w.unicodeScalars.contains { has("aeiouy", $0) }
    }

    private static let maxDepth = 2

    func resolve(_ w: String, _ depth: Int) -> String? {
        if let r = lookup(w) { return r }
        if w.isEmpty || depth > Self.maxDepth { return nil }
        if !Self.hasVowelLetter(w) && !w.contains("'") && w.unicodeScalars.count <= 5 {
            if let sp = spellOut(w) { return sp }
        }
        if let r = possessiveOrContraction(w, depth) { return r }
        if let r = british(w, depth) { return r }
        if let r = inflection(w, depth) { return r }
        if let r = prefixed(w, depth) { return r }
        return compound(w, depth)
    }

    private static let contractions: [(String, String)] = [("'ve", "əv"), ("'ll", "əl"), ("'d", "d"), ("'re", "əɹ"), ("'m", "m"), ("n't", "ənt")]

    private func possessiveOrContraction(_ w: String, _ depth: Int) -> String? {
        if !w.contains("'") { return nil }
        let n = w.unicodeScalars.count
        if w.hasSuffix("'s") && n > 3 {
            guard let b = resolve(String(w.dropLast(2)), depth + 1) else { return nil }
            return b + Self.sSuffix(b)
        }
        if w.hasSuffix("s'") && n > 2 {
            return resolve(String(w.dropLast(1)), depth + 1)
        }
        for (suf, ph) in Self.contractions {
            if w.hasSuffix(suf) && n > suf.unicodeScalars.count + 1 {
                if let b = resolve(String(w.dropLast(suf.unicodeScalars.count)), depth + 1) { return b + ph }
            }
        }
        return nil
    }

    private static func lastSymbol(_ ph: String) -> Unicode.Scalar {
        for c in ph.unicodeScalars.reversed() where c != " " && c != "ˈ" && c != "ˌ" { return c }
        return "a"
    }

    private static func sSuffix(_ ph: String) -> String {
        let last = lastSymbol(ph)
        if has("szʃʒʧʤ", last) { return "ɪz" }
        if has("ptkfθ", last) { return "s" }
        return "z"
    }

    private static func edSuffix(_ ph: String) -> String {
        let last = lastSymbol(ph)
        if last == "t" || last == "d" { return "ɪd" }
        if has("pkfsθʃʧ", last) { return "t" }
        return "d"
    }

    private static let britishFrom: [NSRegularExpression] = [
        "isation(s?)$", "is(e|ed|es|ing|er|ers)$", "ys(e|ed|es|ing)$",
        "([a-z]{2,})our(s|ed|ing|ful|able|less)?$", "([a-z]{2,})tre(s?)$",
        "([a-z])ll(ed|ing|er|ers)$", "([a-z]{2,})ogue(s?)$",
        "^(def|off|pret|lic)ence(s?)$",
    ].map { rx($0) }
    private static let britishTo = ["ization$1", "iz$1", "yz$1", "$1or$2", "$1ter$2", "$1l$2", "$1og$2", "$1ense$2"]

    private func british(_ w: String, _ depth: Int) -> String? {
        for i in 0..<Self.britishFrom.count {
            let re = Self.britishFrom[i]
            let ns = w as NSString
            guard let m = re.firstMatch(in: w, options: [], range: NSRange(location: 0, length: ns.length)) else { continue }
            // Java replaceFirst: only the first match is replaced, the rest of the word is kept
            let rep = re.replacementString(for: m, in: w, offset: 0, template: Self.britishTo[i])
            let alt = ns.replacingCharacters(in: m.range, with: rep)
            if alt != w, let r = resolve(alt, depth + 1) { return r }
        }
        return nil
    }

    private typealias Suffix = (String) -> String
    private static let sufS: Suffix = { sSuffix($0) }
    private static let sufEd: Suffix = { edSuffix($0) }
    private static func fixed(_ s: String) -> Suffix { return { _ in s } }

    private func inflection(_ w: String, _ depth: Int) -> String? {
        let n = w.unicodeScalars.count
        func cut(_ k: Int) -> String { String(w.dropLast(k)) }
        var r: String?
        if n > 3 && w.hasSuffix("ies") {
            if let r = withBase(cut(3) + "y", depth, Self.sufS) { return r }
        }
        if n > 3 && w.hasSuffix("es") {
            if let r = withBase(cut(2), depth, Self.sufS) { return r }
        }
        if n > 3 && w.hasSuffix("s") && !w.hasSuffix("ss") {
            if let r = withBase(cut(1), depth, Self.sufS) { return r }
        }
        if n > 4 && w.hasSuffix("ied") {
            if let r = withBase(cut(3) + "y", depth, Self.sufEd) { return r }
        }
        if n > 4 && w.hasSuffix("ed") {
            if let r = withBases(Self.stems(w, 2, true), depth, Self.sufEd) { return r }
        }
        if n > 5 && w.hasSuffix("ing") {
            if let r = withBases(Self.stems(w, 3, true), depth, Self.fixed("ɪŋ")) { return r }
        }
        if n > 4 && w.hasSuffix("est") {
            if let r = withBases(Self.stems(w, 3, true), depth, Self.fixed("ɪst")) { return r }
        }
        if n > 4 && w.hasSuffix("er") {
            if let r = withBases(Self.stems(w, 2, true), depth, Self.fixed("əɹ")) { return r }
        }
        if n > 5 && w.hasSuffix("ily") {
            if let r = withBase(cut(3) + "y", depth, Self.fixed("li")) { return r }
        }
        if n > 4 && w.hasSuffix("ly") {
            if let r = withBase(cut(2), depth, Self.fixed("li")) { return r }
        }
        if n > 6 && w.hasSuffix("iness") {
            if let r = withBase(cut(5) + "y", depth, Self.fixed("nəs")) { return r }
        }
        if n > 6 && w.hasSuffix("ness") {
            if let r = withBase(cut(4), depth, Self.fixed("nəs")) { return r }
        }
        if n > 6 && w.hasSuffix("ment") {
            if let r = withBases(Self.stems(w, 4, false), depth, Self.fixed("mənt")) { return r }
        }
        if n > 5 && w.hasSuffix("iful") {
            if let r = withBase(cut(4) + "y", depth, Self.fixed("fəl")) { return r }
        }
        if n > 5 && w.hasSuffix("ful") {
            if let r = withBase(cut(3), depth, Self.fixed("fəl")) { return r }
        }
        if n > 6 && w.hasSuffix("less") {
            if let r = withBase(cut(4), depth, Self.fixed("ləs")) { return r }
        }
        if n > 6 && w.hasSuffix("able") {
            if let r = withBases(Self.stems(w, 4, true), depth, Self.fixed("əbəl")) { return r }
        }
        if n > 6 && w.hasSuffix("ible") {
            if let r = withBases(Self.stems(w, 4, true), depth, Self.fixed("əbəl")) { return r }
        }
        if n > 6 && w.hasSuffix("ibly") {
            // base+ible form (possibly -> possible), then base + əbli
            if let ible = lookup(cut(1) + "e"), ible.hasSuffix("əl") { return String(ible.dropLast(2)) + "li" }
            if let r = withBases(Self.stems(w, 4, true), depth, Self.fixed("əbli")) { return r }
        }
        if n > 6 && w.hasSuffix("ably") {
            if let r = withBases(Self.stems(w, 4, true), depth, Self.fixed("əbli")) { return r }
        }
        r = nil
        return r
    }

    /// Candidate stems after removing `cut` letters: plain, +e, and undoubled final consonant.
    private static func stems(_ w: String, _ cut: Int, _ variants: Bool) -> [String] {
        var out: [String] = []
        let b = String(w.dropLast(cut))
        out.append(b)
        if variants {
            out.append(b + "e")
            let s = Array(b.unicodeScalars)
            let l = s.count
            if l >= 3 && s[l - 1] == s[l - 2] && !has("aeiou", s[l - 1]) {
                out.append(String(b.dropLast(1)))
            }
            if l >= 3 && b.hasSuffix("i") { out.append(String(b.dropLast(1)) + "y") }
        }
        return out
    }

    private func withBases(_ bases: [String], _ depth: Int, _ s: Suffix) -> String? {
        for b in bases { if let r = withBase(b, depth, s) { return r } }
        return nil
    }

    private func withBase(_ base: String, _ depth: Int, _ s: Suffix) -> String? {
        if base.unicodeScalars.count < 3 { return nil }
        guard let b = resolve(base, depth + 1) else { return nil }
        return b + s(b)
    }

    private static let prefixes: [(String, String)] = [
        ("under", "ˌʌndəɹ"), ("inter", "ˌɪntəɹ"), ("super", "sˌupəɹ"),
        ("multi", "mˌʌlti"), ("micro", "mˌIkɹO"), ("over", "ˌOvəɹ"),
        ("anti", "ˌænti"), ("non", "nˌɑn"), ("dis", "dˌɪs"), ("mis", "mˌɪs"),
        ("out", "ˌWt"), ("pre", "pɹˌi"), ("sub", "sˌʌb"), ("un", "ˌʌn"),
        ("re", "ɹˌi"), ("de", "dˌi"), ("in", "ˌɪn"),
    ]

    private func prefixed(_ w: String, _ depth: Int) -> String? {
        for (p, ph) in Self.prefixes {
            let min = p == "in" ? 5 : 3
            if w.hasPrefix(p) && w.unicodeScalars.count - p.unicodeScalars.count >= min {
                if let r = resolve(String(w.dropFirst(p.unicodeScalars.count)), depth + 1) { return ph + r }
            }
        }
        return nil
    }

    private func compound(_ w: String, _ depth: Int) -> String? {
        let s = Array(w.unicodeScalars)
        var i = s.count - 3
        while i >= 3 {
            let head = String(String.UnicodeScalarView(s[0..<i]))
            if let a = lookup(head) {
                let tail = String(String.UnicodeScalarView(s[i...]))
                let b = depth < Self.maxDepth ? resolve(tail, depth + 1) : lookup(tail)
                if let b = b { return a.replacingOccurrences(of: "ˈ", with: "ˌ") + b }
            }
            i -= 1
        }
        return nil
    }

    // MARK: sentences

    private static func endsWithPunct(_ sb: String.UnicodeScalarView) -> Bool {
        guard let c = sb.last else { return false }
        return c == "," || c == ";" || c == ":" || c == "—"
    }

    /// Close the current sentence with `terminator`; returns the new hasWord (false).
    private static func flush(_ cur: inout String.UnicodeScalarView, _ hasWord: Bool, _ terminator: String, _ out: inout [String]) -> Bool {
        if hasWord && cur.count > 0 {
            while endsWithPunct(cur) { cur.removeLast() }
            cur.append(contentsOf: terminator.unicodeScalars)
            out.append(String(cur))
        }
        cur.removeAll()
        return false
    }

    private func filterAllowed(_ s: String) -> String {
        guard let allowed = allowed else { return s }
        var v = String.UnicodeScalarView()
        for c in s.unicodeScalars where allowed.contains(c.value) { v.append(c) }
        return String(v)
    }

    static func splitLong(_ s: String) -> [String] {
        var out: [String] = []
        let sc = Array(s.unicodeScalars)
        func str(_ a: ArraySlice<Unicode.Scalar>) -> String { String(String.UnicodeScalarView(a)) }
        func trim(_ x: String) -> String { x.trimmingCharacters(in: CharacterSet(charactersIn: " \t\n\r")) }
        if sc.count <= maxSentenceCodepoints {
            if !sc.isEmpty { out.append(s) }
            return out
        }
        // split at clause punctuation first
        var pieces: [String] = []
        var start = 0
        for i in 0..<sc.count {
            let c = sc[i]
            if (c == "," || c == ";" || c == ":" || c == "—") && i + 1 < sc.count {
                pieces.append(trim(str(sc[start...i])))
                start = i + 1
            }
        }
        pieces.append(trim(str(sc[start...])))
        // break any oversized piece at spaces
        var small: [String] = []
        for p in pieces {
            if p.unicodeScalars.count <= maxSentenceCodepoints {
                small.append(p)
                continue
            }
            var cur = ""
            var words = p.components(separatedBy: " ")
            while let l = words.last, l.isEmpty { words.removeLast() } // Java split drops trailing empties
            for word in words {
                if cur.unicodeScalars.count > 0 && cur.unicodeScalars.count + 1 + word.unicodeScalars.count > maxSentenceCodepoints {
                    small.append(cur + ",")
                    cur = ""
                }
                if cur.unicodeScalars.count > 0 { cur += " " }
                cur += word
            }
            if cur.unicodeScalars.count > 0 { small.append(cur) }
        }
        // greedily merge pieces up to the limit
        var cur = ""
        for p in small {
            if cur.unicodeScalars.count > 0 && cur.unicodeScalars.count + 1 + p.unicodeScalars.count > maxSentenceCodepoints {
                out.append(cur)
                cur = ""
            }
            if cur.unicodeScalars.count > 0 { cur += " " }
            cur += p
        }
        if cur.unicodeScalars.count > 0 { out.append(cur) }
        return out
    }
}
