package com.lazy.vocabulary;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.lazy.vocabulary.kokoro.KokoroEngine;
import com.lazy.vocabulary.kokoro.KokoroTtsPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlaybackServicePlugin.class);
        registerPlugin(KokoroTtsPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        KokoroEngine.trim(level); // no-op while speaking, so screen-off playback keeps working
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        KokoroEngine.trim(android.content.ComponentCallbacks2.TRIM_MEMORY_COMPLETE);
    }

    /** While backgrounded with the playback service active, re-resume the WebView so JS timers never stay frozen. */
    private static final long HEARTBEAT_MS = 3000;
    private final Handler heartbeat = new Handler(Looper.getMainLooper());
    private boolean heartbeatOn = false;
    private final Runnable heartbeatTick = new Runnable() {
        @Override
        public void run() {
            keepWebViewRunningIfPlaying();
            if (heartbeatOn) heartbeat.postDelayed(this, HEARTBEAT_MS);
        }
    };

    @Override
    public void onPause() {
        super.onPause(); // Capacitor pauses the WebView and its timers here
        keepWebViewRunningIfPlaying();
        startHeartbeat(); // also covers the service not being up yet at this exact moment
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewRunningIfPlaying();
    }

    @Override
    public void onResume() {
        super.onResume();
        stopHeartbeat();
    }

    @Override
    public void onDestroy() {
        stopHeartbeat();
        if (isFinishing() && PlaybackService.running) {
            // The WebView (and so the playback) dies with the activity: do not leave an orphan notification.
            try { startService(new Intent(this, PlaybackService.class).setAction(PlaybackService.ACTION_STOP)); }
            catch (RuntimeException ignored) { }
        }
        super.onDestroy();
    }

    private void startHeartbeat() {
        if (heartbeatOn) return;
        heartbeatOn = true;
        heartbeat.postDelayed(heartbeatTick, HEARTBEAT_MS);
    }

    private void stopHeartbeat() {
        heartbeatOn = false;
        heartbeat.removeCallbacks(heartbeatTick);
    }

    /** While the playback service is active, undo the WebView pause so JS timers/TTS callbacks keep firing. */
    private void keepWebViewRunningIfPlaying() {
        if (!PlaybackService.running || getBridge() == null) return;
        WebView wv = getBridge().getWebView();
        if (wv != null) {
            wv.onResume();
            wv.resumeTimers();
        }
    }
}
