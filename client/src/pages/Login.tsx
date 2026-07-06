import { useEffect } from "react";
import { useLocation } from "wouter";
import { Dumbbell } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"login" | "signup">("login");

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleSignup = () => {
    window.location.href = getLoginUrl() + "&signup=true";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 max-w-[480px] mx-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Dumbbell size={40} color="white" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Projeto Verão</h1>
        <p className="text-gray-500 mt-1 text-sm">Seu personal trainer com IA</p>
      </div>

      {/* Tabs */}
      <div className="w-full flex gap-2 mb-8 border-b border-gray-200">
        <button
          onClick={() => setTab("login")}
          className={`flex-1 py-3 font-medium text-sm transition-colors ${
            tab === "login"
              ? "text-black border-b-2 border-black"
              : "text-gray-400 border-b-2 border-transparent"
          }`}
        >
          Entrar
        </button>
        <button
          onClick={() => setTab("signup")}
          className={`flex-1 py-3 font-medium text-sm transition-colors ${
            tab === "signup"
              ? "text-black border-b-2 border-black"
              : "text-gray-400 border-b-2 border-transparent"
          }`}
        >
          Criar Conta
        </button>
      </div>

      {/* Login card */}
      <div className="w-full space-y-4">
        {tab === "login" && (
          <>
            <p className="text-sm text-gray-600 text-center mb-4">Faça login para continuar</p>
          </>
        )}
        {tab === "signup" && (
          <>
            <p className="text-sm text-gray-600 text-center mb-4">Crie uma conta para começar</p>
          </>
        )}

        <button
          onClick={tab === "login" ? handleLogin : handleSignup}
          className="btn-primary"
          style={{ gap: "10px" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {tab === "login" ? "Entrar com Google" : "Criar conta com Google"}
        </button>

        <button
          onClick={tab === "login" ? handleLogin : handleSignup}
          className="btn-secondary"
        >
          {tab === "login" ? "Entrar com Email" : "Criar conta com Email"}
        </button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400 text-center">
        Ao continuar, você concorda com os termos de uso.<br />
        Seus dados são privados e seguros.
      </p>
    </div>
  );
}
