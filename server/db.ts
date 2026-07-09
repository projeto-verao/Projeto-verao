import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as firebaseDb from "./_core/firebaseDb";
import {
  InsertBodyProgress,
  InsertChatMessage,
  InsertGoal,
  InsertMeal,
  InsertNutritionRecommendation,
  InsertUser,
  InsertUserProfile,
  InsertWaterLog,
  InsertWorkout,
  InsertWorkoutCompletion,
  InsertWorkoutVersion,
  bodyProgress,
  chatMessages,
  goals,
  meals,
  nutritionRecommendations,
  userProfiles,
  users,
  waterLogs,
  workoutCompletions,
  workoutVersions,
  workouts,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserProfile(profile: InsertUserProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserProfile(profile.userId);
  if (existing) {
    await db.update(userProfiles).set(profile).where(eq(userProfiles.userId, profile.userId));
    const updated = await getUserProfile(profile.userId);
    return updated!;
  } else {
    await db.insert(userProfiles).values(profile);
    const created = await getUserProfile(profile.userId);
    return created!;
  }
}

// ─── Workouts ─────────────────────────────────────────────────────────────────

export async function getUserWorkouts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workouts).where(eq(workouts.userId, userId)).orderBy(desc(workouts.createdAt));
}

export async function getActiveWorkout(userId: number) {
  const db = await getDb();
  if (!db) {
    // Tentar buscar do Firestore como fallback
    const firebaseResult = await firebaseDb.getActiveWorkoutFromFirestore(String(userId));
    if (firebaseResult) {
      const data = firebaseResult as any;
      return {
        id: 0,
        userId,
        title: data.title || "",
        content: data.content || "",
        isActive: !!data.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }
    return undefined;
  }
  const result = await db.select().from(workouts)
    .where(and(eq(workouts.userId, userId), eq(workouts.isActive, true)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createWorkout(workout: InsertWorkout) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] MySQL não disponível - tentando Firestore");
    // Tentar salvar no Firestore como fallback
    const firebaseResult = await firebaseDb.saveWorkoutToFirestore(
      String(workout.userId),
      {
        title: workout.title,
        content: workout.content,
        isActive: workout.isActive ?? true,
      }
    );
    if (firebaseResult) {
      return {
        id: 0,
        ...workout,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;
    }
    // Se Firestore também falhar, retornar mock
    return {
      id: Math.floor(Math.random() * 1000000),
      ...workout,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }
  // Deactivate previous workouts
  await db.update(workouts).set({ isActive: false }).where(eq(workouts.userId, workout.userId));
  await db.insert(workouts).values(workout);
  return getActiveWorkout(workout.userId);
}

export async function getWorkoutById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Workout Versions ─────────────────────────────────────────────────────────

export async function getWorkoutVersions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workoutVersions)
    .where(eq(workoutVersions.userId, userId))
    .orderBy(desc(workoutVersions.createdAt));
}

export async function createWorkoutVersion(version: InsertWorkoutVersion) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] MySQL não disponível - versão de treino não será persistida");
    return;
  }
  await db.insert(workoutVersions).values(version);
}

// ─── Water Logs ───────────────────────────────────────────────────────────────

export async function getTodayWaterLogs(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return db.select().from(waterLogs)
    .where(and(
      eq(waterLogs.userId, userId),
      gte(waterLogs.loggedAt, today),
      lte(waterLogs.loggedAt, tomorrow)
    ))
    .orderBy(desc(waterLogs.loggedAt));
}

export async function getWaterLogsLast7Days(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return db.select().from(waterLogs)
    .where(and(eq(waterLogs.userId, userId), gte(waterLogs.loggedAt, sevenDaysAgo)))
    .orderBy(desc(waterLogs.loggedAt));
}

export async function addWaterLog(log: InsertWaterLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(waterLogs).values(log);
}

// ─── Meals ────────────────────────────────────────────────────────────────────

export async function getTodayMeals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return db.select().from(meals)
    .where(and(
      eq(meals.userId, userId),
      gte(meals.loggedAt, today),
      lte(meals.loggedAt, tomorrow)
    ))
    .orderBy(desc(meals.loggedAt));
}

export async function getMealsLast7Days(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return db.select().from(meals)
    .where(and(eq(meals.userId, userId), gte(meals.loggedAt, sevenDaysAgo)))
    .orderBy(desc(meals.loggedAt));
}

export async function addMeal(meal: InsertMeal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(meals).values(meal);
  const result = await db.select().from(meals)
    .where(eq(meals.userId, meal.userId))
    .orderBy(desc(meals.loggedAt)).limit(1);
  return result[0];
}

// ─── Nutrition Recommendations ────────────────────────────────────────────────

export async function getLatestNutritionRecommendation(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(nutritionRecommendations)
    .where(eq(nutritionRecommendations.userId, userId))
    .orderBy(desc(nutritionRecommendations.generatedAt)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function addNutritionRecommendation(rec: InsertNutritionRecommendation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(nutritionRecommendations).values(rec);
  return getLatestNutritionRecommendation(rec.userId);
}

// ─── Body Progress ────────────────────────────────────────────────────────────

export async function getBodyProgressHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bodyProgress)
    .where(eq(bodyProgress.userId, userId))
    .orderBy(desc(bodyProgress.recordedAt));
}

export async function addBodyProgress(progress: InsertBodyProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(bodyProgress).values(progress);
  const result = await db.select().from(bodyProgress)
    .where(eq(bodyProgress.userId, progress.userId))
    .orderBy(desc(bodyProgress.recordedAt)).limit(1);
  return result[0];
}

// ─── Workout Completions ──────────────────────────────────────────────────────

export async function getThisWeekCompletions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - monday.getDay() + 1);
  return db.select().from(workoutCompletions)
    .where(and(eq(workoutCompletions.userId, userId), gte(workoutCompletions.completedAt, monday)))
    .orderBy(desc(workoutCompletions.completedAt));
}

export async function addWorkoutCompletion(completion: InsertWorkoutCompletion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workoutCompletions).values(completion);
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export async function getUserGoals(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(goals).where(eq(goals.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertGoals(goal: InsertGoal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getUserGoals(goal.userId);
  if (existing) {
    await db.update(goals).set(goal).where(eq(goals.userId, goal.userId));
  } else {
    await db.insert(goals).values(goal);
  }
  return getUserGoals(goal.userId);
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function getChatHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(chatMessages)
    .where(eq(chatMessages.userId, userId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function addChatMessage(msg: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(chatMessages).values(msg);
}
