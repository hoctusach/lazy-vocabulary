package com.lazy.vocabulary.kokoro;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lexicon-based English grapheme-to-phoneme conversion producing Kokoro (misaki-style US) phoneme strings.
 * sherpa-onnx >= 2.0 skips out-of-vocabulary words, so we resolve them here and hand the engine phonemes.
 * Pure Java (no Android deps) so it can be unit-tested on the JVM.
 */
public final class KokoroG2P {
    public static final int MAX_SENTENCE_CODEPOINTS = 400;

    public static final class Result {
        public final List<String> sentences;
        public final List<String> oov;

        Result(List<String> sentences, List<String> oov) {
            this.sentences = sentences;
            this.oov = oov;
        }
    }

    private final Map<String, String> main;
    private final Map<String, String> extra;
    private final Set<Integer> allowed; // null = allow everything
    private final Map<String, String> cache = new HashMap<>();
    private static final String MISS = "\u0000";

    public KokoroG2P(Map<String, String> main, Map<String, String> extra, Set<Integer> allowedCodePoints) {
        this.main = main;
        this.extra = extra == null ? new HashMap<String, String>() : extra;
        this.allowed = allowedCodePoints;
    }

    // ---------------------------------------------------------------- loading

    /** `word p h o n e m e s` (or `word phonemes`); '#' comments; keys lowercased; first occurrence wins. */
    public static Map<String, String> parseLexicon(Reader reader) throws IOException {
        Map<String, String> map = new HashMap<>(1 << 17);
        BufferedReader br = reader instanceof BufferedReader ? (BufferedReader) reader : new BufferedReader(reader, 1 << 16);
        String line;
        while ((line = br.readLine()) != null) {
            if (line.isEmpty() || line.charAt(0) == '#') continue;
            int sp = indexOfWhitespace(line);
            if (sp <= 0) continue;
            String key = line.substring(0, sp).toLowerCase(Locale.ROOT);
            StringBuilder ph = new StringBuilder();
            for (int i = sp; i < line.length(); i++) {
                char c = line.charAt(i);
                if (!Character.isWhitespace(c)) ph.append(c);
            }
            if (ph.length() == 0) continue;
            if (!map.containsKey(key)) map.put(key, ph.toString());
        }
        return map;
    }

    private static int indexOfWhitespace(String s) {
        for (int i = 0; i < s.length(); i++) if (Character.isWhitespace(s.charAt(i))) return i;
        return -1;
    }

    /** tokens.txt: `<symbol> <id>` per line; the symbol may itself be a space. */
    public static Set<Integer> parseTokens(Reader reader) throws IOException {
        Set<Integer> set = new HashSet<>();
        BufferedReader br = new BufferedReader(reader);
        String line;
        while ((line = br.readLine()) != null) {
            int idx = line.lastIndexOf(' ');
            if (idx <= 0) continue;
            String sym = line.substring(0, idx);
            if (sym.isEmpty()) continue;
            set.add(sym.codePointAt(0));
        }
        return set;
    }

    // ---------------------------------------------------------------- public API

    public Result phonemize(String text) {
        List<String> sentences = new ArrayList<>();
        Set<String> oov = new LinkedHashSet<>();
        if (text == null) return new Result(sentences, new ArrayList<>(oov));
        String t = expandNumbers(expandAbbreviations(normalize(text)));
        StringBuilder cur = new StringBuilder();
        boolean hasWord = false;
        int theEnd = -1; // cur.length() right after an appended "ðə" awaiting the next word
        Matcher m = TOKEN.matcher(t);
        while (m.find()) {
            String tok = m.group();
            char c = tok.charAt(0);
            if (c == '\n') {
                hasWord = flush(cur, hasWord, ".", sentences);
                theEnd = -1;
            } else if (Character.isLetterOrDigit(c) && c < 128) {
                String ph = articlePhonemes(tok);
                boolean isThe = ph != null && ph.equals(THE);
                if (ph == null) ph = resolveToken(tok);
                if (ph == null) {
                    oov.add(tok.toLowerCase(Locale.ROOT));
                    continue;
                }
                if (theEnd > 0 && theEnd == cur.length() && startsWithVowel(ph)) cur.setCharAt(theEnd - 1, 'i');
                if (cur.length() > 0) cur.append(' ');
                cur.append(ph);
                theEnd = isThe ? cur.length() : -1;
                hasWord = true;
            } else if (c == '.' || c == '!' || c == '?' || c == '…') {
                hasWord = flush(cur, hasWord, String.valueOf(c), sentences);
                theEnd = -1;
            } else if (c == ',' || c == ';' || c == ':' || c == '—') {
                if (hasWord && !endsWithPunct(cur)) cur.append(c);
            }
            // quotes, parentheses, stray symbols: dropped
        }
        flush(cur, hasWord, ".", sentences);
        List<String> out = new ArrayList<>();
        for (String s : sentences) out.addAll(splitLong(filterAllowed(s)));
        return new Result(out, new ArrayList<>(oov));
    }

