import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { ArrowLeft, Droplets, Plus, Camera, Upload, Loader2, Sparkles, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type Tab = "diario" | "ia" | "dashboard";

const MEAL_TYPES = ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"];

export default function Nutrition() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Redireciona para login se não autenticado
  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate]);
  const [activeTab, setActiveTab] = useState<Tab>("diario");
  const [mealDescription, setMealDescription] = useState("");
  const [mealType, setMealType] = useState(MEAL_TYPES[0]);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: waterData, refetch: refetchWater } = trpc.nutrition.todayWater.useQuery();
  const { data: todayMeals, refetch: refetchMeals } = trpc.nutrition.todayMeals.useQuery();
  const { data: recommendation, refetch: refetchRec } = trpc.nutrition.latestRecommendation.useQuery();
  const { data: stats } = trpc.nutrition.last7DaysStats.useQuery();

  // Mutations
  const addWater = trpc.nutrition.addWater.useMutation({
    onSuccess: (data) => { refetchWater(); toast.success(`+${data.logs[data.logs.length - 1]?.amountMl ?? 0}ml adicionados`); },
  });
  const analyzeMeal = trpc.nutrition.analyzeMeal.useMutation({
    onSuccess: () => {
      toast.success("Refeição analisada e registrada!");
      refetchMeals();
      setMealDescription("");
      setPhotoBase64(null);
      setPhotoPreview(null);
    },
    onError: () => toast.error("Erro ao analisar refeição."),
  });
  const generateRec = trpc.nutrition.generateRecommendation.useMutation({
    onSuccess: () => { toast.success("Recomendações geradas!"); refetchRec(); },
    onError: () => toast.error("Erro ao gerar recomendações."),
  });

  const totalWater = waterData?.total ?? 0;
  const waterGoal = 2500;
  const waterPercent = Math.min((totalWater / waterGoal) * 100, 100);

  const todayTotals = (todayMeals ?? []).reduce((acc, m) => ({
    calories: acc.calories + (m.calories ?? 0),
    protein: acc.protein + (m.proteinG ?? 0),
    carbs: acc.carbs + (m.carbsG ?? 0),
    fat: acc.fat + (m.fatG ?? 0),
    fiber: acc.fiber + (m.fiberG ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  const handlePhotoSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      setPhotoPreview(result);
      setPhotoBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  // 7-day chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayMeals = (stats?.mealLogs ?? []).filter(m => {
      const t = new Date(m.loggedAt).getTime();
      return t >= d.getTime() && t < dayEnd.getTime();
    });
    const dayWater = (stats?.waterLogs ?? []).filter(w => {
      const t = new Date(w.loggedAt).getTime();
      return t >= d.getTime() && t < dayEnd.getTime();
    });
    return {
      label: d.toLocaleDateString("pt-BR", { weekday: "short" }),
      calories: dayMeals.reduce((s, m) => s + (m.calories ?? 0), 0),
      water: dayWater.reduce((s, w) => s + w.amountMl, 0),
      protein: dayMeals.reduce((s, m) => s + (m.proteinG ?? 0), 0),
    };
  });

  const maxCal = Math.max(...last7Days.map(d => d.calories), 1);
  const maxWater = Math.max(...last7Days.map(d => d.water), 1);

  return (
    <AppLayout>
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate("/dashboard")} className="mr-3 text-gray-500">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-semibold text-gray-900 text-lg">Alimentação Inteligente</h1>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {(["diario", "ia", "dashboard"] as Tab[]).map(tab => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "diario" ? "Diário" : tab === "ia" ? "IA" : "Dashboard"}
          </button>
        ))}
      </div>

      {/* ── DIÁRIO TAB ── */}
      {activeTab === "diario" && (
        <div className="px-5 py-4 space-y-4">
          {/* Water tracking */}
          <div className="app-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets size={18} className="text-blue-500" />
                <span className="font-semibold text-gray-900">Água hoje</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{totalWater}ml</span>
            </div>
            <div className="progress-bar mb-3">
              <div className="progress-bar-fill" style={{ width: `${waterPercent}%`, background: "#3B82F6" }} />
            </div>
            <p className="text-xs text-gray-400 mb-3">Meta: {waterGoal}ml · {Math.round(waterPercent)}% atingido</p>
            <div className="flex gap-2">
              {[200, 300, 500].map(ml => (
                <button
                  key={ml}
                  className="btn-secondary py-2 text-sm flex-1"
                  onClick={() => addWater.mutate({ amountMl: ml })}
                  disabled={addWater.isPending}
                >
                  +{ml}ml
                </button>
              ))}
            </div>
          </div>

          {/* Today's macros summary */}
          {(todayMeals ?? []).length > 0 && (
            <div className="dark-card">
              <p className="text-xs text-gray-300 uppercase tracking-wider mb-3 font-semibold">Macros de hoje</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: "Calorias", value: Math.round(todayTotals.calories), unit: "kcal" },
                  { label: "Proteína", value: Math.round(todayTotals.protein), unit: "g" },
                  { label: "Carbo", value: Math.round(todayTotals.carbs), unit: "g" },
                  { label: "Gordura", value: Math.round(todayTotals.fat), unit: "g" },
                  { label: "Fibra", value: Math.round(todayTotals.fiber), unit: "g" },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="macro-badge text-white">
                    <span className="value text-base">{value}</span>
                    <span className="label text-gray-400">{label}</span>
                    <span className="text-xs text-gray-500">{unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meal registration */}
          <div className="app-card">
            <h3 className="font-semibold text-gray-900 mb-3">Registrar refeição</h3>

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1.5">Refeição</label>
              <div className="relative">
                <select className="app-input appearance-none pr-8 text-sm" value={mealType} onChange={e => setMealType(e.target.value)}>
                  {MEAL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1.5">Alimentos (texto)</label>
              <textarea
                className="app-input resize-none text-sm"
                rows={3}
                placeholder="Ex: 150g arroz, 200g frango grelhado, 2 ovos..."
                value={mealDescription}
                onChange={e => setMealDescription(e.target.value)}
              />
            </div>

            {photoPreview && (
              <img src={photoPreview} alt="Foto da refeição" className="w-full h-32 object-cover rounded-lg mb-3" />
            )}

            <div className="flex gap-2">
              <button
                className="btn-primary py-2.5 text-sm flex-1"
                onClick={() => {
                  if (!mealDescription.trim() && !photoBase64) { toast.error("Descreva a refeição ou adicione uma foto."); return; }
                  analyzeMeal.mutate({ description: mealDescription || "Refeição na foto", mealType, photoBase64: photoBase64 || undefined });
                }}
                disabled={analyzeMeal.isPending}
              >
                {analyzeMeal.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
                Analisar texto
              </button>
              <button
                className="btn-secondary py-2.5 text-sm w-auto px-4"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera size={16} />
                Foto
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
          </div>

          {/* Today's meals list */}
          {(todayMeals ?? []).length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Refeições de hoje</h3>
              <div className="space-y-2">
                {todayMeals!.map(meal => (
                  <div key={meal.id} className="app-card py-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500">{meal.mealType}</p>
                        <p className="text-sm text-gray-800 mt-0.5 truncate">{meal.description}</p>
                      </div>
                      {meal.calories && (
                        <span className="text-sm font-semibold text-gray-900 ml-3 flex-shrink-0">{Math.round(meal.calories)} kcal</span>
                      )}
                    </div>
                    {(meal.proteinG || meal.carbsG || meal.fatG) && (
                      <div className="flex gap-3 mt-1.5">
                        {meal.proteinG && <span className="text-xs text-gray-400">P: {Math.round(meal.proteinG)}g</span>}
                        {meal.carbsG && <span className="text-xs text-gray-400">C: {Math.round(meal.carbsG)}g</span>}
                        {meal.fatG && <span className="text-xs text-gray-400">G: {Math.round(meal.fatG)}g</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── IA TAB ── */}
      {activeTab === "ia" && (
        <div className="px-5 py-4 space-y-4">
          <button
            className="btn-primary"
            onClick={() => generateRec.mutate()}
            disabled={generateRec.isPending}
          >
            {generateRec.isPending ? (
              <><Loader2 size={16} className="animate-spin" /> Gerando recomendações...</>
            ) : (
              <><Sparkles size={16} /> Gerar recomendações do dia</>
            )}
          </button>

          {recommendation ? (
            <div className="app-card">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-gray-500" />
                <span className="text-xs text-gray-500">
                  {new Date(recommendation.generatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed">
                <Streamdown>{recommendation.content}</Streamdown>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Sparkles size={36} className="text-gray-300 mb-2" />
              <p className="text-gray-400 text-sm">Nenhuma recomendação gerada ainda.</p>
            </div>
          )}
        </div>
      )}

      {/* ── DASHBOARD TAB ── */}
      {activeTab === "dashboard" && (
        <div className="px-5 py-4 space-y-4">
          {/* Calories chart */}
          <div className="app-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900">Calorias (últimos 7 dias)</h3>
            </div>
            <div className="flex items-end gap-1.5 h-24">
              {last7Days.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm bg-gray-900 transition-all"
                    style={{ height: `${(day.calories / maxCal) * 80}px`, minHeight: day.calories > 0 ? "4px" : "0" }}
                  />
                  <span className="text-xs text-gray-400">{day.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Macros chart */}
          <div className="app-card">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900">Proteína (últimos 7 dias)</h3>
            </div>
            <div className="flex items-end gap-1.5 h-24">
              {last7Days.map((day, i) => {
                const maxProt = Math.max(...last7Days.map(d => d.protein), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm bg-gray-500 transition-all"
                      style={{ height: `${(day.protein / maxProt) * 80}px`, minHeight: day.protein > 0 ? "4px" : "0" }}
                    />
                    <span className="text-xs text-gray-400">{day.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Water chart */}
          <div className="app-card">
            <div className="flex items-center gap-2 mb-4">
              <Droplets size={16} className="text-blue-500" />
              <h3 className="font-semibold text-gray-900">Água (últimos 7 dias)</h3>
            </div>
            <div className="flex items-end gap-1.5 h-24">
              {last7Days.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-sm bg-blue-400 transition-all"
                    style={{ height: `${(day.water / maxWater) * 80}px`, minHeight: day.water > 0 ? "4px" : "0" }}
                  />
                  <span className="text-xs text-gray-400">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
