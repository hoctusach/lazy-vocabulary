package com.lazy.vocabulary.kokoro;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

import com.k2fsa.sherpa.onnx.GeneratedAudio;
import com.k2fsa.sherpa.onnx.GenerationConfig;
import com.k2fsa.sherpa.onnx.OfflineTts;
import com.k2fsa.sherpa.onnx.OfflineTtsConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/** Loads Kokoro lazily, phonemizes, synthesizes sentence by sentence and streams the audio through AudioTrack. */
public final class KokoroEngine {
    public interface SpeakCallback {
        void onDone(boolean interrupted);

        void onError(String code, String message, List<String> oov);
    }

    private static final int SAMPLE_RATE = 24000;
    private static final long IDLE_RELEASE_MS = 10 * 60 * 1000L;
    private static final int TRIM_MEMORY_RUNNING_CRITICAL = 15;
    private static final float[] END = new float[0];

    private static KokoroEngine instance;

    public static synchronized KokoroEngine get(Context ctx, KokoroModelStore store) {
        if (instance == null) instance = new KokoroEngine(ctx.getApplicationContext(), store);
        return instance;
    }

    /** Called from MainActivity.onTrimMemory/onLowMemory. Never frees while speaking. */
    public static void trim(int level) {
        KokoroEngine e;
        synchronized (KokoroEngine.class) {
            e = instance;
        }
        if (e != null && level >= TRIM_MEMORY_RUNNING_CRITICAL) e.releaseIfIdle();
    }

