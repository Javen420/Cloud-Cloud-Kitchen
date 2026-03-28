import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const REPO_ROOT = path.resolve(__dirname, "../..");

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, REPO_ROOT, "");
  return {
    plugins: [react()],
    envDir: REPO_ROOT,
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      port: 5175,
      proxy: {
        "/api": {
          // Host dev: localhost:8000 (Kong). Docker UI service: set VITE_API_BASE_URL=http://kong:8000 in compose.
          target:
            process.env.VITE_API_BASE_URL ||
            env.VITE_API_BASE_URL ||
            "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
