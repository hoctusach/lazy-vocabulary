package com.lazy.vocabulary.kokoro;

import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Downloads and verifies the Kokoro model files (pinned Hugging Face revision) into the app's private storage.
 * voices.bin is assembled locally from two HTTP Range slices (af_heart, am_michael); the rest is zeros.
 */
public final class KokoroModelStore {
    public static final String VERSION = "kokoro-v1.0-int8";
    public static final long TOTAL_BYTES = 121205045L;

    static final String BASE = "https://huggingface.co/csukuangfj/kokoro-int8-multi-lang-v1_0/resolve/57adb37fc0e8d4bd430cfc1b8f8c2294945b9af2/";
    static final String DIR_NAME = "kokoro-int8-multi-lang-v1_0";

    static final String MODEL = "model.int8.onnx";
    static final String TOKENS = "tokens.txt";
    static final String LEXICON = "lexicon-us-en.txt";
    static final String VOICES = "voices.bin";
    static final String READY = "ready";

    static final long VOICES_SIZE = 28200960L;
    static final String VOICES_FULL_SHA = "1c5a5b983d3d50d8586d437a51f3faa2da7919ce76a013c081e65671a3447c29";
    static final long SLICE_LEN = 522240L;

    private static final class Entry {
        final String name;
        final long size;
        final String sha;

        Entry(String name, long size, String sha) {
            this.name = name;
            this.size = size;
            this.sha = sha;
        }
    }

    private static final Entry[] FILES = {
            new Entry(MODEL, 114202993L, "75635ea3b85a32d00094dcdd61a258aba87c160f7c264c304a7b3ae9d734195e"),
            new Entry(TOKENS, 687L, "6ebb6bb288f20f3ae8d004d3c2ca27697da27c037d75e81a60e2a6a663f95425"),
            new Entry(LEXICON, 5956885L, "7daaab53a181be9885b853a8582bf1838186317e5dadacbcef9c426d6fa0da14"),
    };

    private static final class Slice {
        final String id;
        final long offset;
        final String sha;

        Slice(String id, long offset, String sha) {
            this.id = id;
            this.offset = offset;
            this.sha = sha;
        }
    }

    private static final Slice[] SLICES = {
            new Slice("af_heart", 1566720L, "d583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b"),
            new Slice("am_michael", 8355840L, "1d1f21dd8da39c30705cd4c75d039d265e9bc4a2a93ed09bc9e1b1225eb95ba1"),
    };

    public interface Listener {
        void onProgress(long downloadedBytes, long totalBytes, String currentFile);
    }

    public static final class DownloadException extends Exception {
        public final String code; // NO_SPACE | NETWORK | CHECKSUM | CANCELLED

        public DownloadException(String code, String message, Throwable cause) {
            super(message, cause);
            this.code = code;
        }
    }

    private static final class RangeIgnored extends IOException {
        RangeIgnored() {
            super("server ignored Range");
        }
    }

    private final File dir;
    private CompletableFuture<Void> inflight;
    private volatile boolean downloading;

    // progress accounting (only touched by the downloading thread)
    private long doneBytes;
    private long lastEmit;
    private Listener listener;

    public KokoroModelStore(Context context) {
        this(new File(new File(context.getFilesDir(), "kokoro"), DIR_NAME));
    }

    public KokoroModelStore(File dir) {
        this.dir = dir;
    }

    public File dir() { return dir; }
    public File modelFile() { return new File(dir, MODEL); }
    public File tokensFile() { return new File(dir, TOKENS); }
    public File lexiconFile() { return new File(dir, LEXICON); }
    public File voicesFile() { return new File(dir, VOICES); }

    public boolean isDownloading() { return downloading; }

    public boolean isReady() {
        if (!new File(dir, READY).isFile()) return false;
        for (Entry e : FILES) {
            File f = new File(dir, e.name);
            if (!f.isFile() || f.length() != e.size) return false;
        }
        File v = voicesFile();
        return v.isFile() && v.length() == VOICES_SIZE;
    }

    public long bytesOnDisk() {
        return sizeOf(dir);
    }

