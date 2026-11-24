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
import android.os.IBinder;
import android.graphics.drawable.Icon;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;

/** Foreground (mediaPlayback) service that keeps the app process, WebView and TTS alive in the background. */
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

    /** Set while the service is running so MainActivity can keep the WebView alive. */
    static volatile boolean running = false;
    /** The live service instance (same process as the WebView), so JS state changes need no start-service intent. */
    private static volatile PlaybackService current;
    private final Handler main = new Handler(Looper.getMainLooper());

    private PowerManager.WakeLock wakeLock;
    private MediaSession mediaSession;
    private String title = "Lazy Vocabulary";
    private String text = "";
    /** True while words are advancing; false = paused (the card stays so Play can be tapped from the lock screen). */
    private boolean playing = true;

    @Override
    public void onCreate() {
        super.onCreate();
        current = this;
    }

    /** JS -> native state change (word / playing). Runs on the main thread; no-op if the service is gone. */
    static void applyState(final String title, final String text, final boolean playing) {
        final PlaybackService svc = current;
        if (svc == null) return;
        svc.main.post(new Runnable() {
            @Override public void run() { svc.updateState(title, text, playing); }
        });
    }

    private void updateState(String newTitle, String newText, boolean isPlaying) {
        if (!running) return;
        if (newTitle != null) title = newTitle;
        if (newText != null) text = newText;
        playing = isPlaying;
        ensureMediaSession();
        if (playing) acquireWakeLock(); else releaseWakeLock();
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification());
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (intent == null && !PlaybackServicePlugin.isLoaded()) {
            // START_STICKY restart after the whole process died: the WebView (and the playback) is gone, so an
            // orphan notification would be misleading. Only a service-only kill (JS still alive) is resumed.
            shutdown();
            return START_NOT_STICKY;
        }
        if (ACTION_STOP.equals(action)) {
            shutdown();
            return START_NOT_STICKY;
        }
        if (ACTION_PAUSE.equals(action) || ACTION_PLAY.equals(action) || ACTION_NEXT.equals(action)) {
            // Notification buttons: tell the app (JS owns the player). JS answers with a state update that flips the card.
            PlaybackServicePlugin.emitAction(ACTION_PAUSE.equals(action) ? "pause" : ACTION_PLAY.equals(action) ? "play" : "next");
            return START_STICKY;
        }
        if (intent != null) {
            if (intent.hasExtra(EXTRA_TITLE)) title = intent.getStringExtra(EXTRA_TITLE);
            if (intent.hasExtra(EXTRA_TEXT)) text = intent.getStringExtra(EXTRA_TEXT);
            playing = intent.getBooleanExtra(EXTRA_PLAYING, true);
        }
        ensureChannel();
        ensureMediaSession();
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
        if (playing) acquireWakeLock(); else releaseWakeLock();
        // Sticky: if the system kills only the service while the app process lives, it is restarted (FB-31).
        return START_STICKY;
    }

    /** An active media session with a PLAYING state: Android 13/14+ treat a mediaPlayback FGS without one as idle. */
    private void ensureMediaSession() {
        if (mediaSession == null) {
            mediaSession = new MediaSession(this, "LazyVocabularyPlayback");
            mediaSession.setCallback(new MediaSession.Callback() {
                @Override public void onPlay() { PlaybackServicePlugin.emitAction("play"); }
                @Override public void onPause() { PlaybackServicePlugin.emitAction("pause"); }
                @Override public void onSkipToNext() { PlaybackServicePlugin.emitAction("next"); }
            });
        }
        // Now-playing card (lock screen / shade): title = the current word, subtitle = its meaning.
        mediaSession.setMetadata(new MediaMetadata.Builder()
                .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                .putString(MediaMetadata.METADATA_KEY_ARTIST, text)
                .putString(MediaMetadata.METADATA_KEY_ALBUM, "Lazy Vocabulary")
                .build());
        PlaybackState state = new PlaybackState.Builder()
                .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                        | PlaybackState.ACTION_SKIP_TO_NEXT)
                .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                        PlaybackState.PLAYBACK_POSITION_UNKNOWN, playing ? 1.0f : 0.0f)
                .build();
        mediaSession.setPlaybackState(state);
        if (!mediaSession.isActive()) mediaSession.setActive(true);
    }

    private void releaseMediaSession() {
        if (mediaSession == null) return;
        try { mediaSession.setActive(false); mediaSession.release(); } catch (RuntimeException ignored) { }
        mediaSession = null;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Playback", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("Shown while vocabulary audio plays in the background");
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);
            }
        }
    }

    private PendingIntent servicePi(String action, int req) {
        Intent i = new Intent(this, PlaybackService.class).setAction(action);
        return PendingIntent.getService(this, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification buildNotification() {
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(this, CHANNEL_ID)
                : new Notification.Builder(this);
        b.setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(contentPi)
                .setOngoing(playing)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_TRANSPORT)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .addAction(playing
                        ? new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_media_pause), "Pause", servicePi(ACTION_PAUSE, 1)).build()
                        : new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_media_play), "Play", servicePi(ACTION_PLAY, 3)).build())
                .addAction(new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_media_next), "Next", servicePi(ACTION_NEXT, 2)).build());
        if (mediaSession != null) {
            b.setStyle(new Notification.MediaStyle()
                    .setMediaSession(mediaSession.getSessionToken())
                    .setShowActionsInCompactView(0, 1));
        }
        if (Build.VERSION.SDK_INT >= 31) {
            b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        }
        return b.build();
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

    private void shutdown() {
        running = false;
        releaseWakeLock();
        releaseMediaSession();
        stopForeground(true);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        running = false;
        if (current == this) current = null;
        releaseWakeLock();
        releaseMediaSession();
        super.onDestroy();
    }
}