    private static final String THE = "ðə";

    /** Function words whose lexicon entries are letter names. ALL-CAPS tokens (initialisms) are left alone. */
    private static String articlePhonemes(String tok) {
        if (tok.length() >= 2 && tok.equals(tok.toUpperCase(Locale.ROOT))) return null;
        switch (tok.toLowerCase(Locale.ROOT)) {
            case "a": return "ɐ";
            case "an": return "ən";
            case "the": return THE;
            default: return null;
        }
    }

    static boolean startsWithVowel(String ph) {
        for (int i = 0; i < ph.length(); i++) {
            char c = ph.charAt(i);
            if (c == 'ˈ' || c == 'ˌ' || c == ' ') continue;
            return "aeiouAIOWYæɑɒɔəɛɜɪʊʌɐɚɝᵻ".indexOf(c) >= 0;
        }
        return false;
    }

    // ---------------------------------------------------------------- normalization

    private static final Pattern TOKEN = Pattern.compile(
            "[A-Za-z0-9]+(?:'[A-Za-z]+)*(?:(?<=[sS])'(?![A-Za-z0-9]))?|[.!?…,;:—\\n]");

    static String normalize(String text) {
        String s = Normalizer.normalize(text, Normalizer.Form.NFKC);
        s = s.replace('‘', '\'').replace('’', '\'').replace('‛', '\'').replace('′', '\'');
        s = s.replace('“', '"').replace('”', '"');
        s = s.replace("–", " — ").replace("—", " — ");
        s = s.replaceAll("\\.{2,}", "…");
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        s = Normalizer.normalize(s, Normalizer.Form.NFC);
        s = s.replace("\r", "\n").replaceAll("[ \\t\\u00A0]+", " ").replaceAll(" ?\\n ?", "\n");
        return s.trim();
    }

    private static final String[][] ABBREVIATIONS = {
            {"\\bsb\\b", "somebody"},
            {"\\bsth\\b", "something"},
            {"\\be\\.g\\.?", "for example"},
            {"\\bi\\.e\\.?", "that is"},
            {"\\bvs\\b\\.?", "versus"},
            {"\\bdr\\.", "doctor"},
            {"\\bmr\\.", "mister"},
            {"\\bmrs\\.", "missus"},
            {"\\bms\\.", "miz"},
            {"\\badj\\.", "adjective"},
            {"\\binf\\b\\.?", "infinitive"},
            {"\\bkg\\b", "kilograms"},
            {"\\bkm\\b", "kilometers"},
            {"\\bcm\\b", "centimeters"},
    };
    private static final Pattern[] ABBREV_PATTERNS = new Pattern[ABBREVIATIONS.length];
    static {
        for (int i = 0; i < ABBREVIATIONS.length; i++) {
            ABBREV_PATTERNS[i] = Pattern.compile(ABBREVIATIONS[i][0], Pattern.CASE_INSENSITIVE);
        }
    }
    private static final Pattern ETC_END = Pattern.compile("\\betc\\.(?=\\s+\\p{Lu}|\\s*$)", Pattern.CASE_INSENSITIVE);
    private static final Pattern ETC = Pattern.compile("\\betc\\.?", Pattern.CASE_INSENSITIVE);
    private static final Pattern ACRONYM_DOTS = Pattern.compile("\\b(?:[A-Za-z]\\.){2,}");
    private static final Pattern DOLLARS = Pattern.compile("\\$\\s?(\\d[\\d,]*(?:\\.\\d+)?)");
    private static final Pattern PERCENT = Pattern.compile("%");
    private static final Pattern INTRA_DOT = Pattern.compile("(?<=[A-Za-z])\\.(?=[A-Za-z])");

