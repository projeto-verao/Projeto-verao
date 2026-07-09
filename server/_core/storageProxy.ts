/**
 * storageProxy.ts — Proxy de armazenamento do Projeto Verão.
 *
 * Migrado de Manus Forge/S3 para Firebase Storage.
 * As URLs de arquivos são armazenadas diretamente como URLs públicas do Firebase Storage,
 * portanto este proxy serve apenas como compatibilidade para URLs legadas /manus-storage/*.
 */
import type { Express } from "express";

export function registerStorageProxy(app: Express) {
  // Rota legada /manus-storage/* — retorna 410 Gone para indicar que foi removida.
  // Novas URLs de storage são URLs diretas do Firebase Storage.
  app.get("/manus-storage/*", (_req, res) => {
    res.status(410).json({
      error: "Storage proxy removido. Use URLs diretas do Firebase Storage.",
    });
  });
}
