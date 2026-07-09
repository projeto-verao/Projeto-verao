import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { firestoreService, StoredWorkout } from "@/hooks/useFirebaseFirestore";
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Loader2, History as HistoryIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function History() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<StoredWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);

  const loadVersions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const list = await firestoreService.listWorkouts(user.uid);
      setVersions(list);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { if (user) loadVersions(); }, [user, loadVersions]);

  const handleRestore = async (workoutId: string) => {
    if (!user) return;
    setRestoring(true);
    try {
      await firestoreService.restoreWorkout(user.uid, workoutId);
      toast.success("Treino restaurado com sucesso!");
      navigate("/dashboard");
    } catch (err) {
      toast.error("Erro ao restaurar treino.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate("/dashboard")} className="mr-3 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="font-semibold text-gray-900 text-lg">Histórico</h1>
          <p className="text-xs text-gray-400">
            {versions.length > 0 ? `${versions.length} treino${versions.length !== 1 ? "s" : ""} registrado${versions.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : versions.length === 0 ? (
          <div className="empty-state">
            <HistoryIcon size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum treino registrado ainda</p>
            <p className="text-gray-400 text-sm mt-1">
              Gere seu primeiro treino no Dashboard
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => {
              const isExpanded = expandedId === version.id;
              const isActive = version.isActive;
              return (
                <div key={version.id} className="app-card">
                  <div className="flex items-start gap-3">
                    {/* Version badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isActive ? "bg-black text-white" : "bg-gray-100 text-gray-600"}`}>
                      {version.version}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{version.title}</p>
                        {isActive && (
                          <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full flex-shrink-0">Atual</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(version.createdAt.toMillis()).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                      {version.changeDescription && (
                        <p className="text-xs text-gray-500 mt-1 italic">{version.changeDescription}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : version.id)}
                      className="btn-secondary py-2 text-xs flex-1"
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {isExpanded ? "Ocultar" : "Ver treino"}
                    </button>
                    {!isActive && (
                      <button
                        onClick={() => handleRestore(version.id)}
                        disabled={restoring}
                        className="btn-secondary py-2 text-xs flex-1"
                      >
                        {restoring ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        Restaurar
                      </button>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 max-h-80 overflow-y-auto space-y-4">
                      {version.days.map((day) => (
                        <div key={day.dayNumber}>
                          <p className="text-sm font-semibold text-gray-900 mb-2">
                            {day.emoji} Dia {day.dayNumber} — {day.title}
                          </p>
                          <div className="space-y-1.5">
                            {day.exercises.map((ex, i) => (
                              <div key={i} className="flex items-start justify-between text-xs">
                                <div className="flex-1 min-w-0 pr-2">
                                  <p className="text-gray-800 font-medium">{ex.name}</p>
                                  {ex.notes && <p className="text-gray-400 mt-0.5">{ex.notes}</p>}
                                </div>
                                <span className="text-gray-500 flex-shrink-0">
                                  {ex.sets}x{ex.reps} · {ex.rest}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
