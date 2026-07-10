import { useState, useEffect } from "react";
import { X, ThumbsUp, ThumbsDown, Loader2, Play, AlertCircle } from "lucide-react";
import { firestoreService, ExerciseVideo } from "@/hooks/useFirebaseFirestore";
import { geminiService } from "@/lib/gemini";
import { toast } from "sonner";

interface VideoModalProps {
  exerciseName: string;
  userId: string;
  onClose: () => void;
}

export default function VideoModal({ exerciseName, userId, onClose }: VideoModalProps) {
  const [loading, setLoading] = useState(true);
  const [video, setVideo] = useState<ExerciseVideo | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rated, setRated] = useState(false);

  const loadVideo = async () => {
    setLoading(true);
    try {
      // 1. Verificar biblioteca local (Firestore)
      let videoData = await firestoreService.getExerciseVideo(exerciseName);
      
      // 2. Se não existir, IA pesquisa e salva
      if (!videoData) {
        const searchResult = await geminiService.searchExerciseVideo(exerciseName);
        await firestoreService.saveExerciseVideo({
          exerciseName,
          videoUrl: searchResult.videoUrl,
          language: searchResult.language,
          likes: 0,
          dislikes: 0,
          totalRatings: 0,
          ratingAverage: 0
        });
        videoData = await firestoreService.getExerciseVideo(exerciseName);
      }
      
      setVideo(videoData);
    } catch (err) {
      console.error("Erro ao carregar vídeo:", err);
      toast.error("Não foi possível carregar o vídeo demonstrativo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideo();
  }, [exerciseName]);

  const handleRate = async (isUseful: boolean, reason?: string) => {
    if (!video) return;
    // Permitir múltiplas chamadas se o usuário está selecionando um motivo
    if (rated && !reason) return;
    try {
      await firestoreService.rateExerciseVideo(userId, video.id, isUseful, reason);
      setRated(true);
      toast.success(isUseful ? "Obrigado pelo feedback! 👍" : "Feedback registrado. Vamos melhorar! 🤝");
      
      // Lógica de Aprendizado Automático: Verificar se precisa substituir o vídeo
      if (!isUseful) {
        const updatedVideo = await firestoreService.getExerciseVideo(exerciseName);
        if (updatedVideo && updatedVideo.totalRatings >= 5) {
          const dislikeRatio = updatedVideo.dislikes / updatedVideo.totalRatings;
          if (dislikeRatio > 0.2) {
            console.log("Iniciando substituição automática de vídeo mal avaliado...");
            const newSearch = await geminiService.searchExerciseVideo(exerciseName);
            if (newSearch.videoUrl !== updatedVideo.videoUrl) {
              await firestoreService.updateVideoUrl(updatedVideo.id, newSearch.videoUrl, updatedVideo.videoUrl);
              toast.info("A IA localizou um vídeo melhor para este exercício!");
              loadVideo();
            }
          }
        }
      }
      
      if (!isUseful && !reason) {
        setShowFeedback(true);
      } else {
        setShowFeedback(false);
      }
    } catch (err) {
      toast.error("Erro ao salvar avaliação.");
    }
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/");
    }
    if (url.includes("youtu.be/")) {
      return url.replace("youtu.be/", "youtube.com/embed/");
    }
    return url;
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">{exerciseName}</h3>
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Demonstração Técnica</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="aspect-video bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-4 border border-gray-100">
              <Loader2 size={48} className="animate-spin text-orange-500" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Localizando melhor vídeo...</p>
            </div>
          ) : video ? (
            <div className="space-y-6">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border border-gray-200">
                <iframe
                  src={getEmbedUrl(video.videoUrl)}
                  className="w-full h-full"
                  allowFullScreen
                  title={exerciseName}
                />
              </div>

              {!rated && !showFeedback && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
                  <p className="text-sm font-bold text-gray-900 mb-4">Este vídeo foi útil para você?</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => handleRate(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-green-600 transition-all active:scale-95 shadow-lg shadow-green-100"
                    >
                      <ThumbsUp size={16} /> Útil
                    </button>
                    <button
                      onClick={() => handleRate(false)}
                      className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                    >
                      <ThumbsDown size={16} /> Não foi útil
                    </button>
                  </div>
                </div>
              )}

              {showFeedback && (
                <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
                  <div className="flex items-center gap-2 mb-4 text-orange-600">
                    <AlertCircle size={18} />
                    <p className="text-sm font-bold uppercase tracking-tight">O que podemos melhorar?</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {["Exercício incorreto", "Explicação ruim", "Vídeo indisponível", "Outro idioma", "Baixa qualidade", "Outro"].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => handleRate(false, reason)}
                        className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 py-2 px-3 rounded-lg hover:border-orange-500 hover:text-orange-500 transition-all text-left"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {rated && (
                <div className="flex items-center justify-center gap-2 py-4 text-green-500 bg-green-50 rounded-2xl border border-green-100">
                  <CheckCircle2 size={18} />
                  <p className="text-xs font-bold uppercase tracking-widest">Avaliação registrada!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} className="text-gray-200" />
              </div>
              <p className="text-sm text-gray-500">Vídeo não encontrado para este exercício.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckCircle2({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
