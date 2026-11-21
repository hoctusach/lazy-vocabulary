package com.lazy.vocabulary.kokoro;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class KokoroPostFxTest {
    private static final int SR = 24000;

    private static float[] sine(double freq, double amp, int n) {
        float[] b = new float[n];
        for (int i = 0; i < n; i++) b[i] = (float) (amp * Math.sin(2 * Math.PI * freq * i / SR));
        return b;
    }

    private static double rms(float[] b, int from) {
        double s = 0;
        for (int i = from; i < b.length; i++) s += (double) b[i] * b[i];
        return Math.sqrt(s / (b.length - from));
    }

    private static double notchDb(double freq) {
        float[] in = sine(freq, 0.3, SR);
        float[] out = in.clone();
        new KokoroPostFx().notch(out);
        return 20 * Math.log10(rms(out, 4000) / rms(in, 4000));
    }

    @Test
    public void notchesAttenuateArtifactTones() {
        assertTrue(notchDb(4800) < -20);
        assertTrue(notchDb(9600) < -20);
    }

    @Test
    public void notchPassesSpeechBand() {
        assertEquals(0.0, notchDb(1000), 1.0);
        assertEquals(0.0, notchDb(300), 1.0);
    }

    @Test
    public void makeUpGainIsAboutFourDb() {
        float[] in = sine(1000, 0.1, SR);
        float[] out = in.clone();
        KokoroPostFx.gainAndLimit(out);
        assertEquals(4.0, 20 * Math.log10(rms(out, 0) / rms(in, 0)), 0.1);
    }

    @Test
    public void limiterNeverExceedsCeiling() {
        float[] v = {0f, 0.5f, 0.8f, 0.81f, 1f, 2f, 10f, 1e9f, Float.POSITIVE_INFINITY, -0.9f, -3f, -1e9f, Float.NaN};
        for (float x : v) assertTrue("x=" + x, Math.abs(KokoroPostFx.limit(x)) <= 0.98f);
        float[] loud = sine(1000, 5.0, SR);
        new KokoroPostFx().process(loud);
        for (float x : loud) assertTrue(Math.abs(x) <= 0.98f);
        assertEquals(0.5f, KokoroPostFx.limit(0.5f), 0f);
        assertTrue(KokoroPostFx.limit(0.9f) > 0.8f);
    }

    @Test
    public void fadesStartAndEndAtZero() {
        float[] b = new float[SR / 2];
        java.util.Arrays.fill(b, 0.5f);
        KokoroPostFx.fade(b, SR, 5);
        assertEquals(0f, b[0], 0f);
        assertEquals(0f, b[b.length - 1], 0f);
        assertEquals(0.5f, b[b.length / 2], 0f);
        assertTrue(b[60] > b[10]);
        float[] tiny = {1f};
        KokoroPostFx.fade(tiny, SR, 5);
        assertEquals(0f, tiny[0], 0f);
        KokoroPostFx.fade(new float[0], SR, 5);
    }

    @Test
    public void processedSentenceEdgesAreZero() {
        float[] b = sine(500, 0.6, SR / 4);
        new KokoroPostFx().process(b);
        assertEquals(0f, b[0], 0f);
        assertEquals(0f, b[b.length - 1], 0f);
    }

    @Test
    public void resetClearsFilterState() {
        KokoroPostFx fx = new KokoroPostFx();
        float[] a = sine(1000, 0.5, 2000);
        fx.notch(a);
        fx.reset();
        float[] x = sine(1000, 0.5, 100);
        float[] y = x.clone();
        fx.notch(x);
        new KokoroPostFx().notch(y);
        assertTrue(java.util.Arrays.equals(x, y));
    }
}
