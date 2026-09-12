import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // capacitor-kiosk-mode is a native Capacitor plugin — not available
      // in the browser/Netlify build. It's imported dynamically with a
      // try/catch guard so externalising it is safe: the catch path runs.
      external: ["capacitor-kiosk-mode"],
    },
  },
});
