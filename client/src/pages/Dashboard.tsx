import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import {
  Utensils, Target, RefreshCw, Dumbbell, Loader2, ChevronRight, Timer, X, AlertTriangle, Sparkles, Activity
} from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, profile: firebaseProfile, isAuthenticated, loading: authLoading } = useAuth();
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

  // Tentativa de buscar dados do backend antigo (opcional agora)
  const { data: trpcProfile, isError: trpcProfileError } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false
  });
  
  const { data: activeWorkout, isLoading: workoutLoading, refetch: refetchWorkout, isError: trpcWorkoutError } = trpc.workout.getActive.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false
  });

  const { data: weekProgress, refetch: refetchProgress } = trpc.workout.weekProgress.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false
  });

  // Usar perfil do Firebase como prioridade, tRPC como fallback
  const profile = firebaseProfile || trpcProfile;

  const generateWorkout = trpc.workout.generate.useMutation({
    onSuccess: (data) => {
      toast.success("Novo treino gerado com sucesso!");
      // Cache o treino em sessionStorage como fallback
      if (data) {
        sessionStorage.setItem("cached_workout", JSON.stringify(data));
      }
      refetchWorkout();
    },
    onError: (err) => {
      console.error("Erro ao gerar treino:", err);
      toast.error("Erro ao gerar treino. Tente novamente em instantes.");
    },
  });

  // Tentar carregar treino do cache se não houver no banco
  useEffect(() => {
    if (!activeWorkout && !workoutLoading) {
      const cachedWorkout = sessionStorage.getItem("cached_workout");
      if (cachedWorkout) {
        try {
          const parsed = JSON.parse(cachedWorkout);
          // Usar o treino em cache como fallback
          if (parsed?.content) {
            workoutData = JSON.parse(parsed.content);
          }
        } catch (e) {
          console.warn("Erro ao carregar treino do cache", e);
        }
      }
    }
  }, [activeWorkout, workoutLoading]);

  const completed = weekProgress?.completed ?? 0;
  const target = weekProgress?.target ?? 4;

  // Parse workout JSON
  let workoutData: any = null;
  try {
    if (activeWorkout?.content) {
      workoutData = JSON.parse(activeWorkout.content);
    }
  } catch (e) {
    workoutData = { title: activeWorkout?.title, content: activeWorkout?.content };
  }

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
        {/* Sync Alert (Only if there's a real issue) */}
        {(trpcProfileError || trpcWorkoutError) && (
          <div className="bg-orange-50 border border-orange-100 p-4 rounded-3xl flex items-start gap-3">
            <AlertTriangle className="text-orange-500 shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold text-orange-800">Servidor em Atualização</p>
              <p className="text-[10px] text-orange-700 leading-tight">Estamos sincronizando sua conta. Se o treino não aparecer, tente clicar em "Gerar Treino" abaixo.</p>
            </div>
          </div>
        )}

        {/* Weekly Progress Card */}
        <div className="bg-black rounded-[32px] p-6 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progresso Semanal</span>
              <span className="text-orange-500 font-black text-xl">{completed}/{target}</span>
            </div>
            <div className="flex gap-2 mb-2">
              {Array.from({ length: target }).map((_, i) => (
                <div key={i} className={`h-2.5 flex-1 rounded-full ${i < completed ? "bg-orange-500" : "bg-white/10"}`} />
              ))}
            </div>
            <p className="text-[10px] text-white/40 font-medium">Faltam {target - completed} treinos para bater sua meta!</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <Activity size={120} />
          </div>
        </div>

        {/* Workout Content */}
        {workoutLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[32px] border border-gray-100">
            <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Calculando Rotina...</p>
          </div>
        ) : !workoutData?.days ? (
          <div className="bg-white rounded-[32px] p-10 flex flex-col items-center text-center border border-gray-100 shadow-sm">
            <div className="w-20 h-20 bg-gray-50 rounded-[28px] flex items-center justify-center mb-6">
              <Sparkles size={40} className="text-orange-300" />
            </div>
            <h3 className="font-black text-gray-900 text-lg">VAMOS COMEÇAR?</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-[240px]">Sua IA ainda não gerou seu treino personalizado baseado no seu perfil.</p>
            <button 
              onClick={() => generateWorkout.mutate()} 
              disabled={generateWorkout.isPending}
              className="mt-8 w-full bg-black text-white py-5 rounded-3xl font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {generateWorkout.isPending ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
              GERAR TREINO COM IA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sua Planilha</h2>
              <button onClick={() => generateWorkout.mutate()} className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1">
                <RefreshCw size={10} /> Atualizar
              </button>
            </div>
            
            {workoutData.days.map((day: any) => (
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
                    {day.exercises.map((ex: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-3xl p-5 border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-black text-gray-900 text-sm leading-tight mb-1">{ex.name?.toUpperCase()}</h5>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{ex.rest} de descanso</p>
                          </div>
                          <span className="text-[10px] bg-black text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-tighter">{ex.sets} séries</span>
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