    static String expandAbbreviations(String s) {
        s = ETC_END.matcher(s).replaceAll("et cetera.");
        s = ETC.matcher(s).replaceAll("et cetera");
        for (int i = 0; i < ABBREV_PATTERNS.length; i++) {
            s = ABBREV_PATTERNS[i].matcher(s).replaceAll(ABBREVIATIONS[i][1]);
        }
        // U.S. / U.K. style: spell the letters
        Matcher am = ACRONYM_DOTS.matcher(s);
        StringBuffer sb = new StringBuffer();
        while (am.find()) {
            String letters = am.group().replace(".", "");
            StringBuilder spaced = new StringBuilder();
            for (char ch : letters.toCharArray()) spaced.append(Character.toUpperCase(ch)).append(' ');
            am.appendReplacement(sb, Matcher.quoteReplacement(spaced.toString().trim().toUpperCase(Locale.ROOT)));
        }
        am.appendTail(sb);
        s = sb.toString();
        s = DOLLARS.matcher(s).replaceAll("$1 dollars");
        s = PERCENT.matcher(s).replaceAll(" percent");
        s = s.replace("&", " and ");
        s = INTRA_DOT.matcher(s).replaceAll(" ");
        return s;
    }

    // ---------------------------------------------------------------- numbers

    private static final String[] ONES = {"zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
            "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"};
    private static final String[] TENS = {"", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"};
    private static final String[] DECADES = {"", "tens", "twenties", "thirties", "forties", "fifties", "sixties", "seventies", "eighties", "nineties"};

    private static final Pattern DECADE_YEAR = Pattern.compile("(?<![A-Za-z0-9])(1[0-9]|20)(\\d)0s\\b");
    private static final Pattern DECADE_SHORT = Pattern.compile("(?<![A-Za-z0-9])(\\d)0s\\b");
    private static final Pattern ORDINAL = Pattern.compile("(?<![A-Za-z0-9])(\\d{1,9})(?:st|nd|rd|th)\\b", Pattern.CASE_INSENSITIVE);
    private static final Pattern NUMBER = Pattern.compile(
            "(?<![A-Za-z0-9])(\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.(\\d+))?(?![A-Za-z0-9])");

    static String expandNumbers(String s) {
        s = replaceAll(DECADE_YEAR, s, new Fn() {
            public String apply(Matcher m) {
                int century = Integer.parseInt(m.group(1));
                int dec = Integer.parseInt(m.group(2));
                if (dec == 0) return century == 20 ? " two thousands " : " " + cardinal(century) + " hundreds ";
                return " " + (century == 20 ? "twenty" : cardinal(century)) + " " + DECADES[dec] + " ";
            }
        });
        s = replaceAll(DECADE_SHORT, s, new Fn() {
            public String apply(Matcher m) {
                int d = Integer.parseInt(m.group(1));
                return " " + (d == 0 ? "hundreds" : DECADES[d]) + " ";
            }
        });
        s = replaceAll(ORDINAL, s, new Fn() {
            public String apply(Matcher m) {
                return " " + ordinal(Long.parseLong(m.group(1))) + " ";
            }
        });
        s = replaceAll(NUMBER, s, new Fn() {
            public String apply(Matcher m) {
                String intPart = m.group(1);
                String frac = m.group(2);
                boolean commas = intPart.indexOf(',') >= 0;
                String digits = intPart.replace(",", "");
                if (frac != null) {
                    return " " + numberWords(digits) + " point " + digitWords(frac) + " ";
                }
                if (!commas && digits.length() == 4) {
                    int n = Integer.parseInt(digits);
                    if ((n >= 1100 && n <= 1999) || (n >= 2010 && n <= 2099)) return " " + yearWords(n) + " ";
                }
                return " " + numberWords(digits) + " ";
            }
        });
        return s;
    }

    private interface Fn { String apply(Matcher m); }

    private static String replaceAll(Pattern p, String s, Fn fn) {
        Matcher m = p.matcher(s);
        StringBuffer sb = new StringBuffer();
        while (m.find()) m.appendReplacement(sb, Matcher.quoteReplacement(fn.apply(m)));
        m.appendTail(sb);
        return sb.toString();
    }

    static String digitWords(String digits) {
        StringBuilder sb = new StringBuilder();
        for (char c : digits.toCharArray()) {
            if (c < '0' || c > '9') continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(ONES[c - '0']);
        }
        return sb.toString();
    }

    /** Cardinal for digit strings; leading zeros or > 999,999,999 are read digit by digit. */
    static String numberWords(String digits) {
        if (digits.length() > 9 || (digits.length() > 1 && digits.charAt(0) == '0')) return digitWords(digits);
        return cardinal(Long.parseLong(digits));
    }

    static String cardinal(long n) {
        if (n < 20) return ONES[(int) n];
        if (n < 100) return TENS[(int) (n / 10)] + (n % 10 == 0 ? "" : " " + ONES[(int) (n % 10)]);
        if (n < 1000) return ONES[(int) (n / 100)] + " hundred" + (n % 100 == 0 ? "" : " " + cardinal(n % 100));
        if (n < 1000000) return cardinal(n / 1000) + " thousand" + (n % 1000 == 0 ? "" : " " + cardinal(n % 1000));
        return cardinal(n / 1000000) + " million" + (n % 1000000 == 0 ? "" : " " + cardinal(n % 1000000));
    }

    static String ordinal(long n) {
        if (n > 999999999L) return digitWords(Long.toString(n));
        String c = cardinal(n);
        int sp = Math.max(c.lastIndexOf(' '), c.lastIndexOf('-'));
        String head = c.substring(0, sp + 1);
        String last = c.substring(sp + 1);
        String o;
        switch (last) {
            case "one": o = "first"; break;
            case "two": o = "second"; break;
            case "three": o = "third"; break;
            case "five": o = "fifth"; break;
            case "eight": o = "eighth"; break;
            case "nine": o = "ninth"; break;
            case "twelve": o = "twelfth"; break;
            default:
                o = last.endsWith("y") ? last.substring(0, last.length() - 1) + "ieth" : last + "th";
        }
        return head + o;
    }

    static String yearWords(int n) {
        if (n >= 2000 && n <= 2009) return n == 2000 ? "two thousand" : "two thousand " + ONES[n - 2000];
        int hi = n / 100;
        int lo = n % 100;
        String h = cardinal(hi);
        if (lo == 0) return h + " hundred";
        if (lo < 10) return h + " oh " + ONES[lo];
        return h + " " + cardinal(lo);
    }

    // ---------------------------------------------------------------- word resolution

    private String resolveToken(String tok) {
        boolean hasDigit = false;
        boolean hasLetter = false;
        for (int i = 0; i < tok.length(); i++) {
            char c = tok.charAt(i);
            if (c >= '0' && c <= '9') hasDigit = true;
            else if (Character.isLetter(c)) hasLetter = true;
        }
        if (hasDigit) return spellOut(tok);
        String lower = tok.toLowerCase(Locale.ROOT);
        boolean allCaps = tok.length() >= 2 && tok.length() <= 5 && tok.equals(tok.toUpperCase(Locale.ROOT)) && tok.indexOf('\'') < 0;
        String cached = cache.get(lower);
        String r;
        if (cached != null && !allCaps) {
            r = MISS.equals(cached) ? null : cached;
        } else {
            r = resolve(lower, 0);
            if (r == null && allCaps) r = spellOut(lower);
            if (!allCaps) cache.put(lower, r == null ? MISS : r);
        }
        return r;
    }

    /** Letter by letter using the lexicon's single-letter entries; digits via digit words. */
    private String spellOut(String s) {
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < s.length(); i++) {
            char c = Character.toLowerCase(s.charAt(i));
            String ph;
            if (c >= '0' && c <= '9') ph = lookup(ONES[c - '0']);
            else if (c >= 'a' && c <= 'z') ph = lookup(String.valueOf(c));
            else if (c == '\'') continue;
            else ph = null;
            if (ph == null) return null;
            parts.add(ph);
        }
        if (parts.isEmpty()) return null;
        return join(parts);
    }

