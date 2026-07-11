import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { firestoreService, ReminderConfig } from "@/hooks/useFirebaseFirestore";
import { messaging } from "@/lib/firebase";
import { getToken } from "firebase/messaging";
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
  Sparkles,
  Zap,
  TestTube,
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

// ─── Verificar status FCM ────────────────────────────────────────────────────

function useFcmStatus() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkFcm = async () => {
      if (!messaging) {
        setIsSupported(false);
        return;
      }

      try {
        // Verificar se "serviceWorker" in navigator
        const supported = 'serviceWorker' in navigator && 'PushManager' in window;
        setIsSupported(supported);

        if (supported) {
          const token = localStorage.getItem("fcm_token");
          setFcmToken(token);
        }
      } catch (e) {
        console.warn("[FCM] Verificação falhou:", e);
        setIsSupported(false);
      }
    };

    checkFcm();
  }, []);

  return { fcmToken, isSupported };
}

// ─── Botão de Teste (FCM) ────────────────────────────────────────────────────

function TestNotificationButton() {
  const { fcmToken, isSupported } = useFcmStatus();
  const [testing, setTesting] = useState(false);

  const handleTest = useCallback(async () => {
    setTesting(true);

    // Verificar permissão de notificação
    if ('Notification' in window) {
      if (Notification.permission === 'denied') {
        toast.error("Permissão de notificação negada. Ative nas configurações do navegador.");
        setTesting(false);
        return;
      }
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
        if (Notification.permission !== 'granted') {
          toast.error("Permissão de notificação negada.");
          setTesting(false);
          return;
        }
      }
    }

    // Verificar se tem FCM token
    const token = fcmToken || localStorage.getItem("fcm_token");

    if (token && isSupported) {
      // Tentar enviar via endpoint FCM do backend
      try {
        const response = await fetch("/api/fcm/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            fcmToken: token,
            title: "Teste de Notificação",
            body: "Se você está vendo isso, os lembretes estão funcionando via FCM!",
          }),
        });

        if (response.ok) {
          toast.success("Notificação FCM enviada! Verifique em 5-10 segundos.");
          console.log("[Reminders] Teste FCM enviado com sucesso", {
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e: any) {
        // Fallback: usar notificação local via SW
        console.log("[Reminders] FCM endpoint não disponível, usando fallback local");
        try {
          const sw = await navigator.serviceWorker.ready;
          sw.active?.postMessage({
            type: "SCHEDULE_NOTIFICATION",
            reminderId: `test_${Date.now()}`,
            title: "Teste de Notificação",
            body: "Se você está vendo isso, os lembretes estão funcionando (fallback local)!",
            delayMs: 5000
          });
          toast.success("Notificação agendada para daqui a 5 segundos (fallback local)!");
          console.log("[Reminders] Teste agendado localmente", {
            timestamp: new Date().toISOString()
          });
        } catch (e2) {
          toast.error("Erro ao agendar notificação de teste.");
        }
      }
    } else if (isSupported) {
      // Fallback: usar notificação local via SW
      try {
        const sw = await navigator.serviceWorker.ready;
        sw.active?.postMessage({
          type: "SCHEDULE_NOTIFICATION",
          reminderId: `test_${Date.now()}`,
          title: "Teste de Notificação",
          body: "Se você está vendo isso, os lembretes estão funcionando (fallback local)!",
          delayMs: 5000
        });
        toast.success("Notificação agendada para daqui a 5 segundos (fallback local)!");
      } catch (e) {
        toast.error("Erro ao agendar notificação de teste.");
      }
    } else {
      // Fallback: notificação web direta
      try {
        const sw = await navigator.serviceWorker.ready;
        sw.active?.postMessage({
          type: "SCHEDULE_NOTIFICATION",
          reminderId: `test_${Date.now()}`,
          title: "Teste de Notificação",
          body: "Se você está vendo isso, os lembretes estão funcionando (fallback local)!",
          delayMs: 5000
        });
        toast.success("Notificação agendada para daqui a 5 segundos (fallback local)!");
      } catch (e) {
        // Último fallback: notificação web direta
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification("Teste de Notificação", {
            body: "Se você está vendo isso, as notificações estão funcionando!",
            icon: "/icons/icon-192x192.png",
            vibrate: [100, 50, 100],
          });
          toast.success("Notificação direta enviada!");
        } else {
          toast.error("Permissão de notificação negada.");
        }
      }
    }

    setTesting(false);
  }, [fcmToken, isSupported]);

  return (
    <button
      onClick={handleTest}
      disabled={testing}
      className="fixed bottom-24 left-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3 hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
    >
      <TestTube size={20} />
      {testing ? "ENVIANDO..." : "TESTAR LEMBRETE (5s)"}
    </button>
  );
}

