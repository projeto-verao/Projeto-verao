import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

// ─── Plugin: Injeta versão única no sw.js a cada build ───────────────────────
// Problema: sw.js em /public é copiado sem modificação pelo Vite, então o
// browser vê bytes idênticos a cada deploy e nunca detecta atualização do SW.
// Solução: após o build, substituir o CACHE_NAME pelo timestamp do build.
// Isso garante que o browser sempre detecte um "novo" sw.js após cada deploy.
function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    apply: 'build' as const,
    closeBundle() {
      const outPath = path.resolve(import.meta.dirname, 'dist/public/sw.js');
      if (!fs.existsSync(outPath)) {
        console.warn('[inject-sw-version] sw.js não encontrado em dist/public/');
        return;
      }
      const content = fs.readFileSync(outPath, 'utf-8');
      const buildId = Date.now();
      const updated = content.replace(
        /const CACHE_NAME = 'projeto-verao-[^']+'/,
        `const CACHE_NAME = 'projeto-verao-${buildId}'`
      );
      fs.writeFileSync(outPath, updated);
      console.log(`[inject-sw-version] CACHE_NAME atualizado → projeto-verao-${buildId}`);
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), injectSwVersion()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client/src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: "client",
  build: {
    outDir: "../dist/public",
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: true,
    strictPort: false,
    hmr: {
      clientPort: 443,
    },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
