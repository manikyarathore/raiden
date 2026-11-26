import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",
  build: { outDir: "dist", chunkSizeWarningLimit: 900 },
  // during development the CTTGS server runs on 8765 (or set it on the sign-in screen)
  server: { host: true, proxy: { "/api": "http://127.0.0.1:8765" } },
  preview: { proxy: { "/api": "http://127.0.0.1:8765" } },
});
