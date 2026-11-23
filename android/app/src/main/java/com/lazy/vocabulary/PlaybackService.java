package com.lazy.vocabulary;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

/**
 * Keeps vocabulary playback running while the screen is off or the app is in the
 * background. The WebView is throttled or suspended there, so the service speaks the
 * queue itself with the system TextToSpeech engine and advances on its own.
 * The web layer hands over the queue when the app goes to the background and takes
 * the position back when the app returns.
 */
public class PlaybackService extends Service {
    public static final String ACTION_START = "com.lazy.vocabulary.action.START";
    public static final String ACTION_PAUSE = "com.lazy.vocabulary.action.PAUSE";
    public static final String ACTION_RESUME = "com.lazy.vocabulary.action.RESUME";
    public static final String ACTION_NEXT = "com.lazy.vocabulary.action.NEXT";
    public static final String ACTION_STOP = "com.lazy.vocabulary.action.STOP";

    private static final String CHANNEL_ID = "lazy_vocabulary_playback";
    private static final int NOTIFICATION_ID = 4711;
    private static final long GAP_MS = 400L;
    private static final long WAKE_LOCK_MS = 6L * 60L * 60L * 1000L;

    /** Queue handed over by the plugin before the service starts. */
    private static final Object LOCK = new Object();
    private static String[] pendingTitles = new String[0];
    private static String[] pendingTexts = new String[0];
    private static float pendingRate = 1.0f;
    private static String pendingLang = "en-US";

    private static volatile boolean running = false;
    private static volatile boolean paused = false;
    private static volatile int advanced = 0;

    public static void setQueue(String[] titles, String[] texts, float rate, String lang) {
        synchronized (LOCK) {
            pendingTitles = titles;
            pendingTexts = texts;
            pendingRate = rate;
            pendingLang = lang;
        }
    }

    public static boolean isRunning() {
        return running;
    }

    public static boolean isPaused() {
        return paused;
    }

    /** How many words the service has moved forward since the queue was handed over. */
    public static int getAdvanced() {
        return advanced;
    }

    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private PowerManager.WakeLock wakeLock;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private boolean pausedByFocus = false;

