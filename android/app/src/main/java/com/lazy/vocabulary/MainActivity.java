package com.lazy.vocabulary;

import android.os.Bundle;
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

    @Override
    public void onPause() {
        super.onPause(); // Capacitor pauses the WebView and its timers here
        keepWebViewRunningIfPlaying();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewRunningIfPlaying();
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
