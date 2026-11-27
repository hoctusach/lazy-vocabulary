package com.lazy.vocabulary;

import java.util.ArrayList;
import java.util.List;

/**
 * [FB-65] Body of the playback notification card: pure Java (no Android classes) so it is unit-tested directly.
 * Field order matches the in-app word card (VocabularyCardNew): category, [word = notification title], meaning,
 * example, translation. Empty fields are omitted. The service turns each line's kind into spans.
 */
final class NotificationBody {
    static final int CATEGORY = 0;    // dim + smaller
    static final int MEANING = 1;     // italic
    static final int EXAMPLE = 2;     // wrapped in curly quotes
    static final int TRANSLATION = 3; // italic

    static final class Line {
        final int kind;
        final String text;
        Line(int kind, String text) { this.kind = kind; this.text = text; }
    }

    private NotificationBody() { }

    static List<Line> lines(String categoryLabel, String meaning, String example, String translation) {
        List<Line> out = new ArrayList<>();
        add(out, CATEGORY, categoryLabel);
        add(out, MEANING, meaning);
        add(out, EXAMPLE, example == null || example.trim().isEmpty() ? "" : "“" + example.trim() + "”");
        add(out, TRANSLATION, translation);
        return out;
    }

    private static void add(List<Line> out, int kind, String s) {
        if (s == null || s.trim().isEmpty()) return;
        out.add(new Line(kind, s.trim()));
    }

    /** Lines joined with '\n' (what BigTextStyle shows without spans). */
    static String plain(List<Line> lines) {
        StringBuilder sb = new StringBuilder();
        for (Line l : lines) {
            if (sb.length() > 0) sb.append('\n');
            sb.append(l.text);
        }
        return sb.toString();
    }
}
