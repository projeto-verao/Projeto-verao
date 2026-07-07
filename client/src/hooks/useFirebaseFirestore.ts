import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";

// Tipos para Firestore
export interface Workout {
  id: string;
  userId: string;
  goal: string;
  days: WorkoutDay[];
  isActive: boolean;
  version: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WorkoutDay {
  day: number;
  name: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: number;
}

export interface BodyProgress {
  id: string;
  userId: string;
  weightKg: number;
  photoUrl?: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface WorkoutCompletion {
  id: string;
  userId: string;
  workoutId: string;
  day: number;
  completedExercises: number;
  totalExercises: number;
  duration: number;
  createdAt: Timestamp;
}

// Funções para Firestore
export const firestoreService = {
  // Workouts
  async createWorkout(userId: string, workout: Omit<Workout, "id" | "createdAt" | "updatedAt">) {
    const workoutsRef = collection(db, "users", userId, "workouts");
    const docRef = await addDoc(workoutsRef, {
      ...workout,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getActiveWorkout(userId: string) {
    const workoutsRef = collection(db, "users", userId, "workouts");
    const q = query(workoutsRef, where("isActive", "==", true));
    const snapshot = await getDocs(q);
    return snapshot.docs[0]?.data() as Workout | undefined;
  },

  async updateWorkout(userId: string, workoutId: string, updates: Partial<Workout>) {
    const workoutRef = doc(db, "users", userId, "workouts", workoutId);
    await updateDoc(workoutRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  },

  // Body Progress
  async addBodyProgress(userId: string, progress: Omit<BodyProgress, "id" | "createdAt">) {
    const progressRef = collection(db, "users", userId, "bodyProgress");
    const docRef = await addDoc(progressRef, {
      ...progress,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getBodyProgressHistory(userId: string, limit: number = 30) {
    const progressRef = collection(db, "users", userId, "bodyProgress");
    const q = query(progressRef);
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as BodyProgress))
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      .slice(0, limit);
  },

  // Workout Completions
  async addWorkoutCompletion(userId: string, completion: Omit<WorkoutCompletion, "id" | "createdAt">) {
    const completionsRef = collection(db, "users", userId, "completions");
    const docRef = await addDoc(completionsRef, {
      ...completion,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  async getWeekCompletions(userId: string) {
    const completionsRef = collection(db, "users", userId, "completions");
    const snapshot = await getDocs(completionsRef);
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as WorkoutCompletion))
      .filter((c) => c.createdAt.toMillis() >= weekAgo);
  },
};
