import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

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
export const db = getFirestore(app);
export const storage = getStorage(app);

// Enable offline persistence
import { enableIndexedDbPersistence } from "firebase/firestore";
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.");
  } else if (err.code === "unimplemented") {
    console.warn("The current browser does not support offline persistence");
  }
});

export default app;
