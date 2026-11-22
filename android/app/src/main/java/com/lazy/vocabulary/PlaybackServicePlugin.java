package com.lazy.vocabulary;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

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

    private void send(String action, PluginCall call) {
        Context ctx = getContext();
        Intent i = new Intent(ctx, PlaybackService.class).setAction(action);
        if (call != null) {
            String title = call.getString("title");
            String text = call.getString("text");
            if (title != null) i.putExtra(PlaybackService.EXTRA_TITLE, title);
            if (text != null) i.putExtra(PlaybackService.EXTRA_TEXT, text);
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
        send(PlaybackService.ACTION_UPDATE, call);
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
