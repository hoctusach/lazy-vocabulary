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
