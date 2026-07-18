import { trpc } from "@/lib/trpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { messaging } from "./lib/firebase";
import { getToken, onMessage } from "firebase/messaging";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const token = localStorage.getItem("auth_token");
        const headers = new Headers(init?.headers || {});
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

// ─── Firebase Cloud Messaging (FCM) Registration ─────────────────────────────
// Registra o token FCM do dispositivo para receber notificações nativas do Android
// mesmo com o app fechado ou após reiniciar o dispositivo.

async function registerFcmToken() {
  if (!messaging) {
    console.warn("[FCM] Messaging não disponível, pulando registro");
    return;
  }

  try {
    // Registrar o Service Worker para o Firebase Messaging
    const swRegistration = await navigator.serviceWorker.getRegistration();
    if (!swRegistration) {
      console.warn("[FCM] Service Worker não registrado, pulando FCM");
      return;
    }

    // Solicitar permissão de notificação
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Permissão de notificação negada");
      return;
    }

    // Obter o token FCM do dispositivo
    const token = await getToken(messaging, {
      vapidKey: "BFx8Kw0KQxLJxN8Vq3K7G5bK9zL0JxN8Vq3K7G5bK9zL0JxN8Vq3K7G5bK9zL0JxN8Vq3K7G5bK9zL0JxN8Vq3K7G5bK9zL0JxN8Vq3K7G5bK9zL0JxN8Vq3K7G5bK9zL0",
    });

    if (token) {
      console.log("[FCM] Token FCM registrado:", token.substring(0, 20) + "...");
      // Salvar o token no localStorage para o Reminders.tsx usar
      localStorage.setItem("fcm_token", token);

      // Registrar o token no servidor via tRPC
      try {
        await (trpcClient as any).mutation("fcm.registerToken", {
          fcmToken: token,
        }).catch((err: any) => {
          // Endpoint pode não existir ainda - não é crítico
          console.log("[FCM] Endpoint de registro não disponível, token salvo localmente");
        });
      } catch (e) {
        // Fallback: registrar via fetch direto
        try {
          await fetch("/api/fcm/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fcmToken: token }),
            credentials: "include",
          });
        } catch (e2) {
          console.log("[FCM] Token salvo localmente, registro backend não disponível");
        }
      }
    }
  } catch (error: any) {
    console.warn("[FCM] Erro ao registrar token:", error.message);
  }
}

// ─── Foreground Message Handler ──────────────────────────────────────────────
// Recebe mensagens FCM quando o app está aberto (foreground)

function setupForegroundMessaging() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log("[FCM] Mensagem em foreground:", payload);
    // Se o app está aberto, mostrar notificação web como fallback
    if ("Notification" in window && Notification.permission === "granted") {
      const title = payload.notification?.title || "Projeto Verão";
      const body = payload.notification?.body || payload.data?.body || "";
      new Notification(title, {
        body,
        icon: "/icons/icon-192x192.png",

      });
    }
  });
}

// ─── Service Worker Registration ────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  // ─── Reload inteligente quando novo SW assume o controle ────────────────────
  // Problema original: reload imediato no controllerchange interrompia
  // createUserWithEmailAndPassword() em andamento no PWA instalado, pois o
  // PWA abre com SW antigo → novo SW ativa imediatamente → reload → cadastro abortado.
  //
  // Problema do "sem reload": sem recarregar, o JS antigo em memória pode
  // tentar importar sub-chunks com hashes antigos que o servidor não serve
  // mais, causando ChunkLoadError → crash do React (NotFoundError: removeChild).
  //
  // Solução: reload com guarda — só recarrega se nenhum formulário está sendo
  // submetido (detectado via button[disabled]). Se o usuário está no meio do
  // cadastro, o reload é abortado; o SW network-first garante conteúdo fresco
  // na próxima navegação natural.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Novo service worker ativo — verificando se é seguro recarregar...');
    const hasActiveSubmit = !!document.querySelector('button[disabled]');
    if (hasActiveSubmit) {
      console.log('[SW] Operação em andamento detectada — reload adiado. Conteúdo fresco na próxima navegação.');
      return;
    }
    console.log('[SW] Recarregando para nova versão...');
    window.location.reload();
  });

  // ─── Recuperação de chunk desatualizado ──────────────────────────────────────
  // Após um deploy, sub-chunks com hashes antigos deixam de existir no servidor.
  // Se o app detecta importação dinâmica falhando (ChunkLoadError), recarrega
  // uma vez para obter a versão correta — evita crash do React 19.
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const isChunkError =
      reason?.name === 'ChunkLoadError' ||
      reason?.message?.includes('Failed to fetch dynamically imported module') ||
      reason?.message?.includes('Unable to preload CSS for') ||
      reason?.message?.includes('Loading chunk');
    if (isChunkError) {
      console.warn('[SW] Chunk desatualizado detectado — recarregando para nova versão:', reason?.message);
      window.location.reload();
    }
  });

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);

      // ─── Forçar ativação de SW em waiting (Fix: aba 'Teses' / versão antiga) ─
      // Se há um novo SW em estado 'waiting', envia SKIP_WAITING para que ele
      // assuma imediatamente o controle. Sem isso, o SW antigo continua servindo
      // conteúdo cacheado (que em alguns dispositivos mostrava 'Teses' em vez de
      // 'Lembretes') até que o usuário feche todas as abas do app.
      function activateWaiting(reg: ServiceWorkerRegistration) {
        if (reg.waiting) {
          console.log('[SW] SW em waiting detectado — forçando skipWaiting...');
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
      activateWaiting(registration);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] Novo SW instalado em waiting — forçando skipWaiting...');
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Registrar FCM token
      registerFcmToken();

      // Setup foreground messaging
      setupForegroundMessaging();
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError);
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </trpc.Provider>
);
