package com.lazy.vocabulary.kokoro;

/**
 * Post-processing for Kokoro output: notch filters that remove the constant tonal artifacts at sr/5 and sr/2.5
 * (4800 / 9600 Hz at 24 kHz) of the decoder, a fixed make-up gain, a soft limiter and edge fades.
 * Pure Java, no Android dependencies. One instance per utterance (filter state carries across sentences).
 */
public final class KokoroPostFx {
    public static final int SAMPLE_RATE = 24000;
    public static final double NOTCH_Q = 8.0;
    public static final double GAIN_DB = 4.0;
    public static final float KNEE_START = 0.8f;
    public static final float CEILING = 0.98f;
    public static final int FADE_MS = 5;

    private static final double GAIN = Math.pow(10.0, GAIN_DB / 20.0);

    /** RBJ notch, direct form I. */
    private static final class Biquad {
        final double b0, b1, b2, a1, a2;
        double x1, x2, y1, y2;

        Biquad(double freq, double q, int sr) {
            double w0 = 2.0 * Math.PI * freq / sr;
            double alpha = Math.sin(w0) / (2.0 * q);
            double cos = Math.cos(w0);
            double a0 = 1.0 + alpha;
            b0 = 1.0 / a0;
            b1 = -2.0 * cos / a0;
            b2 = 1.0 / a0;
            a1 = -2.0 * cos / a0;
            a2 = (1.0 - alpha) / a0;
        }

        float step(float in) {
            double x = in;
            double y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
            x2 = x1;
            x1 = x;
            y2 = y1;
            y1 = y;
            return (float) y;
        }

        void reset() {
            x1 = x2 = y1 = y2 = 0;
        }
    }

    private final Biquad[] notches;
    private final int sampleRate;

    public KokoroPostFx() {
        this(SAMPLE_RATE);
    }

    public KokoroPostFx(int sampleRate) {
        this.sampleRate = sampleRate;
        notches = new Biquad[]{
                new Biquad(sampleRate / 5.0, NOTCH_Q, sampleRate),
                new Biquad(sampleRate / 2.5, NOTCH_Q, sampleRate),
        };
    }

    /** Clear filter state (start of a new utterance). */
    public void reset() {
        for (Biquad b : notches) b.reset();
    }

    /** Notch filters only, in place. */
    public void notch(float[] buf) {
        for (int i = 0; i < buf.length; i++) {
            float v = buf[i];
            for (Biquad b : notches) v = b.step(v);
            buf[i] = v;
        }
    }

    /** Make-up gain followed by the soft limiter, in place. */
    public static void gainAndLimit(float[] buf) {
        for (int i = 0; i < buf.length; i++) buf[i] = limit((float) (buf[i] * GAIN));
    }

    /** Linear below KNEE_START, smooth tanh knee above, asymptote and hard ceiling at CEILING. */
    public static float limit(float x) {
        if (Float.isNaN(x)) return 0f;
        float a = Math.abs(x);
        if (a <= KNEE_START) return x;
        float room = CEILING - KNEE_START;
        float y = KNEE_START + room * (float) Math.tanh((a - KNEE_START) / room);
        if (y > CEILING) y = CEILING;
        return x < 0 ? -y : y;
    }

    /** Linear fade-in and fade-out of `ms` milliseconds on the buffer edges, in place. */
    public static void fade(float[] buf, int sampleRate, int ms) {
        int n = Math.min(sampleRate * ms / 1000, buf.length / 2);
        for (int i = 0; i < n; i++) {
            float g = (float) i / n;
            buf[i] *= g;
            buf[buf.length - 1 - i] *= g;
        }
        if (buf.length > 0) {
            buf[0] = 0f;
            buf[buf.length - 1] = 0f;
        }
    }

    /** Full chain for one sentence: notches, gain, limiter, edge fades. */
    public void process(float[] sentence) {
        notch(sentence);
        gainAndLimit(sentence);
        fade(sentence, sampleRate, FADE_MS);
    }
}
