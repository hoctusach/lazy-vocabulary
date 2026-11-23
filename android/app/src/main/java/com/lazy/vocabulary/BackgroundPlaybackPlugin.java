package com.lazy.vocabulary;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONException;
import org.json.JSONObject;

/** Bridge between the web player and the native playback service. */
@CapacitorPlugin(
    name = "BackgroundPlayback",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class BackgroundPlaybackPlugin extends Plugin {
    private static final int MAX_ITEMS = 500;

    /**
     * start({ items: [{ title, text }], rate, lang })
     * Items start at the word the learner is on; the service loops through them.
     */
    @PluginMethod
    public void start(PluginCall call) {
        JSArray items = call.getArray("items");
        if (items == null || items.length() == 0) {
            call.reject("items is required");
            return;
        }
        int count = Math.min(items.length(), MAX_ITEMS);
        String[] titles = new String[count];
        String[] texts = new String[count];
        try {
            for (int i = 0; i < count; i++) {
                JSONObject item = items.getJSONObject(i);
                titles[i] = item.optString("title", "");
                texts[i] = item.optString("text", "");
            }
        } catch (JSONException error) {
            call.reject("items are malformed");
            return;
        }
        float rate = call.getFloat("rate", 1.0f);
        if (rate < 0.3f) rate = 0.3f;
        if (rate > 3.0f) rate = 3.0f;
        String lang = call.getString("lang", "en-US");
        PlaybackService.setQueue(titles, texts, rate, lang);
        Context context = getContext();
        Intent intent = new Intent(context, PlaybackService.class).setAction(PlaybackService.ACTION_START);
        try {
            ContextCompat.startForegroundService(context, intent);
        } catch (RuntimeException error) {
            call.reject("Could not start background playback: " + error.getMessage());
            return;
        }
        call.resolve();
    }

    /** stop() -> { running, paused, advanced }. Reads the position, then stops the service. */
    @PluginMethod
    public void stop(PluginCall call) {
        JSObject result = new JSObject();
        result.put("running", PlaybackService.isRunning());
        result.put("paused", PlaybackService.isPaused());
        result.put("advanced", PlaybackService.getAdvanced());
        if (PlaybackService.isRunning()) {
            Context context = getContext();
            Intent intent = new Intent(context, PlaybackService.class).setAction(PlaybackService.ACTION_STOP);
            context.startService(intent);
        }
        call.resolve(result);
    }

    /** Ask for the notification permission (Android 13+) so the player controls are visible. */
    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
            || getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("notifications", call, "notificationsCallback");
    }

    @PermissionCallback
    private void notificationsCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(result);
    }
}
