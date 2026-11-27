package com.lazy.vocabulary.kokoro;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.io.StringReader;
import java.util.List;
import java.util.Map;

import org.junit.BeforeClass;
import org.junit.Test;

public class KokoroG2PTest {
    private static KokoroG2P g2p;

    private static final String MAIN = String.join("\n",
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
            "hello h ə l ˈ O", "world w ɜ ɹ l d", "good ɡ ʊ d", "day d A", "it ɪ t");
    private static final String TOKENS = String.join("\n", "; 1", ": 2", ", 3", ". 4", "! 5", "? 6", "— 9", "… 10", "  16");

    @BeforeClass
    public static void setUp() throws Exception {
        Map<String, String> main = KokoroG2P.parseLexicon(new StringReader(MAIN));
        Map<String, String> extra = KokoroG2P.parseLexicon(new StringReader("# c\nwindmill wɪndmɪl\nshelf bad"));
        java.util.Set<Integer> set = new java.util.HashSet<>();
        for (String v : main.values()) v.codePoints().forEach(set::add);
        for (String v : extra.values()) v.codePoints().forEach(set::add);
        for (char c : " ,.;:!?—…ɐ".toCharArray()) set.add((int) c);
        g2p = new KokoroG2P(main, extra, set);
    }

    private static String one(String text) {
        KokoroG2P.Result r = g2p.phonemize(text);
        assertTrue("oov: " + r.oov, r.oov.isEmpty());
        assertEquals(1, r.sentences.size());
        return r.sentences.get(0);
    }

    @Test public void tokensParsing() throws Exception {
        java.util.Set<Integer> s = KokoroG2P.parseTokens(new StringReader(TOKENS));
        assertTrue(s.contains((int) ' '));
        assertTrue(s.contains((int) ','));
    }

    @Test public void cardinals() {
        assertEquals("twɛnti fɔɹ.", one("24"));
        assertEquals("θɹi hʌndɹəd.", one("300"));
        assertEquals("wʌn θWzənd.", one("1,000"));
        assertEquals("θɹi pɔɪnt fIv.", one("3.5"));
    }

    @Test public void years() {
        assertEquals("nIntin nInti.", one("1990"));
        assertEquals("nIntin O fIv.", one("1905"));
        assertEquals("twɛnti twɛnti fɔɹ.", one("2024"));
        assertEquals("tu θWzənd fIv.", one("2005"));
    }

    @Test public void decadesAndOrdinals() {
        assertEquals("nIntin nIntiz.", one("1990s"));
        assertEquals("Atiz.", one("80s"));
        assertEquals("fɜɹst.", one("1st"));
        assertEquals("twɛnti fɜɹst.", one("21st"));
        assertEquals("fɔɹθ.", one("4th"));
    }

    @Test public void pluralPossessiveInflections() {
        assertEquals("dɔɡz.", one("dogs"));
        assertEquals("bɑksɪz.", one("boxes"));
        assertEquals("stɔɹiz.", one("stories"));
        assertEquals("dɔɡz.", one("dog's"));
        assertEquals("kæts.", one("cat's"));
        assertEquals("wɔkt.", one("walked"));
        assertEquals("wɑntɪd.", one("wanted"));
        assertEquals("stɑpt.", one("stopped"));
        assertEquals("mAkɪŋ.", one("making"));
        assertEquals("wɔkɪŋ.", one("walking"));
        assertEquals("lIkt.", one("liked"));
        assertEquals("hæpili.", one("happily"));
    }

    @Test public void britishPrefixCompound() {
        assertEquals("ɔɹɡənIz.", one("organise"));
        assertEquals("kʌlɚ.", one("colour"));
        assertEquals("ˌʌnhæpi.", one("unhappy"));
        assertEquals("ɹˌiwɔk.", one("rewalk"));
        assertEquals("bʊkʃɛlf.", one("bookshelf"));
        assertEquals("wɪndmɪl.", one("windmill"));
    }

