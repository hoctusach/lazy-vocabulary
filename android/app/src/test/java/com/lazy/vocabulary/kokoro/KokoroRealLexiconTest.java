package com.lazy.vocabulary.kokoro;

import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeNotNull;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.Test;

/** Gated on env KOKORO_LEXICON (path to the real lexicon-us-en.txt). Skipped when unset. */
public class KokoroRealLexiconTest {
    private static KokoroG2P load(String path) throws Exception {
        Map<String, String> main;
        try (InputStreamReader r = new InputStreamReader(new FileInputStream(path), StandardCharsets.UTF_8)) {
            main = KokoroG2P.parseLexicon(r);
        }
        Map<String, String> extra;
        try (InputStreamReader r = new InputStreamReader(new FileInputStream("src/main/assets/kokoro/cmudict-extra-us.txt"), StandardCharsets.UTF_8)) {
            extra = KokoroG2P.parseLexicon(r);
        }
        Set<Integer> tokens = null;
        File tf = new File(new File(path).getParentFile(), "tokens.txt");
        if (tf.isFile()) {
            try (InputStreamReader r = new InputStreamReader(new FileInputStream(tf), StandardCharsets.UTF_8)) {
                tokens = KokoroG2P.parseTokens(r);
            }
        }
        return new KokoroG2P(main, extra, tokens);
    }

    static String clean(String s) {
        if (s == null) return "";
        return s.replaceAll("\\([^)]*\\)", " ").replaceAll("\\[[^\\]]*\\]", " ").replaceAll("/[^/]*/", " ").trim();
    }

    @Test
    public void phonemesForSample() throws Exception {
        String out = System.getenv("KOKORO_PHONEME_OUT");
        String lex = System.getenv("KOKORO_LEXICON");
        assumeNotNull(out, lex);
        KokoroG2P g = load(lex);
        KokoroG2P.Result r = g.phonemize("Serendipity. Noun. The occurrence of events by chance in a happy way. Example: Finding this café was pure serendipity.");
        Files.write(new File(out).toPath(), String.join("\n", r.sentences).concat("\n").getBytes(StandardCharsets.UTF_8));
    }

    @Test
    public void defaultVocabularyCoverage() throws Exception {
        String lex = System.getenv("KOKORO_LEXICON");
        assumeNotNull(lex);
        KokoroG2P g = load(lex);
        String json = new String(Files.readAllBytes(new File("../../src/data/defaultVocabulary.json").toPath()), StandardCharsets.UTF_8);
        Object root = new Json(json).parse();
        int cards = 0, badCards = 0;
        Set<String> oov = new LinkedHashSet<>();
        for (Object cat : ((Map<?, ?>) root).values()) {
            for (Object c : (List<?>) cat) {
                Map<?, ?> card = (Map<?, ?>) c;
                cards++;
                boolean bad = false;
                for (String k : new String[]{"word", "meaning", "example"}) {
                    Object v = card.get(k);
                    KokoroG2P.Result r = g.phonemize(clean(v == null ? "" : v.toString()));
                    if (!r.oov.isEmpty()) {
                        bad = true;
                        oov.addAll(r.oov);
                    }
                }
                if (bad) badCards++;
            }
        }
        System.out.println("KOKORO cards=" + cards + " cardsWithOOV=" + badCards + " ratio=" + (100.0 * badCards / cards) + "% distinctOOV=" + oov.size());
        int i = 0;
        for (String w : oov) {
            if (i++ >= 100) break;
            System.out.println("KOKORO OOV: " + w);
        }
        assertTrue("OOV-card ratio too high: " + badCards + "/" + cards, badCards < cards * 0.02);
    }

    /** Minimal JSON parser (org.json is stubbed in Android unit tests). */
    static final class Json {
        private final String s;
        private int i;

        Json(String s) { this.s = s; }

        Object parse() { ws(); return val(); }

        private void ws() { while (i < s.length() && Character.isWhitespace(s.charAt(i))) i++; }

        private Object val() {
            ws();
            char c = s.charAt(i);
            if (c == '{') {
                Map<String, Object> m = new java.util.LinkedHashMap<>();
                i++; ws();
                if (s.charAt(i) == '}') { i++; return m; }
                while (true) {
                    ws(); String k = str(); ws(); i++; // :
                    m.put(k, val()); ws();
                    if (s.charAt(i++) == '}') return m;
                }
            }
            if (c == '[') {
                List<Object> l = new java.util.ArrayList<>();
                i++; ws();
                if (s.charAt(i) == ']') { i++; return l; }
                while (true) {
                    l.add(val()); ws();
                    if (s.charAt(i++) == ']') return l;
                }
            }
            if (c == '"') return str();
            int st = i;
            while (i < s.length() && ",}] \n\r\t".indexOf(s.charAt(i)) < 0) i++;
            return s.substring(st, i);
        }

        private String str() {
            StringBuilder sb = new StringBuilder();
            i++;
            while (s.charAt(i) != '"') {
                char c = s.charAt(i++);
                if (c == '\\') {
                    char e = s.charAt(i++);
                    switch (e) {
                        case 'n': sb.append('\n'); break;
                        case 't': sb.append('\t'); break;
                        case 'u': sb.append((char) Integer.parseInt(s.substring(i, i + 4), 16)); i += 4; break;
                        default: sb.append(e);
                    }
                } else sb.append(c);
            }
            i++;
            return sb.toString();
        }
    }
}
