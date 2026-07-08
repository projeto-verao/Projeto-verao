/**
 * Módulo de Persistência no Firestore
 * Usado como fallback quando DATABASE_URL não está configurado
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

let db: any = null;

export function getFirebaseDb() {
  if (db) return db;
  
  try {
    // Inicializar Firebase Admin se não estiver inicializado
    if (getApps().length === 0) {
      initializeApp();
    }
    db = getFirestore();
    return db;
  } catch (error) {
    console.warn("[FirebaseDb] Erro ao inicializar Firestore:", error);
    return null;
  }
}

export async function saveWorkoutToFirestore(
  userId: string,
  workout: {
    title: string;
    content: string;
    isActive: boolean;
  }
) {
  try {
    const firestore = getFirebaseDb();
    if (!firestore) {
      console.warn("[FirebaseDb] Firestore não disponível");
      return null;
    }

    // Salvar no Firestore com estrutura: users/{userId}/workouts/{docId}
    const workoutRef = firestore.collection("users").doc(userId).collection("workouts");
    
    // Deactivate previous workouts
    const activeWorkouts = await workoutRef.where("isActive", "==", true).get();
    for (const doc of activeWorkouts.docs) {
      await doc.ref.update({ isActive: false });
    }

    // Add new workout
    const docRef = await workoutRef.add({
      ...workout,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log("[FirebaseDb] Treino salvo no Firestore com ID:", docRef.id);

    return {
      id: docRef.id,
      ...workout,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  } catch (error) {
    console.error("[FirebaseDb] Erro ao salvar treino:", error);
    return null;
  }
}

export async function getActiveWorkoutFromFirestore(userId: string) {
  try {
    const firestore = getFirebaseDb();
    if (!firestore) {
      console.warn("[FirebaseDb] Firestore não disponível");
      return undefined;
    }

    const snapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("workouts")
      .where("isActive", "==", true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return undefined;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    console.error("[FirebaseDb] Erro ao buscar treino ativo:", error);
    return undefined;
  }
}

export async function saveWorkoutVersionToFirestore(
  userId: string,
  workoutId: string,
  version: {
    versionNumber: number;
    title: string;
    content: string;
    changeDescription: string;
  }
) {
  try {
    const firestore = getFirebaseDb();
    if (!firestore) {
      console.warn("[FirebaseDb] Firestore não disponível");
      return;
    }

    await firestore
      .collection("users")
      .doc(userId)
      .collection("workouts")
      .doc(workoutId)
      .collection("versions")
      .add({
        ...version,
        createdAt: Timestamp.now(),
      });

    console.log("[FirebaseDb] Versão de treino salva no Firestore");
  } catch (error) {
    console.error("[FirebaseDb] Erro ao salvar versão:", error);
  }
}

export async function addBodyProgressToFirestore(
  userId: string,
  progress: {
    weightKg?: number;
    photoUrl?: string;
    notes?: string;
  }
) {
  try {
    const firestore = getFirebaseDb();
    if (!firestore) {
      console.warn("[FirebaseDb] Firestore não disponível");
      return null;
    }

    const docRef = await firestore
      .collection("users")
      .doc(userId)
      .collection("bodyProgress")
      .add({
        ...progress,
        createdAt: Timestamp.now(),
      });

    console.log("[FirebaseDb] Progresso corporal salvo no Firestore com ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[FirebaseDb] Erro ao salvar progresso:", error);
    return null;
  }
}
