import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { geminiService } from "@/lib/gemini";
import { firestoreService } from "@/hooks/useFirebaseFirestore";
import { Dumbbell, AlertCircle } from "lucide-react";

const MESSAGES = [
  "Analisando sua composição corporal...",
  "Processando suas informações...",
  "Criando seu treino personalizado...",
  "Preparando sua jornada...",
];

export default function Processing() {
  const [, navigate] = useLocation();
  const { user, profile, loading: authLoading } = useAuth();

  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState(".");
  const [progress, setProgress] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const runGeneration = async () => {
    if (!user) return;
    try {
      // 1. Análise corporal opcional via foto de avaliação (base64 no sessionStorage)
      let bodyAnalysisSummary: string | undefined;
      const evalPhoto = sessionStorage.getItem("evalPhotoBase64");
      if (evalPhoto) {
        try {
          const analysis = await geminiService.analyzeBody(evalPhoto, profile as any);
          bodyAnalysisSummary = `Gordura corporal estimada: ${analysis.bfEstimate}. Nível muscular: ${analysis.muscleLevel}. ${analysis.summary}`;
          // Salvar análise como primeiro registro de progresso corporal
          await firestoreService.addBodyProgress(user.uid, {
            weightKg: (profile as any)?.weightKg,
            notes: `Avaliação inicial IA — ${bodyAnalysisSummary}`,
          });
        } catch (e) {
          console.warn("Análise corporal falhou, seguindo sem ela:", e);
        }
      }

      setProgress((p) => Math.max(p, 45));

      // 2. Gerar treino personalizado
      const generated = await geminiService.generateWorkout(profile as any, bodyAnalysisSummary);

      setProgress((p) => Math.max(p, 80));

      // 3. Salvar no Firestore
      await firestoreService.createWorkout(user.uid, {
        title: generated.title,
        days: generated.days,
        changeDescription: bodyAnalysisSummary
          ? "Primeiro treino gerado pela IA com avaliação física por foto"
          : "Primeiro treino gerado pela IA",
      });

      // Limpar foto temporária
      sessionStorage.removeItem("evalPhotoBase64");

      setProgress(100);
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      console.error("Erro ao gerar treino:", err);
      const msg = err instanceof Error ? err.message : "Não conseguimos gerar seu treino agora. Por favor, tente novamente.";
      setError(msg);
    }
  };

  // Inicia a geração do treino uma única vez (aguarda auth e perfil carregarem)
  useEffect(() => {
    if (authLoading || !user || hasStarted.current) return;
    if (!profile) return; // aguarda perfil carregar
    hasStarted.current = true;
    runGeneration();
  }, [authLoading, user, profile]);

  // Redireciona se não autenticado
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  // Rotação das mensagens com fade
  useEffect(() => {
    if (error) return;
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
        if (p >= 90) return p;
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
              // Retry: useEffect vai disparar de novo
              setTimeout(() => {
                if (user && profile) {
                  hasStarted.current = true;
                  runGeneration();
                }
              }, 100);
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
