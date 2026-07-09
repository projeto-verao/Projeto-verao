import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { firestoreService, ReminderConfig, MealEntry, BodyProgressEntry, WorkoutCompletionEntry } from "@/hooks/useFirebaseFirestore";
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
  Settings2,
  Zap,
  Clock,
  Calendar,
  Volume2,
  Vibrate,
  ChevronLeft,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

const REMINDER_TYPES = [
  { id: "water", title: "Beber água", description: "Lembrete para hidratação constante", icon: Droplets, color: "text-blue-500", repetitionType: 'daily', time: '08:00', intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "movement", title: "Se movimentar", description: "Evite ficar muito tempo sentado", icon: Activity, color: "text-orange-500", repetitionType: 'every_x_hours', time: '10:00', intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "food_log", title: "Registrar alimentação", description: "Não esqueça de anotar suas refeições", icon: Utensils, color: "text-green-500", repetitionType: 'daily', time: '12:00', intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "calories", title: "Meta de calorias", description: "Acompanhe seu balanço energético", icon: Flame, color: "text-red-500", repetitionType: 'daily', time: '18:00', intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "protein", title: "Meta de proteínas", description: "Garanta o aporte proteico diário", icon: Beef, color: "text-amber-700", repetitionType: 'daily', time: '18:00', intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "training_remind", title: "Lembrete de treino", description: "Hora de ir para a academia", icon: Dumbbell, color: "text-slate-700", repetitionType: 'daily', time: '17:00', intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "sleep", title: "Hora de dormir", description: "Mantenha a higiene do sono", icon: Moon, color: "text-indigo-600", repetitionType: 'daily', time: '22:00', intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "weight", title: "Registrar peso", description: "Acompanhe sua evolução na balança", icon: Scale, color: "text-gray-600", repetitionType: 'daily', time: '07:00', intervalHours: 2, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "evolution_photo", title: "Foto de evolução", description: "Registre seu progresso visual", icon: Camera, color: "text-purple-500", repetitionType: 'specific_days', time: '09:00', intervalHours: 2, daysOfWeek: [0], sound: true, vibration: true, repeatUntilDone: false },
  { id: "measurements", title: "Atualizar medidas", description: "Mantenha suas medidas em dia", icon: Ruler, color: "text-blue-600", repetitionType: 'specific_days', time: '09:00', intervalHours: 2, daysOfWeek: [0], sound: true, vibration: true, repeatUntilDone: false },
  { id: "supplements", title: "Suplementos", description: "Não esqueça de tomar sua suplementação", icon: Pill, color: "text-cyan-500", repetitionType: 'every_x_hours', time: '09:00', intervalHours: 4, daysOfWeek: [1, 2, 3, 4, 5], sound: true, vibration: true, repeatUntilDone: false },
  { id: "training_log", title: "Registrar treino", description: "Anote as cargas e repetições", icon: CheckCircle2, color: "text-emerald-600", repetitionType: 'training_days', time: '19:00', intervalHours: 2, daysOfWeek: [1, 3, 5], sound: true, vibration: true, repeatUntilDone: false },
];

const REPETITION_OPTIONS = [
  { value: 'once_a_day', label: 'Uma vez por dia' },
  { value: 'every_x_hours', label: 'A cada X horas' },
  { value: 'specific_days', label: 'Dias específicos' },
  { value: 'training_days', label: 'Apenas em dias de treino' },
  { value: 'workdays', label: 'Apenas dias úteis' },
  { value: 'daily', label: 'Todos os dias' },
];