    private static String join(List<String> parts) {
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(p);
        }
        return sb.toString();
    }

    private String lookup(String w) {
        String r = main.get(w);
        return r != null ? r : extra.get(w);
    }

    private static boolean hasVowelLetter(String w) {
        for (int i = 0; i < w.length(); i++) if ("aeiouy".indexOf(w.charAt(i)) >= 0) return true;
        return false;
    }

    private static final int MAX_DEPTH = 2;

    String resolve(String w, int depth) {
        String r = lookup(w);
        if (r != null) return r;
        if (w.isEmpty() || depth > MAX_DEPTH) return null;
        if (!hasVowelLetter(w) && w.indexOf('\'') < 0 && w.length() <= 5) {
            String sp = spellOut(w);
            if (sp != null) return sp;
        }
        r = possessiveOrContraction(w, depth);
        if (r != null) return r;
        r = british(w, depth);
        if (r != null) return r;
        r = inflection(w, depth);
        if (r != null) return r;
        r = prefixed(w, depth);
        if (r != null) return r;
        return compound(w, depth);
    }

    private static final String[][] CONTRACTIONS = {
            {"'ve", "əv"}, {"'ll", "əl"}, {"'d", "d"}, {"'re", "əɹ"}, {"'m", "m"}, {"n't", "ənt"},
    };

    private String possessiveOrContraction(String w, int depth) {
        if (w.indexOf('\'') < 0) return null;
        if (w.endsWith("'s") && w.length() > 3) {
            String b = resolve(w.substring(0, w.length() - 2), depth + 1);
            return b == null ? null : b + sSuffix(b);
        }
        if (w.endsWith("s'") && w.length() > 2) {
            return resolve(w.substring(0, w.length() - 1), depth + 1);
        }
        for (String[] c : CONTRACTIONS) {
            if (w.endsWith(c[0]) && w.length() > c[0].length() + 1) {
                String b = resolve(w.substring(0, w.length() - c[0].length()), depth + 1);
                if (b != null) return b + c[1];
            }
        }
        return null;
    }

    private static String sSuffix(String ph) {
        char last = lastSymbol(ph);
        if ("szʃʒʧʤ".indexOf(last) >= 0) return "ɪz";
        if ("ptkfθ".indexOf(last) >= 0) return "s";
        return "z";
    }

    private static String edSuffix(String ph) {
        char last = lastSymbol(ph);
        if (last == 't' || last == 'd') return "ɪd";
        if ("pkfsθʃʧ".indexOf(last) >= 0) return "t";
        return "d";
    }

    private static char lastSymbol(String ph) {
        for (int i = ph.length() - 1; i >= 0; i--) {
            char c = ph.charAt(i);
            if (c != ' ' && c != 'ˈ' && c != 'ˌ') return c;
        }
        return 'a';
    }

    private static final Pattern[] BRITISH_FROM = {
            Pattern.compile("isation(s?)$"), Pattern.compile("is(e|ed|es|ing|er|ers)$"), Pattern.compile("ys(e|ed|es|ing)$"),
            Pattern.compile("([a-z]{2,})our(s|ed|ing|ful|able|less)?$"), Pattern.compile("([a-z]{2,})tre(s?)$"),
            Pattern.compile("([a-z])ll(ed|ing|er|ers)$"), Pattern.compile("([a-z]{2,})ogue(s?)$"),
            Pattern.compile("^(def|off|pret|lic)ence(s?)$"),
    };
    private static final String[] BRITISH_TO = {
            "ization$1", "iz$1", "yz$1", "$1or$2", "$1ter$2", "$1l$2", "$1og$2", "$1ense$2",
    };

    private String british(String w, int depth) {
        for (int i = 0; i < BRITISH_FROM.length; i++) {
            Matcher m = BRITISH_FROM[i].matcher(w);
            if (m.find()) {
                String alt = m.replaceFirst(BRITISH_TO[i]);
                // the ^...$ replacement drops nothing else; others replace only the matched tail
                if (!alt.equals(w)) {
                    String r = resolve(alt, depth + 1);
                    if (r != null) return r;
                }
            }
        }
        return null;
    }

    private interface Suffix { String suffix(String basePh); }

    private String inflection(String w, int depth) {
        int n = w.length();
        String r;
        // plural / 3rd person
        if (n > 3 && w.endsWith("ies")) {
            r = withBase(w.substring(0, n - 3) + "y", depth, SUF_S);
            if (r != null) return r;
        }
        if (n > 3 && w.endsWith("es")) {
            r = withBase(w.substring(0, n - 2), depth, SUF_S);
            if (r != null) return r;
        }
        if (n > 3 && w.endsWith("s") && !w.endsWith("ss")) {
            r = withBase(w.substring(0, n - 1), depth, SUF_S);
            if (r != null) return r;
        }
        // past tense
        if (n > 4 && w.endsWith("ied")) {
            r = withBase(w.substring(0, n - 3) + "y", depth, SUF_ED);
            if (r != null) return r;
        }
        if (n > 4 && w.endsWith("ed")) {
            r = withBases(stems(w, 2, true), depth, SUF_ED);
            if (r != null) return r;
        }
        // -ing
        if (n > 5 && w.endsWith("ing")) {
            r = withBases(stems(w, 3, true), depth, fixed("ɪŋ"));
            if (r != null) return r;
        }
        if (n > 4 && w.endsWith("est")) {
            r = withBases(stems(w, 3, true), depth, fixed("ɪst"));
            if (r != null) return r;
        }
        if (n > 4 && w.endsWith("er")) {
            r = withBases(stems(w, 2, true), depth, fixed("əɹ"));
            if (r != null) return r;
        }
        if (n > 5 && w.endsWith("ily")) {
            r = withBase(w.substring(0, n - 3) + "y", depth, fixed("li"));
            if (r != null) return r;
        }
        if (n > 4 && w.endsWith("ly")) {
            r = withBase(w.substring(0, n - 2), depth, fixed("li"));
            if (r != null) return r;
        }
        if (n > 6 && w.endsWith("iness")) {
            r = withBase(w.substring(0, n - 5) + "y", depth, fixed("nəs"));
            if (r != null) return r;
        }
        if (n > 6 && w.endsWith("ness")) {
            r = withBase(w.substring(0, n - 4), depth, fixed("nəs"));
            if (r != null) return r;
        }
        if (n > 6 && w.endsWith("ment")) {
            r = withBases(stems(w, 4, false), depth, fixed("mənt"));
            if (r != null) return r;
        }
        if (n > 5 && w.endsWith("iful")) {
            r = withBase(w.substring(0, n - 4) + "y", depth, fixed("fəl"));
            if (r != null) return r;
        }
        if (n > 5 && w.endsWith("ful")) {
            r = withBase(w.substring(0, n - 3), depth, fixed("fəl"));
            if (r != null) return r;
        }
        if (n > 6 && w.endsWith("less")) {
            r = withBase(w.substring(0, n - 4), depth, fixed("ləs"));
            if (r != null) return r;
        }
        if (n > 6 && w.endsWith("able")) {
            r = withBases(stems(w, 4, true), depth, fixed("əbəl"));
            if (r != null) return r;
        }
        if (n > 6 && w.endsWith("ible")) {
            r = withBases(stems(w, 4, true), depth, fixed("əbəl"));
            if (r != null) return r;
        }
        if (n > 6 && w.endsWith("ibly")) {
            // base+ible form (possibly -> possible), then base + əbli
            String ible = lookup(w.substring(0, n - 1) + "e");
            if (ible != null && ible.endsWith("əl")) return ible.substring(0, ible.length() - 2) + "li";
            r = withBases(stems(w, 4, true), depth, fixed("əbli"));
            if (r != null) return r;
        }
        if (n > 6 && w.endsWith("ably")) {
            r = withBases(stems(w, 4, true), depth, fixed("əbli"));
            if (r != null) return r;
        }
        return null;
    }

    private static final Suffix SUF_S = new Suffix() { public String suffix(String p) { return sSuffix(p); } };
    private static final Suffix SUF_ED = new Suffix() { public String suffix(String p) { return edSuffix(p); } };

    private static Suffix fixed(final String s) {
        return new Suffix() { public String suffix(String p) { return s; } };
    }

    /** Candidate stems after removing `cut` letters: plain, +e, and undoubled final consonant. */
    private static List<String> stems(String w, int cut, boolean variants) {
        List<String> out = new ArrayList<>();
        String b = w.substring(0, w.length() - cut);
        out.add(b);
        if (variants) {
            out.add(b + "e");
            int l = b.length();
            if (l >= 3 && b.charAt(l - 1) == b.charAt(l - 2) && "aeiou".indexOf(b.charAt(l - 1)) < 0) {
                out.add(b.substring(0, l - 1));
            }
            if (l >= 3 && b.endsWith("i")) out.add(b.substring(0, l - 1) + "y");
        }
        return out;
    }

    private String withBases(List<String> bases, int depth, Suffix s) {
        for (String b : bases) {
            String r = withBase(b, depth, s);
            if (r != null) return r;
        }
        return null;
    }

    private String withBase(String base, int depth, Suffix s) {
        if (base.length() < 3) return null;
        String b = resolve(base, depth + 1);
        return b == null ? null : b + s.suffix(b);
    }

    private static final String[][] PREFIXES = {
            {"under", "ˌʌndəɹ"}, {"inter", "ˌɪntəɹ"}, {"super", "sˌupəɹ"},
            {"multi", "mˌʌlti"}, {"micro", "mˌIkɹO"}, {"over", "ˌOvəɹ"},
            {"anti", "ˌænti"}, {"non", "nˌɑn"}, {"dis", "dˌɪs"}, {"mis", "mˌɪs"},
            {"out", "ˌWt"}, {"pre", "pɹˌi"}, {"sub", "sˌʌb"}, {"un", "ˌʌn"},
            {"re", "ɹˌi"}, {"de", "dˌi"}, {"in", "ˌɪn"},
    };

    private String prefixed(String w, int depth) {
        for (String[] p : PREFIXES) {
            int min = p[0].equals("in") ? 5 : 3;
            if (w.startsWith(p[0]) && w.length() - p[0].length() >= min) {
                String r = resolve(w.substring(p[0].length()), depth + 1);
                if (r != null) return p[1] + r;
            }
        }
        return null;
    }

    private String compound(String w, int depth) {
        for (int i = w.length() - 3; i >= 3; i--) {
            String a = lookup(w.substring(0, i));
            if (a == null) continue;
            String b = depth < MAX_DEPTH ? resolve(w.substring(i), depth + 1) : lookup(w.substring(i));
            if (b != null) return a.replace('ˈ', 'ˌ') + b;
        }
        return null;
    }

    // ---------------------------------------------------------------- sentences

    private static boolean endsWithPunct(CharSequence sb) {
        if (sb.length() == 0) return false;
        char c = sb.charAt(sb.length() - 1);
        return c == ',' || c == ';' || c == ':' || c == '—';
    }

    /** Close the current sentence with `terminator`; returns the new hasWord (false). */
    private static boolean flush(StringBuilder cur, boolean hasWord, String terminator, List<String> out) {
        if (hasWord && cur.length() > 0) {
            while (endsWithPunct(cur)) cur.setLength(cur.length() - 1);
            cur.append(terminator);
            out.add(cur.toString());
        }
        cur.setLength(0);
        return false;
    }

    private String filterAllowed(String s) {
        if (allowed == null) return s;
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); ) {
            int cp = s.codePointAt(i);
            i += Character.charCount(cp);
            if (allowed.contains(cp)) sb.appendCodePoint(cp);
        }
        return sb.toString();
    }

    static List<String> splitLong(String s) {
        List<String> out = new ArrayList<>();
        if (s.codePointCount(0, s.length()) <= MAX_SENTENCE_CODEPOINTS) {
            if (!s.isEmpty()) out.add(s);
            return out;
        }
        // split at clause punctuation first
        List<String> pieces = new ArrayList<>();
        int start = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if ((c == ',' || c == ';' || c == ':' || c == '—') && i + 1 < s.length()) {
                pieces.add(s.substring(start, i + 1).trim());
                start = i + 1;
            }
        }
        pieces.add(s.substring(start).trim());
        // break any oversized piece at spaces
        List<String> small = new ArrayList<>();
        for (String p : pieces) {
            if (p.codePointCount(0, p.length()) <= MAX_SENTENCE_CODEPOINTS) {
                small.add(p);
                continue;
            }
            StringBuilder cur = new StringBuilder();
            for (String word : p.split(" ")) {
                if (cur.length() > 0 && cur.length() + 1 + word.length() > MAX_SENTENCE_CODEPOINTS) {
                    small.add(cur.toString() + ",");
                    cur.setLength(0);
                }
                if (cur.length() > 0) cur.append(' ');
                cur.append(word);
            }
            if (cur.length() > 0) small.add(cur.toString());
        }
        // greedily merge pieces up to the limit
        StringBuilder cur = new StringBuilder();
        for (String p : small) {
            if (cur.length() > 0 && cur.length() + 1 + p.length() > MAX_SENTENCE_CODEPOINTS) {
                out.add(cur.toString());
                cur.setLength(0);
            }
            if (cur.length() > 0) cur.append(' ');
            cur.append(p);
        }
        if (cur.length() > 0) out.add(cur.toString());
        return out;
    }
}
