import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import {
  Utensils, Target, History, RefreshCw, CheckCircle2, Dumbbell, Loader2, ChevronRight, Timer, X
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Dashboard() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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

  const { data: profile } = trpc.profile.get.useQuery();
  const { data: activeWorkout, isLoading: workoutLoading, refetch: refetchWorkout } = trpc.workout.getActive.useQuery();
  const { data: weekProgress, refetch: refetchProgress } = trpc.workout.weekProgress.useQuery();

  const generateWorkout = trpc.workout.generate.useMutation({
    onSuccess: () => {
      toast.success("Novo treino gerado!");
      refetchWorkout();
    },
    onError: () => toast.error("Erro ao gerar treino."),
  });

  const completeWorkout = trpc.workout.complete.useMutation({
    onSuccess: () => {
      toast.success("Treino marcado como concluído!");
      refetchProgress();
    },
  });

  const completed = weekProgress?.completed ?? 0;
  const target = weekProgress?.target ?? 4;

  // Parse workout JSON
  let workoutData: any = null;
  try {
    if (activeWorkout?.content) {
      workoutData = JSON.parse(activeWorkout.content);
    }
  } catch (e) {
    // Fallback to plain text if not JSON
    workoutData = { title: activeWorkout?.title, content: activeWorkout?.content };
  }

  const nextWorkoutDay = workoutData?.days?.[completed % (workoutData.days.length || 1)];

  // Timer Logic
  useEffect(() => {
    if (restTimer?.isActive && restTimer.seconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setRestTimer(prev => prev ? { ...prev, seconds: prev.seconds - 1 } : null);
      }, 1000);
    } else if (restTimer?.seconds === 0) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      toast.info("Descanso finalizado! Próxima série.");
      setRestTimer(null);
      // Play a subtle sound or vibrate if possible
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(200);
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

  const completeAllSets = (exerciseId: string, numSets: number, restTime: string) => {
    const newSets = { ...completedSets };
    let anyNewlyCompleted = false;

    for (let i = 0; i < numSets; i++) {
      const key = `${exerciseId}-${i}`;
      if (!newSets[key]) {
        newSets[key] = true;
        anyNewlyCompleted = true;
      }
    }

    if (anyNewlyCompleted) {
      setCompletedSets(newSets);
      const seconds = parseInt(restTime) || 60;
      setRestTimer({ seconds, isActive: true });
      toast.success("Exercício concluído!");
    }
  };

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

      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meu Treino</h1>
            {profile?.goal && (
              <p className="text-sm text-gray-500">{profile.goal}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/nutrition")} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Utensils size={18} className="text-gray-600" />
            </button>
            <button onClick={() => navigate("/goals")} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Target size={18} className="text-gray-600" />
            </button>
            <button onClick={() => navigate("/history")} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <History size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 pb-10">
        {/* Weekly Progress Card */}
        <div className="dark-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Progresso da Semana</span>
            <span className="text-white font-bold text-lg">{completed}/{target}</span>
          </div>
          <div className="flex gap-2 mb-3">
            {Array.from({ length: target }).map((_, i) => (
              <div key={i} className={`week-bar h-8 flex-1 rounded ${i < completed ? "done" : "pending"}`} />
            ))}
          </div>
        </div>

        {/* Next Workout Highlight */}
        {nextWorkoutDay && !selectedDay && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Próximo Treino</h2>
            <div 
              className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg cursor-pointer active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)" }}
              onClick={() => setSelectedDay(nextWorkoutDay.dayNumber)}
            >
              <div className="relative z-10">
                <span className="text-sm font-medium opacity-90">Dia {nextWorkoutDay.dayNumber}</span>
                <h3 className="text-2xl font-bold mt-1">{nextWorkoutDay.title}</h3>
                <p className="text-sm mt-1 opacity-90">{nextWorkoutDay.exercises?.length || 0} exercícios · Toque para iniciar</p>
              </div>
              <span className="absolute -right-2 -bottom-2 text-7xl opacity-40 select-none">{nextWorkoutDay.emoji || "💪"}</span>
            </div>
          </div>
        )}

        {/* Workout List */}
        <div>
          <div className="flex items-center justify-between mb-3 mt-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Todos os Treinos</h2>
            <button
              onClick={() => generateWorkout.mutate()}
              disabled={generateWorkout.isPending}
              className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold"
            >
              {generateWorkout.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Gerar novo
            </button>
          </div>

          {workoutLoading ? (
            <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-gray-300" /></div>
          ) : !workoutData?.days ? (
            <div className="empty-state">
              <Dumbbell size={40} className="text-gray-200 mb-3" />
              <p className="text-gray-400 font-medium">Nenhum treino estruturado</p>
              <button onClick={() => generateWorkout.mutate()} className="text-black text-sm font-bold mt-2 underline">Gerar agora</button>
            </div>
          ) : (
            <div className="space-y-3">
              {workoutData.days.map((day: any) => (
                <div key={day.dayNumber}>
                  <div 
                    className="app-card flex items-center justify-between cursor-pointer active:bg-gray-50"
                    onClick={() => setSelectedDay(selectedDay === day.dayNumber ? null : day.dayNumber)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ background: "linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%)" }}>
                        {day.emoji || "💪"}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dia {day.dayNumber}</span>
                        <h4 className="font-bold text-gray-900 leading-tight">{day.title}</h4>
                        <p className="text-xs text-gray-500">{day.exercises?.length || 0} exercícios</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className={`text-gray-300 transition-transform ${selectedDay === day.dayNumber ? "rotate-90" : ""}`} />
                  </div>

                  {/* Exercise Details */}
                  {selectedDay === day.dayNumber && (
                    <div className="mt-3 space-y-3 pl-2 border-l-2 border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      {day.exercises.map((ex: any, idx: number) => {
                        const exId = `${day.dayNumber}-${idx}`;
                        return (
                          <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-start justify-between">
                              <div className="flex gap-3">
                                <button 
                                  onClick={() => completeAllSets(exId, ex.sets, ex.rest)}
                                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center text-[10px] font-bold text-gray-500 transition-colors shadow-sm active:scale-90"
                                  title="Marcar tudo como feito"
                                >
                                  {idx + 1}
                                </button>
                                <div>
                                  <h5 className="font-bold text-gray-900">{ex.name}</h5>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-500">
                                    <span className="flex items-center gap-1">🏋️ {ex.weight}</span>
                                    <span className="flex items-center gap-1">⏱️ {ex.rest} descanso</span>
                                    <span className="flex items-center gap-1">🔄 {ex.reps} reps</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                              {Array.from({ length: ex.sets }).map((_, sIdx) => {
                                const isDone = completedSets[`${exId}-${sIdx}`];
                                return (
                                  <button 
                                    key={sIdx} 
                                    onClick={() => toggleSet(exId, sIdx, ex.rest)}
                                    className={`w-10 h-10 rounded-xl border flex items-center justify-center text-[11px] font-bold transition-all ${
                                      isDone 
                                        ? "bg-green-500 border-green-600 text-white shadow-inner scale-95" 
                                        : "bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100 active:scale-90"
                                    }`}
                                  >
                                    {isDone ? "✓" : `S${sIdx + 1}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <button 
                        className="btn-primary mt-4 py-3"
                        onClick={() => {
                          if (!activeWorkout) return;
                          completeWorkout.mutate({ workoutId: activeWorkout.id });
                          setSelectedDay(null);
                        }}
                      >
                        <CheckCircle2 size={18} /> Finalizar Treino do Dia
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
