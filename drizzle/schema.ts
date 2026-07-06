import {
  boolean,
  float,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User physical profile for AI personalization.
 */
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  name: varchar("name", { length: 255 }),
  age: int("age"),
  sex: mysqlEnum("sex", ["Masculino", "Feminino", "Outro"]),
  heightCm: float("heightCm"),
  weightKg: float("weightKg"),
  targetWeightKg: float("targetWeightKg"),
  goal: varchar("goal", { length: 255 }),
  experienceLevel: mysqlEnum("experienceLevel", ["Iniciante", "Intermediário", "Avançado"]),
  daysPerWeek: int("daysPerWeek").default(4),
  minutesPerSession: int("minutesPerSession").default(60),
  gymType: varchar("gymType", { length: 255 }),
  physicalRestrictions: text("physicalRestrictions"),
  preferredExercises: text("preferredExercises"),
  avoidedExercises: text("avoidedExercises"),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * AI-generated workout plans.
 */
export const workouts = mysqlTable("workouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content").notNull(), // JSON string with full workout plan
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;

/**
 * Versioned history of workout plans (for compare/restore).
 */
export const workoutVersions = mysqlTable("workout_versions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workoutId: int("workoutId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  changeDescription: text("changeDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkoutVersion = typeof workoutVersions.$inferSelect;
export type InsertWorkoutVersion = typeof workoutVersions.$inferInsert;

/**
 * Daily water intake logs.
 */
export const waterLogs = mysqlTable("water_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  amountMl: int("amountMl").notNull(),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
});

export type WaterLog = typeof waterLogs.$inferSelect;
export type InsertWaterLog = typeof waterLogs.$inferInsert;

/**
 * Meal logs with AI macro analysis.
 */
export const meals = mysqlTable("meals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  mealType: varchar("mealType", { length: 100 }),
  description: text("description").notNull(),
  calories: float("calories"),
  proteinG: float("proteinG"),
  carbsG: float("carbsG"),
  fatG: float("fatG"),
  fiberG: float("fiberG"),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 500 }),
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
});

export type Meal = typeof meals.$inferSelect;
export type InsertMeal = typeof meals.$inferInsert;

/**
 * AI-generated daily nutrition recommendations.
 */
export const nutritionRecommendations = mysqlTable("nutrition_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type NutritionRecommendation = typeof nutritionRecommendations.$inferSelect;
export type InsertNutritionRecommendation = typeof nutritionRecommendations.$inferInsert;

/**
 * Body evolution tracking (weight, measurements, photos).
 */
export const bodyProgress = mysqlTable("body_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weightKg: float("weightKg"),
  bodyFatPercent: float("bodyFatPercent"),
  chestCm: float("chestCm"),
  waistCm: float("waistCm"),
  armCm: float("armCm"),
  thighCm: float("thighCm"),
  photoUrl: text("photoUrl"),
  photoKey: varchar("photoKey", { length: 500 }),
  notes: text("notes"),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type BodyProgress = typeof bodyProgress.$inferSelect;
export type InsertBodyProgress = typeof bodyProgress.$inferInsert;

/**
 * Workout completion tracking.
 */
export const workoutCompletions = mysqlTable("workout_completions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workoutId: int("workoutId").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  durationMinutes: int("durationMinutes"),
  notes: text("notes"),
});

export type WorkoutCompletion = typeof workoutCompletions.$inferSelect;
export type InsertWorkoutCompletion = typeof workoutCompletions.$inferInsert;

/**
 * User fitness goals.
 */
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  mainGoal: varchar("mainGoal", { length: 255 }),
  currentWeightKg: float("currentWeightKg"),
  targetWeightKg: float("targetWeightKg"),
  targetBodyFatPercent: float("targetBodyFatPercent"),
  weeklyGoalKg: float("weeklyGoalKg"),
  targetDate: timestamp("targetDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

/**
 * AI chat messages for workout trainer.
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
