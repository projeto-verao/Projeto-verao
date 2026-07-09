/**
 * useFirebaseStorage.ts — Hook para upload de arquivos via Firebase Storage.
 * 
 * Permite fazer upload de imagens diretamente para o Firebase Storage
 * e obter URLs públicas para armazenar no banco de dados.
 */
import { useState } from "react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth } from "@/lib/firebase";

export function useFirebaseStorage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Faz upload de um arquivo para o Firebase Storage.
   * @param file Arquivo a ser enviado
   * @param path Caminho no Storage (ex: "profiles/user123/photo.jpg")
   * @returns URL pública do arquivo
   */
  const uploadFile = async (file: File, path: string): Promise<string> => {
    if (!auth.currentUser) {
      throw new Error("Usuário não autenticado");
    }

    try {
      setUploading(true);
      setError(null);

      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      console.log("[useFirebaseStorage] Upload bem-sucedido:", downloadUrl);
      return downloadUrl;
    } catch (err: any) {
      const errorMsg = err.message || "Erro ao fazer upload";
      setError(errorMsg);
      console.error("[useFirebaseStorage] Erro:", err);
      throw new Error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  /**
   * Converte um Blob/File para URL de download do Firebase Storage.
   * Atalho para uploadFile quando você já tem um Blob.
   */
  const uploadBlob = async (blob: Blob, path: string): Promise<string> => {
    const file = new File([blob], path.split("/").pop() || "file", {
      type: blob.type,
    });
    return uploadFile(file, path);
  };

  /**
   * Converte uma Data URL (base64) para arquivo e faz upload.
   */
  const uploadFromDataUrl = async (
    dataUrl: string,
    path: string
  ): Promise<string> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return uploadBlob(blob, path);
  };

  return {
    uploadFile,
    uploadBlob,
    uploadFromDataUrl,
    uploading,
    error,
  };
}
