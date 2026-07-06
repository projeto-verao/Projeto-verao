import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Dumbbell } from "lucide-react";

export default function Logout() {
  const [, navigate] = useLocation();
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Limpar localStorage e sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirecionar para login
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    },
    onError: () => {
      // Mesmo com erro, limpar dados locais e redirecionar
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/login";
    },
  });

  useEffect(() => {
    // Executar logout
    logout.mutate();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
          <Dumbbell size={32} color="white" />
        </div>
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 mt-4">Fazendo logout...</p>
      </div>
    </div>
  );
}
