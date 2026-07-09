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
  { id: "water", title: "Beber água", description: "Lembrete para hidratação constante", icon: Droplets, color: "text-blue-500" },
  { id: "movement", title: "Se movimentar", description: "Evite ficar muito tempo sentado", icon: Activity, color: "text-orange-500" },
  { id: "food_log", title: "Registrar alimentação", description: "Não esqueça de anotar suas refeições", icon: Utensils, color: "text-green-500" },
  { id: "calories", title: "Meta de calorias", description: "Acompanhe seu balanço energético", icon: Flame, color: "text-red-500" },
  { id: "protein", title: "Meta de proteínas", description: "Garanta o aporte proteico diário", icon: Beef, color: "text-amber-700" },
  { id: "training_remind", title: "Lembrete de treino", description: "Hora de ir para a academia", icon: Dumbbell, color: "text-slate-700" },
  { id: "sleep", title: "Hora de dormir", description: "Mantenha a higiene do sono", icon: Moon, color: "text-indigo-600" },
  { id: "weight", title: "Registrar peso", description: "Acompanhe sua evolução na balança", icon: Scale, color: "text-gray-600" },
  { id: "evolution_photo", title: "Foto de evolução", description: "Registre seu progresso visual", icon: Camera, color: "text-purple-500" },
  { id: "measurements", title: "Atualizar medidas", description: "Mantenha suas medidas em dia", icon: Ruler, color: "text-blue-600" },
  { id: "supplements", title: "Suplementos", description: "Não esqueça de tomar sua suplementação", icon: Pill, color: "text-cyan-500" },
  { id: "training_log", title: "Registrar treino", description: "Anote as cargas e repetições", icon: CheckCircle2, color: "text-emerald-600" },
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
        water: water >= 2500, // Meta padrão de 2500ml
        food_log: meals.length >= 4, // Exemplo: 4 refeições registradas
        calories: totals.calories >= 2000, // Exemplo: meta de 2000kcal
        protein: totals.protein >= 150, // Exemplo: meta de 150g proteína
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
    }
  }, [user]);

  const loadReminders = async () => {
    try {
      const configs = await firestoreService.getReminderConfigs(user!.uid);
      
      // Initialize with default values if not exists
      const merged = REMINDER_TYPES.map(type => {
        const existing = configs.find(c => c.id === type.id);
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
      await checkSmartStatus();
    } catch (error) {
      console.error("Erro ao carregar lembretes:", error);
      toast.error("Erro ao carregar lembretes");
    } finally {
      setLoading(false);
    }
  };

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;

    const newStatus = !reminder.enabled;
    const updatedReminders = reminders.map(r => 
      r.id === id ? { ...r, enabled: newStatus } : r
    );
    setReminders(updatedReminders);

    try {
      await firestoreService.updateReminderConfig(user!.uid, { id, enabled: newStatus });
      toast.success(`${reminder.title} ${newStatus ? 'ativado' : 'desativado'}`);
    } catch (error) {
      console.error("Erro ao atualizar lembrete:", error);
      toast.error("Erro ao salvar alteração");
      // Rollback
      setReminders(reminders);
    }
  };

  const saveConfig = async (config: ReminderConfig) => {
    try {
      await firestoreService.updateReminderConfig(user!.uid, config);
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
    const updated = [...reminders];
    const idsToEnable = presetType === 'basic' 
      ? ['water', 'food_log', 'training_remind']
      : ['water', 'food_log', 'protein', 'calories', 'training_remind', 'weight', 'evolution_photo'];

    updated.forEach(r => {
      r.enabled = idsToEnable.includes(r.id);
    });

    try {
      setLoading(true);
      await firestoreService.saveAllReminders(user!.uid, updated);
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
              <h1 className="text-2xl font-bold">{selectedReminder.title}</h1>
              <p className="text-gray-500 text-sm">{selectedReminder.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Ativado Switch */}
            <div className="app-card flex items-center justify-between">
              <div>
                <span className="font-semibold">Lembrete Ativado</span>
                <p className="text-xs text-gray-500">Receber notificações deste lembrete</p>
              </div>
              <button 
                onClick={() => setSelectedReminder({...selectedReminder, enabled: !selectedReminder.enabled})}
                className={`w-12 h-6 rounded-full transition-colors relative ${selectedReminder.enabled ? 'bg-black' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedReminder.enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            {/* Repetição */}
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 px-1">
                <Calendar size={16} /> Repetição
              </label>
              <div className="grid grid-cols-1 gap-2">
                {REPETITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedReminder({...selectedReminder, repetitionType: opt.value as any})}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      selectedReminder.repetitionType === opt.value 
                        ? 'border-black bg-gray-50 font-semibold' 
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Horário (condicional) */}
            {['once_a_day', 'training_days', 'workdays', 'daily'].includes(selectedReminder.repetitionType) && (
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
            )}

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
                          ? 'border-black bg-gray-50 font-bold' 
                          : 'border-gray-100'
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
                <div className="flex justify-between">
                  {DAYS.map((day, idx) => {
                    const isSelected = selectedReminder.daysOfWeek?.includes(idx);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const current = selectedReminder.daysOfWeek || [];
                          const next = isSelected 
                            ? current.filter(d => d !== idx)
                            : [...current, idx];
                          setSelectedReminder({...selectedReminder, daysOfWeek: next});
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isSelected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {day[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Som e Vibração */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setSelectedReminder({...selectedReminder, sound: !selectedReminder.sound})}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  selectedReminder.sound ? 'border-black bg-gray-50' : 'border-gray-100'
                }`}
              >
                <Volume2 size={18} />
                <span className="font-semibold text-sm">Som</span>
              </button>
              <button 
                onClick={() => setSelectedReminder({...selectedReminder, vibration: !selectedReminder.vibration})}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  selectedReminder.vibration ? 'border-black bg-gray-50' : 'border-gray-100'
                }`}
              >
                <Vibrate size={18} />
                <span className="font-semibold text-sm">Vibração</span>
              </button>
            </div>

            {/* Persistência */}
            <div className="app-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Persistência</span>
                <button 
                  onClick={() => setSelectedReminder({...selectedReminder, repeatUntilDone: !selectedReminder.repeatUntilDone})}
                  className={`w-12 h-6 rounded-full transition-colors relative ${selectedReminder.repeatUntilDone ? 'bg-black' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedReminder.repeatUntilDone ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Repetir notificação em intervalos até que a tarefa seja marcada como concluída no app.
              </p>
            </div>

            <button 
              onClick={() => saveConfig(selectedReminder)}
              className="btn-primary mt-4"
            >
              Salvar Configurações
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
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
            <Zap size={14} className="text-amber-500" /> Configuração Rápida
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => applyPreset('basic')}
              className="app-card flex flex-col items-center gap-2 hover:border-black transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Activity size={20} />
              </div>
              <span className="font-bold text-sm">Básico</span>
              <span className="text-[10px] text-gray-400 text-center">Água, Alimentação e Treino</span>
            </button>
            <button 
              onClick={() => applyPreset('fitness')}
              className="app-card flex flex-col items-center gap-2 hover:border-black transition-all group"
            >
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                <Flame size={20} />
              </div>
              <span className="font-bold text-sm">Fitness</span>
              <span className="text-[10px] text-gray-400 text-center">Tudo para performance</span>
            </button>
          </div>
        </div>

        {/* Reminders List */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">
            Seus Lembretes
          </h2>
          {reminders.map(reminder => {
            const type = REMINDER_TYPES.find(t => t.id === reminder.id);
            const Icon = type?.icon || Bell;
            
            return (
              <div key={reminder.id} className="app-card flex items-center gap-4 p-4">
                <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center ${type?.color || 'text-black'}`}>
                  <Icon size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{reminder.title}</h3>
                  <p className="text-xs text-gray-500 truncate">{reminder.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  {smartStatus[reminder.id] && reminder.enabled && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full animate-pulse">
                      <Sparkles size={10} />
                      <span>META ATINGIDA</span>
                    </div>
                  )}

                  <button 
                    onClick={() => {
                      setSelectedReminder(reminder);
                      setIsConfiguring(true);
                    }}
                    className="p-2 text-gray-400 hover:text-black transition-colors"
                  >
                    <Settings2 size={18} />
                  </button>
                  
                  <button 
                    onClick={() => toggleReminder(reminder.id)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${reminder.enabled ? 'bg-black' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${reminder.enabled ? 'left-5.5' : 'left-0.5'}`} />
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
