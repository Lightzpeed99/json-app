import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import autoShutdown from "./vite-auto-shutdown.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoShutdown()],
  server: {
    port: 5173,
    open: true, // ← Esto hace que se abra automáticamente
    host: true,
  },
});
