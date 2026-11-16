package com.lazy.vocabulary;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PlaybackServicePlugin.class);
        super.onCreate(savedInstanceState);
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
