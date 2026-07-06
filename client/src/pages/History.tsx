import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Loader2, History as HistoryIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function History() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: versions, isLoading, refetch } = trpc.workoutHistory.list.useQuery();
  const restoreVersion = trpc.workoutHistory.restore.useMutation({
    onSuccess: () => {
      toast.success("Treino restaurado com sucesso!");
      refetch();
      navigate("/dashboard");
    },
    onError: () => toast.error("Erro ao restaurar treino."),
  });

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
            {versions ? `${versions.length} treino${versions.length !== 1 ? "s" : ""} registrado${versions.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : !versions || versions.length === 0 ? (
          <div className="empty-state">
            <HistoryIcon size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum treino registrado ainda</p>
            <p className="text-gray-400 text-sm mt-1">
              Gere seu primeiro treino no Dashboard
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version, index) => {
              const isExpanded = expandedId === version.id;
              const isLatest = index === 0;
              return (
                <div key={version.id} className="app-card">
                  <div className="flex items-start gap-3">
                    {/* Version badge */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isLatest ? "bg-black text-white" : "bg-gray-100 text-gray-600"}`}>
                      {version.versionNumber}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{version.title}</p>
                        {isLatest && (
                          <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full flex-shrink-0">Atual</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(version.createdAt).toLocaleDateString("pt-BR", {
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
                    {!isLatest && (
                      <button
                        onClick={() => restoreVersion.mutate({ versionId: version.id })}
                        disabled={restoreVersion.isPending}
                        className="btn-secondary py-2 text-xs flex-1"
                      >
                        {restoreVersion.isPending ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        Restaurar
                      </button>
                    )}
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 leading-relaxed max-h-80 overflow-y-auto">
                      <Streamdown>{version.content}</Streamdown>
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
