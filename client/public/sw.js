// ─── Projeto Verão – Service Worker v5.0 ──────────────────────────────────────
// Suporte: FCM Push (nativo Android) + Notificações Locais + Agendamento
// 
// FCM Push: Recebe notificações nativas do Android via Google Play Services
// mesmo com o app completamente fechado ou após reiniciar o dispositivo.
//
// Notificações Locais: Agendamento via postMessage do cliente (fallback).
// Ambos coexistem: FCM é o canal principal, local é fallback.
//
// Estratégia de cache:
// - Navegação (HTML/rotas): network-first, para que novos deploys apareçam
//   imediatamente em qualquer dispositivo, sem prender o usuário em uma
//   versão antiga da PWA. Cache é usado apenas como fallback offline.
// - Assets estáticos versionados (JS/CSS/imagens com hash do build): cache-first,
//   pois o nome do arquivo muda a cada build e não há risco de servir conteúdo velho.

const CACHE_NAME = 'projeto-verao-v5';

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
  const { request } = event;

  // Apenas GET é cacheável; outros métodos seguem direto para a rede.
  if (request.method !== 'GET') return;

  const isNavigation = request.mode === 'navigate' || request.destination === 'document';

  if (isNavigation) {
    // Network-first para navegação: sempre busca a versão mais nova do servidor.
    // Isso evita que celulares fiquem presos em versões antigas da PWA após um deploy.
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  // Cache-first para assets estáticos versionados (JS/CSS/imagens com hash do build).
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((fetchResponse) => {
        if (request.url.startsWith(self.location.origin)) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
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
        // Remover timer da lista SEMPRE, mesmo que showNotification falhe.
        // Isso garante que activeTimers não acumule entradas obsoletas.
        activeTimers.delete(timerId);

        // CORREÇÃO BUG 2: try/catch em showNotification — antes, qualquer erro
        // aqui (permissão revogada, modo privado, etc.) era perdido silenciosamente.
        try {
          await self.registration.showNotification(title, {
            body: body || '',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            tag: reminderId,
            data: { url: '/', reminderId: reminderId, type: 'local' }
          });
          logDebug('Notificação local exibida com sucesso', { reminderId, title });
        } catch (err) {
          console.error('[SW] Erro ao exibir showNotification:', { reminderId, title, error: String(err) });
        }
        
        // Notificar cliente que a notificação foi processada (sucesso ou falha).
        // O cliente usa este evento para reagendar a próxima ocorrência.
        try {
          const clientList = await clients.matchAll({ type: 'window' });
          for (const client of clientList) {
            client.postMessage({ type: 'NOTIFICATION_DELIVERED', reminderId, timestamp: Date.now() });
          }
        } catch (err) {
          console.error('[SW] Erro ao notificar clientes após disparo:', { reminderId, error: String(err) });
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

    case 'SKIP_WAITING': {
      // Força este SW a ativar imediatamente, descartando a fase de espera.
      // Chamado pelo cliente quando detecta um SW em estado 'waiting'.
      self.skipWaiting();
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
