import { useState } from "react";
import { useLocation } from "wouter";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dumbbell, Mail, Lock, User } from "lucide-react";

export default function FirebaseLogin() {
  const [, navigate] = useLocation();
  const { login, register, loading } = useFirebaseAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        if (!name.trim()) {
          toast.error("Por favor, digite seu nome");
          return;
        }
        await register(email, password, name);
        toast.success("Conta criada com sucesso!");
        navigate("/welcome");
      } else {
        await login(email, password);
        toast.success("Login realizado com sucesso!");
        navigate("/welcome");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao autenticar";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
            <Dumbbell size={32} color="white" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Projeto Verão
        </h1>
        <p className="text-center text-gray-500 mb-8">
          {isSignUp ? "Crie sua conta" : "Faça login na sua conta"}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-3 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
          >
            {loading ? "Processando..." : isSignUp ? "Criar Conta" : "Entrar"}
          </Button>
        </form>

        {/* Toggle */}
        <p className="text-center text-gray-600 mt-6">
          {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-black font-semibold hover:underline"
            disabled={loading}
          >
            {isSignUp ? "Entrar" : "Criar Conta"}
          </button>
        </p>
      </div>
    </div>
  );
}
