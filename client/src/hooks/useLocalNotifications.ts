import { useCallback, useEffect, useRef } from "react";

// ─── Tipo para agendamento ─────────────────────────────────────────────────────
export interface ScheduledNotification {
  enabled?: boolean; // Adicionado para corrigir erro de tipo

  reminderId: string;
  title: string;
  body: string;
  delayMs: number;
}

// ─── Interface do Service Worker ───────────────────────────────────────────────

interface ServiceWorkerMessage {
  type: string;
  reminderId?: string;
  timerId?: string;
  deliveryAt?: number;
  timestamp?: number;
  count?: number;
}

// ─── Hook: Solicitar permissão ─────────────────────────────────────────────────

export function useNotificationPermission() {
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    
    if (Notification.permission === "granted") return true;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch {
      return false;
    }
  }, []);

  const checkPermission = useCallback((): NotificationPermission => {
    return "Notification" in window ? Notification.permission : "denied";
  }, []);

  return { requestPermission, checkPermission };
}

// ─── Hook: Agendar notificações locais ────────────────────────────────────────

export function useLocalNotifications() {
  const swRef = useRef<ServiceWorkerRegistration | null>(null);

  // Obter o service worker registration
  useEffect(() => {
    const init = async () => {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        swRef.current = await navigator.serviceWorker.ready;
      }
    };
    init();

    // Ouvir mensagens do SW
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as ServiceWorkerMessage;
      switch (data.type) {
        case "NOTIFICATION_DELIVERED":
          console.log(`[Notifications] Notificação entregue: ${data.reminderId}`, {
            timestamp: new Date(data.timestamp!).toISOString()
          });
          break;
        case "SCHEDULE_CONFIRMED":
          console.log(`[Notifications] Agendado: ${data.reminderId} para ${new Date(data.deliveryAt!).toISOString()}`);
          break;
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  // Agendar notificação
  const scheduleNotification = useCallback(async (notification: ScheduledNotification): Promise<boolean> => {
    const sw = swRef.current;
    if (!sw) {
      console.warn("[Notifications] Service Worker não disponível");
      return false;
    }

    try {
      sw.active?.postMessage({
        type: "SCHEDULE_NOTIFICATION",
        ...notification
      });
      return true;
    } catch (err) {
      console.error("[Notifications] Erro ao agendar:", err);
      return false;
    }
  }, []);

  // Cancelar notificação específica
  const cancelNotification = useCallback(async (reminderId: string) => {
    const sw = swRef.current;
    if (!sw) return;
    sw.active?.postMessage({ type: "CANCEL_NOTIFICATION", reminderId });
  }, []);

  // Cancelar todas as notificações
  const cancelAll = useCallback(async () => {
    const sw = swRef.current;
    if (!sw) return;
    sw.active?.postMessage({ type: "CANCEL_ALL_NOTIFICATIONS" });
  }, []);

  // Verificar agendamentos ativos
  const getActiveSchedules = useCallback((): Promise<number> => {
    return new Promise((resolve) => {
      const sw = swRef.current;
      if (!sw) { resolve(0); return; }
      
      const handler = (event: MessageEvent) => {
        if (event.data.type === "ACTIVE_SCHEDULES") {
          resolve(event.data.count || 0);
          navigator.serviceWorker.removeEventListener("message", handler);
        }
      };
      navigator.serviceWorker.addEventListener("message", handler);
      sw.active?.postMessage({ type: "GET_ACTIVE_SCHEDULES" });
      
      // Timeout de fallback
      setTimeout(() => resolve(-1), 3000);
    });
  }, []);

  return { scheduleNotification, cancelNotification, cancelAll, getActiveSchedules };
}

// ─── Hook: Agendar lembretes recorrentes ──────────────────────────────────────

export function useRecurringReminders() {
  const { scheduleNotification, cancelNotification } = useLocalNotifications();

  // Agendar o próximo lembrete baseado na configuração
  const scheduleNextReminder = useCallback(async (
    reminder: {
      id: string;
      title: string;
      description: string;
      repetitionType: string;
      time?: string;
      intervalHours?: number;
      daysOfWeek?: number[];
      enabled?: boolean; // Adicionado para corrigir erro de tipo
    }
  ): Promise<boolean> => {
    if (!reminder.enabled) {
      await cancelNotification(reminder.id);
      return false;
    }

    // Cancelar agendamento anterior
    await cancelNotification(reminder.id);

    const delayMs = calculateNextDelivery(reminder);
    if (delayMs <= 0) return false;

    return scheduleNotification({
      reminderId: reminder.id,
      title: reminder.title,
      body: reminder.description,
      delayMs
    });
  }, [scheduleNotification, cancelNotification]);

  // Agendar todos os lembretes ativos
  const scheduleAllActive = useCallback(async (reminders: any[]): Promise<number> => {
    let count = 0;
    for (const reminder of reminders) {
      if (reminder.enabled) {
        const success = await scheduleNextReminder(reminder);
        if (success) count++;
      }
    }
    return count;
  }, [scheduleNextReminder]);

  // Reagendar todos os lembretes ao reabrir o app
  const rescheduleOnAppOpen = useCallback(async (reminders: any[]) => {
    // Cancelar todos os anteriores
    const sw = await navigator.serviceWorker.ready;
    sw.active?.postMessage({ type: "CANCEL_ALL_NOTIFICATIONS" });
    
    // Agendar novos
    return scheduleAllActive(reminders);
  }, [scheduleAllActive]);

  return { scheduleNextReminder, scheduleAllActive, rescheduleOnAppOpen };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Calcula o delay em ms até a próxima notificação
 */
function calculateNextDelivery(reminder: {
  repetitionType: string;
  time?: string;
  intervalHours?: number;
  daysOfWeek?: number[];
}): number {
  const now = new Date();
  const [hours, minutes] = (reminder.time || "08:00").split(":").map(Number);

  switch (reminder.repetitionType) {
    case "once_a_day": {
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      return target.getTime() - now.getTime();
    }

    case "daily": {
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      return target.getTime() - now.getTime();
    }

    case "every_x_hours": {
      const intervalMs = (reminder.intervalHours || 2) * 60 * 60 * 1000;
      return intervalMs; // Próximo em X horas a partir de agora
    }

    case "specific_days": {
      const daysOfWeek = reminder.daysOfWeek || [1, 2, 3, 4, 5];
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      
      // Encontrar o próximo dia válido
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        if (daysOfWeek.includes(checkDate.getDay())) {
          checkDate.setHours(hours, minutes, 0, 0);
          if (i === 0 && checkDate <= now) {
            // Hoje já passou, procurar próximo
            continue;
          }
          if (checkDate > now) return checkDate.getTime() - now.getTime();
        }
      }
      return -1;
    }

    case "training_days": {
      // Mesma lógica que specific_days, mas com dias de treino
      const daysOfWeek = reminder.daysOfWeek || [1, 3, 5];
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        if (daysOfWeek.includes(checkDate.getDay())) {
          checkDate.setHours(hours, minutes, 0, 0);
          if (i === 0 && checkDate <= now) continue;
          if (checkDate > now) return checkDate.getTime() - now.getTime();
        }
      }
      return -1;
    }

    case "workdays": {
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(now);
        checkDate.setDate(now.getDate() + i);
        const day = checkDate.getDay();
        if (day !== 0 && day !== 6) { // Segunda a Sexta
          checkDate.setHours(hours, minutes, 0, 0);
          if (i === 0 && checkDate <= now) continue;
          if (checkDate > now) return checkDate.getTime() - now.getTime();
        }
      }
      return -1;
    }

    default:
      return -1;
  }
}