const HOUR_OPTIONS = [1, 2, 3, 4, 6, 8, 12];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<ReminderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<ReminderConfig | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<'all' | 'basic' | 'fitness' | 'none'>('none');

  const basicRemindersIds = ['water', 'food_log', 'training_remind'];
  const fitnessRemindersIds = ['water', 'food_log', 'protein', 'calories', 'training_remind', 'weight', 'evolution_photo'];

  const filteredReminders = reminders.filter(reminder => {
    if (selectedProfile === 'all') return true;
    if (selectedProfile === 'basic') return basicRemindersIds.includes(reminder.id);
    if (selectedProfile === 'fitness') return fitnessRemindersIds.includes(reminder.id);
    return true;
  });

  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user]);

  // ── Inteligência de Lembretes ───────────────────────────────────────────
  const [smartStatus, setSmartStatus] = useState<Record<string, boolean>>({});

  const checkSmartStatus = useCallback(async () => {
    if (!user) return;
    try {
      const [water, meals, completions, history] = await Promise.all([
        firestoreService.getTodayWater(user.uid),
        firestoreService.getTodayMeals(user.uid),
        firestoreService.getWeekCompletions(user.uid),
        firestoreService.getBodyProgressHistory(user.uid, 7)
      ]);

      const totals = meals.reduce((acc, m) => ({
        calories: acc.calories + (m.calories ?? 0),
        protein: acc.protein + (m.proteinG ?? 0),
      }), { calories: 0, protein: 0 });

      const status: Record<string, boolean> = {
        water: water >= 2500,
        food_log: meals.length >= 4,
        calories: totals.calories >= 2000,
        protein: totals.protein >= 150,
        training_remind: completions.some(c => {
          const today = new Date();
          const createdAt = c.createdAt.toDate();
          return createdAt.getDate() === today.getDate() && 
                 createdAt.getMonth() === today.getMonth() &&
                 createdAt.getFullYear() === today.getFullYear();
        }),
        weight: history.some(h => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return h.createdAt.toDate() > weekAgo;
        })
      };

      setSmartStatus(status);
    } catch (err) {
      console.error("Erro ao verificar status inteligente:", err);
      throw err;
    }
  }, [user]);

  const loadReminders = async () => {
    if (!user) {
      console.warn("loadReminders: User not available, skipping loading.");
      setLoading(false);
      return;
    }
    try {
      const configs = await firestoreService.getReminderConfigs(user.uid);
      
      let finalConfigs = configs;
      if (configs.length === 0) {
        const defaultReminders = REMINDER_TYPES.map(type => ({
          id: type.id,
          type: type.id,
          title: type.title,
          description: type.description,
          icon: type.id,
          enabled: false,
          repetitionType: 'daily',
          time: '08:00',
          intervalHours: 2,
          daysOfWeek: [1, 2, 3, 4, 5],
          sound: true,
          vibration: true,
          repeatUntilDone: false
        })) as ReminderConfig[];
        await firestoreService.saveAllReminders(user.uid, defaultReminders);
        finalConfigs = defaultReminders;
      }

      const merged = REMINDER_TYPES.map(type => {
        const existing = finalConfigs.find(c => c.id === type.id);
        if (existing) return existing;
        return {
          id: type.id,
          type: type.id,
          title: type.title,
          description: type.description,
          icon: type.id,
          enabled: false,
          repetitionType: 'daily',
          time: '08:00',
          intervalHours: 2,
          daysOfWeek: [1, 2, 3, 4, 5],
          sound: true,
          vibration: true,
          repeatUntilDone: false
        } as ReminderConfig;
      });
      
      setReminders(merged);
      setSelectedProfile("all");
      try {
        await checkSmartStatus();
      } catch (smartStatusError) {
        console.error("Erro ao verificar status inteligente:", smartStatusError);
      }
    } catch (error) {
      console.error("Erro ao carregar lembretes:", error);
      toast.error("Erro ao carregar lembretes");
      setReminders(REMINDER_TYPES.map(type => ({
        id: type.id,
        type: type.id,
        title: type.title,
        description: type.description,
        icon: type.id,
        enabled: false,
        repetitionType: 'daily',
        time: '08:00',
        intervalHours: 2,
        daysOfWeek: [1, 2, 3, 4, 5],
        sound: true,
        vibration: true,
        repeatUntilDone: false
      })) as ReminderConfig[]);
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const originalReminders = [...reminders];
    const newStatus = !reminder.enabled;
    const updatedReminders = reminders.map(r => 
      r.id === id ? { ...r, enabled: newStatus } : r
    );
    setReminders(updatedReminders);

    try {
      if (!user) {
        toast.error("Usuário não autenticado.");
        setReminders(originalReminders);
        return;
      }
      await firestoreService.updateReminderConfig(user.uid, updatedReminders.find(r => r.id === id)!);
      toast.success(`${reminder.title} ${newStatus ? 'ativado' : 'desativado'}`);
    } catch (error: any) {
      console.error("Erro ao atualizar lembrete:", id, error);
      let errorMessage = "Erro desconhecido ao salvar.";
      if (error.code === 'permission-denied') {
        errorMessage = "Permissão negada. Verifique as regras do Firestore.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(`Erro ao salvar alteração para ${reminder.title}: ${errorMessage}`);
      setReminders(originalReminders);
    }
  };

  const saveConfig = async (config: ReminderConfig) => {
    try {
      if (!user) return;
      await firestoreService.updateReminderConfig(user.uid, config);
      setReminders(reminders.map(r => r.id === config.id ? config : r));
      setIsConfiguring(false);
      setSelectedReminder(null);
      toast.success("Configuração salva!");
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro ao salvar configuração");
    }
  };

  const applyPreset = async (presetType: 'basic' | 'fitness') => {
    if (!user) {
      toast.error("Usuário não autenticado. Por favor, faça login novamente.");
      return;
    }
    const updated = [...reminders];
    const idsToEnable = presetType === 'basic' 
      ? ['water', 'food_log', 'training_remind']
      : ['water', 'food_log', 'protein', 'calories', 'training_remind', 'weight', 'evolution_photo'];

    updated.forEach(r => {
      const isEnabledInPreset = idsToEnable.includes(r.id);
      r.enabled = isEnabledInPreset;

      if (isEnabledInPreset) {
        const defaultType = REMINDER_TYPES.find(type => type.id === r.id);
        if (defaultType) {
          r.repetitionType = defaultType.repetitionType;
          r.time = defaultType.time;
          r.intervalHours = defaultType.intervalHours;
          r.daysOfWeek = defaultType.daysOfWeek;
          r.sound = defaultType.sound;
          r.vibration = defaultType.vibration;
          r.repeatUntilDone = defaultType.repeatUntilDone;
        }
      }
    });

    try {
      setLoading(true);
      if (!user) return;
      await firestoreService.saveAllReminders(user.uid, updated);
      setReminders(updated);
      toast.success(`Configuração ${presetType === 'basic' ? 'Básica' : 'Fitness'} aplicada!`);
    } catch (error) {
      toast.error("Erro ao aplicar configuração rápida");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      </AppLayout>
    );
  }

  if (isConfiguring && selectedReminder) {
    return (
      <AppLayout>
        <div className="p-4 pb-24">
          <button 
            onClick={() => setIsConfiguring(false)}
            className="flex items-center gap-2 text-gray-600 mb-6 hover:text-black transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="font-medium">Voltar</span>
          </button>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-black">
              {(() => {
                const Icon = REMINDER_TYPES.find(t => t.id === selectedReminder.id)?.icon || Bell;
                return <Icon size={24} />;
              })()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{selectedReminder.title}</h2>
              <p className="text-sm text-gray-500">{selectedReminder.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Tipo de Repetição */}
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 px-1">
                <Calendar size={16} /> Tipo de Repetição
              </label>
              <select
                value={selectedReminder.repetitionType}
                onChange={(e) => setSelectedReminder({...selectedReminder, repetitionType: e.target.value as any})}
                className="app-input"
              >
                {REPETITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Horário */}
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 px-1">
                <Clock size={16} /> Horário
              </label>
              <input
                type="time"
                value={selectedReminder.time || '08:00'}
                onChange={(e) => setSelectedReminder({...selectedReminder, time: e.target.value})}
                className="app-input"
              />
            </div>

            {/* Intervalo (condicional) */}
            {selectedReminder.repetitionType === 'every_x_hours' && (
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2 px-1">
                  <Clock size={16} /> Intervalo
                </label>
                <div className="flex flex-wrap gap-2">
                  {HOUR_OPTIONS.map(h => (
                    <button
                      key={h}
                      onClick={() => setSelectedReminder({...selectedReminder, intervalHours: h})}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${
                        selectedReminder.intervalHours === h 
                          ? "border-black bg-black text-white" 
                          : "border-gray-300 hover:border-black"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dias da Semana (condicional) */}
            {selectedReminder.repetitionType === 'specific_days' && (
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2 px-1">
                  <Calendar size={16} /> Dias da Semana
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const newDays = selectedReminder.daysOfWeek.includes(idx)
                          ? selectedReminder.daysOfWeek.filter(d => d !== idx)
                          : [...selectedReminder.daysOfWeek, idx];
                        setSelectedReminder({...selectedReminder, daysOfWeek: newDays});
                      }}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        selectedReminder.daysOfWeek.includes(idx)
                          ? "border-black bg-black text-white"
                          : "border-gray-300 hover:border-black"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Som e Vibração */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setSelectedReminder({...selectedReminder, sound: !selectedReminder.sound})}
                className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  selectedReminder.sound 
                    ? "border-black bg-black text-white" 
                    : "border-gray-300 hover:border-black"
                }`}
              >
                <Volume2 size={16} />
                <span className="text-sm font-semibold">Som</span>
              </button>
              <button 
                onClick={() => setSelectedReminder({...selectedReminder, vibration: !selectedReminder.vibration})}
                className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  selectedReminder.vibration 
                    ? "border-black bg-black text-white" 
                    : "border-gray-300 hover:border-black"
                }`}
              >
                <Vibrate size={16} />
                <span className="text-sm font-semibold">Vibração</span>
              </button>
            </div>

            {/* Salvar */}
            <button
              onClick={() => saveConfig(selectedReminder)}
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
            >
              Salvar Configuração
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 pb-24">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
              <Bell size={20} />
            </div>
            <h1 className="text-2xl font-bold">Lembretes</h1>
          </div>
          <p className="text-gray-500">Gerencie suas notificações e hábitos diários.</p>
        </header>

        {/* Quick Config */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            onClick={() => {setSelectedProfile("basic"); applyPreset("basic");}}
            className={`app-card flex-1 p-4 flex flex-col items-center justify-center space-y-2 text-center ${selectedProfile === "basic" ? "border-2 border-black bg-gray-50" : ""}`}
          >
            <Zap size={20} />
            <span className="font-semibold">Básico</span>
            <p className="text-xs text-gray-500">Água, Alimentação e Treino</p>
          </button>
          <button 
            onClick={() => {setSelectedProfile("fitness"); applyPreset("fitness");}}
            className={`app-card flex-1 p-4 flex flex-col items-center justify-center space-y-2 text-center ${selectedProfile === "fitness" ? "border-2 border-black bg-gray-50" : ""}`}
          >
            <Sparkles size={20} />
            <span className="font-semibold">Fitness</span>
            <p className="text-xs text-gray-500">Tudo para performance</p>
          </button>
          <button 
            onClick={() => {setSelectedProfile("all");}}
            className={`app-card flex-1 p-4 flex flex-col items-center justify-center space-y-2 text-center ${selectedProfile === "all" ? "border-2 border-black bg-gray-50" : ""}`}
          >
            <Bell size={20} />
            <span className="font-semibold">Todos</span>
            <p className="text-xs text-gray-500">Ver todos os lembretes</p>
          </button>
        </div>

        {selectedProfile === "basic" && <h2 className="text-lg font-bold mb-4">Lembretes do Perfil Básico</h2>}
        {selectedProfile === "fitness" && <h2 className="text-lg font-bold mb-4">Lembretes do Perfil Fitness</h2>}
        {selectedProfile === "all" && <h2 className="text-lg font-bold mb-4">Todos os Lembretes</h2>}

        <div className="space-y-4">
          {filteredReminders.map(reminder => {
            const Icon = REMINDER_TYPES.find(t => t.id === reminder.id)?.icon || Bell;
            const isSmart = smartStatus[reminder.id];

            return (
              <div key={reminder.id} className="app-card flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reminder.enabled ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">{reminder.title}</h3>
                    <p className="text-xs text-gray-500">{reminder.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSmart && reminder.enabled && (
                    <span className="text-xs text-green-600 font-medium">META ATINGIDA</span>
                  )}
                  <button
                    onClick={() => toggleReminder(reminder.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${reminder.enabled ? "bg-black" : "bg-gray-200"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reminder.enabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedReminder(reminder);
                      setIsConfiguring(true);
                    }}
                    className="text-gray-400 hover:text-black transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
