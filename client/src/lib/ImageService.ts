import { cloudinaryService } from "./cloudinary";

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
  folder?: string;
}

export const imageService = {
  resizeImage,
  
  /**
   * Faz upload de uma imagem (Data URL) para o Cloudinary com retry e timeout.
   * @param dataUrl - Data URL da imagem (base64)
   * @param path - Caminho original (agora usado para determinar a pasta no Cloudinary)
   * @param options - Opções de upload (timeout, retries, onProgress, folder)
   * @returns URL de download pública, ou null em caso de falha
   */
  uploadImage: async (
    dataUrl: string,
    path: string,
    options?: UploadOptions
  ): Promise<string | null> => {
    const { timeoutMs = 30000, retries = 3, folder } = options || {};

    // Determinar pasta baseada no path se não fornecida
    let targetFolder = folder;
    if (!targetFolder) {
      if (path.includes("profile")) targetFolder = "profiles";
      else if (path.includes("evolution")) targetFolder = "evolution";
      else if (path.includes("onboarding")) targetFolder = "onboarding";
      else targetFolder = "general";
    }

    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`[ImageService] Tentativa ${i + 1} de ${retries + 1} para upload Cloudinary (${targetFolder})`);
        
        const uploadPromise = cloudinaryService.uploadFromDataUrl(dataUrl, targetFolder);
        
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => {
            reject(new Error(`Upload timeout após ${timeoutMs / 1000}s`));
          }, timeoutMs)
        );

        return await Promise.race([uploadPromise, timeoutPromise]);
      } catch (err: any) {
        console.error(`[ImageService] Falha na tentativa ${i + 1} de upload Cloudinary:`, err);
        if (i === retries) {
          console.error(`[ImageService] Todas as tentativas de upload Cloudinary falharam.`);
          return null;
        }
        // Pequeno delay antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    return null;
  },

  /**
   * Faz upload de uma DataURL (base64) para o Cloudinary.
   */
  async uploadDataUrl(dataUrl: string, path: string): Promise<string> {
    let folder = "general";
    if (path.includes("profile")) folder = "profiles";
    else if (path.includes("evolution")) folder = "evolution";
    else if (path.includes("onboarding")) folder = "onboarding";
    
    return cloudinaryService.uploadFromDataUrl(dataUrl, folder);
  }
};
