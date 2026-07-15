import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { firestoreService, ReminderConfig } from "@/hooks/useFirebaseFirestore";
import { useRecurringReminders } from "@/hooks/useLocalNotifications";
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
  BellRing
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

function NotificationPermissionBanner() {
  const [permission, setPermission] = useState<NotificationPermission | 'checking'>('checking');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('denied');
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
        if ('Notification' in window) {
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

export default function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<ReminderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<ReminderConfig | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<'basic' | 'fitness'>('basic');
  const initialLoadDone = useRef(false);
  const hasScheduledOnOpen = useRef(false);
  const { scheduleNextReminder, rescheduleOnAppOpen } = useRecurringReminders();

  const basicRemindersIds = ['water', 'food_log', 'training_remind'];
  const fitnessRemindersIds = ['water', 'food_log', 'protein', 'calories', 'training_remind', 'weight', 'evolution_photo'];

  const filteredReminders = reminders.filter(reminder => {
    if (selectedProfile === 'basic') return basicRemindersIds.includes(reminder.id);
    if (selectedProfile === 'fitness') return fitnessRemindersIds.includes(reminder.id);
    return false;
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const unsubscribe = firestoreService.subscribeToReminders(user.uid, (configs) => {
      if (configs.length === 0 && !initialLoadDone.current) {
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
        setReminders(configs);
      }
      setLoading(false);
      initialLoadDone.current = true;
    });
    return () => unsubscribe();
  }, [user]);

  // Reagendar todos os lembretes ativos ao abrir o app
  useEffect(() => {
    if (reminders.length > 0 && !hasScheduledOnOpen.current && 'serviceWorker' in navigator) {
      hasScheduledOnOpen.current = true;
      rescheduleOnAppOpen(reminders).then(count => {
        if (count > 0) {
          console.log(`[Reminders] ${count} lembrete(s) reagendado(s) ao abrir o app`);
        }
      }).catch(err => {
        console.warn('[Reminders] Erro ao reagendar lembretes:', err);
      });
    }
  }, [reminders, rescheduleOnAppOpen]);

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!user) return;
    try {
      // Solicitar permissão se necessário ao ativar um lembrete
      if (enabled && 'Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast.error("Permissão de notificação negada. Ative nas configurações do navegador.");
          return;
        }
      }

      await firestoreService.updateReminder(user.uid, id, { enabled });

      // Agendar ou cancelar a notificação correspondente
      const reminder = reminders.find(r => r.id === id);
      if (reminder && 'serviceWorker' in navigator) {
        await scheduleNextReminder({ ...reminder, enabled });
      }

      toast.success(enabled ? "Lembrete ativado!" : "Lembrete desativado!");
    } catch (err) {
      toast.error("Erro ao atualizar lembrete.");
    }
  };

  const handleSave = async () => {
    if (!user || !selectedReminder) return;
    try {
      await firestoreService.updateReminderConfig(user.uid, selectedReminder);
      if (selectedReminder.enabled && 'serviceWorker' in navigator) {
        await scheduleNextReminder(selectedReminder);
      }
      setIsConfiguring(false);
      setSelectedReminder(null);
      toast.success("Configuração salva!");
    } catch (err) {
      toast.error("Erro ao salvar configuração.");
    }
  };

  if (isConfiguring && selectedReminder) {
    const ConfigIcon = REMINDER_TYPES.find(t => t.id === selectedReminder.id)?.icon || Bell;
    return (
      <AppLayout>
        <div className="p-4 pb-24">
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
            <div className="space-y-3">
              <label className="text-sm font-bold flex items-center gap-2 px-1">
                <Calendar size={16} /> Tipo de Repetição
              </label>
              <select
                value={selectedReminder.repetitionType}
                onChange={(e) => setSelectedReminder({ ...selectedReminder, repetitionType: e.target.value as ReminderConfig['repetitionType'] })}
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
                onChange={(e) => setSelectedReminder({ ...selectedReminder, time: e.target.value })}
                className="w-full bg-gray-100 border-none rounded-xl p-4 text-sm font-medium focus:ring-2 focus:ring-black"
              />
            </div>

            {selectedReminder.repetitionType === 'every_x_hours' && (
              <div className="space-y-3">
                <label className="text-sm font-bold flex items-center gap-2 px-1">
                  <Clock size={16} /> Intervalo
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {HOUR_OPTIONS.map(h => (
                    <button
                      key={h}
                      onClick={() => setSelectedReminder({ ...selectedReminder, intervalHours: h })}
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
                          setSelectedReminder({ ...selectedReminder, daysOfWeek: newDays });
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
                  onClick={() => setSelectedReminder({ ...selectedReminder, sound: !selectedReminder.sound })}
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
                  onClick={() => setSelectedReminder({ ...selectedReminder, vibration: !selectedReminder.vibration })}
                  className={`w-12 h-6 rounded-full transition-all relative ${selectedReminder.vibration ? "bg-black" : "bg-gray-300"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedReminder.vibration ? "right-1" : "left-1"}`} />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
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
            onClick={() => setSelectedProfile('basic')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              selectedProfile === 'basic' ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            BÁSICO
          </button>
          <button
            onClick={() => setSelectedProfile('fitness')}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
              selectedProfile === 'fitness' ? "bg-white text-primary shadow-sm" : "text-gray-500"
            }`}
          >
            FITNESS
          </button>
        </div>

        <div className="grid gap-4">
          {filteredReminders.map((reminder) => {
            const type = REMINDER_TYPES.find(t => t.id === reminder.id);
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
                <div
                  onClick={() => handleToggle(reminder.id, !reminder.enabled)}
                  className={`w-14 h-8 rounded-full transition-all relative cursor-pointer shrink-0 mr-5 ${
                    reminder.enabled ? "bg-primary" : "bg-gray-200"
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${
                    reminder.enabled ? "left-7" : "left-1"
                  }`} />
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100/50">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-indigo-600" size={20} />
            <h2 className="font-bold text-indigo-900">Sugestão da IA</h2>
          </div>
          <p className="text-sm text-indigo-700 leading-relaxed">
            Com base no seu perfil de <span className="font-bold">{selectedProfile === 'basic' ? 'iniciante' : 'atleta'}</span>, 
            recomendo ativar os lembretes de <span className="font-bold">água</span> e <span className="font-bold">proteína</span> para 
            maximizar seus resultados nesta semana.
          </p>
          <button className="mt-4 flex items-center gap-2 text-indigo-600 font-bold text-sm hover:gap-3 transition-all">
            Ver plano detalhado <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
