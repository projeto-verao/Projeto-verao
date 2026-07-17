import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
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

// Initialize Firestore com persistência offline (single-tab).
//
// Por que NÃO usamos persistentMultipleTabManager():
// O PWA instalado roda em processo isolado do Chrome (standalone mode).
// A coordenação multi-tab via IndexedDB locking pode falhar nesse contexto,
// causando erro assíncrono na primeira operação Firestore (ex: setDoc no
// cadastro) mesmo quando initializeFirestore() não lança exceção síncrona.
//
// persistentLocalCache() sem tabManager usa single-tab manager por padrão,
// que é mais compatível e adequado para PWA (sempre uma única janela).
// Fallback: memoryLocalCache() para ambientes sem IndexedDB (modo privado, etc).
function initDb() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache(),
    });
  } catch (e) {
    console.warn(
      "[Firebase] Persistência IndexedDB indisponível, usando cache em memória:",
      e
    );
    return initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
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
