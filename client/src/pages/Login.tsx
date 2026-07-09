import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dumbbell, Mail, Lock, User, ArrowLeft } from "lucide-react";

type Tab = "login" | "signup" | "reset";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function Login() {
  const [, navigate] = useLocation();
  const { login, register, resetPassword, loading, isAuthenticated } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("E-mail inválido");
      return;
    }
    try {
      await login(email, password);
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao fazer login");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[handleSignup] Iniciando com email:", email);
    if (!name.trim()) {
      toast.error("Digite seu nome");
      return;
    }
    if (!email) {
      toast.error("Digite seu e-mail");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("E-mail inválido");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    try {
      console.log("[handleSignup] Chamando register...");
      await register(email, password, name);
      console.log("[handleSignup] Register concluído");
      toast.success("Conta criada com sucesso! Bem-vindo ao Projeto Verão!");
      navigate("/welcome");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar conta");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Digite seu e-mail para recuperar a senha");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("E-mail inválido");
      return;
    }
    try {
      await resetPassword(email);
      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      setTab("login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar e-mail de recuperação");
    }
  };

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

      {/* Recuperação de senha */}
      {tab === "reset" && (
        <div className="w-full">
          <button
            onClick={() => setTab("login")}
            className="flex items-center gap-2 text-sm text-gray-500 mb-6 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar ao login
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Recuperar senha</h2>
          <p className="text-sm text-gray-500 mb-6">
            Digite seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              {loading ? "Enviando..." : "Enviar e-mail de recuperação"}
            </Button>
          </form>
        </div>
      )}

      {/* Tabs login / cadastro */}
      {tab !== "reset" && (
        <>
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

          {/* Formulário de Login */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setTab("reset")}
                  className="text-sm text-gray-500 hover:text-black transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          )}

          {/* Formulário de Cadastro */}
          {tab === "signup" && (
            <form onSubmit={handleSignup} className="w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                  <Input
                    type="password"
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                {loading ? "Criando conta..." : "Criar Conta"}
              </Button>
            </form>
          )}
        </>
      )}

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400 text-center">
        Ao continuar, você concorda com os termos de uso.
        <br />
        Seus dados são privados e seguros.
      </p>
    </div>
  );
}
