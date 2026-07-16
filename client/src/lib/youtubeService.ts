/**
 * Serviço de integração com YouTube Data API v3
 * Responsável por pesquisar vídeos de exercícios no YouTube
 */

interface YouTubeSearchResult {
  videoId: string;
  videoUrl: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration?: string;
}

async function callYouTubeAPI(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
  const apiKey =
    (typeof process !== "undefined" && process.env?.VITE_YOUTUBE_API_KEY) ||
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_YOUTUBE_API_KEY) ||
    "";

  if (!apiKey || apiKey.length < 10) {
    throw new Error(
      "YouTube API Key não configurada. Defina VITE_YOUTUBE_API_KEY no .env"
    );
  }

  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  url.searchParams.append("key", apiKey);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("YouTube API: tempo limite excedido. Verifique sua conexão.");
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `YouTube API Error: ${error.error?.message || response.statusText}`
    );
  }

  return response.json();
}

export const youtubeService = {
  /**
   * Pesquisa um vídeo de exercício no YouTube com prioridade em português
   */
  async searchExerciseVideo(
    exerciseName: string
  ): Promise<YouTubeSearchResult | null> {
    try {
      // Pesquisa em português primeiro
      const searchQuery = `${exerciseName} exercício técnica correta português`;

      const response = await callYouTubeAPI("search", {
        part: "snippet",
        q: searchQuery,
        type: "video",
        regionCode: "BR",
        relevanceLanguage: "pt",
        maxResults: "10",
        order: "relevance",
      });

      if (!response.items || response.items.length === 0) {
        console.warn(`Nenhum vídeo encontrado para: ${exerciseName}`);
        return null;
      }

      // Filtrar e selecionar o melhor resultado
      const bestResult = response.items[0];
      const videoId = bestResult.id.videoId;

      // Obter detalhes do vídeo (duração, estatísticas)
      const detailsResponse = await callYouTubeAPI("videos", {
        part: "contentDetails,statistics",
        id: videoId,
      });

      const videoDetails = detailsResponse.items?.[0];

      return {
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        title: bestResult.snippet.title,
        channelTitle: bestResult.snippet.channelTitle,
        thumbnail: bestResult.snippet.thumbnails.high?.url || "",
        duration: videoDetails?.contentDetails?.duration,
      };
    } catch (error) {
      console.error("Erro ao pesquisar vídeo no YouTube:", error);
      throw error;
    }
  },

  /**
   * Valida se um vídeo do YouTube ainda existe e está disponível
   */
  async validateVideoExists(videoId: string): Promise<boolean> {
    try {
      const response = await callYouTubeAPI("videos", {
        part: "id",
        id: videoId,
      });

      return response.items && response.items.length > 0;
    } catch (error) {
      console.error("Erro ao validar vídeo:", error);
      return false;
    }
  },

  /**
   * Pesquisa vídeos alternativos para um exercício (para substituição automática)
   */
  async searchAlternativeVideos(
    exerciseName: string,
    excludeVideoId?: string
  ): Promise<YouTubeSearchResult[]> {
    try {
      const searchQuery = `${exerciseName} exercício técnica correta português`;

      const response = await callYouTubeAPI("search", {
        part: "snippet",
        q: searchQuery,
        type: "video",
        regionCode: "BR",
        relevanceLanguage: "pt",
        maxResults: "5",
        order: "relevance",
      });

      if (!response.items || response.items.length === 0) {
        return [];
      }

      return response.items
        .filter((item: any) => item.id.videoId !== excludeVideoId)
        .map((item: any) => ({
          videoId: item.id.videoId,
          videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.high?.url || "",
        }));
    } catch (error) {
      console.error("Erro ao pesquisar vídeos alternativos:", error);
      return [];
    }
  },
};
