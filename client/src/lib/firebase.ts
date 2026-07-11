import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCW1fXp4QgW6k7zV7L9IW3c2CX9JGRu4v0",
  authDomain: "projeto-verao-3a6a1.firebaseapp.com",
  projectId: "projeto-verao-3a6a1",
  storageBucket: "projeto-verao-3a6a1.firebasestorage.app",
  messagingSenderId: "345477225478",
  appId: "1:345477225478:web:f7411381143f218d5a3787"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Initialize Firestore with offline persistence (Firebase 10+)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);

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
