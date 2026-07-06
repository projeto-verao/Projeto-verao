import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import {
  User, Camera, Upload, LogOut, ChevronRight, Dumbbell,
  Utensils, Target, TrendingDown, Loader2, Settings, Sparkles, Activity
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
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
      toast.error("Não foi possível analisar a foto agora.");
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

  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/login"; },
  });

  const handlePhotoSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        uploadPhoto.mutate({ base64: resizedBase64 });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Latest weight from body progress
  const latestWeight = bodyHistory?.[0]?.weightKg ?? profile?.weightKg;
  const initialWeight = profile?.weightKg;
  const targetWeight = profile?.targetWeightKg;

  // BMI calculation
  const bmi = profile?.weightKg && profile?.heightCm
    ? (profile.weightKg / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
    : null;

  const bmiLabel = bmi
    ? parseFloat(bmi) < 18.5 ? "Abaixo do peso"
    : parseFloat(bmi) < 25 ? "Peso normal"
    : parseFloat(bmi) < 30 ? "Sobrepeso"
    : "Obesidade"
    : null;

  const completed = weekProgress?.completed ?? 0;
  const target = weekProgress?.target ?? 4;

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <h1 className="font-semibold text-gray-900 text-lg flex-1">Meu Perfil</h1>
        <button
          onClick={() => navigate("/trainer")}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
          title="Configurações"
        >
          <Settings size={17} className="text-gray-600" />
        </button>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden cursor-pointer border-2 border-gray-200"
              onClick={() => fileInputRef.current?.click()}
            >
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={32} className="text-gray-400" />
                </div>
              )}
            </div>
            {(uploadPhoto.isPending || saveProfile.isPending || analyzeBody.isPending) && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Loader2 size={18} color="white" className="animate-spin" />
              </div>
            )}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-black rounded-full flex items-center justify-center border-2 border-white"
            >
              <Camera size={13} color="white" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-xl truncate">{profile?.name ?? user?.name ?? "Usuário"}</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">{profile?.goal ?? "Sem objetivo definido"}</p>
              <button 
                onClick={() => {
                  if (profile?.photoUrl) {
                    console.log("Iniciando análise para URL:", profile.photoUrl);
                    analyzeBody.mutate({ photoUrl: profile.photoUrl });
                  } else {
                    fileInputRef.current?.click();
                    toast.info("Envie uma foto para a IA analisar seu corpo!");
                  }
                }}
                disabled={analyzeBody.isPending}
                className={`flex items-center gap-1 text-[10px] font-bold bg-black text-white px-2 py-1 rounded-full shadow-lg transition-all ${analyzeBody.isPending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
              >
                {analyzeBody.isPending ? (
                  <>
                    <Loader2 size={10} className="animate-spin" /> ANALISANDO...
                  </>
                ) : (
                  <>
                    <Sparkles size={10} /> ANALISAR CORPO
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{profile?.experienceLevel ?? ""}</p>
          </div>
        </div>

        {/* AI Analysis Result */}
        {analysisResult && (
          <div className="app-card border-black/10 bg-black/5 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2 mb-3 text-black">
              <Activity size={18} />
              <h3 className="font-bold text-sm uppercase tracking-wider">Avaliação Física IA</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-black/5">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Gordura Estimada</p>
                <p className="text-xl font-black text-black">{analysisResult.bfEstimate}</p>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm border border-black/5">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Massa Muscular</p>
                <p className="text-xl font-black text-black">{analysisResult.muscleLevel}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-700 leading-relaxed">
                <span className="font-bold">Análise:</span> {analysisResult.summary}
              </p>
              <div className="pt-2 border-t border-black/5">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Dica do Especialista</p>
                <p className="text-xs text-gray-600 italic">"{analysisResult.tip}"</p>
              </div>
            </div>
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="app-card text-center py-3">
            <p className="text-xl font-bold text-gray-900">{latestWeight ? `${latestWeight}` : "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">Peso (kg)</p>
          </div>
          <div className="app-card text-center py-3">
            <p className="text-xl font-bold text-gray-900">{bmi ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">IMC</p>
          </div>
          <div className="app-card text-center py-3">
            <p className="text-xl font-bold text-gray-900">{completed}/{target}</p>
            <p className="text-xs text-gray-500 mt-0.5">Treinos</p>
          </div>
        </div>

        {/* BMI label */}
        {bmiLabel && (
          <p className="text-xs text-center text-gray-400">{bmiLabel}</p>
        )}

        {/* Progress to goal */}
        {targetWeight && latestWeight && (
          <div className="app-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso da meta</span>
              <span className="text-sm font-bold text-gray-900">{targetWeight}kg</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min(Math.max(
                    ((initialWeight! - latestWeight) / (initialWeight! - targetWeight)) * 100,
                    0
                  ), 100)}%`
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-gray-400">Início: {initialWeight}kg</span>
              <span className="text-xs text-gray-400">Meta: {targetWeight}kg</span>
            </div>
          </div>
        )}

        {/* Body info */}
        {profile && (
          <div className="app-card">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Informações físicas</h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {[
                { label: "Idade", value: profile.age ? `${profile.age} anos` : "—" },
                { label: "Sexo", value: profile.sex ?? "—" },
                { label: "Altura", value: profile.heightCm ? `${profile.heightCm} cm` : "—" },
                { label: "Peso atual", value: latestWeight ? `${latestWeight} kg` : "—" },
                { label: "Dias/semana", value: profile.daysPerWeek ? `${profile.daysPerWeek} dias` : "—" },
                { label: "Tempo/treino", value: profile.minutesPerSession ? `${profile.minutesPerSession} min` : "—" },
                { label: "Academia", value: profile.gymType ?? "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm font-medium text-gray-800">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="app-card p-0 overflow-hidden">
          {[
            { icon: Dumbbell, label: "Meu treino", path: "/dashboard" },
            { icon: Utensils, label: "Alimentação", path: "/nutrition" },
            { icon: Target, label: "Meus objetivos", path: "/goals" },
            { icon: TrendingDown, label: "Histórico de evolução", path: "/trainer" },
          ].map(({ icon: Icon, label, path }, i, arr) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors ${i < arr.length - 1 ? "border-b border-gray-100" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-800">{label}</span>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="btn-secondary text-red-500 border-red-200 py-3"
        >
          {logout.isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          Sair da conta
        </button>
      </div>
    </AppLayout>
  );
}
