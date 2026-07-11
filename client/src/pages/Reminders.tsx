import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { firestoreService, ReminderConfig } from "@/hooks/useFirebaseFirestore";
import { messaging } from "@/lib/firebase";
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

function TestNotificationButton() {
  const { fcmToken, isSupported } = useFcmStatus();
  const [testing, setTesting] = useState(false);

  const handleTest = useCallback(async () => {
    setTesting(true);
    if ('Notification' in window) {
      const currentPermission = Notification.permission as string;
      if (currentPermission === 'denied') {
        toast.error("Permissão de notificação negada. Ative nas configurações do navegador.");
        setTesting(false);
        return;
      }
      if (currentPermission === 'default') {
        const newPermission = await Notification.requestPermission();
        if ((newPermission as string) !== 'granted') {
          toast.error("Permissão de notificação negada.");
          setTesting(false);
          return;
        }
      }
    }

    const token = fcmToken || localStorage.getItem("fcm_token");

    if (token && isSupported) {
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
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e) {
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
        } catch (e2) {
          toast.error("Erro ao agendar notificação de teste.");
        }
      }
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification("Teste de Notificação", {
        body: "Se você está vendo isso, as notificações estão funcionando!",
        icon: "/icons/icon-192x192.png",
      });
      toast.success("Notificação direta enviada!");
    } else {
      toast.error("Permissão de notificação negada.");
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
  const [selectedProfile, setSelectedProfile] = useState<'basic' | 'fitness'>('basic');
  const initialLoadDone = useRef(false);

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

  const handleToggle = async (id: string, enabled: boolean) => {
    if (!user) return;
    try {
      await firestoreService.updateReminder(user.uid, id, { enabled });
      toast.success(enabled ? "Lembrete ativado!" : "Lembrete desativado!");
    } catch (err) {
      toast.error("Erro ao atualizar lembrete.");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 pb-40">
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
              <div key={reminder.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className={`p-3 rounded-2xl bg-gray-50 ${type.color}`}>
                  <Icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{type.title}</h3>
                  <p className="text-xs text-gray-500 truncate">{type.description}</p>
                </div>
                <div
                  onClick={() => handleToggle(reminder.id, !reminder.enabled)}
                  className={`w-14 h-8 rounded-full transition-all relative cursor-pointer ${
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
      <TestNotificationButton />
    </AppLayout>
  );
}
