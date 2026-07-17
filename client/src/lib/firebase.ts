import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from "firebase/firestore";
// import { getStorage } from "firebase/storage"; // Removido: migrado para Cloudinary
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCW1fXp4QgW6k7zV7L9IW3c2CX9JGRu4v0",
  authDomain: "projeto-verao-3a6a1.firebaseapp.com",
  projectId: "projeto-verao-3a6a1",
  // storageBucket: "projeto-verao-3a6a1.firebasestorage.app", // Removido: migrado para Cloudinary
  messagingSenderId: "345477225478",
  appId: "1:345477225478:web:f7411381143f218d5a3787"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore com persistência offline e fallbacks progressivos.
//
// Nível 1 — persistentMultipleTabManager(): coordena múltiplas abas via
// IndexedDB. Funciona no Chrome normal e resolve a falha de escrita que
// ocorria quando o single-tab manager não conseguia adquirir o lock após
// uma sessão anterior ter usado o multi-tab.
//
// Nível 2 — persistentLocalCache() sem tabManager: single-tab, usado em
// contextos onde o multi-tab falha (ex: alguns browsers móveis restritos).
//
// Nível 3 — memoryLocalCache(): sem persistência (modo privado / sem IndexedDB).
//
// Nota PWA: o problema de cadastro no PWA (standalone mode) estava no
// window.location.reload() do controllerchange — já corrigido em main.tsx
// com reload inteligente. O multi-tab manager é seguro para PWA.
function initDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    try {
      console.warn("[Firebase] Multi-tab IndedxedDB indisponível, tentando single-tab...");
      return initializeFirestore(app, {
        localCache: persistentLocalCache(),
      });
    } catch (e) {
      console.warn("[Firebase] Persistência IndexedDB indisponível, usando cache em memória:", e);
      return initializeFirestore(app, {
        localCache: memoryLocalCache(),
      });
    }
  }
}

export const db = initDb();

// export const storage = getStorage(app); // Removido: migrado para Cloudinary

// Initialize Firebase Cloud Messaging (FCM)
// Nota: O FCM no web requer um VAPID key. A messagingSenderId acima permite
// que o Firebase gere o token de registro do dispositivo automaticamente.
export let messaging: ReturnType<typeof getMessaging> | null = null;

try {
  messaging = getMessaging(app);
} catch (e) {
  // FCM pode não estar disponível em alguns contextos (ex: HTTPS não disponível)
  console.warn("[Firebase] Messaging não inicializado:", e);
}

export default app;
