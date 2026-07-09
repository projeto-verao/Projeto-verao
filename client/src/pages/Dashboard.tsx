import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { geminiService } from "@/lib/gemini";
import { firestoreService, StoredWorkout } from "@/hooks/useFirebaseFirestore";
import {
  Utensils, Target, RefreshCw, Loader2, ChevronRight, Timer, X, Sparkles, Activity, Trash2, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, profile, isAuthenticated, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [restTimer, setRestTimer] = useState<{ seconds: number; isActive: boolean } | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeWorkout, setActiveWorkout] = useState<StoredWorkout | null>(null);
  const [workoutLoading, setWorkoutLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [weekCompleted, setWeekCompleted] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const target = profile?.daysPerWeek || 4;

  // ── Carregar treino ativo e progresso semanal do Firestore ────────────────
  const loadData = useCallback(async () => {
    if (!user) return;
    setWorkoutLoading(true);
    try {
      const [workout, completions] = await Promise.all([
        firestoreService.getActiveWorkout(user.uid),
        firestoreService.getWeekCompletions(user.uid),
      ]);
      setActiveWorkout(workout);
      setWeekCompleted(completions.length);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setWorkoutLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // ── Gerar treino com IA (Gemini direto) ────────────────────────────────────
  const handleGenerateWorkout = async () => {
    if (!user) return;
    if (!profile?.goal) {
      toast.error("Complete seu perfil primeiro para gerar o treino.");
      navigate("/onboarding");
      return;
    }
    setGenerating(true);
    const toastId = toast.loading("A IA está montando seu treino personalizado...");
    try {
      const generated = await geminiService.generateWorkout(profile as any);
      await firestoreService.createWorkout(user.uid, {
        title: generated.title,
        days: generated.days,
        changeDescription: "Treino gerado pela IA",
      });
      toast.success("Novo treino gerado com sucesso!", { id: toastId });
      setCompletedSets({});
      setSelectedDay(null);
      await loadData();
    } catch (err) {
      console.error("Erro ao gerar treino:", err);
      const msg = err instanceof Error ? err.message : "Erro ao gerar treino. Tente novamente.";
      toast.error(msg, { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  // ── Excluir treino ativo ───────────────────────────────────────────────────
  const handleDeleteWorkout = async () => {
    if (!user || !activeWorkout) return;
    try {
      await firestoreService.deleteWorkout(user.uid, activeWorkout.id);
      toast.success("Treino excluído.");
      setConfirmDelete(false);
      setCompletedSets({});
      setSelectedDay(null);
      await loadData();
    } catch (err) {
      console.error("Erro ao excluir treino:", err);
      toast.error("Erro ao excluir treino. Tente novamente.");
    }
  };

  // ── Concluir dia de treino ─────────────────────────────────────────────────
  const handleCompleteDay = async (dayNumber: number, totalExercises: number) => {
    if (!user || !activeWorkout) return;
    try {
      await firestoreService.addWorkoutCompletion(user.uid, {
        workoutId: activeWorkout.id,
        day: dayNumber,
        completedExercises: totalExercises,
        totalExercises,
        duration: profile?.minutesPerSession || 60,
      });
      toast.success(`Treino do dia ${dayNumber} concluído! 🎉`);
      await loadData();
    } catch (err) {
      console.error("Erro ao registrar conclusão:", err);
      toast.error("Erro ao registrar conclusão do treino.");
    }
  };

  // ── Timer de descanso ──────────────────────────────────────────────────────
  useEffect(() => {
    if (restTimer?.isActive && restTimer.seconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setRestTimer(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
      }, 1000);
    } else if (restTimer?.seconds === 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      toast.info("Descanso finalizado! Próxima série.");
      setRestTimer(null);
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [restTimer]);

  const toggleSet = (exerciseId: string, setIdx: number, restTime: string) => {
    const key = `${exerciseId}-${setIdx}`;
    const isNowCompleted = !completedSets[key];
    setCompletedSets(prev => ({ ...prev, [key]: isNowCompleted }));
    if (isNowCompleted) {
      const seconds = parseInt(restTime) || 60;
      setRestTimer({ seconds, isActive: true });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const days = activeWorkout?.days || [];

  return (
    <AppLayout>
      {/* Rest Timer Overlay */}
      {restTimer && (
        <div className="fixed inset-x-0 top-0 z-[100] p-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-black text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Timer size={20} className="text-orange-400 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Descanso Ativo</p>
                <p className="text-xl font-mono font-bold">{Math.floor(restTimer.seconds / 60)}:{(restTimer.seconds % 60).toString().padStart(2, '0')}</p>
              </div>
            </div>
            <button onClick={() => setRestTimer(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-6" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-gray-900 text-lg mb-2">Excluir treino?</h3>
            <p className="text-sm text-gray-500 mb-6">Esta ação não pode ser desfeita. Você poderá gerar um novo treino a qualquer momento.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-2xl font-bold bg-gray-100 text-gray-700">Cancelar</button>
              <button onClick={handleDeleteWorkout} className="flex-1 py-3 rounded-2xl font-bold bg-red-500 text-white">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">OLÁ, {profile?.name?.split(' ')[0]?.toUpperCase() || 'ATLETA'}!</h1>
            <p className="text-sm text-gray-500 font-medium">Sua rotina de treinos está pronta.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/nutrition")} className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center shadow-sm">
              <Utensils size={18} className="text-gray-600" />
            </button>
            <button onClick={() => navigate("/goals")} className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center shadow-sm">
              <Target size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5 pb-24">
        {/* Weekly Progress Card */}
        <div className="bg-black rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progresso Semanal</span>
              <span className="text-orange-500 font-black text-xl">{Math.min(weekCompleted, target)}/{target}</span>
            </div>
            <div className="flex gap-2 mb-2">
              {Array.from({ length: target }).map((_, i) => (
                <div key={i} className={`h-2.5 flex-1 rounded-full ${i < weekCompleted ? "bg-orange-500" : "bg-white/10"}`} />
              ))}
            </div>
            <p className="text-[10px] text-white/40 font-medium">
              {weekCompleted >= target ? "Meta da semana batida! 🎉" : `Faltam ${target - weekCompleted} treinos para bater sua meta!`}
            </p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Activity size={120} />
          </div>
        </div>

        {/* Workout Content */}
        {workoutLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-gray-100">
            <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Carregando Rotina...</p>
          </div>
        ) : days.length === 0 ? (
          <div className="bg-white rounded-[32px] p-10 flex flex-col items-center text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-[28px] flex items-center justify-center mb-6">
              <Sparkles size={40} className="text-orange-300" />
            </div>
            <h3 className="font-black text-gray-900 text-lg">VAMOS COMEÇAR?</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-[240px]">Sua IA ainda não gerou seu treino personalizado baseado no seu perfil.</p>
            <button
              onClick={handleGenerateWorkout}
              disabled={generating}
              className="mt-8 w-full bg-black text-white py-5 rounded-3xl font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {generating ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
              {generating ? "GERANDO TREINO..." : "GERAR TREINO COM IA"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sua Planilha</h2>
                <p className="text-sm font-black text-gray-900">{activeWorkout?.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateWorkout}
                  disabled={generating}
                  className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1 disabled:opacity-50"
                >
                  {generating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  {generating ? "Gerando..." : "Regenerar"}
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1"
                >
                  <Trash2 size={10} /> Excluir
                </button>
              </div>
            </div>

            {days.map((day) => (
              <div key={day.dayNumber} className={`bg-white border transition-all duration-300 rounded-[32px] p-5 shadow-sm ${selectedDay === day.dayNumber ? "border-black ring-1 ring-black" : "border-gray-100"}`}>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setSelectedDay(selectedDay === day.dayNumber ? null : day.dayNumber)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-3xl shadow-inner">
                      {day.emoji || "💪"}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Dia {day.dayNumber}</span>
                      <h4 className="font-black text-gray-900 leading-tight text-lg">{day.title?.toUpperCase()}</h4>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform ${selectedDay === day.dayNumber ? "rotate-90 bg-black text-white" : "text-gray-300"}`}>
                    <ChevronRight size={18} />
                  </div>
                </div>

                {selectedDay === day.dayNumber && (
                  <div className="mt-8 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                    {day.exercises.map((ex, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-black text-gray-900 text-sm leading-tight mb-1">{ex.name?.toUpperCase()}</h5>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {ex.reps} reps · {ex.weight} · {ex.rest} de descanso
                            </p>
                            {ex.notes && <p className="text-[11px] text-gray-500 mt-1 italic">{ex.notes}</p>}
                          </div>
                          <span className="text-[10px] bg-black text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-tighter shrink-0">{ex.sets} séries</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: ex.sets }).map((_, sIdx) => {
                            const isDone = completedSets[`${day.dayNumber}-${idx}-${sIdx}`];
                            return (
                              <button
                                key={sIdx}
                                onClick={() => toggleSet(`${day.dayNumber}-${idx}`, sIdx, ex.rest)}
                                className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center text-xs font-black transition-all ${
                                  isDone ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200" : "bg-white border-gray-100 text-gray-300 hover:border-black hover:text-black"
                                }`}
                              >
                                {isDone ? "✓" : sIdx + 1}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Botão de concluir treino do dia */}
                    <button
                      onClick={() => handleCompleteDay(day.dayNumber, day.exercises.length)}
                      className="w-full bg-green-500 text-white py-4 rounded-3xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} />
                      CONCLUIR TREINO DO DIA {day.dayNumber}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
