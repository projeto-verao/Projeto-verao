CREATE TABLE `body_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weightKg` float,
	`bodyFatPercent` float,
	`chestCm` float,
	`waistCm` float,
	`armCm` float,
	`thighCm` float,
	`photoUrl` text,
	`photoKey` varchar(500),
	`notes` text,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `body_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mainGoal` varchar(255),
	`currentWeightKg` float,
	`targetWeightKg` float,
	`targetBodyFatPercent` float,
	`weeklyGoalKg` float,
	`targetDate` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `goals_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`mealType` varchar(100),
	`description` text NOT NULL,
	`calories` float,
	`proteinG` float,
	`carbsG` float,
	`fatG` float,
	`fiberG` float,
	`photoUrl` text,
	`photoKey` varchar(500),
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nutrition_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`content` text NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `nutrition_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255),
	`age` int,
	`sex` enum('Masculino','Feminino','Outro'),
	`heightCm` float,
	`weightKg` float,
	`targetWeightKg` float,
	`goal` varchar(255),
	`experienceLevel` enum('Iniciante','Intermediário','Avançado'),
	`daysPerWeek` int DEFAULT 4,
	`minutesPerSession` int DEFAULT 60,
	`gymType` varchar(255),
	`physicalRestrictions` text,
	`preferredExercises` text,
	`avoidedExercises` text,
	`photoUrl` text,
	`photoKey` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `water_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amountMl` int NOT NULL,
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `water_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workoutId` int NOT NULL,
	`completedAt` timestamp NOT NULL DEFAULT (now()),
	`durationMinutes` int,
	`notes` text,
	CONSTRAINT `workout_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workoutId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`changeDescription` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workout_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`content` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workouts_id` PRIMARY KEY(`id`)
);
