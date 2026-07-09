import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Dumbbell } from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading, profile } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Aguardar carregamento de autenticação
    if (loading) return;

    // Se não autenticado, ir para login
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Se autenticado e onboarding completo, ir para dashboard
    if (profile && (profile as any).onboardingCompleted) {
      navigate("/dashboard");
    } else {
      // Após login, se onboarding não completo, vai para Welcome
      navigate("/welcome");
    }
  }, [isAuthenticated, loading, profile, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
          <Dumbbell size={32} color="white" />
        </div>
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}
