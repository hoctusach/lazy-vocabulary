package com.lazy.vocabulary.kokoro;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class KokoroVariantTest {
    private static final long GIB = 1024L * 1024 * 1024;

    @Test
    public void choosesByTotalMemory() {
        assertEquals(KokoroVariant.INT8, KokoroVariant.choose(0));
        assertEquals(KokoroVariant.INT8, KokoroVariant.choose(2 * GIB));
        assertEquals(KokoroVariant.INT8, KokoroVariant.choose(3 * GIB - 1));
        assertEquals(KokoroVariant.FP32, KokoroVariant.choose(3 * GIB));
        assertEquals(KokoroVariant.FP32, KokoroVariant.choose(8 * GIB));
    }

    @Test
    public void downloadSizes() {
        assertEquals(332562608L, KokoroVariant.FP32.totalBytes());
        assertEquals(121205045L, KokoroVariant.INT8.totalBytes());
    }
}
