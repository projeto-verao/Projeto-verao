/**
 * cloudinary.ts — Serviço de upload de imagens via Cloudinary.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  [key: string]: any;
}

export const cloudinaryService = {
  /**
   * Faz upload de uma imagem para o Cloudinary usando unsigned upload.
   * @param file Arquivo (File ou Blob) a ser enviado
   * @param folder Pasta opcional no Cloudinary
   * @returns URL segura da imagem
   */
  uploadImage: async (file: File | Blob, folder?: string): Promise<string> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      console.error("[Cloudinary] Configurações ausentes: VITE_CLOUDINARY_CLOUD_NAME ou VITE_CLOUDINARY_UPLOAD_PRESET");
      throw new Error("Configuração do Cloudinary incompleta");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    if (folder) {
      formData.append("folder", folder);
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Erro no upload para Cloudinary");
      }

      const data: CloudinaryUploadResponse = await response.json();
      console.log("[Cloudinary] Upload bem-sucedido:", data.secure_url);
      return data.secure_url;
    } catch (err) {
      console.error("[Cloudinary] Erro no upload:", err);
      throw err;
    }
  },

  /**
   * Converte uma Data URL (base64) para Blob e faz upload.
   */
  uploadFromDataUrl: async (dataUrl: string, folder?: string): Promise<string> => {
    if (!dataUrl || !dataUrl.startsWith("data:")) {
      throw new Error("URL de imagem inválida para upload.");
    }
    const response = await fetch(dataUrl);
    if (!response.ok) {
      throw new Error("Falha ao converter imagem para upload.");
    }
    const blob = await response.blob();
    return cloudinaryService.uploadImage(blob, folder);
  },
};
