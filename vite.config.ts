import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { PluginOption, UserConfig } from "vite";

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
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-toast'],
          }
        }
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    }
  };
});