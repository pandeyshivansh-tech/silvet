/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { validateSupabaseConfig } from "./src/lib/supabase/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createApiHandler, createVerifier } from "./server/api";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_SUPABASE_");
  // Block elevated keys BEFORE Vite can embed them into a browser bundle.
  // Both absent remains valid for a completely offline DemoRepository setup.
  if (env.VITE_SUPABASE_URL || env.VITE_SUPABASE_ANON_KEY) validateSupabaseConfig(env);
  return {
  plugins: [react(), tailwindcss(), {
    name: "silvet-product-api",
    configureServer(server) {
      const api = createApiHandler({ verify: createVerifier(env) });
      server.middlewares.use((req, res, next) => { void api(req, res).then((handled) => { if (!handled) next(); }).catch(next); });
    },
  }],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // Replit and LAN phone testing need the dev server reachable from outside localhost.
    host: true,
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
  },
  };
});
