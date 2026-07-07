import { useEffect, useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Dumbbell, AlertCircle } from "lucide-react";

const MESSAGES = [
  "Analisando sua composição corporal...",
  "Processando suas informações...",
  "Criando seu treino personalizado...",
  "Preparando sua jornada...",
];

export default function Processing() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const evalPhotoUrl = params.get("evalPhoto") || undefined;

  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState(".");
  const [progress, setProgress] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const generateWorkout = trpc.workout.generateWithPhoto.useMutation({
    onSuccess: () => {
      setProgress(100);
      setTimeout(() => navigate("/dashboard"), 800);
    },
    onError: (err) => {
      console.error("Erro ao gerar treino:", err);
      setError("Não conseguimos gerar seu treino agora. Por favor, tente novamente.");
    },
  });

  // Inicia a geração do treino uma única vez
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    generateWorkout.mutate({ evalPhotoUrl });
  }, []);

  // Rotação das mensagens com fade
  useEffect(() => {
    if (error) return; // Não rotaciona mensagens se houver erro
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setMessageIndex(i => (i + 1) % MESSAGES.length);
        setFadeIn(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, [error]);

  // Animação dos pontos
  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? "." : d + ".");
    }, 500);
    return () => clearInterval(interval);
  }, [error]);

  // Barra de progresso simulada
  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p; // Para em 90% até a resposta chegar
        return p + Math.random() * 4;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [error]);

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "linear-gradient(160deg, #0f0f0f 0%, #1a1a1a 100%)" }}
      >
        <div className="relative mb-12">
          <div
            className="relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ background: "linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)" }}
          >
            <AlertCircle size={44} color="white" />
          </div>
        </div>

        <div className="text-center mb-10">
          <p className="text-white text-lg font-semibold mb-2">Oops!</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              setError(null);
              hasStarted.current = false;
              setProgress(0);
              setMessageIndex(0);
              generateWorkout.mutate({ evalPhotoUrl });
            }}
            className="px-6 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => navigate("/onboarding")}
            className="px-6 py-2 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-black transition"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #0f0f0f 0%, #1a1a1a 100%)" }}
    >
      {/* Logo animado */}
      <div className="relative mb-12">
        {/* Anéis pulsantes */}
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-20"
          style={{
            background: "linear-gradient(135deg, #FF5F6D, #FFC371)",
            animationDuration: "2s",
            transform: "scale(1.6)",
          }}
        />
        <div
          className="absolute inset-0 rounded-full animate-ping opacity-10"
          style={{
            background: "linear-gradient(135deg, #FF5F6D, #FFC371)",
            animationDuration: "2.5s",
            animationDelay: "0.5s",
            transform: "scale(2.2)",
          }}
        />
        {/* Ícone central */}
        <div
          className="relative w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
          style={{ background: "linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)" }}
        >
          <Dumbbell size={44} color="white" />
        </div>
      </div>

      {/* Mensagem rotativa */}
      <div className="text-center mb-10" style={{ minHeight: "60px" }}>
        <p
          className="text-white text-lg font-semibold transition-opacity duration-300"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          {MESSAGES[messageIndex].replace("...", dots)}
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Isso pode levar alguns segundos
        </p>
      </div>

      {/* Barra de progresso */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: "linear-gradient(90deg, #FF5F6D 0%, #FFC371 100%)",
            }}
          />
        </div>
        <p className="text-center text-gray-600 text-xs mt-3">
          {Math.round(Math.min(progress, 100))}%
        </p>
      </div>

      {/* Dica de rodapé */}
      <div className="absolute bottom-10 px-6 text-center">
        <p className="text-gray-600 text-xs leading-relaxed">
          A IA está combinando sua avaliação física com seus objetivos para criar o treino perfeito para você.
        </p>
      </div>
    </div>
  );
}
