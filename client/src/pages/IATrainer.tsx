import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { geminiService } from "@/lib/gemini";
import { firestoreService, ChatMessageEntry, BodyProgressEntry, StoredWorkout } from "@/hooks/useFirebaseFirestore";
import { ArrowLeft, Send, Loader2, Camera, Upload, ChevronDown, RotateCcw, Sparkles, Info, Ruler, CheckCircle2, X, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type Tab = "chat" | "perfil" | "evolucao" | "historico";

const GOALS = ["Hipertrofia", "Emagrecimento", "Condicionamento", "Saúde geral", "Força", "Resistência"];
const LEVELS = ["Iniciante", "Intermediário", "Avançado"] as const;

export default function IATrainer() {
  const [, navigate] = useLocation();
  const { user, profile, isAuthenticated, loading, updateProfile } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState<ChatMessageEntry[]>([]);
  const [sending, setSending] = useState(false);

  const loadChat = useCallback(async () => {
    if (!user) return;
    try {
      const history = await firestoreService.getChatHistory(user.uid);
      setChatHistory(history);
    } catch (err) {
      console.error("Erro ao carregar chat:", err);
    }
  }, [user]);

  useEffect(() => { if (user) loadChat(); }, [user, loadChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [chatHistory]);

  const handleSend = async () => {
    if (!message.trim() || sending || !user) return;
    const userMsg = message.trim();
    setMessage("");
    setSending(true);

    // Otimista: mostra a mensagem do usuário imediatamente
    const tempUserMsg: ChatMessageEntry = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMsg,
      createdAt: { toMillis: () => Date.now() } as any,
    };
    setChatHistory(prev => [...prev, tempUserMsg]);

    try {
      await firestoreService.addChatMessage(user.uid, "user", userMsg);

      // Contexto do treino ativo para que a IA possa alterá-lo
      let workoutContext: string | undefined;
      let activeWorkout: StoredWorkout | null = null;
      try {
        activeWorkout = await firestoreService.getActiveWorkout(user.uid);
        if (activeWorkout) {
          workoutContext = JSON.stringify({
            title: activeWorkout.title,
            days: activeWorkout.days
          });
        }
      } catch { /* sem treino */ }

      const historyForAI = [...chatHistory, tempUserMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await geminiService.chat(historyForAI, profile as any, workoutContext);
      
      // Se a IA alterou o treino, salvar no Firestore
      if (response.updatedWorkout) {
        await firestoreService.createWorkout(user.uid, {
          title: response.updatedWorkout.title,
          days: response.updatedWorkout.days as any,
          changeDescription: response.explanation || "Alteração solicitada via chat"
        });
        toast.success("Treino atualizado com sucesso!");
      }

      // Adiciona explicação se houver
      const fullReply = response.explanation 
        ? `${response.reply}\n\n> **O que mudou:** ${response.explanation}`
        : response.reply;

      await firestoreService.addChatMessage(user.uid, "assistant", fullReply);
      await loadChat();
    } catch (err) {
      console.error("Erro no chat:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  };

  // ── Profile state ───────────────────────────────────────────────────────────
  const [savingProfile, setSavingProfile] = useState(false);
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

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await updateProfile({
        name: profileForm.name,
        age: parseInt(profileForm.age) || undefined,
        sex: profileForm.sex,
        heightCm: parseFloat(profileForm.heightCm) || undefined,
        weightKg: parseFloat(profileForm.weightKg) || undefined,
        goal: profileForm.goal,
        experienceLevel: profileForm.experienceLevel,
        daysPerWeek: parseInt(profileForm.daysPerWeek) || undefined,
        minutesPerSession: parseInt(profileForm.minutesPerSession) || undefined,
        gymType: profileForm.gymType,
        physicalRestrictions: profileForm.physicalRestrictions,
        preferredExercises: profileForm.preferredExercises,
        avoidedExercises: profileForm.avoidedExercises,
      });
      toast.success("Perfil atualizado!");
    } catch (err) {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Evolução state ──────────────────────────────────────────────────────────
  const [evolutionHistory, setEvolutionHistory] = useState<BodyProgressEntry[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<BodyProgressEntry | null>(null);
  
  // Tarefa 5: Form para medidas manuais (será preenchido pela IA)
  const [measurements, setMeasurements] = useState({
    weightKg: "", bodyFatPercent: "", chestCm: "", waistCm: "", armCm: "", thighCm: ""
  });

  const loadEvolution = useCallback(async () => {
    if (!user) return;
    const history = await firestoreService.getBodyProgressHistory(user.uid);
    setEvolutionHistory(history);
  }, [user]);

  const handleDeleteEntry = async (entryId: string) => {
    if (!user || !window.confirm("Tem certeza que deseja excluir esta avaliação?")) return;
    try {
      await firestoreService.deleteBodyProgress(user.uid, entryId);
      toast.success("Avaliação excluída com sucesso!");
      setSelectedEntry(null);
      loadEvolution();
    } catch (err) {
      toast.error("Erro ao excluir avaliação.");
    }
  };

  useEffect(() => { if (user) loadEvolution(); }, [user, loadEvolution]);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setAnalyzing(true);
    const toastId = toast.loading("A IA está analisando sua foto...");
    
    const reader = new FileReader();
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo da foto.", { id: toastId });
      setAnalyzing(false);
    };

    reader.onload = async () => {
      try {
        const rawBase64 = reader.result as string;
        
        // Compressão da imagem antes de enviar para IA e Firestore
        const compressedBase64 = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.src = rawBase64;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 800; // Tamanho máximo para garantir que fique abaixo de 1MB

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% de qualidade
          };
          img.onerror = reject;
        });

        // IA analisa foto e retorna estimativas de medidas
        const analysis = await geminiService.analyzeBody(compressedBase64, profile as any);
        
        // Validação de imagem humana
        if (analysis.isValidHumanBody === false) {
          toast.error(analysis.rejectionReason || "A foto enviada não parece ser de uma pessoa para avaliação física.", { id: toastId });
          setAnalyzing(false);
          return;
        }

        // Atualiza o estado de measurements com TODAS as estimativas da IA
        setMeasurements({
          weightKg: analysis.weightKg || profile?.weightKg?.toString() || "",
          bodyFatPercent: analysis.bfEstimate || "",
          chestCm: analysis.chestCm || "",
          waistCm: analysis.waistCm || "",
          armCm: analysis.armCm || "",
          thighCm: analysis.thighCm || ""
        });

        // Constrói a nota detalhada para o histórico
        const fullNotes = [
          analysis.detailedAnalysis,
          `**Pontos Fortes:** ${analysis.strengths}`,
          `**Melhorias:** ${analysis.improvements}`,
          `**Resumo:** ${analysis.summary}`,
          `**Dica:** ${analysis.tip}`
        ].filter(Boolean).join("\n\n");

        await firestoreService.addBodyProgress(user.uid, {
          photoUrl: compressedBase64,
          bodyFatPercent: parseFloat(analysis.bfEstimate) || undefined,
          weightKg: parseFloat(analysis.weightKg || "") || profile?.weightKg,
          chestCm: parseFloat(analysis.chestCm || "") || undefined,
          waistCm: parseFloat(analysis.waistCm || "") || undefined,
          armCm: parseFloat(analysis.armCm || "") || undefined,
          thighCm: parseFloat(analysis.thighCm || "") || undefined,
          notes: fullNotes,
        });
        
        toast.success("Análise visual concluída! As medidas foram estimadas abaixo.", { id: toastId });
        loadEvolution();
      } catch (err: any) {
        console.error("Erro na análise corporal:", err);
        toast.error(err.message || "Erro ao analisar foto. Tente novamente.", { id: toastId });
      } finally {
        setAnalyzing(false);
      }
    };
    
    try {
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Erro ao processar imagem.", { id: toastId });
      setAnalyzing(false);
    }
  };

  const handleSaveMeasurements = async () => {
    if (!user) return;
    
    // Validação mínima: pelo menos um campo deve estar preenchido
    const hasData = Object.values(measurements).some(v => v !== "");
    if (!hasData) {
      toast.error("Preencha pelo menos um campo para salvar sua evolução.");
      return;
    }

    setAnalyzing(true);
    const toastId = toast.loading("Salvando sua evolução...");
    try {
      await firestoreService.addBodyProgress(user.uid, {
        weightKg: parseFloat(measurements.weightKg) || undefined,
        bodyFatPercent: parseFloat(measurements.bodyFatPercent) || undefined,
        chestCm: parseFloat(measurements.chestCm) || undefined,
        waistCm: parseFloat(measurements.waistCm) || undefined,
        armCm: parseFloat(measurements.armCm) || undefined,
        thighCm: parseFloat(measurements.thighCm) || undefined,
        notes: "Evolução registrada manualmente."
      });
      
      // Limpar campos após salvar
      setMeasurements({
        weightKg: "", bodyFatPercent: "", chestCm: "", waistCm: "", armCm: "", thighCm: ""
      });
      
      toast.success("Evolução salva com sucesso!", { id: toastId });
      loadEvolution();
    } catch (err) {
      toast.error("Erro ao salvar evolução.", { id: toastId });
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Histórico state ─────────────────────────────────────────────────────────
  const [workoutVersions, setWorkoutVersions] = useState<StoredWorkout[]>([]);

  const loadVersions = useCallback(async () => {
    if (!user) return;
    const versions = await firestoreService.listWorkouts(user.uid);
    setWorkoutVersions(versions);
  }, [user]);

  useEffect(() => { if (user) loadVersions(); }, [user, loadVersions]);

  const handleRestore = async (workoutId: string) => {
    if (!user) return;
    try {
      await firestoreService.restoreWorkout(user.uid, workoutId);
      toast.success("Treino restaurado!");
      loadVersions();
    } catch (err) {
      toast.error("Erro ao restaurar treino.");
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-12rem)]">
        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
          {(["chat", "perfil", "evolucao", "historico"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          {activeTab === "chat" && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 custom-scrollbar">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Sparkles className="text-primary w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Seu Personal Trainer IA</h3>
                    <p className="text-gray-500 text-sm max-w-xs">
                      Pergunte sobre exercícios, alimentação ou peça para ajustar seu treino.
                    </p>
                  </div>
                ) : (
                  chatHistory.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-white rounded-tr-none"
                            : "bg-gray-100 text-gray-800 rounded-tl-none"
                        }`}
                      >
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    </div>
                  ))
                )}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-xs text-gray-500">O Coach está pensando...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200">
                <input
                  type="text"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Peça para mudar um exercício..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm p-2"
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="p-2 bg-primary text-white rounded-lg disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {activeTab === "perfil" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nome</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full app-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Idade</label>
                    <input
                      type="number"
                      value={profileForm.age}
                      onChange={e => setProfileForm(prev => ({ ...prev, age: e.target.value }))}
                      className="w-full app-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Sexo</label>
                    <select
                      value={profileForm.sex}
                      onChange={e => setProfileForm(prev => ({ ...prev, sex: e.target.value }))}
                      className="w-full app-input"
                    >
                      <option>Masculino</option>
                      <option>Feminino</option>
                      <option>Outro</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Altura (cm)</label>
                    <input
                      type="number"
                      value={profileForm.heightCm}
                      onChange={e => setProfileForm(prev => ({ ...prev, heightCm: e.target.value }))}
                      className="w-full app-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Peso (kg)</label>
                    <input
                      type="number"
                      value={profileForm.weightKg}
                      onChange={e => setProfileForm(prev => ({ ...prev, weightKg: e.target.value }))}
                      className="w-full app-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Objetivo</label>
                  <select
                    value={profileForm.goal}
                    onChange={e => setProfileForm(prev => ({ ...prev, goal: e.target.value }))}
                    className="w-full app-input"
                  >
                    {GOALS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="w-full btn-primary flex items-center justify-center gap-2"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Perfil"}
              </button>
            </div>
          )}

          {activeTab === "evolucao" && (
            <div className="space-y-6">
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-center">
                <h3 className="font-semibold text-primary mb-2">Análise de Composição Corporal</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tire uma foto de corpo inteiro para a IA estimar seu BF e medidas corporais.
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Camera size={18} />
                    Câmera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={18} />
                    Galeria
                  </button>
                </div>
                <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelect} />
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </div>

              {/* Tarefa 5: Medidas preenchidas pela IA */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Ruler size={18} className="text-primary" />
                  <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Medidas Corporais</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Peso (kg)</label>
                    <input type="number" value={measurements.weightKg} onChange={e => setMeasurements({...measurements, weightKg: e.target.value})} className="w-full app-input text-sm" placeholder="Ex: 75.5" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gordura (%)</label>
                    <input type="number" value={measurements.bodyFatPercent} onChange={e => setMeasurements({...measurements, bodyFatPercent: e.target.value})} className="w-full app-input text-sm" placeholder="Ex: 18" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Peitoral (cm)</label>
                    <input type="number" value={measurements.chestCm} onChange={e => setMeasurements({...measurements, chestCm: e.target.value})} className="w-full app-input text-sm" placeholder="Ex: 100" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cintura (cm)</label>
                    <input type="number" value={measurements.waistCm} onChange={e => setMeasurements({...measurements, waistCm: e.target.value})} className="w-full app-input text-sm" placeholder="Ex: 85" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Braço (cm)</label>
                    <input type="number" value={measurements.armCm} onChange={e => setMeasurements({...measurements, armCm: e.target.value})} className="w-full app-input text-sm" placeholder="Ex: 38" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Coxa (cm)</label>
                    <input type="number" value={measurements.thighCm} onChange={e => setMeasurements({...measurements, thighCm: e.target.value})} className="w-full app-input text-sm" placeholder="Ex: 55" />
                  </div>
                </div>
                <button
                  onClick={handleSaveMeasurements}
                  disabled={analyzing}
                  className="w-full mt-4 py-3 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors"
                >
                  {analyzing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirmar Medidas
                </button>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Histórico de Fotos</h3>
                {evolutionHistory.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Nenhuma análise feita ainda.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {evolutionHistory.map(entry => (
                      <div 
                        key={entry.id} 
                        className="relative bg-gray-50 rounded-xl overflow-hidden border border-gray-100 group"
                      >
                        <div 
                          onClick={() => setSelectedEntry(entry)}
                          className="cursor-pointer hover:opacity-90 transition-all active:scale-[0.98]"
                        >
                          {entry.photoUrl ? (
                            <img src={entry.photoUrl} alt="Evolução" className="w-full h-40 object-cover" />
                          ) : (
                            <div className="w-full h-40 bg-gray-100 flex flex-col items-center justify-center gap-2 text-gray-400">
                              <Ruler size={32} />
                              <span className="text-[10px] font-bold uppercase tracking-widest">Apenas Medidas</span>
                            </div>
                          )}
                          <div className="p-2">
                            <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-400">
                              {new Date(entry.createdAt.toMillis()).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                              {entry.bodyFatPercent && <span className="text-xs font-bold text-primary">{entry.bodyFatPercent}% BF</span>}
                            </div>
                            <p className="text-[10px] text-gray-600 line-clamp-2">{entry.notes}</p>
                          </div>
                        </div>
                        
                        {/* Botão de exclusão direta na miniatura */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEntry(entry.id);
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          title="Excluir avaliação"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {activeTab === "historico" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Versões de treino</h3>
              {!workoutVersions || workoutVersions.length === 0 ? (
                <div className="text-center py-12">
                  <RotateCcw className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Nenhuma versão de treino ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workoutVersions.map(version => (
                    <div
                      key={version.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        version.isActive ? "border-primary bg-primary/5" : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900">{version.title}</h4>
                          <span className="text-[10px] text-gray-400">
                            v{version.version} • {new Date(version.createdAt.toMillis()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {version.isActive ? (
                            <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">ATIVO</span>
                          ) : (
                            <button
                              onClick={() => handleRestore(version.id)}
                              className="text-xs text-primary font-medium hover:underline"
                            >
                              Restaurar
                            </button>
                          )}
                          {!version.isActive && (
                            <button
                              onClick={async () => {
                                if (!user || !window.confirm("Deseja excluir permanentemente esta versão de treino?")) return;
                                try {
                                  await firestoreService.deleteWorkout(user.uid, version.id);
                                  toast.success("Versão excluída!");
                                  loadVersions();
                                } catch (err) {
                                  toast.error("Erro ao excluir.");
                                }
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                              title="Excluir versão"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 italic flex items-start gap-1">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        {version.changeDescription}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Detalhes da Evolução (Fora das abas para garantir visibilidade) */}
        {selectedEntry && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between p-4 border-b">
                <div>
                  <h3 className="font-bold text-gray-900">Detalhes da Avaliação</h3>
                        <p className="text-xs text-gray-400">
                          {new Date(selectedEntry.createdAt.toMillis()).toLocaleString('pt-BR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {selectedEntry.photoUrl && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <img src={selectedEntry.photoUrl} alt="Evolução" className="w-full object-contain bg-black max-h-[400px]" />
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-primary/5 rounded-2xl p-3 text-center border border-primary/10">
                    <span className="block text-[10px] font-bold text-primary uppercase mb-1">Peso</span>
                    <span className="text-lg font-bold text-gray-900">{selectedEntry.weightKg || '--'} <small className="text-[10px] font-normal">kg</small></span>
                  </div>
                  <div className="bg-primary/5 rounded-2xl p-3 text-center border border-primary/10">
                    <span className="block text-[10px] font-bold text-primary uppercase mb-1">BF</span>
                    <span className="text-lg font-bold text-gray-900">{selectedEntry.bodyFatPercent || '--'} <small className="text-[10px] font-normal">%</small></span>
                  </div>
                  <div className="bg-primary/5 rounded-2xl p-3 text-center border border-primary/10">
                    <span className="block text-[10px] font-bold text-primary uppercase mb-1">Cintura</span>
                    <span className="text-lg font-bold text-gray-900">{selectedEntry.waistCm || '--'} <small className="text-[10px] font-normal">cm</small></span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Peitoral</span>
                    <span className="text-sm font-bold text-gray-900">{selectedEntry.chestCm || '--'} <small className="text-[10px] font-normal">cm</small></span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Braço</span>
                    <span className="text-sm font-bold text-gray-900">{selectedEntry.armCm || '--'} <small className="text-[10px] font-normal">cm</small></span>
                  </div>
                  <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Coxa</span>
                    <span className="text-sm font-bold text-gray-900">{selectedEntry.thighCm || '--'} <small className="text-[10px] font-normal">cm</small></span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <Info size={14} className="text-primary" />
                    Análise da IA
                  </h4>
                  <div className="prose prose-sm text-gray-700 max-w-none">
                    <Streamdown>{selectedEntry.notes || ""}</Streamdown>
                  </div>
                </div>
              </div>

                    <div className="p-6 pb-10 border-t bg-white flex flex-col gap-3 sticky bottom-0 mt-auto">
                      <button 
                        onClick={() => handleDeleteEntry(selectedEntry.id)}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-[0.98] shadow-lg shadow-red-200"
                      >
                        <Trash2 size={18} />
                        EXCLUIR ESTA AVALIAÇÃO
                      </button>
                      <button 
                        onClick={() => setSelectedEntry(null)}
                        className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
                      >
                        Voltar
                      </button>
                    </div>
            </div>
          </div>
        )}

          {activeTab === "historico" && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 mb-3">Versões de treino</h3>
              {!workoutVersions || workoutVersions.length === 0 ? (
                <div className="text-center py-12">
                  <RotateCcw className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Nenhuma versão de treino ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workoutVersions.map(version => (
                    <div
                      key={version.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        version.isActive ? "border-primary bg-primary/5" : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900">{version.title}</h4>
                          <span className="text-[10px] text-gray-400">
                            v{version.version} • {new Date(version.createdAt.toMillis()).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {version.isActive ? (
                            <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">ATIVO</span>
                          ) : (
                            <button
                              onClick={() => handleRestore(version.id)}
                              className="text-xs text-primary font-medium hover:underline"
                            >
                              Restaurar
                            </button>
                          )}
                          {!version.isActive && (
                            <button
                              onClick={async () => {
                                if (!user || !window.confirm("Deseja excluir permanentemente esta versão de treino?")) return;
                                try {
                                  await firestoreService.deleteWorkout(user.uid, version.id);
                                  toast.success("Versão excluída!");
                                  loadVersions();
                                } catch (err) {
                                  toast.error("Erro ao excluir.");
                                }
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                              title="Excluir versão"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 italic flex items-start gap-1">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        {version.changeDescription}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      {/* Modal de Detalhes da Evolução (Fora das abas para garantir visibilidade) */}
      {selectedEntry && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">Detalhes da Avaliação</h3>
                <p className="text-xs text-gray-400">
                  {new Date(selectedEntry.createdAt.toMillis()).toLocaleString('pt-BR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
              {selectedEntry.photoUrl && (
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  <img src={selectedEntry.photoUrl} alt="Evolução" className="w-full h-64 object-cover" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary/5 rounded-2xl p-3 text-center border border-primary/10">
                  <span className="block text-[10px] font-bold text-primary uppercase mb-1">Peso</span>
                  <span className="text-lg font-bold text-gray-900">{selectedEntry.weightKg || '--'} <small className="text-[10px] font-normal">kg</small></span>
                </div>
                <div className="bg-primary/5 rounded-2xl p-3 text-center border border-primary/10">
                  <span className="block text-[10px] font-bold text-primary uppercase mb-1">BF</span>
                  <span className="text-lg font-bold text-gray-900">{selectedEntry.bodyFatPercent || '--'} <small className="text-[10px] font-normal">%</small></span>
                </div>
                <div className="bg-primary/5 rounded-2xl p-3 text-center border border-primary/10">
                  <span className="block text-[10px] font-bold text-primary uppercase mb-1">Cintura</span>
                  <span className="text-lg font-bold text-gray-900">{selectedEntry.waistCm || '--'} <small className="text-[10px] font-normal">cm</small></span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Peitoral</span>
                  <span className="text-sm font-bold text-gray-900">{selectedEntry.chestCm || '--'} <small className="text-[10px] font-normal">cm</small></span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Braço</span>
                  <span className="text-sm font-bold text-gray-900">{selectedEntry.armCm || '--'} <small className="text-[10px] font-normal">cm</small></span>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Coxa</span>
                  <span className="text-sm font-bold text-gray-900">{selectedEntry.thighCm || '--'} <small className="text-[10px] font-normal">cm</small></span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <Info size={14} className="text-primary" />
                  Análise da IA
                </h4>
                <div className="prose prose-sm text-gray-700 max-w-none">
                  <Streamdown>{selectedEntry.notes || ""}</Streamdown>
                </div>
              </div>
            </div>

            <div className="p-6 pb-10 border-t bg-white flex flex-col gap-3 sticky bottom-0 mt-auto">
              <button 
                onClick={() => handleDeleteEntry(selectedEntry.id)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-600 transition-all active:scale-[0.98] shadow-lg shadow-red-200"
              >
                <Trash2 size={18} />
                EXCLUIR ESTA AVALIAÇÃO
              </button>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-200 transition-all"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
