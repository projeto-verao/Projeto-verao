import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Send, Loader2, Camera, Upload, User, ChevronDown, RotateCcw, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type Tab = "chat" | "perfil" | "evolucao" | "historico";

const GOALS = ["Hipertrofia", "Emagrecimento", "Condicionamento", "Saúde geral", "Força", "Resistência"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"] as const;

export default function IATrainer() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Chat
  const { data: chatHistory, refetch: refetchChat } = trpc.chat.history.useQuery();
  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: () => { refetchChat(); setMessage(""); },
    onError: () => toast.error("Erro ao enviar mensagem."),
  });

  // Profile
  const { data: profile, refetch: refetchProfile } = trpc.profile.get.useQuery();
  const saveProfile = trpc.profile.save.useMutation({
    onSuccess: () => { toast.success("Perfil atualizado!"); refetchProfile(); },
  });
  const uploadPhoto = trpc.profile.uploadPhoto.useMutation();

  const [profileForm, setProfileForm] = useState({
    name: "", age: "", sex: "Masculino", heightCm: "", weightKg: "",
    goal: "Hipertrofia", experienceLevel: "Iniciante" as typeof LEVELS[number],
    daysPerWeek: "4", minutesPerSession: "60", gymType: "Academia completa",
    physicalRestrictions: "", preferredExercises: "", avoidedExercises: "",
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name ?? "",
        age: profile.age?.toString() ?? "",
        sex: profile.sex ?? "Masculino",
        heightCm: profile.heightCm?.toString() ?? "",
        weightKg: profile.weightKg?.toString() ?? "",
        goal: profile.goal ?? "Hipertrofia",
        experienceLevel: (profile.experienceLevel ?? "Iniciante") as typeof LEVELS[number],
        daysPerWeek: profile.daysPerWeek?.toString() ?? "4",
        minutesPerSession: profile.minutesPerSession?.toString() ?? "60",
        gymType: profile.gymType ?? "Academia completa",
        physicalRestrictions: profile.physicalRestrictions ?? "",
        preferredExercises: profile.preferredExercises ?? "",
        avoidedExercises: profile.avoidedExercises ?? "",
      });
    }
  }, [profile]);

  // Evolution
  const { data: bodyHistory, refetch: refetchBody } = trpc.bodyProgress.history.useQuery();
  const addProgress = trpc.bodyProgress.add.useMutation({
    onSuccess: () => { toast.success("Registro salvo!"); refetchBody(); setEvoForm({ weightKg: "", bodyFatPercent: "", chestCm: "", waistCm: "", armCm: "", thighCm: "", notes: "" }); },
  });
  const analyzeEvolution = trpc.profile.analyzeBody.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast.success("Análise corporal concluída!");
    },
    onError: () => toast.error("Erro ao analisar evolução."),
  });
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [evoForm, setEvoForm] = useState({ weightKg: "", bodyFatPercent: "", chestCm: "", waistCm: "", armCm: "", thighCm: "", notes: "" });
  const [evoPhotoBase64, setEvoPhotoBase64] = useState<string | null>(null);
  const [evoPhotoPreview, setEvoPhotoPreview] = useState<string | null>(null);

  // History
  const { data: workoutVersions, refetch: refetchVersions } = trpc.workoutHistory.list.useQuery();
  const restoreVersion = trpc.workoutHistory.restore.useMutation({
    onSuccess: () => { toast.success("Treino restaurado!"); refetchVersions(); },
  });

  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [chatHistory, activeTab]);

  const handleSend = () => {
    if (!message.trim() || sendMessage.isPending) return;
    sendMessage.mutate({ message: message.trim() });
  };

  const handleEvoPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
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
        
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setEvoPhotoPreview(resizedBase64);
        setEvoPhotoBase64(resizedBase64.split(",")[1]);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const setP = (f: string, v: string) => setProfileForm(prev => ({ ...prev, [f]: v }));
  const setE = (f: string, v: string) => setEvoForm(prev => ({ ...prev, [f]: v }));

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate("/dashboard")} className="mr-3 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold text-gray-900 text-lg">IA Personal Trainer</h1>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {(["chat", "perfil", "evolucao", "historico"] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "chat" ? "Chat" : tab === "perfil" ? "Perfil" : tab === "evolucao" ? "Evolução" : "Histórico"}
          </button>
        ))}
      </div>

      {/* ── CHAT TAB ── */}
      {activeTab === "chat" && (
        <div className="flex flex-col" style={{ height: "calc(100dvh - 200px)" }}>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {!chatHistory || chatHistory.length === 0 ? (
              <div className="empty-state">
                <p className="text-gray-500 text-center text-sm">
                  Pergunte sobre exercícios, alimentação ou peça para ajustar seu treino.
                </p>
              </div>
            ) : (
              chatHistory.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                    {msg.role === "assistant" ? (
                      <Streamdown>{msg.content}</Streamdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))
            )}
            {sendMessage.isPending && (
              <div className="flex justify-start">
                <div className="chat-bubble-ai flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-gray-500 text-sm">Pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
            <input
              className="app-input flex-1"
              placeholder="Pergunte algo ao seu personal trainer..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="w-11 h-11 bg-black rounded-xl flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            >
              <Send size={18} color="white" />
            </button>
          </div>
        </div>
      )}

      {/* ── PERFIL TAB ── */}
      {activeTab === "perfil" && (
        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-500">Atualize seus dados para recomendações mais precisas.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
            <input className="app-input" value={profileForm.name} onChange={e => setP("name", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Idade</label>
              <input className="app-input" type="number" value={profileForm.age} onChange={e => setP("age", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sexo</label>
              <div className="relative">
                <select className="app-input appearance-none pr-8" value={profileForm.sex} onChange={e => setP("sex", e.target.value)}>
                  {["Masculino", "Feminino", "Outro"].map(o => <option key={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Altura (cm)</label>
              <input className="app-input" type="number" value={profileForm.heightCm} onChange={e => setP("heightCm", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso (kg)</label>
              <input className="app-input" type="number" value={profileForm.weightKg} onChange={e => setP("weightKg", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Objetivo</label>
            <div className="relative">
              <select className="app-input appearance-none pr-8" value={profileForm.goal} onChange={e => setP("goal", e.target.value)}>
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nível</label>
            <div className="relative">
              <select className="app-input appearance-none pr-8" value={profileForm.experienceLevel} onChange={e => setP("experienceLevel", e.target.value as typeof LEVELS[number])}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dias/semana</label>
              <input className="app-input" type="number" min="1" max="7" value={profileForm.daysPerWeek} onChange={e => setP("daysPerWeek", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tempo (min)</label>
              <input className="app-input" type="number" value={profileForm.minutesPerSession} onChange={e => setP("minutesPerSession", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Restrições físicas</label>
            <textarea className="app-input resize-none" rows={2} value={profileForm.physicalRestrictions} onChange={e => setP("physicalRestrictions", e.target.value)} />
          </div>

          <button
            className="btn-primary"
            onClick={() => saveProfile.mutate({
              name: profileForm.name,
              age: parseInt(profileForm.age) || undefined,
              sex: profileForm.sex as "Masculino" | "Feminino" | "Outro",
              heightCm: parseFloat(profileForm.heightCm) || undefined,
              weightKg: parseFloat(profileForm.weightKg) || undefined,
              goal: profileForm.goal,
              experienceLevel: profileForm.experienceLevel,
              daysPerWeek: parseInt(profileForm.daysPerWeek) || undefined,
              minutesPerSession: parseInt(profileForm.minutesPerSession) || undefined,
              gymType: profileForm.gymType,
              physicalRestrictions: profileForm.physicalRestrictions || undefined,
            })}
            disabled={saveProfile.isPending}
          >
            {saveProfile.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
            Salvar perfil
          </button>
        </div>
      )}

      {/* ── EVOLUÇÃO TAB ── */}
      {activeTab === "evolucao" && (
        <div className="px-5 py-4 space-y-4">
          {/* Photo upload */}
          <div className="app-card">
            <h3 className="font-semibold text-gray-900 mb-3">Analisar por foto</h3>
            <div className="flex gap-2">
              <button className="btn-secondary py-2 text-sm" onClick={() => cameraInputRef.current?.click()}>
                <Camera size={15} /> Câmera
              </button>
              <button className="btn-secondary py-2 text-sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={15} /> Álbum
              </button>
            </div>
            {evoPhotoPreview && (
              <img src={evoPhotoPreview} alt="Preview" className="mt-3 w-full h-40 object-cover rounded-lg" />
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleEvoPhoto(e.target.files[0])} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleEvoPhoto(e.target.files[0])} />
          </div>

          {/* Measurements */}
          <div className="app-card">
            <h3 className="font-semibold text-gray-900 mb-3">Registrar evolução</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Peso (kg)</label>
                  <input className="app-input text-sm py-2" type="number" step="0.1" placeholder="75.5" value={evoForm.weightKg} onChange={e => setE("weightKg", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">% Gordura</label>
                  <input className="app-input text-sm py-2" type="number" step="0.1" placeholder="20 (opcional)" value={evoForm.bodyFatPercent} onChange={e => setE("bodyFatPercent", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Peito (cm)</label>
                  <input className="app-input text-sm py-2" type="number" value={evoForm.chestCm} onChange={e => setE("chestCm", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Cintura (cm)</label>
                  <input className="app-input text-sm py-2" type="number" value={evoForm.waistCm} onChange={e => setE("waistCm", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Braço (cm)</label>
                  <input className="app-input text-sm py-2" type="number" value={evoForm.armCm} onChange={e => setE("armCm", e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Coxa (cm)</label>
                  <input className="app-input text-sm py-2" type="number" value={evoForm.thighCm} onChange={e => setE("thighCm", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Observações</label>
                <textarea className="app-input text-sm resize-none" rows={2} value={evoForm.notes} onChange={e => setE("notes", e.target.value)} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                className="btn-primary py-2.5 text-sm"
                onClick={() => addProgress.mutate({
                  weightKg: evoForm.weightKg ? parseFloat(evoForm.weightKg) : undefined,
                  bodyFatPercent: evoForm.bodyFatPercent ? parseFloat(evoForm.bodyFatPercent) : undefined,
                  chestCm: evoForm.chestCm ? parseFloat(evoForm.chestCm) : undefined,
                  waistCm: evoForm.waistCm ? parseFloat(evoForm.waistCm) : undefined,
                  armCm: evoForm.armCm ? parseFloat(evoForm.armCm) : undefined,
                  thighCm: evoForm.thighCm ? parseFloat(evoForm.thighCm) : undefined,
                  notes: evoForm.notes || undefined,
                  photoBase64: evoPhotoBase64 || undefined,
                })}
                disabled={addProgress.isPending}
              >
                {addProgress.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Salvar registro
              </button>
              <button
                className="btn-secondary py-2.5 text-sm"
                onClick={() => {
                  if (evoPhotoPreview) {
                    analyzeEvolution.mutate({ photoUrl: evoPhotoPreview });
                  } else if (profile?.photoUrl) {
                    analyzeEvolution.mutate({ photoUrl: profile.photoUrl });
                  } else {
                    toast.info("Envie uma foto primeiro para a IA analisar!");
                  }
                }}
                disabled={analyzeEvolution.isPending}
              >
                {analyzeEvolution.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Gerar análise
              </button>
            </div>

            {analysisResult && (
              <div className="mt-4 p-4 bg-black/5 border border-black/10 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-black font-bold text-xs uppercase tracking-wider">
                  <Sparkles size={14} /> Avaliação Física IA
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded-lg border border-black/5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Gordura Est.</p>
                    <p className="text-lg font-black text-black">{analysisResult.bfEstimate}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-black/5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Massa Musc.</p>
                    <p className="text-lg font-black text-black">{analysisResult.muscleLevel}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {analysisResult.summary}
                </p>
                <div className="pt-2 border-t border-black/5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Dica do Personal</p>
                  <p className="text-xs text-gray-600 italic">"{analysisResult.tip}"</p>
                </div>
              </div>
            )}
          </div>

          {/* History */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Histórico de medidas</h3>
            {!bodyHistory || bodyHistory.length === 0 ? (
              <div className="empty-state py-8">
                <p className="text-gray-400 text-sm">Nenhum registro ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bodyHistory.slice(0, 10).map(record => (
                  <div key={record.id} className="app-card py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(record.recordedAt).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-sm text-gray-500">
                        {record.weightKg ? `${record.weightKg}kg` : "—"}
                      </span>
                    </div>
                    {(record.chestCm || record.waistCm || record.armCm) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {[record.chestCm && `Peito: ${record.chestCm}cm`, record.waistCm && `Cintura: ${record.waistCm}cm`, record.armCm && `Braço: ${record.armCm}cm`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HISTÓRICO TAB ── */}
      {activeTab === "historico" && (
        <div className="px-5 py-4">
          <h3 className="font-semibold text-gray-900 mb-3">Versões de treino</h3>
          {!workoutVersions || workoutVersions.length === 0 ? (
            <div className="empty-state">
              <p className="text-gray-400 text-sm">Nenhuma versão de treino ainda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workoutVersions.map(version => (
                <div key={version.id} className="app-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">Versão {version.versionNumber}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(version.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      {version.changeDescription && (
                        <p className="text-xs text-gray-400 mt-1 truncate">{version.changeDescription}</p>
                      )}
                    </div>
                    <button
                      onClick={() => restoreVersion.mutate({ versionId: version.id })}
                      disabled={restoreVersion.isPending}
                      className="ml-3 flex items-center gap-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 flex-shrink-0"
                    >
                      <RotateCcw size={12} />
                      Restaurar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
