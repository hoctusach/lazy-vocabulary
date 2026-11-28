/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { readFileSync } from "fs";
import type { PluginOption, UserConfig } from "vite";

// The footer version comes from package.json itself, never from npm_package_version (unset outside npm
// scripts, and it can be stale/lockfile-derived). FB-35 follow-up: footer showed v1.0.0.
function readAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "";
  } catch {
    return process.env.npm_package_version ?? "";
  }
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const plugins: PluginOption[] = [react()];

  if (mode === 'development') {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger());
    } catch (error) {
      console.warn('Could not load lovable-tagger:', error);
    }
  }

  return {
    // No custom base needed when serving at root
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // json2csv@6 alpha publishes a "module" path that is not in the package.
        // Import only the parser so the browser bundle does not load Node streams.
        "@json2csv-parser": path.resolve(__dirname, "node_modules/json2csv/lib/JSON2CSVParser.js"),
      },
    },
    build: {
      // output into `docs` for GitHub Pages
      outDir: "docs",
      target: 'es2015',
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // [FB-84] The 1.3 MB built-in vocabulary JSON gets its own chunk (cached separately, not in the entry chunk).
            if (id.includes('/src/data/defaultVocabulary.json')) return 'vocab-data';
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'vendor';
            if (/node_modules\/@radix-ui\/react-(dialog|toast)\//.test(id)) return 'ui';
            return undefined;
          }
        }
      }
    },
    // Strip noisy debug logging from production bundles (web and Android app).
    // The vocabulary pipeline logs per word; leaving it in made app start-up slow.
    esbuild: mode === 'production'
      ? { pure: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.group', 'console.groupCollapsed', 'console.groupEnd'] }
      : undefined,
    test: { setupFiles: [path.resolve(__dirname, "tests/setup/xlsx.ts")] },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __APP_VERSION__: JSON.stringify(readAppVersion())
    }
  };
});