package com.lazy.vocabulary;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import androidx.core.app.NotificationCompat;

import com.lazy.vocabulary.kokoro.KokoroEngine;
import com.lazy.vocabulary.kokoro.KokoroModels;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Foreground service that OWNS the upcoming word queue (FB-52).
 *
 * JS pushes the queue ({@link #setQueue}) and index/playing changes ({@link #applyState}). While the app is in the
 * foreground JS drives the audio exactly as before. When the Activity is paused ({@link #takeOver}) a native watchdog
 * (Handler) is armed after every word JS reports: if JS (WebView timers throttled/frozen with the screen off) does not
 * report the next word in time, the service takes the queue over and runs word -> pause -> word natively, speaking via
 * Kokoro or android.speech.tts.TextToSpeech directly. {@link #handBack} (Activity resumed) gives control back and tells
 * JS which word is current. The notification is a plain app notification (BigTextStyle, FB-53), not a media widget.
 */
public class PlaybackService extends Service {
    static final String CHANNEL_ID = "playback";
    static final int NOTIFICATION_ID = 4711;
    static final String ACTION_START = "com.lazy.vocabulary.playback.START";
    static final String ACTION_UPDATE = "com.lazy.vocabulary.playback.UPDATE";
    static final String ACTION_STOP = "com.lazy.vocabulary.playback.STOP";
    static final String ACTION_PAUSE = "com.lazy.vocabulary.playback.PAUSE";
    static final String ACTION_PLAY = "com.lazy.vocabulary.playback.PLAY";
    static final String ACTION_NEXT = "com.lazy.vocabulary.playback.NEXT";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_TEXT = "text";
    static final String EXTRA_PLAYING = "playing";

    /** Extra time JS gets, after the estimated end of a word + pause, before native takes over. */
    static final long JS_GRACE_MS = 3000;
    /** After a notification Play/Next the app gets this long to answer before native speaks the word itself. */
    static final long ACTION_GRACE_MS = 2500;

    /** One queue entry pushed by JS. */
    static final class Item {
        String word = "";
        String meaning = "";
        String example = "";
        String translation = "";
        String category = "";
        long pauseMs = 1500;
    }

    /** Queue + voice config pushed by JS (immutable snapshot; replaced as a whole). */
    static final class Queue {
        final List<Item> items = new ArrayList<>();
        String engine = "system"; // "kokoro" | "system"
        String voice = "af_heart";
        /** [FB-61] System voice name (android.speech.tts.Voice#getName) the user picked; empty = pick by language only. */
        String voiceName = "";
        float speed = 1.0f;
        float rate = 1.0f;
        String lang = "en-US";
        boolean muted = false;
    }

    /** Set while the service is running. */
    static volatile boolean running = false;
    /** The live service instance (same process as the WebView). */
    private static volatile PlaybackService current;
    /** Queue survives until JS replaces/clears it, so it can arrive before the service exists. */
    private static volatile Queue queue = new Queue();
    private static volatile int queueIndex = 0;
    /** True while the Activity is not resumed (screen off / app in background). */
    private static volatile boolean backgrounded = false;

    private final Handler main = new Handler(Looper.getMainLooper());

    private PowerManager.WakeLock wakeLock;
    private String title = "Lazy Vocabulary";
    private String text = "";
    /** True while words are advancing; false = paused (the card stays so Play can be tapped from the lock screen). */
    private boolean playing = true;
    /** True while native (not JS) is speaking and advancing the queue. */
    private boolean nativeOwner = false;
    /** Bumped whenever playback state changes so late TTS callbacks are ignored. */
    private int token = 0;

    private TextToSpeech systemTts;
    private boolean systemTtsReady = false;
    private Runnable pendingAfterTtsInit;

    private final Runnable watchdog = new Runnable() {
        @Override public void run() { onWatchdog(false); }
    };
    private final Runnable watchdogSpeakCurrent = new Runnable() {
        @Override public void run() { onWatchdog(true); }
    };
    private final Runnable nextWord = new Runnable() {
        @Override public void run() { nativeAdvance(); }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        current = this;
    }

    // ---------------------------------------------------------------- static entry points (JS / Activity)

    /** JS -> native: replace the queue. Safe before the service exists. */
    static void setQueue(final Queue q, final int index) {
        queue = q;
        queueIndex = index;
        final PlaybackService svc = current;
        if (svc == null) return;
        svc.main.post(new Runnable() {
            @Override public void run() { svc.onQueueReplaced(); }
        });
    }

    /** JS -> native state change (word / playing / index). Runs on the main thread; no-op if the service is gone. */
    static void applyState(final String title, final String text, final boolean playing, final int index) {
        final PlaybackService svc = current;
        if (svc == null) return;
        svc.main.post(new Runnable() {
            @Override public void run() { svc.updateState(title, text, playing, index, true); }
        });
    }

    /** Activity paused (screen off / backgrounded): arm the native watchdog. */
    static void takeOver() {
        backgrounded = true;
        final PlaybackService svc = current;
        if (svc == null) return;
        svc.main.post(new Runnable() {
            @Override public void run() { svc.armWatchdog(false); }
        });
    }

    /** Activity resumed: give control back to JS and tell it the current word. */
    static void handBack() {
        backgrounded = false;
        final PlaybackService svc = current;
        if (svc == null) return;
        svc.main.post(new Runnable() {
            @Override public void run() { svc.doHandBack(); }
        });
    }

    static boolean isBackgrounded() { return backgrounded; }

    // ---------------------------------------------------------------- lifecycle

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (intent == null && !PlaybackServicePlugin.isLoaded()) {
            // START_STICKY restart after the whole process died: the queue/WebView is gone, so an orphan
            // notification would be misleading. Only a service-only kill (JS still alive) is resumed.
            shutdown();
            return START_NOT_STICKY;
        }
        if (ACTION_STOP.equals(action)) {
            shutdown();
            return START_NOT_STICKY;
        }
        if (ACTION_PAUSE.equals(action)) {
            // Immediately, natively (works with the WebView frozen), then tell JS so the in-app UI follows.
            setPlayingNative(false);
            PlaybackServicePlugin.emitAction("pause");
            return START_STICKY;
        }
        if (ACTION_PLAY.equals(action)) {
            setPlayingNative(true);
            PlaybackServicePlugin.emitAction("play");
            if (backgrounded) armWatchdog(true); // JS answers within the grace period, else native speaks
            return START_STICKY;
        }
        if (ACTION_NEXT.equals(action)) {
            if (hasQueue()) {
                // The word that should play now; JS (if alive) reports the same index back, native speaks it if not.
                stepIndex(1);
                if (!playing) { playing = true; }
                refreshNotification();
                updateWakeLock();
                emitState(false);
            }
            PlaybackServicePlugin.emitAction("next");
            if (backgrounded && playing) armWatchdog(true);
            return START_STICKY;
        }
        if (intent != null) {
            if (intent.hasExtra(EXTRA_TITLE)) title = intent.getStringExtra(EXTRA_TITLE);
            if (intent.hasExtra(EXTRA_TEXT)) text = intent.getStringExtra(EXTRA_TEXT);
            playing = intent.getBooleanExtra(EXTRA_PLAYING, true);
        }
        ensureChannel();
        Notification n = buildNotification();
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, n);
            }
        } catch (RuntimeException e) {
            // e.g. started while not allowed to be foreground; give up quietly.
            shutdown();
            return START_NOT_STICKY;
        }
        running = true;
        updateWakeLock();
        if (backgrounded) armWatchdog(false);
        // Sticky: if the system kills only the service while the app process lives, it is restarted (FB-31).
        return START_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // Swipe-away from recents: the WebView (and JS) die with the task; do not leave a notification or TTS.
        shutdown();
        super.onTaskRemoved(rootIntent);
    }

    // ---------------------------------------------------------------- state

    private boolean hasQueue() {
        return !queue.items.isEmpty();
    }

    private int size() { return queue.items.size(); }

    private Item currentItem() {
        if (!hasQueue()) return null;
        int i = ((queueIndex % size()) + size()) % size();
        return queue.items.get(i);
    }

    private void stepIndex(int delta) {
        if (!hasQueue()) return;
        queueIndex = (((queueIndex + delta) % size()) + size()) % size();
        Item it = currentItem();
        title = it.word;
        text = it.meaning;
    }

    private void onQueueReplaced() {
        if (!running) return;
        if (nativeOwner) {
            // JS changed the list (learned / skip / daily list). Keep speaking natively from the new index.
            Item it = currentItem();
            if (it != null) { title = it.word; text = it.meaning; }
        } else if (backgrounded && playing) {
            armWatchdog(false);
        }
        refreshNotification();
    }

    private void updateState(String newTitle, String newText, boolean isPlaying, int index, boolean fromJs) {
        if (!running) return;
        boolean wasPlaying = playing;
        if (nativeOwner && fromJs && isPlaying == playing) {
            // Native is driving; ignore stale index/word reports from a thawed WebView.
            return;
        }
        if (newTitle != null) title = newTitle;
        if (newText != null) text = newText;
        if (index >= 0 && hasQueue()) queueIndex = index % size();
        if (isPlaying != wasPlaying) {
            if (!isPlaying) setPlayingNative(false);
            else { playing = true; nativeOwner = false; }
        }
        playing = isPlaying;
        updateWakeLock();
        refreshNotification();
        if (backgrounded && playing) armWatchdog(false); else if (!playing) cancelWatchdogs();
    }

    private void setPlayingNative(boolean isPlaying) {
        playing = isPlaying;
        if (!isPlaying) {
            token++;
            cancelWatchdogs();
            main.removeCallbacks(nextWord);
            stopSpeechNow();
        }
        updateWakeLock();
        refreshNotification();
        emitState(false);
    }

    // ---------------------------------------------------------------- watchdog + native loop

    private long estimateMs(Item it, boolean includePause) {
        if (it == null) return 4000;
        String t = speechText(it);
        float speed = queue.engine.equals("kokoro") ? queue.speed : Math.max(0.5f, queue.rate);
        long speech = (long) ((t.length() * 70L) / Math.max(0.5f, speed)) + 800;
        return speech + (includePause ? it.pauseMs : 0);
    }

    private void armWatchdog(boolean speakCurrent) {
        main.removeCallbacks(watchdog);
        main.removeCallbacks(watchdogSpeakCurrent);
        if (!running || !playing || !hasQueue() || nativeOwner) return;
        if (speakCurrent) {
            main.postDelayed(watchdogSpeakCurrent, ACTION_GRACE_MS);
        } else {
            main.postDelayed(watchdog, estimateMs(currentItem(), true) + JS_GRACE_MS);
        }
    }

    private void cancelWatchdogs() {
        main.removeCallbacks(watchdog);
        main.removeCallbacks(watchdogSpeakCurrent);
    }

    /** JS did not move on in time (frozen WebView): native takes over the queue. */
    private void onWatchdog(boolean speakCurrent) {
        if (!running || !playing || !hasQueue() || !backgrounded) return;
        nativeOwner = true;
        // JS may have been speaking via Kokoro: stop it before native speaks (system-TTS from JS is a separate engine).
        try { KokoroEngine.get(getApplicationContext(), new KokoroModels(getApplicationContext())).stop(); }
        catch (Throwable ignored) { }
        if (!speakCurrent) stepIndex(1);
        speakCurrentNative();
    }

    private void nativeAdvance() {
        if (!running || !playing || !nativeOwner || !hasQueue()) return;
        stepIndex(1);
        speakCurrentNative();
    }

    private void speakCurrentNative() {
        final Item it = currentItem();
        if (it == null) return;
        title = it.word;
        text = it.meaning;
        updateWakeLock();
        refreshNotification();
        emitState(false);
        token++;
        final int myToken = token;
        final long pause = Math.max(300, it.pauseMs);
        final Runnable done = new Runnable() {
            @Override public void run() {
                if (myToken != token || !playing || !nativeOwner) return;
                main.removeCallbacks(nextWord);
                main.postDelayed(nextWord, pause);
            }
        };
        if (queue.muted) {
            // FB-30: muted = no sound, same timing.
            main.postDelayed(done, estimateMs(it, false));
            return;
        }
        String speech = speechText(it);
        if (speech.isEmpty()) { main.post(done); return; }
        if ("kokoro".equals(queue.engine)) {
            if (speakKokoro(speech, myToken, done)) return;
            // [FB-61] Kokoro was chosen but is not ready: never swap in the engine's default voice (that is how the
            // lock screen jumped to an Australian voice). Keep the timing silently; the saved voice is untouched.
            main.postDelayed(done, estimateMs(it, false));
            return;
        }
        speakSystem(speech, myToken, done);
    }

    private boolean speakKokoro(String speech, final int myToken, final Runnable done) {
        try {
            Context ctx = getApplicationContext();
            KokoroModels models = new KokoroModels(ctx);
            if (!models.isReady()) return false;
            int sid = "am_michael".equals(queue.voice) ? 16 : 3;
            KokoroEngine.get(ctx, models).speak(speech, sid, queue.speed, new KokoroEngine.SpeakCallback() {
                @Override public void onDone(boolean interrupted) {
                    if (interrupted) return;
                    main.post(done);
                }
                @Override public void onError(String code, String message, List<String> oov) {
                    main.post(done); // never stall the queue on one bad word
                }
            });
            return true;
        } catch (Throwable t) {
            return false;
        }
    }

    private void speakSystem(final String speech, final int myToken, final Runnable done) {
        final Runnable speakNow = new Runnable() {
            @Override public void run() {
                if (myToken != token || systemTts == null) return;
                try {
                    applySystemVoice();
                    systemTts.setSpeechRate(Math.max(0.5f, Math.min(2.0f, queue.rate)));
                    systemTts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                        @Override public void onStart(String utteranceId) { }
                        @Override public void onDone(String utteranceId) {
                            if (("lv" + myToken).equals(utteranceId)) main.post(done);
                        }
                        @Override public void onError(String utteranceId) {
                            if (("lv" + myToken).equals(utteranceId)) main.post(done);
                        }
                    });
                    int r = systemTts.speak(speech, TextToSpeech.QUEUE_FLUSH, null, "lv" + myToken);
                    if (r != TextToSpeech.SUCCESS) main.postDelayed(done, 1500);
                } catch (RuntimeException e) {
                    main.postDelayed(done, 1500);
                }
            }
        };
        if (systemTts == null) {
            pendingAfterTtsInit = speakNow;
            systemTts = new TextToSpeech(getApplicationContext(), new TextToSpeech.OnInitListener() {
                @Override public void onInit(int status) {
                    main.post(new Runnable() {
                        @Override public void run() {
                            Runnable r = pendingAfterTtsInit;
                            pendingAfterTtsInit = null;
                            if (status != TextToSpeech.SUCCESS || systemTts == null) {
                                systemTtsReady = false;
                                if (r != null) main.postDelayed(done, estimateMsForFallback(speech)); // silent but keeps moving
                                return;
                            }
                            systemTtsReady = true;
                            applySystemVoice();
                            if (r != null) r.run();
                        }
                    });
                }
            });
            return;
        }
        if (!systemTtsReady) { main.postDelayed(done, estimateMsForFallback(speech)); return; }
        speakNow.run();
    }

    /** [FB-61] Speak with the SAME system voice the user picked in the app, not the engine default. */
    private void applySystemVoice() {
        if (systemTts == null) return;
        try {
            String want = queue.voiceName;
            if (want != null && !want.isEmpty()) {
                java.util.Set<android.speech.tts.Voice> all = systemTts.getVoices();
                if (all != null) {
                    for (android.speech.tts.Voice v : all) {
                        if (want.equals(v.getName())) { systemTts.setVoice(v); return; }
                    }
                }
            }
            systemTts.setLanguage(Locale.forLanguageTag(queue.lang));
        } catch (RuntimeException ignored) { }
    }

    private long estimateMsForFallback(String speech) {
        return speech.length() * 70L + 800;
    }

    private void stopSpeechNow() {
        try { KokoroEngine.get(getApplicationContext(), new KokoroModels(getApplicationContext())).stop(); }
        catch (Throwable ignored) { }
        if (systemTts != null) {
            try { systemTts.stop(); } catch (RuntimeException ignored) { }
        }
    }

    private void doHandBack() {
        if (!running) return;
        cancelWatchdogs();
        if (nativeOwner) {
            nativeOwner = false;
            token++;
            main.removeCallbacks(nextWord);
            stopSpeechNow();
            // JS catches up to the word native reached (it may have been frozen for a while).
            emitState(true);
        }
    }

    /** Same cleaning as src/utils/speech/formatSpeechText.ts. */
    static String clean(String s) {
        if (s == null) return "";
        return s.replaceAll("\\[[^\\]]*\\]", " ")
                .replaceAll("\\([^)]*\\)", " ")
                .replaceAll("/[^/]*/", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    static String speechText(Item it) {
        StringBuilder sb = new StringBuilder();
        String[] parts = {clean(it.word), clean(it.meaning), clean(it.example)};
        for (String p : parts) {
            if (p.isEmpty()) continue;
            if (sb.length() > 0) sb.append(". ");
            sb.append(p);
        }
        return sb.toString();
    }

    private void emitState(boolean sync) {
        PlaybackServicePlugin.emitState(queueIndex, playing, nativeOwner, sync);
    }

    // ---------------------------------------------------------------- notification (FB-53)

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("Shown while vocabulary audio plays in the background");
                ch.setShowBadge(false);
                ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(ch);
            }
        }
    }

    private PendingIntent servicePi(String action, int req) {
        Intent i = new Intent(this, PlaybackService.class).setAction(action);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        // Foreground service start from a notification button (works with the screen locked).
        return Build.VERSION.SDK_INT >= 26
                ? PendingIntent.getForegroundService(this, req, i, flags)
                : PendingIntent.getService(this, req, i, flags);
    }

    private String bigText() {
        Item it = currentItem();
        StringBuilder sb = new StringBuilder();
        if (it != null && it.word.equals(title)) {
            append(sb, it.meaning);
            append(sb, it.translation);
            append(sb, it.example.isEmpty() ? "" : "“" + it.example + "”");
            append(sb, it.category);
        } else {
            append(sb, text);
        }
        return sb.toString();
    }

    private static void append(StringBuilder sb, String s) {
        if (s == null || s.trim().isEmpty()) return;
        if (sb.length() > 0) sb.append('\n');
        sb.append(s.trim());
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String big = bigText();
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new NotificationCompat.BigTextStyle().setBigContentTitle(title).bigText(big.isEmpty() ? text : big))
                .setContentIntent(contentPi)
                // Swipe-away of a paused (dismissible) card stops the service cleanly.
                .setDeleteIntent(servicePi(ACTION_STOP, 4))
                .setOngoing(playing)
                .setOnlyAlertOnce(true)
                .setSilent(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        if (playing) {
            b.addAction(android.R.drawable.ic_media_pause, "Pause", servicePi(ACTION_PAUSE, 1));
        } else {
            b.addAction(android.R.drawable.ic_media_play, "Play", servicePi(ACTION_PLAY, 3));
        }
        b.addAction(android.R.drawable.ic_media_next, "Next", servicePi(ACTION_NEXT, 2));
        b.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", servicePi(ACTION_STOP, 5));
        if (Build.VERSION.SDK_INT >= 31) {
            b.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }
        return b.build();
    }

    private void refreshNotification() {
        if (!running) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
    }

    // ---------------------------------------------------------------- wake lock (only while playing)

    private void updateWakeLock() {
        if (playing && running) acquireWakeLock(); else releaseWakeLock();
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lazyvocabulary:playback");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(6 * 60 * 60 * 1000L); // safety cap: 6h
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
    }

    // ---------------------------------------------------------------- shutdown

    private void shutdown() {
        running = false;
        playing = false;
        nativeOwner = false;
        token++;
        cancelWatchdogs();
        main.removeCallbacks(nextWord);
        stopSpeechNow();
        releaseWakeLock();
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        running = false;
        playing = false;
        token++;
        cancelWatchdogs();
        main.removeCallbacks(nextWord);
        stopSpeechNow();
        if (systemTts != null) {
            try { systemTts.shutdown(); } catch (RuntimeException ignored) { }
            systemTts = null;
        }
        if (current == this) current = null;
        releaseWakeLock();
        super.onDestroy();
    }
}
