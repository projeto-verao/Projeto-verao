import type { Express, Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseDb } from "../_core/firebaseDb";

/**
 * Registrar rotas FCM para notificações nativas do Android
 * 
 * Endpoints:
 * - POST /api/fcm/register  → Registrar token FCM do dispositivo
 * - POST /api/fcm/send      → Enviar notificação de teste
 * - POST /api/fcm/reminders → Registrar lembretes para agendamento FCM
 */
export function registerFcmRoutes(app: Express) {

  // ── Registrar token FCM ─────────────────────────────────────────────────
  app.post("/api/fcm/register", async (req: Request, res: Response) => {
    try {
      const { fcmToken } = req.body;
      if (!fcmToken) {
        return res.status(400).json({ error: "fcmToken é obrigatório" });
      }

      // Obter userId do contexto de autenticação
      const userId = req.headers.authorization
        ? String(req.headers.authorization).replace("Bearer ", "")
        : null;

      if (!userId) {
        // Fallback: usar session cookie
        const sessionToken = req.headers["x-session-token"] as string;
        if (!sessionToken) {
          return res.status(401).json({ error: "Não autenticado" });
        }
      }

      const firestore = getFirestore(getFirebaseDb());
      await firestore
        .collection("users")
        .doc(userId || String(req.cookies?.userId || ""))
        .set(
          {
            fcmToken,
            fcmTokenUpdatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

      console.log(`[FCM] Token registrado: ${fcmToken.substring(0, 20)}...`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[FCM] Erro ao registrar token:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Enviar notificação de teste ─────────────────────────────────────────
  app.post("/api/fcm/send", async (req: Request, res: Response) => {
    try {
      const { fcmToken, title, body } = req.body;
      if (!fcmToken) {
        return res.status(400).json({ error: "fcmToken é obrigatório" });
      }

      const messaging = getMessaging(getFirebaseDb());
      const message = {
        token: fcmToken,
        notification: {
          title: title || "Teste de Notificação",
          body: body || "Se você está vendo isso, os lembretes estão funcionando via FCM!",
        },
        data: {
          type: "test",
          timestamp: Date.now().toString(),
        },
        android: {
          priority: "high",
          notification: {
            icon: "ic_launcher",
            color: "#000000",
            sound: "default",
            vibrationPattern: [100, 50, 100],
          },
        },
      };

      const response = await messaging.send(message);
      console.log(`[FCM] Teste enviado: messageId=${response}`);
      res.json({ success: true, messageId: response });
    } catch (error: any) {
      console.error("[FCM] Erro ao enviar teste:", error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // ── Registrar lembretes para agendamento FCM ────────────────────────────
  app.post("/api/fcm/reminders", async (req: Request, res: Response) => {
    try {
      const { fcmToken, reminders } = req.body;
      if (!fcmToken || !Array.isArray(reminders)) {
        return res.status(400).json({ error: "fcmToken e reminders são obrigatórios" });
      }

      // Atualizar lembretes no Firestore para o agendamento
      const userId = req.headers.authorization
        ? String(req.headers.authorization).replace("Bearer ", "")
        : null;

      if (userId) {
        const firestore = getFirestore(getFirebaseDb());
        await firestore
          .collection("users")
          .doc(userId)
          .set(
            {
              fcmToken,
              reminderSchedule: reminders.map((r: any) => ({
                id: r.id,
                title: r.title,
                repetitionType: r.repetitionType,
                time: r.time,
                daysOfWeek: r.daysOfWeek || [],
                intervalHours: r.intervalHours || 2,
                lastScheduled: new Date().toISOString(),
              })),
            },
            { merge: true }
          );
      }

      console.log(`[FCM] ${reminders.length} lembretes registrados para agendamento`);
      res.json({ success: true, scheduled: reminders.length });
    } catch (error: any) {
      console.error("[FCM] Erro ao registrar lembretes:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
}
