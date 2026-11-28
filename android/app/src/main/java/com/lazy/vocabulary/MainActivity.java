package com.lazy.vocabulary;

import android.content.Intent;
import android.os.Bundle;

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

    /**
     * FB-52: no WebView-timer workaround. When the Activity leaves the foreground the playback service arms its native
     * watchdog and, if JS stops reporting words (throttled/frozen WebView), runs the queue itself.
     */
    @Override
    public void onPause() {
        super.onPause();
        PlaybackService.takeOver();
    }

    @Override
    public void onResume() {
        super.onResume();
        PlaybackService.handBack();
    }

    @Override
    public void onDestroy() {
        if (isFinishing() && PlaybackService.running) {
            // The WebView (and so the playback) dies with the activity: do not leave an orphan notification.
            try { startService(new Intent(this, PlaybackService.class).setAction(PlaybackService.ACTION_DISMISS)); }
            catch (RuntimeException ignored) { }
        }
        super.onDestroy();
    }
}