    private static long sizeOf(File f) {
        if (f == null || !f.exists()) return 0;
        if (f.isFile()) return f.length();
        long n = 0;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) n += sizeOf(k);
        return n;
    }

    public void delete() {
        deleteRecursive(dir);
    }

    private static void deleteRecursive(File f) {
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteRecursive(k);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }

    // ------------------------------------------------------------------ download

    /** Blocking. A second call while one is running joins it and returns/throws the same outcome. */
    public void download(Listener l, AtomicBoolean cancel) throws DownloadException {
        CompletableFuture<Void> mine;
        boolean owner;
        synchronized (this) {
            if (inflight != null) {
                mine = inflight;
                owner = false;
            } else {
                mine = inflight = new CompletableFuture<>();
                owner = true;
                downloading = true;
            }
        }
        if (owner) {
            try {
                doDownload(l, cancel);
                mine.complete(null);
            } catch (DownloadException e) {
                mine.completeExceptionally(e);
                throw e;
            } catch (RuntimeException e) {
                DownloadException de = new DownloadException("NETWORK", String.valueOf(e.getMessage()), e);
                mine.completeExceptionally(de);
                throw de;
            } finally {
                synchronized (this) {
                    inflight = null;
                    downloading = false;
                }
            }
        } else {
            try {
                mine.get();
            } catch (ExecutionException e) {
                if (e.getCause() instanceof DownloadException) throw (DownloadException) e.getCause();
                throw new DownloadException("NETWORK", String.valueOf(e.getMessage()), e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new DownloadException("CANCELLED", "interrupted", e);
            }
        }
    }

    private void doDownload(Listener l, AtomicBoolean cancel) throws DownloadException {
        listener = l;
        doneBytes = 0;
        lastEmit = 0;
        if (!dir.isDirectory() && !dir.mkdirs()) {
            throw new DownloadException("NO_SPACE", "Cannot create " + dir, null);
        }
        //noinspection ResultOfMethodCallIgnored
        new File(dir, READY).delete();

        long have = 0;
        for (Entry e : FILES) {
            File f = new File(dir, e.name);
            have += f.isFile() && f.length() == e.size ? e.size : new File(dir, e.name + ".part").length();
        }
        long need = Math.max(0, TOTAL_BYTES - have) + 8L * 1024 * 1024;
        if (dir.getUsableSpace() < need) {
            throw new DownloadException("NO_SPACE", "Not enough free storage (need about " + (need / (1024 * 1024)) + " MB)", null);
        }

        for (Entry e : FILES) {
            File f = new File(dir, e.name);
            if (f.isFile() && f.length() == e.size && e.sha.equals(sha256(f, 0, e.size))) {
                doneBytes += e.size;
                emit(e.name, true);
                continue;
            }
            //noinspection ResultOfMethodCallIgnored
            f.delete();
            File part = new File(dir, e.name + ".part");
            try {
                fetch(BASE + e.name, part, e.size, -1, e.name, cancel);
            } catch (RangeIgnored r) {
                throw new DownloadException("NETWORK", "unexpected range response", r);
            }
            verifyAndMove(part, f, e.size, e.sha);
        }
        fetchVoices(cancel);
        emit(VOICES, true);
        try {
            if (!new File(dir, READY).createNewFile() && !new File(dir, READY).isFile()) {
                throw new IOException("cannot write marker");
            }
        } catch (IOException e) {
            throw new DownloadException("NO_SPACE", "Cannot write marker: " + e.getMessage(), e);
        }
    }

    private boolean voicesVerified() {
        File v = voicesFile();
        if (!v.isFile() || v.length() != VOICES_SIZE) return false;
        for (Slice s : SLICES) {
            if (!s.sha.equals(sha256(v, s.offset, SLICE_LEN))) return false;
        }
        return true;
    }

    private void fetchVoices(AtomicBoolean cancel) throws DownloadException {
        if (voicesVerified()) {
            doneBytes += 2 * SLICE_LEN;
            return;
        }
        File voices = voicesFile();
        File assembled = new File(dir, VOICES + ".tmp");
        //noinspection ResultOfMethodCallIgnored
        assembled.delete();
        try (RandomAccessFile raf = new RandomAccessFile(assembled, "rw")) {
            raf.setLength(VOICES_SIZE);
            for (Slice s : SLICES) {
                File part = new File(dir, VOICES + "." + s.id + ".part");
                try {
                    fetch(BASE + VOICES, part, SLICE_LEN, s.offset, VOICES, cancel);
                } catch (RangeIgnored r) {
                    //noinspection ResultOfMethodCallIgnored
                    part.delete();
                    fetchFullVoices(cancel);
                    return;
                }
                if (!s.sha.equals(sha256(part, 0, SLICE_LEN))) {
                    //noinspection ResultOfMethodCallIgnored
                    part.delete();
                    throw new DownloadException("CHECKSUM", "Checksum mismatch for voice " + s.id, null);
                }
                raf.seek(s.offset);
                try (InputStream in = new java.io.FileInputStream(part)) {
                    byte[] buf = new byte[1 << 16];
                    int n;
                    while ((n = in.read(buf)) > 0) raf.write(buf, 0, n);
                }
                //noinspection ResultOfMethodCallIgnored
                part.delete();
            }
        } catch (IOException e) {
            throw new DownloadException(isNoSpace(e) ? "NO_SPACE" : "NETWORK", String.valueOf(e.getMessage()), e);
        }
        //noinspection ResultOfMethodCallIgnored
        voices.delete();
        if (!assembled.renameTo(voices)) throw new DownloadException("NO_SPACE", "Cannot move voices.bin into place", null);
    }

    /** Fallback when the CDN ignores Range: download the whole voices.bin (28 MB) and verify its sha256. */
    private void fetchFullVoices(AtomicBoolean cancel) throws DownloadException {
        File part = new File(dir, VOICES + ".full.part");
        try {
            fetch(BASE + VOICES, part, VOICES_SIZE, -1, VOICES, cancel);
        } catch (RangeIgnored r) {
            throw new DownloadException("NETWORK", "unexpected range response", r);
        }
        File voices = voicesFile();
        //noinspection ResultOfMethodCallIgnored
        voices.delete();
        verifyAndMove(part, voices, VOICES_SIZE, VOICES_FULL_SHA);
        //noinspection ResultOfMethodCallIgnored
        new File(dir, VOICES + ".tmp").delete();
    }

    private void verifyAndMove(File part, File dest, long size, String sha) throws DownloadException {
        if (part.length() != size || !sha.equals(sha256(part, 0, size))) {
            //noinspection ResultOfMethodCallIgnored
            part.delete();
            throw new DownloadException("CHECKSUM", "Checksum mismatch for " + dest.getName(), null);
        }
        //noinspection ResultOfMethodCallIgnored
        dest.delete();
        if (!part.renameTo(dest)) throw new DownloadException("NO_SPACE", "Cannot move " + dest.getName() + " into place", null);
    }

    /**
     * Fetch `expected` bytes into `part`, resuming from its current length. rangeOffset >= 0 requests the slice
     * [rangeOffset, rangeOffset+expected) of the remote file (206 required, RangeIgnored on 200).
     */
    private void fetch(String url, File part, long expected, long rangeOffset, String label, AtomicBoolean cancel)
            throws DownloadException, RangeIgnored {
        long partLen = part.length();
        if (partLen > expected) {
            //noinspection ResultOfMethodCallIgnored
            part.delete();
            partLen = 0;
        }
        if (partLen == expected) {
            doneBytes += expected;
            emit(label, false);
            return;
        }
        HttpURLConnection conn = null;
        try {
            long start = (rangeOffset >= 0 ? rangeOffset : 0) + partLen;
            boolean wantRange = rangeOffset >= 0 || partLen > 0;
            conn = open(url, wantRange ? "bytes=" + start + "-" + ((rangeOffset >= 0 ? rangeOffset : 0) + expected - 1) : null);
            int code = conn.getResponseCode();
            boolean append;
            if (code == 206) {
                append = true;
            } else if (code == 200) {
                if (rangeOffset >= 0) throw new RangeIgnored();
                append = false; // server ignored resume: restart this file
                partLen = 0;
            } else {
                if (code == 416) {
                    //noinspection ResultOfMethodCallIgnored
                    part.delete();
                }
                throw new IOException("HTTP " + code);
            }
            doneBytes += partLen;
            try (InputStream in = conn.getInputStream(); OutputStream out = new FileOutputStream(part, append)) {
                byte[] buf = new byte[1 << 16];
                long got = partLen;
                int n;
                while ((n = in.read(buf)) > 0) {
                    if (cancel != null && cancel.get()) throw new DownloadException("CANCELLED", "Download cancelled", null);
                    long room = expected - got;
                    if (n > room) n = (int) room;
                    if (n <= 0) break;
                    out.write(buf, 0, n);
                    got += n;
                    doneBytes += n;
                    emit(label, false);
                }
            }
            if (part.length() != expected) throw new IOException("Truncated download (" + part.length() + "/" + expected + ")");
        } catch (DownloadException | RangeIgnored e) {
            throw e;
        } catch (IOException e) {
            throw new DownloadException(isNoSpace(e) ? "NO_SPACE" : "NETWORK", String.valueOf(e.getMessage()), e);
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private static boolean isNoSpace(IOException e) {
        String m = String.valueOf(e.getMessage()).toLowerCase();
        return m.contains("enospc") || m.contains("no space");
    }

    private static HttpURLConnection open(String url, String range) throws IOException {
        String current = url;
        for (int hop = 0; hop < 6; hop++) {
            HttpURLConnection c = (HttpURLConnection) new URL(current).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(20000);
            c.setReadTimeout(30000);
            c.setRequestProperty("Accept-Encoding", "identity"); // byte ranges must match the raw file
            c.setRequestProperty("User-Agent", "LazyVocabulary-Android");
            if (range != null) c.setRequestProperty("Range", range);
            int code = c.getResponseCode();
            if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                String loc = c.getHeaderField("Location");
                c.disconnect();
                if (loc == null) throw new IOException("redirect without Location");
                current = new URL(new URL(current), loc).toString();
                continue;
            }
            return c;
        }
        throw new IOException("too many redirects");
    }

    private void emit(String file, boolean force) {
        if (listener == null) return;
        long now = System.currentTimeMillis();
        if (!force && now - lastEmit < 250) return;
        lastEmit = now;
        listener.onProgress(Math.min(doneBytes, TOTAL_BYTES), TOTAL_BYTES, file);
    }

    static String sha256(File f, long offset, long length) {
        try (RandomAccessFile raf = new RandomAccessFile(f, "r")) {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            raf.seek(offset);
            byte[] buf = new byte[1 << 16];
            long left = length;
            while (left > 0) {
                int n = raf.read(buf, 0, (int) Math.min(buf.length, left));
                if (n <= 0) return "";
                md.update(buf, 0, n);
                left -= n;
            }
            StringBuilder sb = new StringBuilder();
            for (byte b : md.digest()) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }
}
