# R8 / resource shrinking for release builds (minifyEnabled + shrinkResources).
# Keeps Capacitor's reflective plugin lookup, AdMob/UMP, and WebView bridges.

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
-keep class com.lazy.vocabulary.** { *; }

# Capacitor core and plugins (methods are discovered by annotation)
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.plugins.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# AdMob, UMP and the Capacitor AdMob plugin
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }
-keep class com.google.android.ump.** { *; }
-keep class com.getcapacitor.community.admob.** { *; }
-dontwarn com.google.android.gms.**

# Cordova compatibility layer pulled in by Capacitor
-keep public class * extends org.apache.cordova.** { *; }
-keep class org.apache.cordova.** { *; }

# @capacitor-community/text-to-speech (extends Plugin, already covered above; explicit for safety)
-keep class com.getcapacitor.community.tts.** { *; }

# @capgo/native-purchases + Google Play Billing (billing ships consumer rules; keep plugin + client API)
-keep class ee.forgr.nativepurchases.** { *; }
-keep class com.android.billingclient.api.** { *; }
-dontwarn com.android.billingclient.**
-dontwarn com.google.android.ump.**
-dontwarn com.google.android.gms.internal.ads.**
-dontwarn org.apache.cordova.**

# sherpa-onnx (Kokoro on-device TTS): the JNI layer reflects on Kotlin fields/classes
-keep class com.k2fsa.sherpa.onnx.** { *; }