    @Test public void firstLexiconEntryWinsAndMainBeforeExtra() {
        assertEquals("ʃɛlf.", one("shelf"));
    }

    @Test public void capsAndDigitSpelling() {
        assertEquals("ti vi.", one("TV"));
        assertEquals("bi wʌn.", one("B1"));
        assertEquals("ti vi.", one("tv"));
    }

    @Test public void oovDetected() {
        KokoroG2P.Result r = g2p.phonemize("hello zorblax world");
        assertEquals(1, r.oov.size());
        assertEquals("zorblax", r.oov.get(0));
        assertFalse(r.sentences.isEmpty());
    }

    @Test public void abbreviations() {
        assertEquals(one("somebody"), one("sb"));
        assertEquals(one("something"), one("sth"));
        assertEquals(one("for example"), one("e.g."));
        assertEquals(one("doctor"), one("Dr."));
        assertEquals(one("ten kilograms"), one("10 kg"));
        assertEquals(one("ten dollars"), one("$10"));
        assertEquals(one("ten percent"), one("10%"));
    }

    @Test public void sentenceSplitAndPunctuation() {
        KokoroG2P.Result r = g2p.phonemize("Hello world. Good day! Is it good?\nhello");
        assertEquals(4, r.sentences.size());
        assertTrue(r.sentences.get(0).endsWith("."));
        assertTrue(r.sentences.get(1).endsWith("!"));
        assertTrue(r.sentences.get(2).endsWith("?"));
        assertTrue(r.sentences.get(3).endsWith("."));
        assertEquals("həlˈO, wɜɹld.", one("Hello, world"));
        assertEquals("kæfˈA.", one("café"));
    }

    @Test public void longSentencesAreSplit() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 120; i++) sb.append(i % 10 == 9 ? "dog, " : "dog ");
        KokoroG2P.Result r = g2p.phonemize(sb.toString());
        assertTrue(r.sentences.size() > 1);
        for (String s : r.sentences) assertTrue(s.codePointCount(0, s.length()) <= KokoroG2P.MAX_SENTENCE_CODEPOINTS);
        StringBuilder nc = new StringBuilder();
        for (int i = 0; i < 200; i++) nc.append("dog ");
        r = g2p.phonemize(nc.toString());
        assertTrue(r.sentences.size() > 1);
        for (String s : r.sentences) assertTrue(s.codePointCount(0, s.length()) <= KokoroG2P.MAX_SENTENCE_CODEPOINTS);
    }

    @Test public void articles() {
        assertEquals("ɐ dɔɡ.", one("a dog"));
        assertEquals("ɐ dɔɡ.", one("A dog"));
        assertEquals("ən ˈæpəl.", one("an apple"));
        assertEquals("ðə dɔɡ.", one("the dog"));
        assertEquals("ði ˈæpəl.", one("the apple"));
        assertEquals("ði ˈWɚ.", one("the hour"));
        assertEquals("ðə, ˈæpəl.", one("the, apple"));
        assertEquals("ðə.", one("the."));
    }

    @Test public void allCapsTokensBypassArticleRule() {
        assertEquals("æn.", one("AN"));   // plain lexicon path, not "ən"
        assertEquals("ði.", one("THE"));  // lexicon entry, not "ðə"
    }

    @Test public void infinitiveAbbreviation() {
        assertEquals("ɪnfˈɪnɪtˌɪv.", one("inf."));
        assertEquals("ɪnfˈɪnɪtˌɪv.", one("inf"));
    }

    @Test public void inPrefixAndIbly() {
        assertEquals("ˌɪnvˈɪzəbəl.", one("invisible"));
        assertEquals("pˈɑsəbli.", one("possibly"));
        assertEquals("vˈɪzəbli.", one("visibly"));
        KokoroG2P.Result r = g2p.phonemize("inxyz");
        assertEquals(1, r.oov.size()); // remainder shorter than 5 letters: no 'in' prefix
    }
}
