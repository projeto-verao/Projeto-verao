import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import {
  User, Camera, Upload, LogOut, ChevronRight, Dumbbell,
  Utensils, Target, TrendingDown, Loader2, Settings, Sparkles, Activity
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, profile: firebaseProfile, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, refetch } = trpc.profile.get.useQuery();
  const { data: weekProgress } = trpc.workout.weekProgress.useQuery();
  const { data: bodyHistory } = trpc.bodyProgress.history.useQuery();
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const analyzeBody = trpc.profile.analyzeBody.useMutation({
    onSuccess: (data) => {
      console.log("Análise corporal recebida:", data);
      setAnalysisResult(data);
      toast.success("Análise corporal concluída!");
    },
    onError: (err) => {
      console.error("Erro na análise corporal:", err);
      toast.error("Erro ao analisar composição corporal.");
    },
  });

  const saveProfile = trpc.profile.save.useMutation({
    onSuccess: () => { toast.success("Foto atualizada!"); refetch(); },
  });

  const uploadPhoto = trpc.profile.uploadPhoto.useMutation({
    onSuccess: (data) => {
      saveProfile.mutate({ photoUrl: data.url, photoKey: data.key });
    },
    onError: () => toast.error("Erro ao fazer upload da foto."),
  });

  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
      // Mesmo com erro, redirecionar
      window.location.href = "/login";
    }
  };

  const handlePhotoSelect = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > 512) { h = Math.round(h * 512 / w); w = 512; }
        } else {
          if (h > 512) { w = Math.round(w * 512 / h); h = 512; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
        uploadPhoto.mutate({ base64 });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Latest weight from body progress
  const latestWeight = bodyHistory?.[0]?.weightKg ?? profile?.weightKg;
  const targetWeight = profile?.targetWeightKg;
  const initialWeight = bodyHistory?.[bodyHistory.length - 1]?.weightKg ?? profile?.weightKg;

  const completed = weekProgress?.completed ?? 0;
  const target = weekProgress?.target ?? 4;

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perfil</h1>
          <p className="text-sm text-gray-500">Gerenciar sua conta e dados</p>
        </div>
      </div>

      <div className="px-5 pb-20 space-y-6">
        {/* User Info Card */}
        <div className="app-card bg-gradient-to-br from-black to-gray-900 text-white">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User size={32} />
              </div>
              <div>
                <p className="font-semibold text-lg">{firebaseProfile?.name || user?.displayName || "Usuário"}</p>
                <p className="text-sm text-white/60">{firebaseProfile?.email || user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Photo Section */}
        <div className="app-card space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Camera size={16} color="white" />
            </div>
            <h2 className="font-semibold text-gray-900">Foto de Perfil</h2>
          </div>
          
          <div className="relative w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden mx-auto">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <User size={40} className="text-gray-300" />
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="btn-secondary flex-1 text-sm py-2"
            >
              <Camera size={14} /> Tirar foto
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex-1 text-sm py-2"
            >
              <Upload size={14} /> Galeria
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="app-card text-center">
            <p className="text-2xl font-bold text-gray-900">{latestWeight ? `${latestWeight}` : "—"}</p>
            <p className="text-xs text-gray-500 mt-1">Peso atual</p>
          </div>
          <div className="app-card text-center">
            <p className="text-2xl font-bold text-gray-900">{completed}/{target}</p>
            <p className="text-xs text-gray-500 mt-1">Treinos</p>
          </div>
          <div className="app-card text-center">
            <p className="text-2xl font-bold text-gray-900">{bodyHistory?.length ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Registros</p>
          </div>
        </div>

        {/* Body Analysis */}
        {profile?.photoUrl && (
          <div className="app-card space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Sparkles size={16} color="white" />
              </div>
              <h2 className="font-semibold text-gray-900">Análise Corporal</h2>
            </div>

            {analysisResult ? (
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Gordura Corporal</p>
                  <p className="text-lg font-bold text-gray-900">{analysisResult.bfEstimate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Nível Muscular</p>
                  <p className="text-lg font-bold text-gray-900">{analysisResult.muscleLevel}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Resumo</p>
                  <p className="text-sm text-gray-700">{analysisResult.summary}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Dica</p>
                  <p className="text-sm text-gray-700">{analysisResult.tip}</p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => profile?.photoUrl && analyzeBody.mutate({ photoUrl: profile.photoUrl })}
                disabled={analyzeBody.isPending}
                className="btn-primary w-full"
              >
                {analyzeBody.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Analisar Composição
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Progress History */}
        {bodyHistory && bodyHistory.length > 0 && (
          <div className="app-card space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <TrendingDown size={16} color="white" />
              </div>
              <h2 className="font-semibold text-gray-900">Histórico de Evolução</h2>
            </div>

            <div className="space-y-2">
              {bodyHistory.slice(0, 5).map((record, i) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(record.recordedAt).toLocaleDateString("pt-BR")}
                    </p>
                    {record.weightKg && (
                      <p className="text-xs text-gray-500">{record.weightKg} kg</p>
                    )}
                  </div>
                  {i > 0 && bodyHistory[i - 1]?.weightKg && record.weightKg && (
                    <p className={`text-sm font-semibold ${
                      record.weightKg < (bodyHistory[i - 1]?.weightKg ?? 0)
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {record.weightKg < (bodyHistory[i - 1]?.weightKg ?? 0) ? "↓" : "↑"}
                      {Math.abs(record.weightKg - (bodyHistory[i - 1]?.weightKg ?? 0)).toFixed(1)} kg
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="app-card space-y-2">
          <h2 className="font-semibold text-gray-900 mb-3">Atalhos</h2>
          <a href="/dashboard" className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
            <div className="flex items-center gap-3">
              <Dumbbell size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Meu Treino</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </a>
          <a href="/nutrition" className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
            <div className="flex items-center gap-3">
              <Utensils size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Nutrição</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </a>
          <a href="/goals" className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
            <div className="flex items-center gap-3">
              <Target size={18} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Metas</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </a>
        </div>
      </div>
    </AppLayout>
  );
}
