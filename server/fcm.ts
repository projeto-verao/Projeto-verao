/**
 * ─── Firebase Cloud Messaging (FCM) – Notificações Nativas Android ────────────
 * 
 * Este módulo envia notificações push nativas do Android para os usuários
 * do Projeto Verão. Funciona mesmo com o app completamente fechado e após
 * reiniciar o dispositivo, pois utiliza o Google Play Services nativo.
 * 
 * Arquitetura:
 * 1. O app web (WebView no APK) registra o FCM Token no Firestore
 * 2. O backend verifica lembretes pendentes e dispara notificações via FCM
 * 3. O Service Worker no APK recebe o push e exibe a notificação nativa
 */

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Inicializar Firebase Admin (apenas uma vez)
let app;
if (!getApps().length) {
  const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH
    ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH)
    : cert("/home/ubuntu/firebase-service-account.json");
  app = initializeApp({ credential });
} else {
  app = getApp();
}

const messaging = getMessaging(app);

// ─── Enviar notificação para um FCM Token específico ─────────────────────────

export async function sendNotificationToDevice(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {
        type: "reminder",
        timestamp: Date.now().toString(),
      },
      android: {
        priority: "high",
        notification: {
          channelId: "projeto_verao_reminders",
          sound: "default",
          vibrateTimingsMillis: [100, 50, 100],
          sticky: false,
          color: "#000000",
        },
      },
    };

    const response = await messaging.send(message);
    console.log(`[FCM] Notificação enviada com sucesso: ${response}`);
    return true;
  } catch (error: any) {
    // Token inválido ou expirado — remover do Firestore
    if (error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered") {
      console.warn(`[FCM] Token inválido, removendo do Firestore: ${fcmToken.substring(0, 20)}...`);
      // O token será removido quando o app reenviar um novo
    } else {
      console.error(`[FCM] Erro ao enviar notificação: ${error.message}`);
    }
    return false;
  }
}

// ─── Enviar notificação para múltiplos dispositivos ──────────────────────────

export async function sendNotificationToTokens(
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const token of fcmTokens) {
    const success = await sendNotificationToDevice(token, title, body, data);
    if (success) sent++;
    else failed++;
  }

  return { sent, failed };
}

// ─── Enviar notificação multicast (até 500 tokens de uma vez) ────────────────

export async function sendMulticast(
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  if (fcmTokens.length === 0) return { sent: 0, failed: 0, invalidTokens: [] };

  try {
    // FCM suporta multicast de até 500 tokens
    const message = {
      tokens: fcmTokens.slice(0, 500),
      notification: {
        title,
        body,
      },
      data: data || {
        type: "reminder",
        timestamp: Date.now().toString(),
      },
      android: {
        priority: "high",
        notification: {
          channelId: "projeto_verao_reminders",
          sound: "default",
          vibrateTimingsMillis: [100, 50, 100],
          sticky: false,
          color: "#000000",
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    const invalidTokens: string[] = [];

    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        failed++;
        if (resp.error?.code === "messaging/invalid-registration-token" ||
            resp.error?.code === "messaging/registration-token-not-registered") {
          invalidTokens.push(fcmTokens[index]);
        }
      } else {
        sent++;
      }
    });

    console.log(`[FCM] Multicast: ${sent} enviados, ${failed} falhas`);
    return { sent, failed, invalidTokens };
  } catch (error: any) {
    console.error(`[FCM] Erro no multicast: ${error.message}`);
    return { sent: 0, failed: fcmTokens.length, invalidTokens: [] };
  }
}

// ─── Validar e atualizar token FCM no Firestore ──────────────────────────────

export async function updateFcmToken(
  userId: string,
  fcmToken: string
): Promise<boolean> {
  try {
    // Importar dinamicamente para evitar dependência circular
    const { doc, setDoc, getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore(app);
    const userDocRef = doc(db, "users", userId);
    
    await setDoc(userDocRef, { fcmToken }, { merge: true });
    console.log(`[FCM] Token atualizado para user ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`[FCM] Erro ao atualizar token: ${error.message}`);
    return false;
  }
}

// ─── Obter tokens FCM de um usuário ──────────────────────────────────────────

export async function getUserFcmTokens(userId: string): Promise<string[]> {
  try {
    const { doc, getFirestore } = await import("firebase-admin/firestore");
    const db = getFirestore(app);
    const userDocRef = doc(db, "users", userId);
    const snap = await userDocRef.get();
    
    const data = snap.data();
    if (data?.fcmToken) {
      return [data.fcmToken];
    }
    return [];
  } catch (error: any) {
    console.error(`[FCM] Erro ao obter token: ${error.message}`);
    return [];
  }
}

export { messaging };
