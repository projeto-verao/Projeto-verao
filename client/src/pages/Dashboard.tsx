import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import {
  Utensils, Target, History, RefreshCw, CheckCircle2, Dumbbell, Loader2, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showWorkout, setShowWorkout] = useState(false);

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
  const progressPercent = Math.min((completed / target) * 100, 100);

  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <AppLayout>
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
            <button
              onClick={() => navigate("/nutrition")}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              title="Alimentação"
            >
              <Utensils size={18} className="text-gray-600" />
            </button>
            <button
              onClick={() => navigate("/goals")}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              title="Objetivos"
            >
              <Target size={18} className="text-gray-600" />
            </button>
            <button
              onClick={() => navigate("/history")}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
              title="Histórico"
            >
              <History size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* Weekly Progress Card */}
        <div className="dark-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Progresso da Semana</span>
            <span className="text-white font-bold text-lg">{completed}/{target}</span>
          </div>
          <div className="flex gap-2 mb-3">
            {Array.from({ length: target }).map((_, i) => (
              <div
                key={i}
                className={`week-bar h-8 flex-1 rounded ${i < completed ? "done" : "pending"}`}
              />
            ))}
            {Array.from({ length: Math.max(0, 7 - target) }).map((_, i) => (
              <div key={`empty-${i}`} className="week-bar h-8 flex-1 rounded opacity-20 pending" />
            ))}
          </div>
          <p className="text-gray-400 text-xs">
            {completed === 0
              ? "Comece seu primeiro treino da semana!"
              : completed >= target
              ? "Meta semanal atingida! Parabéns!"
              : `Faltam ${target - completed} treino${target - completed > 1 ? "s" : ""} para atingir sua meta`}
          </p>
        </div>

        {/* Workout Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Todos os Treinos</h2>
            <button
              onClick={() => generateWorkout.mutate()}
              disabled={generateWorkout.isPending}
              className="flex items-center gap-1.5 text-sm text-gray-600 font-medium"
            >
              {generateWorkout.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <RefreshCw size={15} />
              )}
              Gerar novo
            </button>
          </div>

          {workoutLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 size={28} className="animate-spin text-gray-400" />
            </div>
          ) : !activeWorkout ? (
            <div className="empty-state">
              <Dumbbell size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum treino gerado ainda</p>
              <p className="text-gray-400 text-sm mt-1">Clique em "Gerar novo" para criar seu plano</p>
            </div>
          ) : (
            <div className="app-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{activeWorkout.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Criado em {new Date(activeWorkout.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  onClick={() => setShowWorkout(!showWorkout)}
                  className="text-gray-400"
                >
                  <ChevronRight
                    size={20}
                    className={`transition-transform ${showWorkout ? "rotate-90" : ""}`}
                  />
                </button>
              </div>

              {showWorkout && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                    <Streamdown>{activeWorkout.content}</Streamdown>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  className="btn-primary py-2.5 text-sm"
                  onClick={() => completeWorkout.mutate({ workoutId: activeWorkout.id })}
                  disabled={completeWorkout.isPending}
                >
                  {completeWorkout.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}
                  Marcar como concluído
                </button>
                <button
                  className="btn-secondary py-2.5 text-sm"
                  onClick={() => navigate("/trainer")}
                >
                  Ajustar com IA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
