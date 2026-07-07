import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import {
  User, LogOut, ChevronRight, Dumbbell,
  Utensils, Target, Loader2, RefreshCw, Mail, Calendar, Ruler, Weight
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, profile: firebaseProfile, isAuthenticated, loading, logout, updateProfile } = useAuth();
  const [, navigate] = useLocation();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Sessão encerrada com sucesso!");
      navigate("/login");
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
      window.location.href = "/login";
    }
  };

  const handleResetOnboarding = async () => {
    if (confirm("Deseja reiniciar seu cadastro? Isso permitirá que você refaça a avaliação física.")) {
      try {
        await updateProfile({ onboardingCompleted: false });
        toast.success("Cadastro reiniciado! Redirecionando...");
        setTimeout(() => navigate("/welcome"), 1000);
      } catch (err) {
        toast.error("Erro ao reiniciar cadastro.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">MEU PERFIL</h1>
        <p className="text-sm text-gray-500">Gerencie seus dados e conta</p>
      </div>

      <div className="px-5 pb-24 space-y-6">
        {/* User Info Card */}
        <div className="bg-black rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10">
              <User size={32} className="text-orange-400" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">{firebaseProfile?.name || "Atleta"}</p>
              <div className="flex items-center gap-1 text-white/50 text-xs mt-1">
                <Mail size={12} />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <User size={120} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Ruler size={14} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Altura</span>
            </div>
            <p className="text-xl font-black text-gray-900">{firebaseProfile?.heightCm || "—"} <span className="text-xs font-normal text-gray-400">cm</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Weight size={14} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Peso</span>
            </div>
            <p className="text-xl font-black text-gray-900">{firebaseProfile?.weightKg || "—"} <span className="text-xs font-normal text-gray-400">kg</span></p>
          </div>
        </div>

        {/* Settings Links */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configurações</h2>
          </div>
          
          <button 
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
                <Dumbbell size={16} className="text-orange-500" />
              </div>
              <span className="text-sm font-bold text-gray-900">Meu Treino</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button 
            onClick={handleResetOnboarding}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <RefreshCw size={16} className="text-blue-500" />
              </div>
              <span className="text-sm font-bold text-gray-900">Refazer Avaliação</span>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-between p-4 hover:bg-red-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100">
                <LogOut size={16} className="text-red-500" />
              </div>
              <span className="text-sm font-bold text-red-600">Sair da Conta</span>
            </div>
            <ChevronRight size={18} className="text-red-300" />
          </button>
        </div>

        <p className="text-center text-[10px] text-gray-400 font-medium uppercase tracking-widest">
          Projeto Verão v2.0 • Firebase Auth
        </p>
      </div>
    </AppLayout>
  );
}
