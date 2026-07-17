import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { firestoreService, ReminderConfig } from "@/hooks/useFirebaseFirestore";
import { useRecurringReminders } from "@/hooks/useLocalNotifications";
import { geminiService } from "@/lib/gemini";
import {
  Bell,
  Droplets,
  Activity,
  Utensils,
  Flame,
  Beef,
  Dumbbell,
  Moon,
  Scale,
  Camera,
  Ruler,
  Pill,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Clock,
  Calendar,
  Volume2,
  Vibrate,
  Sparkles,
  BellOff,
  BellRing,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ─── Constantes ────────────────────────────────────────────────────────────────

const REMINDER_TYPES = [
  { id: "water",          title: "Beber água",              description: "Lembrete para hidratação constante",        icon: Droplets,      color: "text-blue-500",    repetitionType: "every_x_hours" as const, time: "08:00", timeStart: "08:00", timeEnd: "22:00", intervalHours: 2,  daysOfWeek: [1, 2, 3, 4, 5],       sound: true, vibration: true, repeatUntilDone: false },
  { id: "movement",       title: "Se movimentar",           description: "Evite ficar muito tempo sentado",           icon: Activity,      color: "text-orange-500",  repetitionType: "every_x_hours" as const, time: "10:00", timeStart: "08:00", timeEnd: "20:00", intervalHours: 2,  daysOfWeek: [1, 2, 3, 4, 5],       sound: true, vibration: true, repeatUntilDone: false },
  { id: "food_log",       title: "Registrar alimentação",   description: "Não esqueça de anotar suas refeições",      icon: Utensils,      color: "text-green-500",   repetitionType: "every_x_hours" as const, time: "12:00", timeStart: "08:00", timeEnd: "21:00", intervalHours: 3,  daysOfWeek: [1, 2, 3, 4, 5],       sound: true, vibration: true, repeatUntilDone: false },
  { id: "calories",       title: "Meta de calorias",        description: "Acompanhe seu balanço energético",          icon: Flame,         color: "text-red-500",     repetitionType: "every_x_hours" as const, time: "18:00", timeStart: "08:00", timeEnd: "21:00", intervalHours: 4,  daysOfWeek: [1, 2, 3, 4, 5],       sound: true, vibration: true, repeatUntilDone: false },
  { id: "protein",        title: "Meta de proteínas",       description: "Garanta o aporte proteico diário",          icon: Beef,          color: "text-amber-700",   repetitionType: "every_x_hours" as const, time: "18:00", timeStart: "08:00", timeEnd: "21:00", intervalHours: 4,  daysOfWeek: [1, 2, 3, 4, 5],       sound: true, vibration: true, repeatUntilDone: false },
  { id: "training_remind",title: "Lembrete de treino",      description: "Hora de ir para a academia",                icon: Dumbbell,      color: "text-slate-700",   repetitionType: "once_a_day"   as const, time: "17:00", timeStart: "17:00", timeEnd: "20:00", intervalHours: 2,  daysOfWeek: [1, 2, 3, 4, 5],       sound: true, vibration: true, repeatUntilDone: false },
  { id: "sleep",          title: "Hora de dormir",          description: "Mantenha a higiene do sono",                icon: Moon,          color: "text-indigo-600",  repetitionType: "once_a_day"   as const, time: "22:00", timeStart: "22:00", timeEnd: "23:00", intervalHours: 2,  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], sound: true, vibration: true, repeatUntilDone: false },
  { id: "weight",         title: "Registrar peso",          description: "Acompanhe sua evolução na balança",         icon: Scale,         color: "text-gray-600",    repetitionType: "once_a_day"   as const, time: "07:00", timeStart: "07:00", timeEnd: "08:00", intervalHours: 2,  daysOfWeek: [0, 1, 2, 3, 4, 5, 6], sound: true, vibration: true, repeatUntilDone: false },
  { id: "evolution_photo",title: "Foto de evolução",        description: "Registre seu progresso visual",             icon: Camera,        color: "text-purple-500",  repetitionType: "once_a_day"   as const, time: "09:00", timeStart: "09:00", timeEnd: "10:00", intervalHours: 2,  daysOfWeek: [0],                    sound: true, vibration: true, repeatUntilDone: false },
  { id: "measurements",   title: "Atualizar medidas",       description: "Mantenha suas medidas em dia",              icon: Ruler,         color: "text-blue-600",    repetitionType: "once_a_day"   as const, time: "09:00", timeStart: "09:00", timeEnd: "10:00", intervalHours: 2,  daysOfWeek: [0],                    sound: true, vibration: true, repeatUntilDone: false },
  { id: "supplements",    title: "Suplementos",             description: "Não esqueça de tomar sua suplementação",   icon: Pill,          color: "text-cyan-500",    repetitionType: "every_x_hours" as const, time: "09:00", timeStart: "09:00", timeEnd: "21:00", intervalHours: 4,  daysOfWeek: [1, 2, 3, 4, 5],       sound: true, vibration: true, repeatUntilDone: false },
  { id: "training_log",   title: "Registrar treino",        description: "Anote as cargas e repetições",              icon: CheckCircle2,  color: "text-emerald-600", repetitionType: "once_a_day"   as const, time: "19:00", timeStart: "19:00", timeEnd: "21:00", intervalHours: 2,  daysOfWeek: [1, 3, 5],              sound: true, vibration: true, repeatUntilDone: false },
];

