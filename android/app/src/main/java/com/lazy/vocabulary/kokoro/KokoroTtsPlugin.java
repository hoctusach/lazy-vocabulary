package com.lazy.vocabulary.kokoro;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "KokoroTts")
public class KokoroTtsPlugin extends Plugin {
    private KokoroModelStore store;
    private KokoroEngine engine;
    private final ExecutorService io = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "kokoro-io");
        t.setDaemon(true);
        return t;
    });
    private volatile AtomicBoolean cancelFlag = new AtomicBoolean(false);

    @Override
    public void load() {
        store = new KokoroModelStore(getContext());
        engine = KokoroEngine.get(getContext(), store);
    }

    private JSObject status() {
        JSObject o = new JSObject();
        o.put("supported", true);
        o.put("downloaded", store.isReady());
        o.put("downloading", store.isDownloading());
        o.put("bytesOnDisk", store.bytesOnDisk());
        o.put("downloadSize", KokoroModelStore.TOTAL_BYTES);
        o.put("version", KokoroModelStore.VERSION);
        return o;
    }

    @PluginMethod
    public void getStatus(final PluginCall call) {
        io.execute(() -> call.resolve(status()));
    }

    @PluginMethod
    public void download(final PluginCall call) {
        final AtomicBoolean cancel = new AtomicBoolean(false);
        cancelFlag = cancel;
        io.execute(() -> {
            state("downloading", null);
            try {
                store.download((done, total, file) -> {
                    JSObject p = new JSObject();
                    p.put("downloaded", done);
                    p.put("total", total);
                    p.put("file", file);
                    notifyListeners("downloadProgress", p);
                }, cancel);
                state("done", null);
                call.resolve(status());
            } catch (KokoroModelStore.DownloadException e) {
                state("error", e.code);
                call.reject(e.getMessage(), e.code);
            } catch (Throwable t) {
                state("error", "NETWORK");
                call.reject(String.valueOf(t.getMessage()), "NETWORK");
            }
        });
    }

    private void state(String state, String error) {
        JSObject s = new JSObject();
        s.put("state", state);
        if (error != null) s.put("error", error);
        notifyListeners("downloadState", s);
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        cancelFlag.set(true);
        call.resolve();
    }

    @PluginMethod
    public void deleteModel(final PluginCall call) {
        io.execute(() -> {
            cancelFlag.set(true);
            engine.releaseBlocking();
            store.delete();
            call.resolve(status());
        });
    }

    @PluginMethod
    public void speak(final PluginCall call) {
        final String text = call.getString("text", "");
        final String voice = call.getString("voice", "af_heart");
        final Double speedD = call.getDouble("speed", 1.0);
        final float speed = (float) Math.max(0.5, Math.min(2.0, speedD == null ? 1.0 : speedD));
        final int sid = "am_michael".equals(voice) ? 16 : 3;
        if (!store.isReady()) {
            call.reject("Kokoro voices are not downloaded", "NOT_DOWNLOADED");
            return;
        }
        engine.speak(text, sid, speed, new KokoroEngine.SpeakCallback() {
            @Override
            public void onDone(boolean interrupted) {
                JSObject o = new JSObject();
                o.put("interrupted", interrupted);
                call.resolve(o);
            }

            @Override
            public void onError(String code, String message, List<String> oov) {
                JSObject d = new JSObject();
                if (oov != null) {
                    JSArray arr = new JSArray();
                    for (String w : oov) arr.put(w);
                    d.put("oov", arr);
                }
                call.reject(message, code, null, d);
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        engine.stop();
        call.resolve();
    }

    @PluginMethod
    public void release(PluginCall call) {
        engine.release();
        call.resolve();
    }
}
