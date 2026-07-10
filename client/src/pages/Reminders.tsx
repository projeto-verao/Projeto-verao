import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { firestoreService, ReminderConfig } from "@/hooks/useFirebaseFirestore";
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
  const [selectedProfile, setSelectedProfile] = useState<'basic' | 'fitness'>('basic');
  const [smartStatus, setSmartStatus] = useState<Record<string, boolean>>({});
  
  const initialLoadDone = useRef(false);

  const basicRemindersIds = ['water', 'food_log', 'training_remind'];
  const fitnessRemindersIds = ['water', 'food_log', 'protein', 'calories', 'training_remind', 'weight', 'evolution_photo'];

  const filteredReminders = reminders.filter(reminder => {
    if (selectedProfile === 'basic') return basicRemindersIds.includes(reminder.id);
    if (selectedProfile === 'fitness') return fitnessRemindersIds.includes(reminder.id);
    return false;
  });

  // ── Sincronização em Tempo Real ───────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = firestoreService.subscribeToReminders(user.uid, (configs) => {
      if (configs.length === 0 && !initialLoadDone.current) {
        // Inicializar com padrões se estiver vazio
        const defaultReminders = REMINDER_TYPES.map(type => ({
          id: type.id,
          type: type.id,
          title: type.title,
          description: type.description,
          icon: type.id,
          enabled: false,
          repetitionType: 'daily' as const,
          time: '08:00',
          intervalHours: 2,
          daysOfWeek: [1, 2, 3, 4, 5],
          sound: true,
          vibration: true,
          repeatUntilDone: false
        })) as ReminderConfig[];
        firestoreService.saveAllReminders(user.uid, defaultReminders);
      } else {
        // Mesclar com tipos definidos para garantir que todos existam na UI
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
            repetitionType: 'daily' as const,
            time: '08:00',
            intervalHours: 2,
            daysOfWeek: [1, 2, 3, 4, 5],
            sound: true,
            vibration: true,
            repeatUntilDone: false
          } as ReminderConfig;
        });
        setReminders(merged);
        setLoading(false);
        initialLoadDone.current = true;
      }
    });

    return () => unsubscribe();
  }, [user]);

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
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      checkSmartStatus();
    }
  }, [user, checkSmartStatus]);

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder || !user) return;

    const newStatus = !reminder.enabled;
    
    try {
      // Otimista: a UI vai atualizar via onSnapshot, mas podemos forçar localmente se quisermos
      await firestoreService.updateReminderConfig(user.uid, { id, enabled: newStatus });
      toast.success(`${reminder.title} ${newStatus ? 'ativado' : 'desativado'}`);
    } catch (error: any) {
      console.error("Erro ao atualizar lembrete:", id, error);
      toast.error(`Erro ao salvar alteração para ${reminder.title}`);
    }
  };

  const saveConfig = async (config: ReminderConfig) => {
    try {
      if (!user) return;
      await firestoreService.updateReminderConfig(user.uid, config);
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
      toast.error("Usuário não autenticado.");
      return;
    }
    
    const idsToEnable = presetType === 'basic' 
      ? basicRemindersIds
      : fitnessRemindersIds;

    const updated = reminders.map(r => {
      const isEnabledInPreset = idsToEnable.includes(r.id);
      const newReminder = { ...r, enabled: isEnabledInPreset };

      if (isEnabledInPreset) {
        const defaultType = REMINDER_TYPES.find(type => type.id === r.id);
        if (defaultType) {
          newReminder.repetitionType = defaultType.repetitionType as any;
          newReminder.time = defaultType.time;
          newReminder.intervalHours = defaultType.intervalHours;
          newReminder.daysOfWeek = defaultType.daysOfWeek;
          newReminder.sound = defaultType.sound;
          newReminder.vibration = defaultType.vibration;
          newReminder.repeatUntilDone = defaultType.repeatUntilDone;
        }
      }
      return newReminder;
    });

    try {
      setLoading(true);
      await firestoreService.saveAllReminders(user.uid, updated);
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
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 px-1">
                <Calendar size={16} /> Tipo de Repetição
              </label>
              <select
                value={selectedReminder.repetitionType}
                onChange={(e) => setSelectedReminder({...selectedReminder, repetitionType: e.target.value as any})}
                className="w-full bg-gray-100 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-black"
              >
                {REPETITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 px-1">
                <Clock size={16} /> Horário
              </label>
              <input
                type="time"
                value={selectedReminder.time || "08:00"}
                onChange={(e) => setSelectedReminder({...selectedReminder, time: e.target.value})}
                className="w-full bg-gray-100 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-black"
              />
            </div>

            {selectedReminder.repetitionType === 'every_x_hours' && (
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2 px-1">
                  <Sparkles size={16} /> Intervalo
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {HOUR_OPTIONS.map(h => (
                    <button
                      key={h}
                      onClick={() => setSelectedReminder({...selectedReminder, intervalHours: h})}
                      className={`py-3 rounded-xl text-xs font-bold transition-all ${
                        selectedReminder.intervalHours === h ? "bg-black text-white" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedReminder.repetitionType === 'specific_days' && (
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2 px-1">
                  <Calendar size={16} /> Dias da Semana
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day, idx) => {
                    const daysOfWeek = selectedReminder.daysOfWeek || [];
                    const isActive = daysOfWeek.includes(idx);
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const newDays = isActive
                            ? daysOfWeek.filter(d => d !== idx)
                            : [...daysOfWeek, idx];
                          setSelectedReminder({...selectedReminder, daysOfWeek: newDays});
                        }}
                        className={`py-3 rounded-lg text-[10px] font-bold transition-all ${
                          isActive ? "bg-black text-white" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400">
                    <Volume2 size={16} />
                  </div>
                  <span className="text-sm font-bold">Som</span>
                </div>
                <button 
                  onClick={() => setSelectedReminder({...selectedReminder, sound: !selectedReminder.sound})}
                  className={`w-12 h-6 rounded-full transition-all relative ${selectedReminder.sound ? "bg-black" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedReminder.sound ? "right-1" : "left-1"}`} />
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
                  onClick={() => setSelectedReminder({...selectedReminder, vibration: !selectedReminder.vibration})}
                  className={`w-12 h-6 rounded-full transition-all relative ${selectedReminder.vibration ? "bg-black" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedReminder.vibration ? "right-1" : "left-1"}`} />
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={() => saveConfig(selectedReminder)}
            className="fixed bottom-24 left-6 right-6 bg-black text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2"
          >
            SALVAR CONFIGURAÇÃO
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight">LEMBRETES</h1>
            <p className="text-sm text-gray-500">Mantenha o foco nos seus objetivos</p>
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-black">
            <Bell size={24} />
          </div>
        </div>

        {/* Abas de Categoria */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-2xl">
          <button 
            onClick={() => setSelectedProfile('basic')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${selectedProfile === 'basic' ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
          >
            BÁSICO
          </button>
          <button 
            onClick={() => setSelectedProfile('fitness')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${selectedProfile === 'fitness' ? "bg-white text-black shadow-sm" : "text-gray-500"}`}
          >
            FITNESS
          </button>
        </div>

        <div className="bg-black rounded-3xl p-6 mb-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Sparkles size={18} className="text-yellow-400" /> Configuração Rápida
            </h3>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Ative conjuntos de lembretes otimizados para seu nível de comprometimento.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => applyPreset('basic')}
                className="bg-white/10 hover:bg-white/20 py-3 rounded-xl text-xs font-bold transition-all border border-white/10"
              >
                BÁSICO
              </button>
              <button 
                onClick={() => applyPreset('fitness')}
                className="bg-orange-500 hover:bg-orange-600 py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-900/20"
              >
                FITNESS PRO
              </button>
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 opacity-10">
            <Bell size={120} />
          </div>
        </div>

        <div className="space-y-4">
          {filteredReminders.map((reminder) => {
            const type = REMINDER_TYPES.find(t => t.id === reminder.id);
            const Icon = type?.icon || Bell;
            const isSmartDone = smartStatus[reminder.id];
            
            return (
              <div 
                key={reminder.id}
                className={`bg-white rounded-3xl p-5 shadow-sm border border-gray-100 transition-all ${reminder.enabled ? "opacity-100" : "opacity-60"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-50 ${type?.color || "text-gray-400"}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{reminder.title}</h3>
                        {isSmartDone && (
                          <span className="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} /> Concluído
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{reminder.description}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleReminder(reminder.id)}
                    className={`w-12 h-6 rounded-full transition-all relative ${reminder.enabled ? "bg-black" : "bg-gray-300"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${reminder.enabled ? "right-1" : "left-1"}`} />
                  </button>
                </div>
                
                {reminder.enabled && (
                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <Clock size={12} /> {reminder.time}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        <Calendar size={12} /> {
                          REPETITION_OPTIONS.find(o => o.value === reminder.repetitionType)?.label || "Diário"
                        }
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedReminder({...reminder});
                        setIsConfiguring(true);
                      }}
                      className="text-xs font-bold text-black flex items-center gap-1 hover:underline"
                    >
                      Configurar <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