    private String[] titles = new String[0];
    private String[] texts = new String[0];
    private float rate = 1.0f;
    private String lang = "en-US";
    private int index = 0;
    private int generation = 0;

    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            if (running && !paused) {
                pausedByFocus = true;
                pausePlayback();
            }
        } else if (change == AudioManager.AUDIOFOCUS_GAIN) {
            if (pausedByFocus) {
                pausedByFocus = false;
                resumePlayback();
            }
        }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (action == null) {
            // Restarted by the system without a queue: nothing to resume.
            stopEverything();
            return START_NOT_STICKY;
        }
        switch (action) {
            case ACTION_START:
                startPlayback();
                break;
            case ACTION_PAUSE:
                pausedByFocus = false;
                pausePlayback();
                break;
            case ACTION_RESUME:
                resumePlayback();
                break;
            case ACTION_NEXT:
                moveNext();
                break;
            case ACTION_STOP:
            default:
                stopEverything();
                break;
        }
        return START_NOT_STICKY;
    }

    private void startPlayback() {
        synchronized (LOCK) {
            titles = pendingTitles;
            texts = pendingTexts;
            rate = pendingRate;
            lang = pendingLang;
        }
        if (texts.length == 0) {
            stopEverything();
            return;
        }
        index = 0;
        advanced = 0;
        paused = false;
        running = true;
        generation++;
        showForeground();
        acquireWakeLock();
        requestFocus();
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
            ttsReady = false;
        }
        tts = new TextToSpeech(getApplicationContext(), status -> {
            if (status != TextToSpeech.SUCCESS || tts == null) {
                handler.post(this::stopEverything);
                return;
            }
            Locale locale = Locale.forLanguageTag(lang);
            int result = tts.setLanguage(locale);
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.US);
            }
            tts.setSpeechRate(rate);
            tts.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            );
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {}

                @Override
                public void onDone(String utteranceId) {
                    handler.post(() -> onUtteranceFinished(utteranceId));
                }

                @Override
                public void onError(String utteranceId) {
                    handler.post(() -> onUtteranceFinished(utteranceId));
                }
            });
            ttsReady = true;
            handler.post(this::speakCurrent);
        });
    }

    private void speakCurrent() {
        if (!running || paused || !ttsReady || tts == null || texts.length == 0) return;
        String id = "w" + generation + "-" + advanced;
        tts.speak(texts[index % texts.length], TextToSpeech.QUEUE_FLUSH, null, id);
        updateNotification();
    }

    private void onUtteranceFinished(String utteranceId) {
        if (!running || paused) return;
        if (utteranceId == null || !utteranceId.equals("w" + generation + "-" + advanced)) return;
        advanceIndex();
        final int expected = generation;
        handler.postDelayed(() -> {
            if (expected == generation) speakCurrent();
        }, GAP_MS);
    }

    private void advanceIndex() {
        index = (index + 1) % texts.length;
        advanced += 1;
    }

    private void moveNext() {
        if (!running) return;
        if (tts != null) tts.stop();
        handler.removeCallbacksAndMessages(null);
        advanceIndex();
        if (paused) {
            updateNotification();
        } else {
            speakCurrent();
        }
    }

    private void pausePlayback() {
        if (!running || paused) return;
        paused = true;
        handler.removeCallbacksAndMessages(null);
        if (tts != null) tts.stop();
        updateNotification();
    }

    private void resumePlayback() {
        if (!running || !paused) return;
        paused = false;
        requestFocus();
        speakCurrent();
    }

    private void stopEverything() {
        running = false;
        paused = false;
        generation++;
        handler.removeCallbacksAndMessages(null);
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        ttsReady = false;
        abandonFocus();
        releaseWakeLock();
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacksAndMessages(null);
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        abandonFocus();
        releaseWakeLock();
        super.onDestroy();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // The learner swiped the app away: stop speaking rather than leave a ghost player.
        stopEverything();
        super.onTaskRemoved(rootIntent);
    }

    private void requestFocus() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest == null) {
                focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(
                        new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build()
                    )
                    .setOnAudioFocusChangeListener(focusListener, handler)
                    .build();
            }
            audioManager.requestAudioFocus(focusRequest);
        } else {
            audioManager.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        }
    }

    private void abandonFocus() {
        if (audioManager == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (focusRequest != null) audioManager.abandonAudioFocusRequest(focusRequest);
        } else {
            audioManager.abandonAudioFocus(focusListener);
        }
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LazyVocabulary:playback");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(WAKE_LOCK_MS);
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Vocabulary playback",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Shows while words keep playing in the background.");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);
    }

    private PendingIntent actionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, PlaybackService.class).setAction(action);
        return PendingIntent.getService(
            this,
            requestCode,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }

    private Notification buildNotification() {
        ensureChannel();
        Intent open = new Intent(this, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this,
            0,
            open,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        String title = titles.length > 0 ? titles[index % titles.length] : "Lazy Vocabulary";
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title)
            .setContentText(paused ? "Paused" : "Playing in the background")
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        if (paused) {
            builder.addAction(android.R.drawable.ic_media_play, "Play", actionIntent(ACTION_RESUME, 1));
        } else {
            builder.addAction(android.R.drawable.ic_media_pause, "Pause", actionIntent(ACTION_PAUSE, 2));
        }
        builder.addAction(android.R.drawable.ic_media_next, "Next", actionIntent(ACTION_NEXT, 3));
        builder.addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", actionIntent(ACTION_STOP, 4));
        return builder.build();
    }

    private void showForeground() {
        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void updateNotification() {
        if (!running) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
    }
}
