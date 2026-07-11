import { storage } from "@/lib/firebase";
import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { auth } from "@/lib/firebase";

/**
 * Redimensiona uma imagem para caber no Firestore (limite ~1MB por doc)
 * e para envio eficiente à IA.
 */
export function resizeImage(file: File | Blob, maxSize = 720, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas não suportado"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Converte uma Data URL (base64) para Blob.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

interface UploadOptions {
  timeoutMs?: number;
  retries?: number;
  onProgress?: (progress: number) => void;
}

export const imageService = {
  resizeImage,
  
  /**
   * Faz upload de uma imagem (Data URL) para o Firebase Storage com retry e timeout.
   * @param dataUrl - Data URL da imagem (base64)
   * @param path - Caminho no Firebase Storage (ex: "users/{uid}/profile/avatar.jpg")
   * @param options - Opções de upload (timeout, retries, onProgress)
   * @returns URL de download pública, ou null em caso de falha
   */
  uploadImage: async (
    dataUrl: string,
    path: string,
    options?: UploadOptions
  ): Promise<string | null> => {
    const { timeoutMs = 30000, retries = 3, onProgress } = options || {};

    if (!auth.currentUser) {
      console.error("[ImageService] Usuário não autenticado para upload.");
      return null;
    }

    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`[ImageService] Tentativa ${i + 1} de ${retries + 1} para upload de ${path}`);
        const blob = await dataUrlToBlob(dataUrl);
        const fileName = path.split("/").pop() || "file.jpg";
        const file = new File([blob], fileName, { type: blob.type });

        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        const uploadPromise = new Promise<string>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              onProgress?.(progress);
              console.log(`[ImageService] Upload ${path}: ${progress.toFixed(0)}%`);
            },
            (error) => {
              console.error(`[ImageService] Erro no upload de ${path}:`, error);
              reject(error);
            },
            async () => {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadUrl);
            }
          );
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => {
            uploadTask.cancel(); // Tenta cancelar o upload ativo
            reject(new Error(`Upload timeout após ${timeoutMs / 1000}s`));
          }, timeoutMs)
        );

        return await Promise.race([uploadPromise, timeoutPromise]);
      } catch (err: any) {
        console.error(`[ImageService] Falha na tentativa ${i + 1} de upload de ${path}:`, err);
        if (i === retries) {
          console.error(`[ImageService] Todas as tentativas de upload de ${path} falharam.`);
          return null;
        }
        // Pequeno delay antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return null;
  },

  /**
   * Faz upload de uma DataURL (base64) para o Firebase Storage.
   */
  async uploadDataUrl(dataUrl: string, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    const blob = await dataUrlToBlob(dataUrl);
    
    const uploadTask = uploadBytesResumable(storageRef, blob);
    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        null,
        (error) => reject(error),
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        }
      );
    });
  }
};
