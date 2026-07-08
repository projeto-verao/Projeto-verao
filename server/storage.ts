/**
 * storage.ts — Módulo de armazenamento do Projeto Verão.
 *
 * Migrado de Manus Forge/S3 para armazenamento local temporário.
 * Para produção, configure o Firebase Storage via Firebase Admin SDK
 * ou use outro serviço de storage configurado via variáveis de ambiente.
 *
 * Estratégia atual:
 * - Imagens em base64 são armazenadas como data URLs (para desenvolvimento)
 * - Em produção, configure FIREBASE_STORAGE_BUCKET para usar Firebase Storage
 */
import { randomUUID } from "crypto";
import { ENV } from "./_core/env";

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Faz upload de um arquivo e retorna a URL de acesso.
 * 
 * Se FIREBASE_STORAGE_BUCKET estiver configurado, usa Firebase Storage.
 * Caso contrário, retorna uma data URL (apenas para desenvolvimento/testes).
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(relKey.replace(/^\/+/, ""));

  // Se Firebase Storage estiver configurado, usar Firebase Admin SDK
  if (ENV.firebaseStorageBucket) {
    try {
      // Importação dinâmica do Firebase Admin SDK (opcional)
      const { initializeApp, getApps, cert } = await import("firebase-admin/app");
      const { getStorage } = await import("firebase-admin/storage");
      
      if (!getApps().length) {
        initializeApp({
          storageBucket: ENV.firebaseStorageBucket,
        });
      }
      
      const bucket = getStorage().bucket();
      const file = bucket.file(key);
      const buffer = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
      
      await file.save(buffer, {
        metadata: { contentType },
        public: true,
      });
      
      const url = `https://storage.googleapis.com/${ENV.firebaseStorageBucket}/${key}`;
      return { key, url };
    } catch (err) {
      console.warn("[Storage] Firebase Admin SDK não disponível, usando fallback:", err);
    }
  }

  // Fallback: retornar data URL (apenas para desenvolvimento)
  const base64 = typeof data === "string" ? data : Buffer.from(data).toString("base64");
  const dataUrl = `data:${contentType};base64,${base64}`;
  
  console.warn("[Storage] Usando data URL como fallback. Configure FIREBASE_STORAGE_BUCKET para produção.");
  return { key, url: dataUrl };
}

/**
 * Retorna a URL de acesso para um arquivo armazenado.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  
  if (ENV.firebaseStorageBucket) {
    const url = `https://storage.googleapis.com/${ENV.firebaseStorageBucket}/${key}`;
    return { key, url };
  }
  
  return { key, url: key };
}