    private final Context context;
    private final KokoroModelStore store;
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "kokoro-engine");
        t.setDaemon(true);
        return t;
    });
    private final ScheduledExecutorService timer = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "kokoro-idle");
        t.setDaemon(true);
        return t;
    });
    private ScheduledFuture<?> idleTask;

    // Touched only on the worker thread
    private OfflineTts tts;
    private KokoroG2P g2p;

    private final Object jobLock = new Object();
    private Job current;

    private KokoroEngine(Context context, KokoroModelStore store) {
        this.context = context;
        this.store = store;
    }

    public boolean isSpeaking() {
        synchronized (jobLock) {
            return current != null && !current.finished.get();
        }
    }

    public void speak(final String text, final int sid, final float speed, final SpeakCallback cb) {
        final Job job = new Job(cb);
        synchronized (jobLock) {
            if (current != null) current.cancel();
            current = job;
        }
        cancelIdleTimer();
        worker.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    job.run(text, sid, speed);
                } finally {
                    scheduleIdleRelease();
                }
            }
        });
    }

    public void stop() {
        Job j;
        synchronized (jobLock) {
            j = current;
        }
        if (j != null) j.cancel();
    }

    /** Stops speech and frees the model (async). */
    public void release() {
        stop();
        worker.execute(new Runnable() {
            @Override
            public void run() {
                doRelease();
            }
        });
    }

    /** Same as release() but waits for completion (used before deleting the model files). */
    public void releaseBlocking() {
        stop();
        try {
            worker.submit(new Runnable() {
                @Override
                public void run() {
                    doRelease();
                }
            }).get(15, TimeUnit.SECONDS);
        } catch (Exception ignored) {
            // best effort
        }
    }

    private void releaseIfIdle() {
        if (isSpeaking()) return;
        worker.execute(new Runnable() {
            @Override
            public void run() {
                if (!isSpeaking()) doRelease();
            }
        });
    }

    private void doRelease() {
        if (tts != null) {
            try {
                tts.release();
            } catch (Throwable ignored) {
                // already freed
            }
            tts = null;
        }
        g2p = null;
    }

    private synchronized void cancelIdleTimer() {
        if (idleTask != null) idleTask.cancel(false);
        idleTask = null;
    }

    private synchronized void scheduleIdleRelease() {
        if (idleTask != null) idleTask.cancel(false);
        idleTask = timer.schedule(new Runnable() {
            @Override
            public void run() {
                releaseIfIdle();
            }
        }, IDLE_RELEASE_MS, TimeUnit.MILLISECONDS);
    }

    private void ensureLoaded() throws Exception {
        if (tts != null && g2p != null) return;
        doRelease();
        Map<String, String> main;
        Set<Integer> tokens;
        try (BufferedReader r = new BufferedReader(new InputStreamReader(new FileInputStream(store.lexiconFile()), StandardCharsets.UTF_8))) {
            main = KokoroG2P.parseLexicon(r);
        }
        Map<String, String> extra;
        try (BufferedReader r = new BufferedReader(new InputStreamReader(context.getAssets().open("kokoro/cmudict-extra-us.txt"), StandardCharsets.UTF_8))) {
            extra = KokoroG2P.parseLexicon(r);
        }
        try (BufferedReader r = new BufferedReader(new InputStreamReader(new FileInputStream(store.tokensFile()), StandardCharsets.UTF_8))) {
            tokens = KokoroG2P.parseTokens(r);
        }
        OfflineTtsKokoroModelConfig k = new OfflineTtsKokoroModelConfig();
        k.setModel(store.modelFile().getAbsolutePath());
        k.setVoices(store.voicesFile().getAbsolutePath());
        k.setTokens(store.tokensFile().getAbsolutePath());
        OfflineTtsModelConfig mc = new OfflineTtsModelConfig();
        mc.setKokoro(k);
        mc.setNumThreads(Math.max(2, Math.min(4, Runtime.getRuntime().availableProcessors() / 2)));
        mc.setProvider("cpu");
        mc.setDebug(false);
        OfflineTtsConfig cfg = new OfflineTtsConfig();
        cfg.setModel(mc);
        cfg.setMaxNumSentences(1);
        tts = new OfflineTts(null, cfg);
        g2p = new KokoroG2P(main, extra, tokens);
    }

    private final class Job {
        final SpeakCallback cb;
        final AtomicBoolean cancelled = new AtomicBoolean(false);
        final AtomicBoolean finished = new AtomicBoolean(false);
        final Object trackLock = new Object();
        AudioTrack track;
        volatile Thread player;
        final BlockingQueue<float[]> queue = new ArrayBlockingQueue<>(2);

        Job(SpeakCallback cb) {
            this.cb = cb;
        }

        void cancel() {
            cancelled.set(true);
            synchronized (trackLock) {
                if (track != null) {
                    try {
                        track.pause();
                        track.flush();
                        track.release();
                    } catch (Throwable ignored) {
                        // released concurrently
                    }
                    track = null;
                }
            }
            Thread p = player;
            if (p != null) p.interrupt();
            finish(true, null, null, null);
        }

        void finish(boolean interrupted, String code, String message, List<String> oov) {
            if (!finished.compareAndSet(false, true)) return;
            if (code != null) cb.onError(code, message, oov);
            else cb.onDone(interrupted);
        }

        void run(String text, int sid, float speed) {
            if (cancelled.get()) return;
            try {
                if (!store.isReady()) {
                    finish(false, "NOT_DOWNLOADED", "Kokoro voices are not downloaded", null);
                    return;
                }
                ensureLoaded();
                if (cancelled.get()) return;
                KokoroG2P.Result res = g2p.phonemize(text);
                if (!res.oov.isEmpty()) {
                    finish(false, "OOV", "Unknown words: " + res.oov, res.oov);
                    return;
                }
                if (res.sentences.isEmpty()) {
                    finish(false, null, null, null);
                    return;
                }
                play(res.sentences, sid, speed);
            } catch (Throwable t) {
                if (!cancelled.get()) finish(false, "ENGINE_ERROR", String.valueOf(t.getMessage()), null);
            }
        }

        private void play(List<String> sentences, int sid, float speed) throws Exception {
            final int min = AudioTrack.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_FLOAT);
            AudioTrack t = new AudioTrack.Builder()
                    .setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build())
                    .setAudioFormat(new AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                            .setSampleRate(SAMPLE_RATE)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build())
                    .setBufferSizeInBytes(Math.max(min * 2, SAMPLE_RATE * 2))
                    .setTransferMode(AudioTrack.MODE_STREAM)
                    .build();
            synchronized (trackLock) {
                if (cancelled.get()) {
                    t.release();
                    return;
                }
                track = t;
            }
            final long[] written = {0};
            final String[] playerError = {null};
            Thread p = new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        t.play();
                        while (true) {
                            float[] chunk = queue.take();
                            if (chunk == END) break;
                            int off = 0;
                            while (off < chunk.length) {
                                int n = t.write(chunk, off, chunk.length - off, AudioTrack.WRITE_BLOCKING);
                                if (n < 0) throw new IllegalStateException("AudioTrack.write error " + n);
                                off += n;
                            }
                            written[0] += chunk.length;
                        }
                        // MODE_STREAM may not start until the buffer is full: pad with silence (not counted in `written`)
                        int pad = t.getBufferSizeInFrames();
                        float[] zeros = new float[Math.min(pad, 4096)];
                        while (pad > 0 && !cancelled.get()) {
                            int n = t.write(zeros, 0, Math.min(zeros.length, pad), AudioTrack.WRITE_BLOCKING);
                            if (n < 0) throw new IllegalStateException("AudioTrack.write error " + n);
                            if (n == 0) break;
                            pad -= n;
                        }
                        // wait for the last real frame to be played
                        int stalled = 0;
                        int lastHead = -1;
                        while (!cancelled.get() && t.getPlaybackHeadPosition() < written[0]) {
                            int head = t.getPlaybackHeadPosition();
                            stalled = head == lastHead ? stalled + 1 : 0;
                            lastHead = head;
                            if (stalled > 150) break; // ~3 s without progress
                            Thread.sleep(20);
                        }
                    } catch (InterruptedException ignored) {
                        // cancelled
                    } catch (Throwable e) {
                        if (!cancelled.get()) playerError[0] = String.valueOf(e.getMessage());
                    }
                }
            }, "kokoro-player");
            player = p;
            p.start();
            try {
                GenerationConfig gc = new GenerationConfig();
                gc.setSid(sid);
                gc.setSpeed(speed);
                float[] gap = new float[SAMPLE_RATE * 120 / 1000];
                for (int i = 0; i < sentences.size() && !cancelled.get(); i++) {
                    String s = sentences.get(i);
                    int[] cps = s.codePoints().toArray();
                    gc.setPhonemeCodepoints(new int[][]{cps});
                    GeneratedAudio a = tts.generateWithConfig("x", gc);
                    float[] samples = a.getSamples();
                    if (i < sentences.size() - 1) {
                        float[] withGap = new float[samples.length + gap.length];
                        System.arraycopy(samples, 0, withGap, 0, samples.length);
                        samples = withGap;
                    }
                    if (cancelled.get()) break;
                    while (!queue.offer(samples, 100, TimeUnit.MILLISECONDS)) {
                        if (cancelled.get() || !p.isAlive()) break;
                    }
                    if (!p.isAlive()) break;
                }
                if (!cancelled.get() && p.isAlive()) {
                    while (!queue.offer(END, 100, TimeUnit.MILLISECONDS)) {
                        if (cancelled.get() || !p.isAlive()) break;
                    }
                }
                p.join();
            } catch (InterruptedException e) {
                // cancelled
            } finally {
                p.interrupt();
                synchronized (trackLock) {
                    if (track != null) {
                        try {
                            track.stop();
                        } catch (Throwable ignored) {
                            // not playing
                        }
                        track.release();
                        track = null;
                    }
                }
                player = null;
            }
            if (cancelled.get()) return; // cancel() already resolved the call
            if (playerError[0] != null) finish(false, "ENGINE_ERROR", playerError[0], null);
            else finish(false, null, null, null);
        }
    }
}
