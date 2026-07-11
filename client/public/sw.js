// ─── Projeto Verão – Service Worker v3.0 ──────────────────────────────────────
// Suporte: FCM Push (nativo Android) + Notificações Locais + Agendamento
// 
// FCM Push: Recebe notificações nativas do Android via Google Play Services
// mesmo com o app completamente fechado ou após reiniciar o dispositivo.
//
// Notificações Locais: Agendamento via postMessage do cliente (fallback).
// Ambos coexistem: FCM é o canal principal, local é fallback.

const CACHE_NAME = 'projeto-verao-v3';

// ── Caching ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/index.html']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        }
        return fetchResponse;
      });
    })
  );
});

// ── FCM Push Notifications (Nativo Android) ──────────────────────────────────
// Este é o handler PRINCIPAL para notificações do Android.
// O Firebase Cloud Messaging envia o push através do Google Play Services
// e o SW recebe aqui mesmo com o app fechado.

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { notification: { title: 'Projeto Verão' } };
    }
  }

  // O FCM pode enviar em dois formatos:
  // 1. data.notification (payload de notificação)
  // 2. data.data (dados customizados)
  const notificationData = data.notification || {};
  const customData = data.data || {};
  
  const title = notificationData.title || customData.title || 'Projeto Verão';
  const body = notificationData.body || customData.body || customData.message || 'Hora de focar nos seus objetivos!';
  const reminderId = customData.reminderId || customData.type || '';
  const url = customData.url || '/';

  const options = {
    body: body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    tag: reminderId || 'projeto_verao', // Evita duplicatas
    data: {
      url: url,
      reminderId: reminderId,
      type: 'fcm'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      console.log('[FCM] Notificação nativa exibida:', title);
    })
  );
});

// ── Notificação Click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já há uma aba aberta, focar nela
      if (clientList.length > 0) {
        const client = clientList[0];
        client.navigate(url);
        client.focus();
      } else {
        // Se não, abrir nova aba
        return clients.openWindow(url);
      }
    })
  );
});

// ── Agendamento Local de Notificações (Fallback) ─────────────────────────────
// Usado como fallback quando FCM não está disponível.
// O SW pode ser terminado pelo navegador, então o cliente reagenda ao reabrir.

const activeTimers = new Map();

self.addEventListener('message', (event) => {
  const { type, ...payload } = event.data;

  switch (type) {
    case 'SCHEDULE_NOTIFICATION': {
      const { reminderId, title, body, delayMs } = payload;
      const timerId = `notif_${reminderId}_${Date.now()}`;
      
      const timer = setTimeout(async () => {
        await self.registration.showNotification(title, {
          body: body || '',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          vibrate: [100, 50, 100],
          tag: reminderId,
          data: { url: '/', reminderId: reminderId, type: 'local' }
        });
        activeTimers.delete(timerId);
        
        // Notificar cliente que a notificação foi disparada
        const clientList = await clients.matchAll({ type: 'window' });
        for (const client of clientList) {
          client.postMessage({ type: 'NOTIFICATION_DELIVERED', reminderId, timestamp: Date.now() });
        }
      }, delayMs);

      activeTimers.set(timerId, timer);
      
      // Confirmar ao cliente
      event.source?.postMessage({
        type: 'SCHEDULE_CONFIRMED',
        reminderId,
        timerId,
        deliveryAt: Date.now() + delayMs
      });
      break;
    }

    case 'CANCEL_NOTIFICATION': {
      const { reminderId } = payload;
      for (const [key, timer] of activeTimers) {
        if (key.startsWith(`notif_${reminderId}`)) {
          clearTimeout(timer);
          activeTimers.delete(key);
        }
      }
      break;
    }

    case 'CANCEL_ALL_NOTIFICATIONS': {
      for (const timer of activeTimers.values()) {
        clearTimeout(timer);
      }
      activeTimers.clear();
      break;
    }

    case 'GET_ACTIVE_SCHEDULES': {
      event.source?.postMessage({ type: 'ACTIVE_SCHEDULES', count: activeTimers.size });
      break;
    }
  }
});

// ── Periodic Background Sync ─────────────────────────────────────────────────

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkRemindersInBackground());
  }
});

async function checkRemindersInBackground() {
  const clientList = await clients.matchAll({ type: 'window' });
  if (clientList.length > 0) {
    for (const client of clientList) {
      client.postMessage({ type: 'TRIGGER_BACKGROUND_CHECK' });
    }
  }
}

// ── Logging ──────────────────────────────────────────────────────────────────

function logDebug(message, data) {
  console.log(`[SW] ${message}`, data || '');
}

self.addEventListener('notificationclose', (event) => {
  logDebug('Notificação fechada', {
    reminderId: event.notification.data?.reminderId,
    title: event.notification.title
  });
});
