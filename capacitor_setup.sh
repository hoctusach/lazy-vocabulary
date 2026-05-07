#!/bin/bash
# This script installs and initializes Capacitor for the project.

echo "--- Installing Capacitor dependencies ---"
# Using npm as it's the standard for the project's lock file.
npm install @capacitor/cli --save-dev
npm install @capacitor/android @capacitor/ios

echo "--- Initializing Capacitor ---"
# This creates capacitor.config.ts. The web-dir must match your build output directory.
npx cap init "Lazy Vocabulary" "com.lazyvocabulary.app" --web-dir "dist"

echo "--- Adding native platforms ---"
# This creates the native android/ and ios/ project folders.
npx cap add android
npx cap add ios

echo "--- Capacitor setup is complete! ---"
