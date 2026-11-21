package com.lazy.vocabulary.kokoro;

import android.app.ActivityManager;
import android.content.Context;

/** Holds both model stores and decides which one to download / load. */
public final class KokoroModels {
    private final KokoroModelStore fp32;
    private final KokoroModelStore int8;
    private final KokoroVariant preferred;

    public KokoroModels(Context context) {
        this(new KokoroModelStore(context, KokoroVariant.FP32), new KokoroModelStore(context, KokoroVariant.INT8),
                KokoroVariant.choose(totalMem(context)));
    }

    public KokoroModels(KokoroModelStore fp32, KokoroModelStore int8, KokoroVariant preferred) {
        this.fp32 = fp32;
        this.int8 = int8;
        this.preferred = preferred;
    }

    private static long totalMem(Context context) {
        try {
            ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);
            return mi.totalMem;
        } catch (Throwable t) {
            return 0; // unknown: be conservative
        }
    }

    public KokoroVariant preferred() { return preferred; }

    public KokoroModelStore store(KokoroVariant v) { return v == KokoroVariant.FP32 ? fp32 : int8; }

    /** The store the device should download. */
    public KokoroModelStore preferredStore() { return store(preferred); }

    /** The store to load for speech: fp32 when fully installed, else int8, else null. */
    public KokoroModelStore ready() {
        if (fp32.isReady()) return fp32;
        if (int8.isReady()) return int8;
        return null;
    }

    public boolean isReady() { return ready() != null; }

    public boolean isDownloading() { return fp32.isDownloading() || int8.isDownloading(); }

    /** Only the legacy int8 model is installed although this device qualifies for fp32. */
    public boolean upgradeAvailable() {
        return preferred == KokoroVariant.FP32 && !fp32.isReady() && int8.isReady();
    }

    public long bytesOnDisk() { return fp32.bytesOnDisk() + int8.bytesOnDisk(); }

    public void deleteAll() {
        fp32.delete();
        int8.delete();
    }
}
