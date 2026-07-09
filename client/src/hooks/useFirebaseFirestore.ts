import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit as fsLimit,
  Timestamp,
} from "firebase/firestore";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface StoredExercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  notes: string;
}

export interface StoredWorkoutDay {
  dayNumber: number;
  title: string;
  emoji: string;
  exercises: StoredExercise[];
}

export interface StoredWorkout {
  id: string;
  userId: string;
  title: string;
  days: StoredWorkoutDay[];
  isActive: boolean;
  version: number;
  changeDescription?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BodyProgressEntry {
  id: string;
  userId: string;
  weightKg?: number;
  bodyFatPercent?: number;
  chestCm?: number;
  waistCm?: number;
  armCm?: number;
  thighCm?: number;
  photoUrl?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface WorkoutCompletionEntry {
  id: string;
  userId: string;
  workoutId: string;
  day: number;
  completedExercises: number;
  totalExercises: number;
  duration: number; // duração em segundos
  startTime?: Timestamp;
  endTime?: Timestamp;
  workoutTitle?: string;
  createdAt: Timestamp;
}

export interface GoalsData {
  mainGoal?: string;
  currentWeightKg?: number;
  targetWeightKg?: number;
  targetBodyFatPercent?: number;
  weeklyGoalKg?: number;
  targetDate?: string;
  updatedAt?: Timestamp;
}

export interface MealEntry {
  id: string;
  mealType?: string;
  description: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  summary?: string;
  createdAt: Timestamp;
}

export interface WaterLogEntry {
  id: string;
  amountMl: number;
  createdAt: Timestamp;
}

export interface ChatMessageEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Timestamp;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userCol(userId: string, name: string) {
  return collection(db, "users", userId, name);
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(): number {
  const d = new Date();
  const day = d.getDay(); // 0 = domingo
  const diff = day === 0 ? 6 : day - 1; // semana começa segunda
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ─── Serviço ──────────────────────────────────────────────────────────────────

export const firestoreService = {
  // ── Workouts ───────────────────────────────────────────────────────────────

  async createWorkout(
    userId: string,
    workout: { title: string; days: StoredWorkoutDay[]; changeDescription?: string }
  ): Promise<string> {
    // Desativar treinos anteriores
    const activeQ = query(userCol(userId, "workouts"), where("isActive", "==", true));
    const activeSnap = await getDocs(activeQ);
    await Promise.all(
      activeSnap.docs.map((d) => updateDoc(d.ref, { isActive: false, updatedAt: Timestamp.now() }))
    );

    const version = (await getDocs(userCol(userId, "workouts"))).size + 1;

    const docRef = await addDoc(userCol(userId, "workouts"), {
      userId,
      title: workout.title,
      days: workout.days,
      isActive: true,
      version,
      changeDescription: workout.changeDescription || "Treino gerado pela IA",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getActiveWorkout(userId: string): Promise<StoredWorkout | null> {
    const q = query(userCol(userId, "workouts"), where("isActive", "==", true));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as StoredWorkout;
  },

  async listWorkouts(userId: string): Promise<StoredWorkout[]> {
    const q = query(
      userCol(userId, "workouts"),
      orderBy("createdAt", "desc"),
      fsLimit(20) // Limite de 20 treinos na lista
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as StoredWorkout);
  },

  async updateWorkout(userId: string, workoutId: string, updates: Partial<Omit<StoredWorkout, "id">>) {
    await updateDoc(doc(db, "users", userId, "workouts", workoutId), {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  async deleteWorkout(userId: string, workoutId: string) {
    await deleteDoc(doc(db, "users", userId, "workouts", workoutId));
  },

  async restoreWorkout(userId: string, workoutId: string) {
    const q = query(userCol(userId, "workouts"), fsLimit(100));
    const all = await getDocs(q);
    await Promise.all(
      all.docs.map((d) =>
        updateDoc(d.ref, { isActive: d.id === workoutId, updatedAt: Timestamp.now() })
      )
    );
  },

  // ── Workout Completions ────────────────────────────────────────────────────

  async addWorkoutCompletion(
    userId: string,
    completion: { 
      workoutId: string; 
      day: number; 
      completedExercises: number; 
      totalExercises: number; 
      duration: number;
      startTime?: Timestamp;
      endTime?: Timestamp;
      workoutTitle?: string;
    }
  ): Promise<string> {
    const docRef = await addDoc(userCol(userId, "completions"), {
      userId,
      ...completion,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getWeekCompletions(userId: string): Promise<WorkoutCompletionEntry[]> {
    const weekStart = startOfWeek();
    const q = query(
      userCol(userId, "completions"),
      orderBy("createdAt", "desc"),
      fsLimit(30) // Limite razoável: no máximo 30 registros por semana
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as WorkoutCompletionEntry)
      .filter((c) => c.createdAt.toMillis() >= weekStart);
  },

  // ── Body Progress ──────────────────────────────────────────────────────────

  async addBodyProgress(
    userId: string,
    progress: Partial<Omit<BodyProgressEntry, "id" | "createdAt" | "userId">>
  ): Promise<string> {
    const clean = Object.fromEntries(
      Object.entries(progress).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const docRef = await addDoc(userCol(userId, "bodyProgress"), {
      userId,
      ...clean,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getBodyProgressHistory(userId: string, max = 60): Promise<BodyProgressEntry[]> {
    const q = query(
      userCol(userId, "bodyProgress"),
      orderBy("createdAt", "desc"),
      fsLimit(max)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as BodyProgressEntry);
  },

  async deleteBodyProgress(userId: string, entryId: string) {
    await deleteDoc(doc(db, "users", userId, "bodyProgress", entryId));
  },

  // ── Goals ──────────────────────────────────────────────────────────────────

  async getGoals(userId: string): Promise<GoalsData | null> {
    const snap = await getDocs(userCol(userId, "meta"));
    const goalsDoc = snap.docs.find((d) => d.id === "goals");
    return goalsDoc ? (goalsDoc.data() as GoalsData) : null;
  },

  async saveGoals(userId: string, goals: GoalsData) {
    const clean = Object.fromEntries(
      Object.entries(goals).filter(([, v]) => v !== undefined)
    );
    await setDoc(
      doc(db, "users", userId, "meta", "goals"),
      { ...clean, updatedAt: Timestamp.now() },
      { merge: true }
    );
  },

  // ── Meals ──────────────────────────────────────────────────────────────────

  async addMeal(userId: string, meal: Omit<MealEntry, "id" | "createdAt">): Promise<string> {
    const clean = Object.fromEntries(
      Object.entries(meal).filter(([, v]) => v !== undefined)
    );
    const docRef = await addDoc(userCol(userId, "meals"), {
      ...clean,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getTodayMeals(userId: string): Promise<MealEntry[]> {
    const today = startOfToday();
    const todayTimestamp = Timestamp.fromMillis(today);
    const q = query(
      userCol(userId, "meals"),
      where("createdAt", ">=", todayTimestamp),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as MealEntry);
  },

  // ── Water ──────────────────────────────────────────────────────────────────

  async addWater(userId: string, amountMl: number): Promise<string> {
    const docRef = await addDoc(userCol(userId, "waterLogs"), {
      amountMl,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getTodayWater(userId: string): Promise<number> {
    const today = startOfToday();
    const todayTimestamp = Timestamp.fromMillis(today);
    const q = query(
      userCol(userId, "waterLogs"),
      where("createdAt", ">=", todayTimestamp)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as Omit<WaterLogEntry, "id">)
      .reduce((sum, w) => sum + (w.amountMl || 0), 0);
  },

  async getLast7DaysMeals(userId: string): Promise<MealEntry[]> {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Timestamp.fromMillis(cutoff);
    const q = query(
      userCol(userId, "meals"),
      where("createdAt", ">=", cutoffTimestamp),
      orderBy("createdAt", "desc"),
      fsLimit(100) // Limite de 100 refeições nos últimos 7 dias
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as MealEntry);
  },

  async getLast7DaysWater(userId: string): Promise<{ amountMl: number; createdAt: Timestamp }[]> {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const cutoffTimestamp = Timestamp.fromMillis(cutoff);
    const q = query(
      userCol(userId, "waterLogs"),
      where("createdAt", ">=", cutoffTimestamp),
      orderBy("createdAt", "desc"),
      fsLimit(100) // Limite de 100 registros nos últimos 7 dias
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as { amountMl: number; createdAt: Timestamp });
  },

  // ── Nutrition recommendation ───────────────────────────────────────────────

  async saveNutritionRecommendation(userId: string, content: string) {
    await setDoc(
      doc(db, "users", userId, "meta", "nutritionRecommendation"),
      { content, updatedAt: Timestamp.now() },
      { merge: true }
    );
  },

  async getNutritionRecommendation(userId: string): Promise<{ content: string; updatedAt: Timestamp } | null> {
    const snap = await getDocs(userCol(userId, "meta"));
    const recDoc = snap.docs.find((d) => d.id === "nutritionRecommendation");
    return recDoc ? (recDoc.data() as { content: string; updatedAt: Timestamp }) : null;
  },

  // ── Chat ───────────────────────────────────────────────────────────────────

  async addChatMessage(userId: string, role: "user" | "assistant", content: string): Promise<string> {
    const docRef = await addDoc(userCol(userId, "chatMessages"), {
      role,
      content,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getChatHistory(userId: string, max = 50): Promise<ChatMessageEntry[]> {
    const q = query(userCol(userId, "chatMessages"), orderBy("createdAt", "desc"), fsLimit(max));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as ChatMessageEntry)
      .reverse();
  },

  async clearChatHistory(userId: string) {
    // Limitar a 100 por vez para evitar timeouts em chats longos
    const q = query(userCol(userId, "chatMessages"), fsLimit(100));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    // Se ainda houver mais, deletar em lotes
    if (snap.docs.length === 100) {
      const remaining = await getDocs(q);
      await Promise.all(remaining.docs.map((d) => deleteDoc(d.ref)));
    }
  },
};
