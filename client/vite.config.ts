import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    proxy: {
      // Keeps audio URLs same-origin in development. This also makes the
      // Network URL work on phones without pointing them at localhost:4010.
      "/audio": {
        target: "http://127.0.0.1:4010",
        changeOrigin: true,
      },
    },
  },
});
