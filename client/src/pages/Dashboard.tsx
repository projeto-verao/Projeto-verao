import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import {
  Utensils, Target, History, RefreshCw, CheckCircle2, Dumbbell, Loader2, ChevronRight, Timer, X, AlertTriangle
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
    onSuccess: () => {
      toast.success("Novo treino gerado!");
      refetchWorkout();
    },
    onError: () => toast.error("Erro ao gerar treino no servidor antigo."),
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
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Olá, {profile?.name?.split(' ')[0] || 'Atleta'}!</h1>
            <p className="text-sm text-gray-500">Vamos treinar hoje?</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/nutrition")} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Utensils size={18} className="text-gray-600" />
            </button>
            <button onClick={() => navigate("/goals")} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Target size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 pb-10">
        {/* Aviso de Sincronização */}
        {(trpcProfileError || trpcWorkoutError) && (
          <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="text-orange-500 shrink-0" size={20} />
            <div>
              <p className="text-xs font-bold text-orange-800">Servidor em Transição</p>
              <p className="text-[10px] text-orange-700">Estamos migrando seus treinos para o novo sistema Firebase. Algumas funções podem estar limitadas.</p>
            </div>
          </div>
        )}

        {/* Weekly Progress Card */}
        <div className="bg-black rounded-3xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Meta Semanal</span>
            <span className="text-white font-bold text-lg">{completed}/{target}</span>
          </div>
          <div className="flex gap-2 mb-1">
            {Array.from({ length: target }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full ${i < completed ? "bg-orange-500" : "bg-gray-800"}`} />
            ))}
          </div>
        </div>

        {/* Workout Content */}
        {workoutLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-orange-500 mb-4" />
            <p className="text-sm text-gray-500 font-medium">Carregando sua rotina...</p>
          </div>
        ) : !workoutData?.days ? (
          <div className="bg-gray-50 rounded-3xl p-10 flex flex-col items-center text-center border-2 border-dashed border-gray-200">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <Dumbbell size={32} className="text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900">Nenhum treino ativo</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Clique abaixo para gerar seu primeiro treino personalizado.</p>
            <button 
              onClick={() => generateWorkout.mutate()} 
              disabled={generateWorkout.isPending}
              className="mt-6 bg-black text-white px-8 py-3 rounded-2xl text-sm font-bold shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              {generateWorkout.isPending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Gerar Treino com IA
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sua Planilha</h2>
            {workoutData.days.map((day: any) => (
              <div key={day.dayNumber} className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setSelectedDay(selectedDay === day.dayNumber ? null : day.dayNumber)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-2xl">
                      {day.emoji || "💪"}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Dia {day.dayNumber}</span>
                      <h4 className="font-bold text-gray-900 leading-tight">{day.title}</h4>
                    </div>
                  </div>
                  <ChevronRight size={20} className={`text-gray-300 transition-transform ${selectedDay === day.dayNumber ? "rotate-90" : ""}`} />
                </div>

                {selectedDay === day.dayNumber && (
                  <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                    {day.exercises.map((ex: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h5 className="font-bold text-gray-900 text-sm">{ex.name}</h5>
                          <span className="text-[10px] bg-white px-2 py-1 rounded-lg font-bold text-gray-400 border border-gray-100">{ex.sets} séries</span>
                        </div>
                        <div className="flex gap-2">
                          {Array.from({ length: ex.sets }).map((_, sIdx) => {
                            const isDone = completedSets[`${day.dayNumber}-${idx}-${sIdx}`];
                            return (
                              <button 
                                key={sIdx}
                                onClick={() => toggleSet(`${day.dayNumber}-${idx}`, sIdx, ex.rest)}
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-[10px] font-bold transition-all ${
                                  isDone ? "bg-green-500 border-green-600 text-white" : "bg-white border-gray-100 text-gray-400"
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
