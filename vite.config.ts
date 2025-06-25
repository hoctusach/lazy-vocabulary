import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { PluginOption, UserConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const plugins: PluginOption[] = [react()];
  
  // Only load lovable-tagger in development
  if (mode === 'development') {
    try {
      const { componentTagger } = await import("lovable-tagger");
      plugins.push(componentTagger());
    } catch (error) {
      console.warn('Could not load lovable-tagger:', error);
    }
  }
  
  return {
    base: '/', // for custom domain
    server: {
      host: "::",
      port: 8080,
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
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
