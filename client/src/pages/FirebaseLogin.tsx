import { useState } from "react";
import { useLocation } from "wouter";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dumbbell, Mail, Lock, User, ArrowLeft, Eye, EyeOff, CheckCircle } from "lucide-react";

type Mode = "login" | "signup" | "forgot";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FirebaseLogin() {
  const [, navigate] = useLocation();
  const { login, register, resetPassword, loading } = useFirebaseAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const changeMode = (next: Mode) => {
    setMode(next);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "forgot") {
      if (!email.trim()) {
        toast.error("Digite seu e-mail para recuperar a senha.");
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        toast.error("Digite um e-mail válido.");
        return;
      }
      try {
        await resetPassword(email.trim());
        setResetSent(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao enviar e-mail.";
        toast.error(msg);
      }
      return;
    }

    if (!email.trim()) {
      toast.error("Digite seu e-mail.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      toast.error("Digite um e-mail válido.");
      return;
    }
    if (!password) {
      toast.error("Digite sua senha.");
      return;
    }

    if (mode === "signup") {
      if (!name.trim()) {
        toast.error("Digite seu nome.");
        return;
      }
      if (password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem.");
        return;
      }
      try {
        await register(email.trim(), password, name.trim());
        toast.success("Conta criada com sucesso! Bem-vindo ao Projeto Verão 🎉");
        navigate("/welcome");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao criar conta.";
        toast.error(msg);
      }
      return;
    }

    // login
    try {
      await login(email.trim(), password);
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login.";
      toast.error(msg);
    }
  };

  // ── Tela de confirmação de e-mail de recuperação ──────────────────────────
  if (resetSent) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">E-mail enviado!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Enviamos um link de recuperação de senha para{" "}
            <span className="font-semibold text-gray-700">{email}</span>.
            Verifique sua caixa de entrada (e o spam).
          </p>
          <button
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            onClick={() => { setResetSent(false); setMode("login"); }}
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header com botão voltar (apenas em forgot/signup) */}
      {(mode === "forgot" || mode === "signup") && (
        <div className="px-5 pt-12 pb-2">
          <button
            onClick={() => changeMode("login")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <Dumbbell size={32} color="white" />
            </div>
          </div>

          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === "login" && "Bem-vindo de volta"}
              {mode === "signup" && "Criar conta"}
              {mode === "forgot" && "Recuperar senha"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {mode === "login" && "Faça login para continuar"}
              {mode === "signup" && "Preencha os dados para começar"}
              {mode === "forgot" && "Enviaremos um link para seu e-mail"}
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome (apenas cadastro) */}
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
                <div className="relative">
                  <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-200 focus:border-black focus:ring-black"
                    disabled={loading}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-gray-200 focus:border-black focus:ring-black"
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Senha (não exibida em forgot) */}
            {mode !== "forgot" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 rounded-xl border-gray-200 focus:border-black focus:ring-black"
                    disabled={loading}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmar senha (apenas cadastro) */}
            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-gray-200 focus:border-black focus:ring-black"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            {/* Link "Esqueci a senha" (apenas login) */}
            {mode === "login" && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="text-sm text-gray-500 hover:text-black transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {/* Botão principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading
                ? "Processando..."
                : mode === "login"
                ? "Entrar"
                : mode === "signup"
                ? "Criar Conta"
                : "Enviar link de recuperação"}
            </button>
          </form>

          {/* Toggle login/cadastro */}
          {mode !== "forgot" && (
            <p className="text-center text-gray-500 text-sm mt-6">
              {mode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
              <button
                type="button"
                onClick={() => changeMode(mode === "login" ? "signup" : "login")}
                className="text-black font-semibold hover:underline"
                disabled={loading}
              >
                {mode === "login" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
