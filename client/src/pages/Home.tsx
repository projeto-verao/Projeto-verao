import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Dumbbell } from "lucide-react";

export default function Home() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile, isLoading: profileLoading } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    // Aguardar carregamento de autenticação
    if (authLoading) return;

    // Se não autenticado, ir para login
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Se autenticado, aguardar perfil
    if (profileLoading) return;

    // Se tem perfil, ir para dashboard
    if (profile) {
      navigate("/dashboard");
    } else {
      // Após login, se não tiver perfil, vai para Welcome
      navigate("/welcome");
    }
  }, [isAuthenticated, authLoading, profile, profileLoading, navigate]);

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
