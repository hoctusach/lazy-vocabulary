package com.lazy.vocabulary;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "PlaybackService",
        permissions = {@Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})}
)
public class PlaybackServicePlugin extends Plugin {
    private static PlaybackServicePlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    /** True while the plugin (hence the WebView/JS) is alive in this process. */
    static boolean isLoaded() { return instance != null; }

    static void emitAction(String action) {
        PlaybackServicePlugin p = instance;
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        p.notifyListeners("action", data);
    }

    /** Native -> JS: current word index / playing / who is driving. sync=true on hand-back (JS should jump to index). */
    static void emitState(int index, boolean playing, boolean nativeOwner, boolean sync) {
        PlaybackServicePlugin p = instance;
        if (p == null) return;
        JSObject data = new JSObject();
        data.put("index", index);
        data.put("playing", playing);
        data.put("native", nativeOwner);
        data.put("sync", sync);
        p.notifyListeners("state", data);
    }

    private void send(String action, PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, PlaybackService.class).setAction(action);
        if (call != null) {
            String title = call.getString("title");
            String text = call.getString("text");
            Boolean playing = call.getBoolean("playing", true);
            if (title != null) i.putExtra(PlaybackService.EXTRA_TITLE, title);
            if (text != null) i.putExtra(PlaybackService.EXTRA_TEXT, text);
            i.putExtra(PlaybackService.EXTRA_PLAYING, playing == null || playing);
        }
        try {
            if (PlaybackService.ACTION_STOP.equals(action)) {
                if (PlaybackService.running) ctx.startService(i);
            } else if (Build.VERSION.SDK_INT >= 26) {
                ctx.startForegroundService(i);
            } else {
                ctx.startService(i);
            }
        } catch (RuntimeException e) {
            if (call != null) { call.reject("Could not start playback service: " + e.getMessage()); return; }
        }
        if (call != null) call.resolve();
    }

    @PluginMethod
    public void start(PluginCall call) { send(PlaybackService.ACTION_START, call); }

    @PluginMethod
    public void update(PluginCall call) {
        // Only refresh an already-running service; don't resurrect it after stop().
        if (!PlaybackService.running) { call.resolve(); return; }
        // Direct call into the running service (same process): works with the app backgrounded / screen off, no
        // start-service restrictions (the service is running, so its instance exists).
        Boolean playing = call.getBoolean("playing", true);
        Integer index = call.getInt("index", -1);
        PlaybackService.applyState(call.getString("title"), call.getString("text"), playing == null || playing,
                index == null ? -1 : index);
        call.resolve();
    }

    /**
     * FB-52: JS hands the service the upcoming words ({word, meaning, example, translation, category, pauseMs}) and the
     * voice config so native can keep going (Handler-driven pause + native Kokoro / TextToSpeech) with the WebView frozen.
     */
    @PluginMethod
    public void setQueue(PluginCall call) {
        PlaybackService.Queue q = new PlaybackService.Queue();
        JSArray arr = call.getArray("items");
        if (arr != null) {
            for (int i = 0; i < arr.length() && i < 400; i++) {
                try {
                    org.json.JSONObject o = arr.getJSONObject(i);
                    PlaybackService.Item it = new PlaybackService.Item();
                    it.word = o.optString("word", "");
                    it.meaning = o.optString("meaning", "");
                    it.example = o.optString("example", "");
                    it.translation = o.optString("translation", "");
                    it.category = o.optString("category", "");
                    it.categoryLabel = o.optString("categoryLabel", "");
                    it.pauseMs = o.optLong("pauseMs", 1500);
                    if (!it.word.isEmpty()) q.items.add(it);
                } catch (org.json.JSONException ignored) { }
            }
        }
        String engine = call.getString("engine", "system");
        q.engine = "kokoro".equals(engine) ? "kokoro" : "system";
        q.voice = call.getString("voice", "af_heart");
        String voiceName = call.getString("voiceName", "");
        q.voiceName = voiceName == null ? "" : voiceName;
        Double speed = call.getDouble("speed", 1.0);
        q.speed = (float) Math.max(0.5, Math.min(2.0, speed == null ? 1.0 : speed));
        Double rate = call.getDouble("rate", 1.0);
        q.rate = (float) Math.max(0.5, Math.min(2.0, rate == null ? 1.0 : rate));
        q.lang = call.getString("lang", "en-US");
        Boolean muted = call.getBoolean("muted", false);
        q.muted = muted != null && muted;
        Integer index = call.getInt("index", 0);
        PlaybackService.setQueue(q, index == null ? 0 : index);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) { send(PlaybackService.ACTION_STOP, call); }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED) {
            JSObject r = new JSObject();
            r.put("granted", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAlias("notifications", call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
        call.resolve(r);
    }
}
