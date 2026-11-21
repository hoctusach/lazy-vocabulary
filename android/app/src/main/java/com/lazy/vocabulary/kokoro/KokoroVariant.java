package com.lazy.vocabulary.kokoro;

/** The two downloadable Kokoro model builds. Pure data + selection logic (no Android dependencies). */
public enum KokoroVariant {
    FP32("fp32", "kokoro-multi-lang-v1_0", "kokoro-v1.0-fp32",
            "https://huggingface.co/csukuangfj/kokoro-multi-lang-v1_0/resolve/f7b96bb6bef5c5da4d3aa4f4e0498fbbf62dc78b/",
            "model.onnx", 325560556L, "b40f62b166ac8164b0627ef48a0b358eda0985e272fb03ef5252e7206305da11"),
    INT8("int8", "kokoro-int8-multi-lang-v1_0", "kokoro-v1.0-int8",
            "https://huggingface.co/csukuangfj/kokoro-int8-multi-lang-v1_0/resolve/57adb37fc0e8d4bd430cfc1b8f8c2294945b9af2/",
            "model.int8.onnx", 114202993L, "75635ea3b85a32d00094dcdd61a258aba87c160f7c264c304a7b3ae9d734195e");

    /** Devices with at least this much RAM get the (better sounding, faster on CPU) fp32 model. */
    public static final long FP32_MIN_TOTAL_MEM = 3L * 1024 * 1024 * 1024;

    public static final String TOKENS_NAME = "tokens.txt";
    public static final long TOKENS_SIZE = 687L;
    public static final String TOKENS_SHA = "6ebb6bb288f20f3ae8d004d3c2ca27697da27c037d75e81a60e2a6a663f95425";
    public static final String LEXICON_NAME = "lexicon-us-en.txt";
    public static final long LEXICON_SIZE = 5956885L;
    public static final String LEXICON_SHA = "7daaab53a181be9885b853a8582bf1838186317e5dadacbcef9c426d6fa0da14";
    public static final long VOICES_SLICES_BYTES = 2L * 522240L;

    public final String id;
    public final String dirName;
    public final String version;
    public final String base;
    public final String modelName;
    public final long modelSize;
    public final String modelSha;

    KokoroVariant(String id, String dirName, String version, String base, String modelName, long modelSize, String modelSha) {
        this.id = id;
        this.dirName = dirName;
        this.version = version;
        this.base = base;
        this.modelName = modelName;
        this.modelSize = modelSize;
        this.modelSha = modelSha;
    }

    /** Bytes downloaded for a full install of this variant. */
    public long totalBytes() {
        return modelSize + TOKENS_SIZE + LEXICON_SIZE + VOICES_SLICES_BYTES;
    }

    public static KokoroVariant choose(long totalMemBytes) {
        return totalMemBytes >= FP32_MIN_TOTAL_MEM ? FP32 : INT8;
    }
}
