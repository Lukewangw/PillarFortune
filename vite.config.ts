import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `vite build --mode pages` produces the GitHub Pages build served from /PillarFortune/.
// The default build is served by the Cloudflare Worker at the domain root.
export default defineConfig(({ mode }) => ({
  base: mode === "pages" ? "/PillarFortune/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": "http://127.0.0.1:8787" },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "worker/**/*.test.ts", "ml/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    environment: "node",
  },
}));
