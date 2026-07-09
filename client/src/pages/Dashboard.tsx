import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { geminiService } from "@/lib/gemini";
import { firestoreService, StoredWorkout } from "@/hooks/useFirebaseFirestore";
import {
  Utensils, Target, RefreshCw, Loader2, ChevronRight, Timer, X, Sparkles, Activity, Trash2, CheckCircle2, Play, Trophy
} from "lucide-react";
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";

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
  const [currentWeek, setCurrentWeek] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [nextWorkoutInfo, setNextWorkoutInfo] = useState<{ dayTitle: string; timing: string; duration?: string } | null>(null);

  // ── Estados do Cronômetro de Treino ────────────────────────────────────────
  const [isTraining, setIsTraining] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const workoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<{
    duration: string;
    nextWorkout: string;
    nextTiming: string;
  } | null>(null);

  const target = profile?.daysPerWeek || 4;

  // ── Carregar treino ativo e persistência do cronômetro ─────────────────────
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

      // Recuperar estado do cronômetro do localStorage
      const savedStartTime = localStorage.getItem(`workout_start_${user.uid}`);
      const savedIsTraining = localStorage.getItem(`workout_active_${user.uid}`);
      const savedSelectedDay = localStorage.getItem(`workout_day_${user.uid}`);

      if (savedIsTraining === "true" && savedStartTime) {
        const start = parseInt(savedStartTime);
        setWorkoutStartTime(start);
        setIsTraining(true);
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
        if (savedSelectedDay) setSelectedDay(parseInt(savedSelectedDay));
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setWorkoutLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Efeito para atualizar o cronômetro em tempo real
  useEffect(() => {
    if (isTraining && workoutStartTime) {
      workoutTimerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
    } else {
      if (workoutTimerRef.current) clearInterval(workoutTimerRef.current);
    }
    return () => { if (workoutTimerRef.current) clearInterval(workoutTimerRef.current); };
  }, [isTraining, workoutStartTime]);

  const formatDuration = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds} segundos`;
    return `${minutes} minutos e ${seconds.toString().padStart(2, '0')} segundos`;
  };

  // ── Iniciar Treino ─────────────────────────────────────────────────────────
  const handleStartWorkout = (dayNumber: number) => {
    if (!user) return;
    const now = Date.now();
    setIsTraining(true);
    setWorkoutStartTime(now);
    setElapsedSeconds(0);
    setSelectedDay(dayNumber);

    // Persistir no localStorage
    localStorage.setItem(`workout_active_${user.uid}`, "true");
    localStorage.setItem(`workout_start_${user.uid}`, now.toString());
    localStorage.setItem(`workout_day_${user.uid}`, dayNumber.toString());

    toast.success("Treino iniciado! O cronômetro está rodando.");
  };

  // ── Gerar treino com IA ────────────────────────────────────────────────────
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
        days: generated.days as any,
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
    if (!user || !activeWorkout || !workoutStartTime) return;
    
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - workoutStartTime) / 1000);
    const durationText = formatDuration(durationSeconds);

    try {
      await firestoreService.addWorkoutCompletion(user.uid, {
        workoutId: activeWorkout.id,
        day: dayNumber,
        completedExercises: totalExercises,
        totalExercises,
        duration: durationSeconds,
        startTime: Timestamp.fromMillis(workoutStartTime),
        endTime: Timestamp.fromMillis(endTime),
        workoutTitle: activeWorkout.days.find(d => d.dayNumber === dayNumber)?.title || "Treino"
      });

      // Limpar estado do cronômetro
      setIsTraining(false);
      setWorkoutStartTime(null);
      setElapsedSeconds(0);
      localStorage.removeItem(`workout_active_${user.uid}`);
      localStorage.removeItem(`workout_start_${user.uid}`);
      localStorage.removeItem(`workout_day_${user.uid}`);

      // Fechar automaticamente a tela do treino e limpar estado
      setSelectedDay(null);
      setCompletedSets({});
      setRestTimer(null);

      await loadData();

      // Identificar próximo treino
      const days = activeWorkout.days || [];
      const nextDayIndex = days.findIndex(d => d.dayNumber > dayNumber);
      const hasMoreDaysThisWeek = nextDayIndex !== -1;
      
      let nextTitle = "";
      let nextTiming = "";

      if (hasMoreDaysThisWeek) {
        const nextDay = days[nextDayIndex];
        nextTitle = nextDay.title || `Treino do dia ${nextDay.dayNumber}`;
        nextTiming = (weekCompleted + 1 < target) ? "Amanhã" : "Na próxima semana";
      } else {
        nextTitle = days[0]?.title || "Dia 1";
        nextTiming = "Início de um novo ciclo!";
      }

      setCompletionSummary({
        duration: durationText,
        nextWorkout: nextTitle,
        nextTiming: nextTiming
      });
      setShowCompletionModal(true);

    } catch (err) {
      console.error("Erro ao registrar conclusão:", err);
      toast.error("Erro ao registrar conclusão do treino.");
    }
  };

  const handleMarkAllSetsOfExercise = (dayNumber: number, exerciseIdx: number, totalSets: number) => {
    const newCompleted = { ...completedSets };
    for (let sIdx = 0; sIdx < totalSets; sIdx++) {
      const key = `${dayNumber}-${exerciseIdx}-${sIdx}`;
      newCompleted[key] = true;
    }
    setCompletedSets(newCompleted);
    toast.success("Todas as séries marcadas como concluídas!");
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

  const toggleSet = (dayNumber: number, exerciseIdx: number, setIdx: number, restTime: string) => {
    const key = `${dayNumber}-${exerciseIdx}-${setIdx}`;
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

      {/* Workout Timer Floating Bar */}
      {isTraining && !selectedDay && (
        <div className="fixed inset-x-0 bottom-24 z-[90] px-5 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-orange-500 text-white rounded-2xl p-4 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity size={20} className="animate-pulse" />
              <div>
                <p className="text-[10px] font-bold uppercase">Treino em Andamento</p>
                <p className="text-lg font-mono font-bold">
                  {Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}:
                  {Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:
                  {(elapsedSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => {
                const savedDay = localStorage.getItem(`workout_day_${user?.uid}`);
                if (savedDay) setSelectedDay(parseInt(savedDay));
              }}
              className="bg-white text-orange-500 px-4 py-2 rounded-xl text-xs font-bold uppercase"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && completionSummary && (
        <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy size={48} className="text-green-500" />
            </div>
            <h3 className="font-black text-gray-900 text-2xl mb-2">🎉 PARABÉNS!</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Você concluiu o treino de hoje!<br/>
              <span className="font-bold text-gray-900">Tempo total: {completionSummary.duration}.</span>
            </p>
            
            <div className="bg-gray-50 rounded-3xl p-5 mb-8 text-left border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Próximo Desafio</p>
              <p className="font-black text-gray-900">{completionSummary.nextWorkout}</p>
              <p className="text-xs text-green-600 font-bold">{completionSummary.nextTiming}</p>
            </div>

            <p className="text-sm text-gray-500 mb-8 italic">
              "Continue assim! Cada treino concluído é um passo a mais em direção ao seu objetivo."
            </p>

            <button 
              onClick={() => setShowCompletionModal(false)}
              className="w-full py-5 rounded-[24px] font-black bg-black text-white shadow-xl active:scale-95 transition-all"
            >
              VAMOS NESSA!
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
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Semana {currentWeek} — Progresso
              </span>
              <span className="text-orange-500 font-black text-xl">{Math.min(weekCompleted, target)}/{target}</span>
            </div>
            <div className="flex gap-2 mb-2">
              {Array.from({ length: target }).map((_, i) => (
                <div key={i} className={`h-2.5 flex-1 rounded-full ${i < weekCompleted ? "bg-orange-500" : "bg-white/10"}`} />
              ))}
            </div>
            <p className="text-[10px] text-white/40 font-medium">
              {weekCompleted >= target
                ? "Meta da semana batida! Nova semana iniciada. 🎉"
                : `Faltam ${target - weekCompleted} treinos para bater sua meta!`}
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
              <Sparkles className="text-gray-200" size={32} />
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
                  <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform ${selectedDay === day.dayNumber ? "rotate-90 bg-black" : ""}`}>
                    <ChevronRight size={18} className={selectedDay === day.dayNumber ? "text-white" : "text-gray-400"} />
                  </div>
                </div>

                {selectedDay === day.dayNumber && (
                  <div className="mt-8 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                    
                    {/* Botão de Iniciar Treino (Cronômetro) */}
                    {!isTraining && (
                      <button
                        onClick={() => handleStartWorkout(day.dayNumber)}
                        className="w-full bg-black text-white py-4 rounded-3xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mb-4"
                      >
                        <Play size={18} fill="white" />
                        INICIAR TREINO AGORA
                      </button>
                    )}

                    {/* Cronômetro Ativo na tela do treino */}
                    {isTraining && (
                      <div className="bg-orange-50 rounded-3xl p-5 border border-orange-100 flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Timer size={20} className="text-orange-500 animate-pulse" />
                          <div>
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Tempo de Treino</p>
                            <p className="text-xl font-mono font-bold text-orange-600">
                              {Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}:
                              {Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:
                              {(elapsedSeconds % 60).toString().padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                          <button
                            onClick={() => handleMarkAllSetsOfExercise(day.dayNumber, idx, ex.sets)}
                            className="text-[10px] bg-black text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-tighter shrink-0 hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
                          >
                            {ex.sets} séries
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: ex.sets }).map((_, sIdx) => {
                            const isDone = completedSets[`${day.dayNumber}-${idx}-${sIdx}`];
                            return (
                              <button
                                key={sIdx}
                                onClick={() => toggleSet(day.dayNumber, idx, sIdx, ex.rest)}
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
                    {isTraining && (
                      <button
                        onClick={() => handleCompleteDay(day.dayNumber, day.exercises.length)}
                        className="w-full bg-green-500 text-white py-4 rounded-3xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        CONCLUIR TREINO DO DIA {day.dayNumber}
                      </button>
                    )}
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
