import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { firestoreService, GoalsData } from "@/hooks/useFirebaseFirestore";
import { ArrowLeft, Target, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Goals() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);

  const [goals, setGoals] = useState<GoalsData | null>(null);
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!user) return;
    try {
      const data = await firestoreService.getGoals(user.uid);
      setGoals(data);
    } catch (err) {
      console.error("Erro ao carregar metas:", err);
    }
  }, [user]);

  useEffect(() => { if (user) loadGoals(); }, [user, loadGoals]);

  const [form, setForm] = useState({
    mainGoal: "",
    currentWeightKg: "",
    targetWeightKg: "",
    targetBodyFatPercent: "",
    weeklyGoalKg: "",
    targetDate: "",
  });

  useEffect(() => {
    if (goals) {
      setForm({
        mainGoal: goals.mainGoal ?? "",
        currentWeightKg: goals.currentWeightKg?.toString() ?? "",
        targetWeightKg: goals.targetWeightKg?.toString() ?? "",
        targetBodyFatPercent: goals.targetBodyFatPercent?.toString() ?? "",
        weeklyGoalKg: goals.weeklyGoalKg?.toString() ?? "",
        targetDate: goals.targetDate ? new Date(goals.targetDate).toISOString().split("T")[0] : "",
      });
    }
  }, [goals]);

  const set = (f: string, v: string) => setForm(prev => ({ ...prev, [f]: v }));

  const handleSave = async () => {
    if (!user) return;

    // Validações
    if (form.currentWeightKg) {
      const v = parseFloat(form.currentWeightKg);
      if (isNaN(v) || v <= 0 || v > 500) { toast.error("Peso atual inválido (1–500 kg)."); return; }
    }
    if (form.targetWeightKg) {
      const v = parseFloat(form.targetWeightKg);
      if (isNaN(v) || v <= 0 || v > 500) { toast.error("Peso desejado inválido (1–500 kg)."); return; }
    }
    if (form.targetBodyFatPercent) {
      const v = parseFloat(form.targetBodyFatPercent);
      if (isNaN(v) || v < 1 || v > 60) { toast.error("% de gordura inválido (1–60%)."); return; }
    }
    if (form.weeklyGoalKg) {
      const v = parseFloat(form.weeklyGoalKg);
      if (isNaN(v) || v <= 0 || v > 5) { toast.error("Meta semanal inválida (máx 5 kg/semana)."); return; }
    }

    setSaving(true);
    try {
      await firestoreService.saveGoals(user.uid, {
        mainGoal: form.mainGoal || undefined,
        currentWeightKg: form.currentWeightKg ? parseFloat(form.currentWeightKg) : undefined,
        targetWeightKg: form.targetWeightKg ? parseFloat(form.targetWeightKg) : undefined,
        targetBodyFatPercent: form.targetBodyFatPercent ? parseFloat(form.targetBodyFatPercent) : undefined,
        weeklyGoalKg: form.weeklyGoalKg ? parseFloat(form.weeklyGoalKg) : undefined,
        targetDate: form.targetDate || undefined,
      });
      toast.success("Meta salva!");
      await loadGoals();
    } catch (err) {
      toast.error("Erro ao salvar meta.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate progress
  const currentW = parseFloat(form.currentWeightKg) || 0;
  const targetW = parseFloat(form.targetWeightKg) || 0;
  const initialW = goals?.currentWeightKg ?? currentW;
  const progress = initialW && targetW && initialW !== targetW
    ? Math.min(Math.max(((initialW - currentW) / (initialW - targetW)) * 100, 0), 100)
    : 0;

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate("/dashboard")} className="mr-3 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold text-gray-900 text-lg">Meus Objetivos</h1>
      </div>

      <div className="px-5 py-4 space-y-5">
        <p className="text-sm text-gray-500">Defina sua meta para a IA acompanhar sua evolução.</p>

        {/* Progress indicator */}
        {targetW > 0 && currentW > 0 && (
          <div className="app-card">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-gray-600" />
              <span className="font-semibold text-gray-900 text-sm">Progresso da meta</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Atual: {currentW}kg</span>
              <span className="text-xs text-gray-500">Meta: {targetW}kg</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{Math.round(progress)}% da meta atingida</p>
          </div>
        )}

        {/* Main goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Objetivo principal</label>
          <input
            className="app-input"
            placeholder="Ex: Perder 10kg até dezembro"
            value={form.mainGoal}
            onChange={e => set("mainGoal", e.target.value)}
          />
        </div>

        {/* Current + Target weight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso atual (kg)</label>
            <input
              className="app-input"
              type="number"
              step="0.1"
              placeholder="75"
              value={form.currentWeightKg}
              onChange={e => set("currentWeightKg", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso desejado (kg)</label>
            <input
              className="app-input"
              type="number"
              step="0.1"
              placeholder="65"
              value={form.targetWeightKg}
              onChange={e => set("targetWeightKg", e.target.value)}
            />
          </div>
        </div>

        {/* Body fat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">% gordura desejado (opcional)</label>
          <input
            className="app-input"
            type="number"
            step="0.1"
            placeholder="15"
            value={form.targetBodyFatPercent}
            onChange={e => set("targetBodyFatPercent", e.target.value)}
          />
        </div>

        {/* Weekly goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta semanal (kg, opcional)</label>
          <input
            className="app-input"
            type="number"
            step="0.1"
            placeholder="0.5"
            value={form.weeklyGoalKg}
            onChange={e => set("weeklyGoalKg", e.target.value)}
          />
        </div>

        {/* Target date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prazo (opcional)</label>
          <input
            className="app-input"
            type="date"
            value={form.targetDate}
            onChange={e => set("targetDate", e.target.value)}
          />
        </div>

        {/* Save button */}
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Target size={16} />}
          Salvar meta
        </button>
      </div>
    </AppLayout>
  );
}
