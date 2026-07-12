/**
 * storage.ts — Módulo de armazenamento do Projeto Verão.
 *
 * Migrado para Cloudinary.
 *
 * Estratégia atual:
 * - O frontend faz upload direto para o Cloudinary via ImageService/CloudinaryService.
 * - Este módulo no servidor é mantido apenas para compatibilidade com geração de imagens por IA
 *   que ainda retornam Data URLs temporárias.
 */
import { randomUUID } from "crypto";

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Faz upload de um arquivo e retorna a URL de acesso.
 * 
 * Atualmente retorna uma data URL para compatibilidade com o fluxo existente.
 * Para produção, o upload de imagens de usuários deve ser feito diretamente pelo cliente
 * usando o CloudinaryService no frontend.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(relKey.replace(/^\/+/, ""));

  // Retornar data URL (compatível com desenvolvimento e testes)
  const base64 = typeof data === "string" ? data : Buffer.from(data).toString("base64");
  const dataUrl = `data:${contentType};base64,${base64}`;
  
  return { key, url: dataUrl };
}

/**
 * Retorna a URL de acesso para um arquivo armazenado.
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  return { key, url: key };
}
