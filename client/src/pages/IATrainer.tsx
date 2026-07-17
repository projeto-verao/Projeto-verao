import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { geminiService } from "@/lib/gemini";
import { firestoreService, ChatMessageEntry, BodyProgressEntry, StoredWorkout } from "@/hooks/useFirebaseFirestore";
import { ArrowLeft, Send, Loader2, Camera, Upload, ChevronDown, RotateCcw, Sparkles, Info, Ruler, CheckCircle2, X, Trash2, Dumbbell } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { imageService } from "@/lib/ImageService";

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

      // Contexto do treino ativo e histórico de cargas para que a IA possa analisar a evolução
      let workoutContext: string | undefined;
      let activeWorkout: StoredWorkout | null = null;
      try {
        activeWorkout = await firestoreService.getActiveWorkout(user.uid);
        const lastLoads = await firestoreService.getLastExerciseLoads(user.uid);
        
        if (activeWorkout) {
          workoutContext = JSON.stringify({
            title: activeWorkout.title,
            days: activeWorkout.days,
            lastExerciseLoads: lastLoads // Injetando o histórico de cargas no contexto da IA
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
    
    try {
      // 1. Redimensionar e comprimir imagem para IA (base64)
      const compressedBase64 = await imageService.resizeImage(file, 800, 0.7);

      // 2. IA analisa foto e retorna estimativas de medidas
      const analysis = await geminiService.analyzeBody(compressedBase64, profile as any);
      
      // 3. Validação de imagem humana
      if (analysis.isValidHumanBody === false) {
        toast.error(analysis.rejectionReason || "A foto enviada não parece ser de uma pessoa para avaliação física.", { id: toastId });
        setAnalyzing(false);
        return;
      }

      // 4. Upload da imagem original para o Cloudinary (com compressão leve)
      const storagePath = `users/${user.uid}/evolution/${new Date().toISOString().replace(/:/g, '-')}.jpg`;
      const compressedForStorage = await imageService.resizeImage(file, 1200, 0.8);
      const photoUrl = await imageService.uploadImage(compressedForStorage, storagePath);

      // 5. Atualiza o estado de measurements com TODAS as estimativas da IA
      setMeasurements({
        weightKg: analysis.weightKg || profile?.weightKg?.toString() || "",
        bodyFatPercent: analysis.bfEstimate || "",
        chestCm: analysis.chestCm || "",
        waistCm: analysis.waistCm || "",
        armCm: analysis.armCm || "",
        thighCm: analysis.thighCm || ""
      });

      // 6. Constrói a nota detalhada para o histórico
      const fullNotes = [
        analysis.detailedAnalysis,
        `**Pontos Fortes:** ${analysis.strengths}`,
        `**Melhorias:** ${analysis.improvements}`,
        `**Resumo:** ${analysis.summary}`,
        `**Dica:** ${analysis.tip}`
      ].filter(Boolean).join("\n\n");

      // 7. Salva no Firestore com a URL segura (Cloudinary)
      await firestoreService.addBodyProgress(user.uid, {
        photoUrl: photoUrl || undefined,
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

      // Invalida o cache da sugestão IA dos Lembretes para que seja
      // regenerada com os dados mais recentes na próxima visita
      firestoreService.clearReminderAiSuggestion(user.uid).catch(() => {});
      
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
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="user"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>

              {/* Grid de Medidas (Editável) */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Ruler className="text-gray-400 w-4 h-4" />
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Medidas Atuais</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: "Peso (kg)", key: "weightKg" },
                    { label: "BF (%)", key: "bodyFatPercent" },
                    { label: "Peito (cm)", key: "chestCm" },
                    { label: "Cintura (cm)", key: "waistCm" },
                    { label: "Braço (cm)", key: "armCm" },
                    { label: "Coxa (cm)", key: "thighCm" },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">{field.label}</label>
                      <input
                        type="number"
                        step="0.1"
                        value={measurements[field.key as keyof typeof measurements]}
                        onChange={(e) => setMeasurements(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder="--"
                        className="w-full bg-white border-gray-200 rounded-xl text-sm focus:ring-primary focus:border-primary"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSaveMeasurements}
                  disabled={analyzing}
                  className="w-full mt-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  Salvar Medidas Manualmente
                </button>
              </div>

              {/* Histórico Visual */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  Histórico de Evolução
                  <span className="text-xs font-normal text-gray-500">({evolutionHistory.length} registros)</span>
                </h4>
                
                <div className="grid grid-cols-1 gap-4">
                  {evolutionHistory.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <p className="text-sm text-gray-500">Nenhum registro de evolução ainda.</p>
                    </div>
                  ) : (
                    evolutionHistory.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer group shadow-sm"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-50">
                          {entry.photoUrl ? (
                            <img src={entry.photoUrl} alt="Evolução" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Dumbbell size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-gray-400 uppercase">
                              {new Date(entry.createdAt.toMillis()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                            {entry.bodyFatPercent && (
                              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {entry.bodyFatPercent}% BF
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">
                            {entry.weightKg ? `${entry.weightKg}kg` : "Apenas medidas"}
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {entry.notes || "Sem observações"}
                          </p>
                        </div>
                        <ChevronDown size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "historico" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
                <Info className="text-amber-500 w-5 h-5 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Aqui você encontra todas as versões de treinos geradas pela IA. Você pode restaurar qualquer versão anterior se preferir.
                </p>
              </div>

              <div className="space-y-3">
                {workoutVersions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">Nenhum histórico de treino encontrado.</p>
                  </div>
                ) : (
                  workoutVersions.map((v) => (
                    <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900">{v.title}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">
                            {new Date(v.createdAt.toMillis()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {v.isActive && (
                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <CheckCircle2 size={10} /> ATIVO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                        {v.changeDescription || "Treino inicial gerado pela IA."}
                      </p>
                      {!v.isActive && (
                        <button
                          onClick={() => handleRestore(v.id)}
                          className="w-full py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <RotateCcw size={14} /> Restaurar esta versão
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes da Evolução */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md p-4 border-b border-gray-100 flex justify-between items-center z-10">
              <h3 className="font-bold text-gray-900">Detalhes da Evolução</h3>
              <button onClick={() => setSelectedEntry(null)} className="p-2 bg-gray-100 rounded-full text-gray-500">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {selectedEntry.photoUrl && (
                <div className="aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100 border border-gray-100 shadow-inner">
                  <img src={selectedEntry.photoUrl} alt="Evolução" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Peso", value: selectedEntry.weightKg ? `${selectedEntry.weightKg}kg` : "--" },
                  { label: "BF", value: selectedEntry.bodyFatPercent ? `${selectedEntry.bodyFatPercent}%` : "--" },
                  { label: "Cintura", value: selectedEntry.waistCm ? `${selectedEntry.waistCm}cm` : "--" },
                  { label: "Braço", value: selectedEntry.armCm ? `${selectedEntry.armCm}cm` : "--" },
                  { label: "Coxa", value: selectedEntry.thighCm ? `${selectedEntry.thighCm}cm` : "--" },
                  { label: "Peito", value: selectedEntry.chestCm ? `${selectedEntry.chestCm}cm` : "--" },
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-50 rounded-2xl p-3 text-center border border-gray-100/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{stat.label}</p>
                    <p className="text-sm font-bold text-gray-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-primary/5 rounded-3xl p-5 border border-primary/10">
                <h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                  <Sparkles size={16} /> Análise do Coach
                </h4>
                <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none">
                  <Streamdown>{selectedEntry.notes || "Nenhuma observação registrada."}</Streamdown>
                </div>
              </div>

              <button
                onClick={() => handleDeleteEntry(selectedEntry.id)}
                className="w-full py-4 text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-all"
              >
                <Trash2 size={18} /> Excluir este registro
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
