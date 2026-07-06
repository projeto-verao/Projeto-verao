import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Dumbbell, Sparkles, ChevronRight, Activity, Target, Brain } from "lucide-react";

export default function Welcome() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero Section */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8"
        style={{ background: "linear-gradient(160deg, #ffffff 0%, #f8f8f8 100%)" }}
      >
        {/* Logo / Icon */}
        <div className="relative mb-8">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #111 0%, #333 100%)" }}
          >
            <Dumbbell size={44} color="white" />
          </div>
          <div
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)" }}
          >
            <Sparkles size={14} color="white" />
          </div>
        </div>

        {/* Main Text */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
            Bem-vindo!{"\n"}Vamos criar um treino{"\n"}
            <span
              className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-rose-500"
            >
              totalmente personalizado
            </span>{" "}
            para você.
          </h1>
          <p className="text-gray-600 text-base leading-relaxed max-w-xs mx-auto">
            Em poucos minutos coletaremos algumas informações e faremos uma avaliação física para que a IA monte seu primeiro treino de acordo com seus objetivos.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-col gap-3 w-full max-w-xs mb-10">
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain size={18} color="white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">IA Personalizada</p>
              <p className="text-xs text-gray-500">Análise visual + dados do perfil</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
              <Target size={18} color="white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Treino sob medida</p>
              <p className="text-xs text-gray-500">Adaptado aos seus objetivos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <div className="w-9 h-9 bg-black rounded-xl flex items-center justify-center flex-shrink-0">
              <Activity size={18} color="white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Evolução acompanhada</p>
              <p className="text-xs text-gray-500">Progresso registrado ao longo do tempo</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="px-6 pb-10 pt-4">
        <button
          className="btn-primary text-base py-4 rounded-2xl"
          onClick={() => navigate("/onboarding")}
          style={{
            background: "linear-gradient(135deg, #111 0%, #333 100%)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          }}
        >
          Começar avaliação
          <ChevronRight size={20} />
        </button>
        <p className="text-center text-xs text-gray-400 mt-4">
          Leva menos de 3 minutos · Totalmente gratuito
        </p>
      </div>
    </div>
  );
}
