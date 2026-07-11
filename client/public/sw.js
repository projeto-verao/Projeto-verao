// ─── Projeto Verão – Service Worker com Notificações Locais ───────────────────
// v2.0.0 – Agendamento local + Push + Click + Periodic Background Sync

const CACHE_NAME = 'projeto-verao-v2';

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

// ── Notificações Push ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Projeto Verão';
  const options = {
    body: data.body || 'Hora de focar nos seus objetivos!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      reminderId: data.reminderId || '',
      type: data.type || 'push'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notificação Click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// ── Agendamento Local de Notificações ────────────────────────────────────────
// O service worker recebe mensagens do cliente via postMessage para agendar
// notificações locais. O agendamento é feito com setTimeout no contexto do SW.
// NOTA: O SW pode ser terminado pelo navegador. Para persistência, o cliente
// reagenda ao reabrir o app.

// Armazenar timers ativos no contexto do SW
const activeTimers = new Map();

self.addEventListener('message', (event) => {
  const { type, ...payload } = event.data;

  switch (type) {
    case 'SCHEDULE_NOTIFICATION': {
      const { reminderId, title, body, delayMs, options } = payload;
      const timerId = `notif_${reminderId}_${Date.now()}`;
      
      const timer = setTimeout(async () => {
        await self.registration.showNotification(title, {
          body: body || '',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          vibrate: [100, 50, 100],
          tag: reminderId, // Evita duplicatas: substitui notificação anterior com mesma tag
          data: {
            url: '/',
            reminderId: reminderId,
            type: 'local'
          }
        });
        activeTimers.delete(timerId);
        // Notificar o cliente que a notificação foi disparada
        const clientList = await clients.matchAll({ type: 'window' });
        for (const client of clientList) {
          client.postMessage({
            type: 'NOTIFICATION_DELIVERED',
            reminderId: reminderId,
            timestamp: Date.now()
          });
        }
      }, delayMs);

      activeTimers.set(timerId, timer);
      
      // Confirmar ao cliente
      event.source?.postMessage({
        type: 'SCHEDULE_CONFIRMED',
        reminderId: reminderId,
        timerId: timerId,
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
      event.source?.postMessage({
        type: 'ACTIVE_SCHEDULES',
        count: activeTimers.size
      });
      break;
    }
  }
});

// ── Periodic Background Sync (quando suportado) ──────────────────────────────

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(
      checkRemindersInBackground()
    );
  }
});

async function checkRemindersInBackground() {
  // Buscar lembretes do Firestore e disparar notificações
  const clientList = await clients.matchAll({ type: 'window' });
  if (clientList.length > 0) {
    // Se há abas abertas, delegar ao cliente
    for (const client of clientList) {
      client.postMessage({ type: 'TRIGGER_BACKGROUND_CHECK' });
    }
  }
}

// ── Logging em modo desenvolvimento ──────────────────────────────────────────

function logDebug(message, data) {
  console.log(`[SW] ${message}`, data || '');
}

self.addEventListener('notificationclose', (event) => {
  logDebug('Notificação fechada', {
    reminderId: event.notification.data?.reminderId,
    title: event.notification.title
  });
});
