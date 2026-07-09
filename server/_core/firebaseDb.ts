/**
 * Módulo de Persistência no Firestore
 * Usado como fallback quando DATABASE_URL não está configurado
 * 
 * Características:
 * - Tratamento robusto de erros com logging estruturado
 * - Retry logic para operações críticas
 * - Validação de dados antes de persistência
 * - Fallback seguro quando Firestore não está disponível
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

let db: any = null;

// ─── Constantes ──────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const LOG_PREFIX = "[FirebaseDb]";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface FirebaseOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  retries?: number;
}

// ─── Funções Auxiliares ──────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: any): boolean {
  // Erros de rede e timeouts são retentáveis
  const retryableMessages = [
    'DEADLINE_EXCEEDED',
    'UNAVAILABLE',
    'RESOURCE_EXHAUSTED',
    'INTERNAL',
    'UNKNOWN',
    'UNAUTHENTICATED'
  ];
  
  const errorCode = String(error?.code || error?.message || '');
  return retryableMessages.some(msg => errorCode.includes(msg));
}

function formatError(error: any): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

// ─── Retry Wrapper ───────────────────────────────────────────────────────────

async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<FirebaseOperationResult<T>> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        console.log(`${LOG_PREFIX} ${operationName} sucedido na tentativa ${attempt}`);
      }
      return { success: true, data: result, retries: attempt - 1 };
    } catch (error) {
      lastError = error;
      const errorMsg = formatError(error);
      
      if (!isRetryableError(error)) {
        console.error(`${LOG_PREFIX} ${operationName} falhou (erro não retentável): ${errorMsg}`);
        return { success: false, error: errorMsg, retries: attempt - 1 };
      }
      
      if (attempt < maxRetries) {
        const delayMs = RETRY_DELAY_MS * attempt;
        console.warn(`${LOG_PREFIX} ${operationName} falhou na tentativa ${attempt}/${maxRetries}: ${errorMsg}. Retentando em ${delayMs}ms...`);
        await sleep(delayMs);
      } else {
        console.error(`${LOG_PREFIX} ${operationName} falhou após ${maxRetries} tentativas: ${errorMsg}`);
      }
    }
  }
  
  return { success: false, error: formatError(lastError), retries: maxRetries };
}

export function getFirebaseDb() {
  if (db) return db;
  
  try {
    // Inicializar Firebase Admin se não estiver inicializado
    if (getApps().length === 0) {
      console.log(`${LOG_PREFIX} Tentando inicializar Firebase Admin SDK...`);
      initializeApp();
    }
    db = getFirestore();

    console.log(`${LOG_PREFIX} Firestore inicializado com sucesso`);
    return db;
  } catch (error) {
    console.error(`${LOG_PREFIX} Erro ao inicializar Firestore: ${formatError(error)}`);
    return null;
  }
}

// ─── Operações de Treino ─────────────────────────────────────────────────────

export async function saveWorkoutToFirestore(
  userId: string,
  workout: {
    title: string;
    content: string;
    isActive: boolean;
  }
): Promise<FirebaseOperationResult<any>> {
  // Validação de entrada
  if (!userId || !workout.title || !workout.content) {
    const error = "Dados de treino inválidos: userId, title e content são obrigatórios";
    console.error(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  const firestore = getFirebaseDb();
  if (!firestore) {
    const error = "Firestore não disponível";
    console.warn(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  return withRetry(
    async () => {
      const workoutRef = firestore.collection("users").doc(userId).collection("workouts");
      
      // Deactivate previous workouts
      console.log(`${LOG_PREFIX} Buscando treinos ativos para desativar...`);
      const activeWorkouts = await workoutRef.where("isActive", "==", true).get();
      console.log(`${LOG_PREFIX} Encontrados ${activeWorkouts.docs.length} treinos ativos.`);
      for (const doc of activeWorkouts.docs) {
        await doc.ref.update({ isActive: false });
      }

      console.log(`${LOG_PREFIX} Adicionando novo treino...`);
      // Add new workout
      const docRef = await workoutRef.add({
        ...workout,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      console.log(`${LOG_PREFIX} Treino salvo no Firestore com ID: ${docRef.id}`);

      return {
        id: docRef.id,
        ...workout,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    },
    "saveWorkoutToFirestore"
  );
}

// ─── Operações de Busca ──────────────────────────────────────────────────────

export async function getActiveWorkoutFromFirestore(
  userId: string
): Promise<FirebaseOperationResult<any>> {
  // Validação de entrada
  if (!userId) {
    const error = "userId é obrigatório";
    console.error(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  const firestore = getFirebaseDb();
  if (!firestore) {
    const error = "Firestore não disponível";
    console.warn(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  return withRetry(
    async () => {
      const snapshot = await firestore
        .collection("users")
        .doc(userId)
        .collection("workouts")
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        console.log(`${LOG_PREFIX} Nenhum treino ativo encontrado para usuário ${userId}`);
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    },
    "getActiveWorkoutFromFirestore"
  );
}

// ─── Operações de Versão ────────────────────────────────────────────────────

export async function saveWorkoutVersionToFirestore(
  userId: string,
  workoutId: string,
  version: {
    versionNumber: number;
    title: string;
    content: string;
    changeDescription: string;
  }
): Promise<FirebaseOperationResult<void>> {
  // Validação de entrada
  if (!userId || !workoutId || !version) {
    const error = "Dados de versão inválidos: userId, workoutId e version são obrigatórios";
    console.error(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  const firestore = getFirebaseDb();
  if (!firestore) {
    const error = "Firestore não disponível";
    console.warn(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  return withRetry(
    async () => {
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

      console.log(`${LOG_PREFIX} Versão de treino salva no Firestore para usuário ${userId}`);
    },
    "saveWorkoutVersionToFirestore"
  );
}

// ─── Operações de Progresso ──────────────────────────────────────────────────

export async function addBodyProgressToFirestore(
  userId: string,
  progress: {
    weightKg?: number;
    photoUrl?: string;
    notes?: string;
  }
): Promise<FirebaseOperationResult<string>> {
  // Validação de entrada
  if (!userId) {
    const error = "userId é obrigatório";
    console.error(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  // Validação de peso se fornecido
  if (progress.weightKg !== undefined && (progress.weightKg <= 0 || progress.weightKg > 500)) {
    const error = "Peso deve estar entre 0 e 500 kg";
    console.error(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  const firestore = getFirebaseDb();
  if (!firestore) {
    const error = "Firestore não disponível";
    console.warn(`${LOG_PREFIX} ${error}`);
    return { success: false, error };
  }

  return withRetry(
    async () => {
      const docRef = await firestore
        .collection("users")
        .doc(userId)
        .collection("bodyProgress")
        .add({
          ...progress,
          createdAt: Timestamp.now(),
        });

      console.log(`${LOG_PREFIX} Progresso corporal salvo no Firestore com ID: ${docRef.id}`);
      return docRef.id;
    },
    "addBodyProgressToFirestore"
  );
}