// ─── Status de Permissão ─────────────────────────────────────────────────────

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

// ─── Componente Principal ────────────────────────────────────────────────────

export default function Reminders() {
  const { user } = useAuth();
  const { fcmToken, isSupported } = useFcmStatus();
  const [reminders, setReminders] = useState<ReminderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReminder, setSelectedReminder] = useState<ReminderConfig | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<'basic' | 'fitness'>('basic');
  const [smartStatus, setSmartStatus] = useState<Record<string, boolean>>({});
  const [scheduledCount, setScheduledCount] = useState(0);
  
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

  // ── Reagendar lembretes ao carregar ───────────────────────────────────────
  useEffect(() => {
    if (!user || reminders.length === 0 || loading) return;
    
    const reschedule = async () => {
      // Tentar reagendar via FCM (backend)
      const token = fcmToken || localStorage.getItem("fcm_token");
      const enabledReminders = reminders.filter(r => r.enabled);
      
      if (token && enabledReminders.length > 0) {
        // Registrar lembretes ativos no backend para agendamento FCM
        try {
          await fetch("/api/fcm/reminders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              fcmToken: token,
              reminders: enabledReminders.map(r => ({
                id: r.id,
                title: r.title,
                repetitionType: r.repetitionType,
                time: r.time,
                daysOfWeek: r.daysOfWeek,
                intervalHours: r.intervalHours,
              })),
            }),
          });
          setScheduledCount(enabledReminders.length);
          console.log(`[Reminders] ${enabledReminders.length} lembretes registrados para FCM`);
        } catch (e) {
          console.log("[Reminders] Backend FCM não disponível, usando fallback local");
        }
      }
      
      // Fallback: reagendar local via SW
      if (enabledReminders.length > 0) {
        const sw = await navigator.serviceWorker.ready;
        for (const reminder of enabledReminders) {
          const nextTime = calculateNextDeliveryTime(reminder);
          if (nextTime > 0) {
            sw.active?.postMessage({
              type: "SCHEDULE_NOTIFICATION",
              reminderId: reminder.id,
              title: reminder.title,
              body: getReminderMessage(reminder),
              delayMs: nextTime,
            });
          }
        }
      }
    };
    reschedule();
  }, [user, reminders, loading, fcmToken]);

  // ── Verificar smart status ────────────────────────────────────────────────
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
    if (user) checkSmartStatus();
  }, [user, checkSmartStatus]);

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder || !user) return;

    const newStatus = !reminder.enabled;
    
    try {
      await firestoreService.updateReminderConfig(user.uid, { id, enabled: newStatus });
      toast.success(`${reminder.title} ${newStatus ? 'ativado' : 'desativado'}`);
      
      // Se ativou, reagendar
      if (newStatus) {
        const token = fcmToken || localStorage.getItem("fcm_token");
        const updatedReminder = reminders.map(r => 
          r.id === id ? { ...r, enabled: true } : r
        );
        
        // Tentar FCM
        if (token) {
          try {
            await fetch("/api/fcm/reminders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                fcmToken: token,
                reminders: [{
                  id,
                  title: reminder.title,
                  repetitionType: reminder.repetitionType,
                  time: reminder.time,
                  daysOfWeek: reminder.daysOfWeek,
                  intervalHours: reminder.intervalHours,
                }],
              }),
            });
          } catch (e) {
            // Fallback: SW local
            const sw = await navigator.serviceWorker.ready;
            const nextTime = calculateNextDeliveryTime(reminder);
            if (nextTime > 0) {
              sw.active?.postMessage({
                type: "SCHEDULE_NOTIFICATION",
                reminderId: id,
                title: reminder.title,
                body: getReminderMessage(reminder),
                delayMs: nextTime,
              });
            }
          }
        } else {
          // Sem FCM, usar SW local
          const sw = await navigator.serviceWorker.ready;
          const nextTime = calculateNextDeliveryTime(reminder);
          if (nextTime > 0) {
            sw.active?.postMessage({
              type: "SCHEDULE_NOTIFICATION",
              reminderId: id,
              title: reminder.title,
              body: getReminderMessage(reminder),
              delayMs: nextTime,
            });
          }
        }
      } else {
        // Se desativou, cancelar
        const sw = await navigator.serviceWorker.ready;
        sw.active?.postMessage({ type: "CANCEL_NOTIFICATION", reminderId: id });
      }
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
      
      // Reagendar com a nova configuração
      if (config.enabled) {
        const token = fcmToken || localStorage.getItem("fcm_token");
        if (token) {
          try {
            await fetch("/api/fcm/reminders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                fcmToken: token,
                reminders: [{
                  id: config.id,
                  title: config.title,
                  repetitionType: config.repetitionType,
                  time: config.time,
                  daysOfWeek: config.daysOfWeek,
                  intervalHours: config.intervalHours,
                }],
              }),
            });
          } catch (e) {
            const sw = await navigator.serviceWorker.ready;
            const nextTime = calculateNextDeliveryTime(config);
            if (nextTime > 0) {
              sw.active?.postMessage({
                type: "SCHEDULE_NOTIFICATION",
                reminderId: config.id,
                title: config.title,
                body: getReminderMessage(config),
                delayMs: nextTime,
              });
            }
          }
        } else {
          const sw = await navigator.serviceWorker.ready;
          const nextTime = calculateNextDeliveryTime(config);
          if (nextTime > 0) {
            sw.active?.postMessage({
              type: "SCHEDULE_NOTIFICATION",
              reminderId: config.id,
              title: config.title,
              body: getReminderMessage(config),
              delayMs: nextTime,
            });
          }
        }
      }
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
      setScheduledCount(idsToEnable.length);
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
      <div className="p-4 pb-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black tracking-tight">LEMBRETES</h1>
            <p className="text-sm text-gray-500">Mantenha o foco nos seus objetivos</p>
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-black">
            <Bell size={24} />
          </div>
        </div>

        {/* Banner de Permissão */}
        <NotificationPermissionBanner />

        {/* Status FCM */}
        {isSupported && fcmToken && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Zap size={20} className="text-blue-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-700">Notificações nativas do Android</p>
              <p className="text-xs text-blue-500 mt-0.5">Funcionam mesmo com o app fechado e após reiniciar o celular</p>
            </div>
          </div>
        )}

        {/* Status dos lembretes agendados */}
        {scheduledCount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Zap size={20} className="text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-700">{scheduledCount} lembrete{scheduledCount > 1 ? 's' : ''} agendado{scheduledCount > 1 ? 's' : ''}</p>
              <p className="text-xs text-green-500 mt-0.5">Notificações ativas e funcionando</p>
            </div>
          </div>
        )}

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

        {/* Lista de Lembretes */}
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

        {/* Botão de Teste */}
        <TestNotificationButton />
      </div>
    </AppLayout>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateNextDeliveryTime(reminder: ReminderConfig): number {
  const now = new Date();
  const [hours, minutes] = (reminder.time || "08:00").split(":").map(Number);
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  
  // Verificar dias da semana
  const targetDay = target.getDay();
  if (reminder.repetitionType === 'specific_days' || reminder.repetitionType === 'training_days') {
    const days = reminder.daysOfWeek || [];
    if (!days.includes(targetDay)) {
      // Avançar para o próximo dia válido
      for (let i = 1; i <= 7; i++) {
        target.setDate(target.getDate() + 1);
        if (days.includes(target.getDay())) break;
      }
    }
  } else if (reminder.repetitionType === 'workdays') {
    if (targetDay === 0 || targetDay === 6) {
      target.setDate(target.getDate() + (targetDay === 6 ? 2 : 1));
      target.setHours(hours, minutes, 0, 0);
    }
  }
  
  return target.getTime() - now.getTime();
}

function getReminderMessage(reminder: ReminderConfig): string {
  const messages: Record<string, string> = {
    water: "Hora de beber água! Mantenha-se hidratado.",
    movement: "Hora de se movimentar! Evite ficar muito tempo parado.",
    food_log: "Não esqueça de registrar suas refeições de hoje.",
    calories: "Acompanhe seu consumo de calorias hoje.",
    protein: "Garanta o aporte proteico do dia.",
    training_remind: "Hora do treino! Bora para a academia.",
    sleep: "Hora de descansar. Mantenha a higiene do sono.",
    weight: "Registre seu peso para acompanhar a evolução.",
    evolution_photo: "Tire uma foto para registrar sua evolução.",
    measurements: "Atualize suas medidas corporais.",
    supplements: "Hora de tomar seus suplementos.",
    training_log: "Registre as cargas e repetições do treino de hoje.",
  };
  return messages[reminder.id] || "Projeto Verão - Hora de focar nos seus objetivos!";
}