const HOUR_OPTIONS = [1, 2, 3, 4, 6, 8, 12];
// Dom=0, Seg=1, Ter=2, Qua=3, Qui=4, Sex=5, Sáb=6
const DAYS_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Migração de formato antigo → novo ────────────────────────────────────────

/**
 * Converte lembretes salvos no formato antigo (workdays, daily, specific_days,
 * training_days) para o novo modelo baseado em daysOfWeek + repetitionType
 * once_a_day / every_x_hours.
 */
function migrateReminderConfig(config: ReminderConfig): ReminderConfig {
  const { repetitionType, daysOfWeek } = config;

  // Já no novo formato
  if (repetitionType === "once_a_day" || repetitionType === "every_x_hours") {
    if (!config.daysOfWeek || config.daysOfWeek.length === 0) {
      return { ...config, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
    }
    return config;
  }

  // Migrar tipos legados
  switch (repetitionType) {
    case "daily":
      return { ...config, repetitionType: "once_a_day", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
    case "workdays":
      return { ...config, repetitionType: "once_a_day", daysOfWeek: [1, 2, 3, 4, 5] };
    case "specific_days":
      return {
        ...config,
        repetitionType: "once_a_day",
        daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : [1, 2, 3, 4, 5],
      };
    case "training_days":
      return {
        ...config,
        repetitionType: "once_a_day",
        daysOfWeek: daysOfWeek && daysOfWeek.length > 0 ? daysOfWeek : [1, 3, 5],
      };
    default:
      return { ...config, repetitionType: "once_a_day", daysOfWeek: [0, 1, 2, 3, 4, 5, 6] };
  }
}

// ─── Banner de permissão ───────────────────────────────────────────────────────

function NotificationPermissionBanner() {
  const [permission, setPermission] = useState<NotificationPermission | "checking">("checking");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    } else {
      setPermission("denied");
    }
  }, []);

  if (permission === "granted") return null;
  if (permission === "denied") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <BellOff size={20} className="text-red-500 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-red-700">Notificações bloqueadas</p>
          <p className="text-xs text-red-500 mt-1">
            Para receber lembretes, ative as notificações nas configurações do navegador ou do dispositivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={async () => {
        if ("Notification" in window) {
          await Notification.requestPermission();
          setPermission(Notification.permission);
        }
      }}
      className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-center gap-3 w-full text-left hover:bg-orange-100 transition-colors"
    >
      <BellRing size={20} className="text-orange-500 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-bold text-orange-700">Ativar notificações</p>
        <p className="text-xs text-orange-500 mt-1">
          Clique para receber lembretes nos horários configurados.
        </p>
      </div>
      <ChevronRight size={16} className="text-orange-400" />
    </button>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function Reminders() {
  const { user, profile } = useAuth();
  const [reminders, setReminders] = useState<ReminderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<ReminderConfig | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<"basic" | "fitness">("basic");
  const [aiSuggestion, setAiSuggestion] = useState<string>("");
  const [aiDetailedPlan, setAiDetailedPlan] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const aiLoadedRef = useRef(false);
  const initialLoadDone = useRef(false);
  const hasScheduledOnOpen = useRef(false);
  const { scheduleNextReminder, rescheduleOnAppOpen } = useRecurringReminders();

  const basicRemindersIds = ["water", "food_log", "training_remind"];
  const fitnessRemindersIds = ["water", "food_log", "protein", "calories", "training_remind", "weight", "evolution_photo"];

  const filteredReminders = reminders.filter((reminder) => {
    if (selectedProfile === "basic") return basicRemindersIds.includes(reminder.id);
    if (selectedProfile === "fitness") return fitnessRemindersIds.includes(reminder.id);
    return false;
  });

  // ── Carregar lembretes do Firestore e migrar formato antigo ────────────────
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const unsubscribe = firestoreService.subscribeToReminders(user.uid, (configs) => {
      if (configs.length === 0 && !initialLoadDone.current) {
        // Primeiro acesso: criar padrões no novo formato
        const defaultReminders = REMINDER_TYPES.map((type) => ({
          id: type.id,
          type: type.id,
          title: type.title,
          description: type.description,
          icon: type.id,
          enabled: false,
          repetitionType: type.repetitionType as ReminderConfig["repetitionType"],
          time: type.time,
          timeStart: type.timeStart,
          timeEnd: type.timeEnd,
          intervalHours: type.intervalHours,
          daysOfWeek: type.daysOfWeek,
          sound: type.sound,
          vibration: type.vibration,
          repeatUntilDone: type.repeatUntilDone,
        })) as ReminderConfig[];
        firestoreService.saveAllReminders(user.uid, defaultReminders);
      } else {
        // Migrar automaticamente configs no formato antigo
        const migrated = configs.map(migrateReminderConfig);
        const needsSave = migrated.some(
          (m, i) => m.repetitionType !== configs[i].repetitionType || !configs[i].daysOfWeek?.length
        );
        if (needsSave) {
          firestoreService.saveAllReminders(user.uid, migrated);
        }
        setReminders(migrated);
      }
      setLoading(false);
      initialLoadDone.current = true;
    });
    return () => unsubscribe();
  }, [user]);

  // ── Reagendar lembretes ao abrir o app ────────────────────────────────────
  useEffect(() => {
    if (reminders.length > 0 && !hasScheduledOnOpen.current && "serviceWorker" in navigator) {
      hasScheduledOnOpen.current = true;
      rescheduleOnAppOpen(reminders)
        .then((count) => {
          if (count > 0) {
            console.log(`[Reminders] ${count} lembrete(s) reagendado(s) ao abrir o app`);
          }
        })
        .catch((err) => {
          console.warn("[Reminders] Erro ao reagendar lembretes:", err);
        });
    }
  }, [reminders, rescheduleOnAppOpen]);

  // ── Gerar sugestão da IA com o perfil real ────────────────────────────────
  useEffect(() => {
    if (!profile || aiLoadedRef.current) return;
    aiLoadedRef.current = true;
    setLoadingAI(true);
    geminiService.generateReminderSuggestion({
      name: profile.name,
      age: profile.age,
      sex: profile.sex,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      goal: profile.goal,
      experienceLevel: profile.experienceLevel,
      daysPerWeek: profile.daysPerWeek,
      minutesPerSession: profile.minutesPerSession,
      gymType: profile.gymType,
      physicalRestrictions: profile.physicalRestrictions,
      preferredExercises: profile.preferredExercises,
      avoidedExercises: profile.avoidedExercises,
    })
      .then(({ suggestion, detailedPlan }) => {
        setAiSuggestion(suggestion);
        setAiDetailedPlan(detailedPlan);
      })
      .catch(() => {
        setAiSuggestion(
          `Com base no seu perfil com foco em ${profile.goal?.toLowerCase() || "seus objetivos"}, ative os lembretes mais relevantes para sua rotina esta semana.`
        );
      })
      .finally(() => setLoadingAI(false));
  }, [profile]);

  // ── Toggle ativo/inativo ───────────────────────────────────────────────────
  const handleToggle = async (id: string, enabled: boolean) => {
    if (!user) return;
    try {
      if (enabled && "Notification" in window && Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          toast.error("Permissão de notificação negada. Ative nas configurações do navegador.");
          return;
        }
      }
      await firestoreService.updateReminder(user.uid, id, { enabled });
      const reminder = reminders.find((r) => r.id === id);
      if (reminder && "serviceWorker" in navigator) {
        await scheduleNextReminder({ ...reminder, enabled });
      }
      toast.success(enabled ? "Lembrete ativado!" : "Lembrete desativado!");
    } catch {
      toast.error("Erro ao atualizar lembrete.");
    }
  };

  // ── Salvar configuração ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user || !selectedReminder) return;
    try {
      await firestoreService.updateReminderConfig(user.uid, selectedReminder);
      if (selectedReminder.enabled && "serviceWorker" in navigator) {
        await scheduleNextReminder(selectedReminder);
      }
      setIsConfiguring(false);
      setSelectedReminder(null);
      toast.success("Configuração salva!");
    } catch {
      toast.error("Erro ao salvar configuração.");
    }
  };

  // ── Tela de configuração ───────────────────────────────────────────────────
  if (isConfiguring && selectedReminder) {
    const ConfigIcon = REMINDER_TYPES.find((t) => t.id === selectedReminder.id)?.icon || Bell;
    const isEveryXHours = selectedReminder.repetitionType === "every_x_hours";

    const toggleDay = (dayIdx: number) => {
      const current = selectedReminder.daysOfWeek || [];
      const updated = current.includes(dayIdx)
        ? current.filter((d) => d !== dayIdx)
        : [...current, dayIdx].sort((a, b) => a - b);
      setSelectedReminder({ ...selectedReminder, daysOfWeek: updated });
    };

    return (
      <AppLayout>
        <div className="p-4 pb-32">
          {/* Cabeçalho */}
          <button
            onClick={() => { setIsConfiguring(false); setSelectedReminder(null); }}
            className="flex items-center gap-2 text-gray-600 mb-6 hover:text-black transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700">
              <ConfigIcon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedReminder.title}</h2>
              <p className="text-sm text-gray-500">{selectedReminder.description}</p>
            </div>
          </div>

          <div className="space-y-6">

            {/* ── 1. DIAS ─────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 px-1">
                <Calendar size={16} /> Dias
              </label>
              <div className="grid grid-cols-7 gap-1">
                {DAYS_LABELS.map((day, idx) => {
                  const isActive = (selectedReminder.daysOfWeek || []).includes(idx);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`py-3 rounded-lg text-[11px] font-bold transition-all ${
                        isActive ? "bg-black text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {(selectedReminder.daysOfWeek || []).length === 0 && (
                <p className="text-xs text-red-500 px-1">Selecione pelo menos um dia.</p>
              )}
            </div>

            {/* ── 2. FREQUÊNCIA ───────────────────────────────────────────── */}
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 px-1">
                <Clock size={16} /> Frequência
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedReminder({ ...selectedReminder, repetitionType: "once_a_day" })
                  }
                  className={`py-4 px-3 rounded-xl text-sm font-bold transition-all border-2 ${
                    !isEveryXHours
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  Uma vez por dia
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedReminder({ ...selectedReminder, repetitionType: "every_x_hours" })
                  }
                  className={`py-4 px-3 rounded-xl text-sm font-bold transition-all border-2 ${
                    isEveryXHours
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600"
                  }`}
                >
                  A cada X horas
                </button>
              </div>
            </div>

            {/* ── 3. CONFIGURAÇÕES DA FREQUÊNCIA ──────────────────────────── */}

            {/* Uma vez por dia → Horário */}
            {!isEveryXHours && (
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2 px-1">
                  <Clock size={16} /> Horário
                </label>
                <input
                  type="time"
                  value={selectedReminder.time || "08:00"}
                  onChange={(e) =>
                    setSelectedReminder({ ...selectedReminder, time: e.target.value })
                  }
                  className="w-full bg-gray-100 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-black"
                />
              </div>
            )}

            {/* A cada X horas → Intervalo + Hora inicial + Hora final */}
            {isEveryXHours && (
              <>
                <div className="space-y-3">
                  <label className="text-sm font-bold flex items-center gap-2 px-1">
                    <Clock size={16} /> Intervalo
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {HOUR_OPTIONS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() =>
                          setSelectedReminder({ ...selectedReminder, intervalHours: h })
                        }
                        className={`py-3 rounded-xl text-xs font-bold transition-all ${
                          selectedReminder.intervalHours === h
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-bold px-1 block">Hora inicial</label>
                    <input
                      type="time"
                      value={selectedReminder.timeStart || selectedReminder.time || "08:00"}
                      onChange={(e) =>
                        setSelectedReminder({ ...selectedReminder, timeStart: e.target.value })
                      }
                      className="w-full bg-gray-100 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-black"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold px-1 block">Hora final</label>
                    <input
                      type="time"
                      value={selectedReminder.timeEnd || "22:00"}
                      onChange={(e) =>
                        setSelectedReminder({ ...selectedReminder, timeEnd: e.target.value })
                      }
                      className="w-full bg-gray-100 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-black"
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Som e Vibração ───────────────────────────────────────────── */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400">
                    <Volume2 size={16} />
                  </div>
                  <span className="text-sm font-bold">Som</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedReminder({ ...selectedReminder, sound: !selectedReminder.sound })
                  }
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    selectedReminder.sound ? "bg-black" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      selectedReminder.sound ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400">
                    <Vibrate size={16} />
                  </div>
                  <span className="text-sm font-bold">Vibração</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedReminder({
                      ...selectedReminder,
                      vibration: !selectedReminder.vibration,
                    })
                  }
                  className={`w-12 h-6 rounded-full transition-all relative ${
                    selectedReminder.vibration ? "bg-black" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                      selectedReminder.vibration ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ── Botão Salvar ──────────────────────────────────────────────── */}
          <button
            onClick={handleSave}
            disabled={(selectedReminder.daysOfWeek || []).length === 0}
            className="fixed bottom-24 left-6 right-6 bg-black text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            SALVAR CONFIGURAÇÃO
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── Lista de lembretes ─────────────────────────────────────────────────────
  return (
    <>
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <Bell className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lembretes</h1>
            <p className="text-sm text-gray-500">Mantenha o foco nos seus objetivos</p>
          </div>
        </div>

        <NotificationPermissionBanner />

        <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setSelectedProfile("basic")}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              selectedProfile === "basic" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            BÁSICO
          </button>
          <button
            onClick={() => setSelectedProfile("fitness")}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              selectedProfile === "fitness" ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            FITNESS
          </button>
        </div>

        <div className="grid gap-4">
          {filteredReminders.map((reminder) => {
            const type = REMINDER_TYPES.find((t) => t.id === reminder.id);
            if (!type) return null;
            const Icon = type.icon;
            return (
              <div
                key={reminder.id}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center"
              >
                <button
                  type="button"
                  className="flex items-center gap-4 flex-1 min-w-0 p-5 text-left"
                  onClick={() => { setSelectedReminder({ ...reminder }); setIsConfiguring(true); }}
                >
                  <div className={`p-3 rounded-2xl bg-gray-50 ${type.color} shrink-0`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{type.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{type.description}</p>
                  </div>
                </button>
                <button
                  type="button"
                  aria-pressed={reminder.enabled}
                  aria-label={reminder.enabled ? `Desativar ${type.title}` : `Ativar ${type.title}`}
                  onClick={() => handleToggle(reminder.id, !reminder.enabled)}
                  className={`w-14 h-8 rounded-full transition-all relative shrink-0 mr-5 ${
                    reminder.enabled ? "bg-primary" : "bg-gray-200"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${
                      reminder.enabled ? "left-7" : "left-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100/50">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-indigo-600" size={20} />
            <h2 className="font-bold text-indigo-900">Sugestão da IA</h2>
          </div>

          {loadingAI ? (
            <div className="flex items-center gap-3 py-2">
              <Loader2 size={16} className="text-indigo-400 animate-spin shrink-0" />
              <p className="text-sm text-indigo-400">Analisando seu perfil...</p>
            </div>
          ) : (
            <p className="text-sm text-indigo-700 leading-relaxed">{aiSuggestion}</p>
          )}

          {!loadingAI && aiDetailedPlan && (
            <button
              onClick={() => setShowDetailModal(true)}
              className="mt-4 flex items-center gap-2 text-indigo-600 font-bold text-sm active:opacity-70 transition-all"
            >
              Ver plano detalhado <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </AppLayout>

    {/* ── Modal plano detalhado ─────────────────────────────────────────── */}
    {showDetailModal && (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        onClick={() => setShowDetailModal(false)}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Sparkles className="text-indigo-600" size={20} />
              <h2 className="font-bold text-gray-900 text-lg">Plano de Lembretes</h2>
            </div>
            <button
              onClick={() => setShowDetailModal(false)}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Perfil do usuário */}
          {profile && (
            <div className="mx-6 mt-4 bg-indigo-50 rounded-2xl px-4 py-3 flex flex-wrap gap-x-4 gap-y-1">
              {profile.goal && (
                <span className="text-xs text-indigo-700">
                  🎯 <span className="font-semibold">{profile.goal}</span>
                </span>
              )}
              {profile.experienceLevel && (
                <span className="text-xs text-indigo-700">
                  📊 <span className="font-semibold">{profile.experienceLevel}</span>
                </span>
              )}
              {profile.daysPerWeek && (
                <span className="text-xs text-indigo-700">
                  📅 <span className="font-semibold">{profile.daysPerWeek}x/semana</span>
                </span>
              )}
            </div>
          )}

          {/* Conteúdo em Markdown renderizado como texto */}
          <div className="overflow-y-auto px-6 py-4 flex-1">
            <div className="text-sm text-gray-700 leading-relaxed space-y-3">
              {aiDetailedPlan.split("\n").map((line, i) => {
                if (line.startsWith("## ")) {
                  return (
                    <h3 key={i} className="font-bold text-gray-900 text-base mt-4 first:mt-0">
                      {line.replace("## ", "")}
                    </h3>
                  );
                }
                if (line.startsWith("### ")) {
                  return (
                    <h4 key={i} className="font-semibold text-gray-800 text-sm mt-3">
                      {line.replace("### ", "")}
                    </h4>
                  );
                }
                if (line.startsWith("- ") || line.startsWith("* ")) {
                  return (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                      <span>{line.replace(/^[-*] /, "")}</span>
                    </div>
                  );
                }
                if (line.startsWith("**") && line.endsWith("**")) {
                  return (
                    <p key={i} className="font-semibold text-gray-800">
                      {line.replace(/\*\*/g, "")}
                    </p>
                  );
                }
                if (line.trim() === "") return <div key={i} className="h-1" />;
                return <p key={i}>{line.replace(/\*\*/g, "")}</p>;
              })}
            </div>
          </div>

          {/* Botão fechar */}
          <div className="px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => setShowDetailModal(false)}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl active:bg-indigo-700 transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
