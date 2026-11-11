import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react()
  ],

  root: ".",

  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    open: true
  },

  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true
  },

  resolve: {
    alias: {
      "@": "/src"
    }
  },

  build: {
    target: "es2022",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: true,
    minify: "esbuild",
    cssCodeSplit: true,
    reportCompressedSize: true
  },

  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "three",
      "satellite.js",
      "zustand",
      "lucide-react"
    ]
  }
});
