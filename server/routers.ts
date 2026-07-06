import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import {
  getUserProfile,
  upsertUserProfile,
  getUserWorkouts,
  getActiveWorkout,
  createWorkout,
  getWorkoutById,
  getWorkoutVersions,
  createWorkoutVersion,
  getTodayWaterLogs,
  getWaterLogsLast7Days,
  addWaterLog,
  getTodayMeals,
  getMealsLast7Days,
  addMeal,
  getLatestNutritionRecommendation,
  addNutritionRecommendation,
  getBodyProgressHistory,
  addBodyProgress,
  getThisWeekCompletions,
  addWorkoutCompletion,
  getUserGoals,
  upsertGoals,
  getChatHistory,
  addChatMessage,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Profile ──────────────────────────────────────────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getUserProfile(ctx.user.id);
    }),

    save: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        age: z.number().optional(),
        sex: z.enum(["Masculino", "Feminino", "Outro"]).optional(),
        heightCm: z.number().optional(),
        weightKg: z.number().optional(),
        targetWeightKg: z.number().optional(),
        goal: z.string().optional(),
        experienceLevel: z.enum(["Iniciante", "Intermediário", "Avançado"]).optional(),
        daysPerWeek: z.number().optional(),
        minutesPerSession: z.number().optional(),
        gymType: z.string().optional(),
        physicalRestrictions: z.string().optional(),
        preferredExercises: z.string().optional(),
        avoidedExercises: z.string().optional(),
        photoUrl: z.string().optional(),
        photoKey: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertUserProfile({ ...input, userId: ctx.user.id });
      }),

    uploadPhoto: protectedProcedure
      .input(z.object({
        base64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64, "base64");
        const key = `profiles/${ctx.user.id}/photo-${Date.now()}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url, key };
      }),
  }),

  // ─── Workout ──────────────────────────────────────────────────────────────
  workout: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserWorkouts(ctx.user.id);
    }),

    getActive: protectedProcedure.query(async ({ ctx }) => {
      return getActiveWorkout(ctx.user.id);
    }),

    generate: protectedProcedure.mutation(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      if (!profile) throw new Error("Perfil não encontrado. Complete o onboarding primeiro.");

      const prompt = `Você é um personal trainer especializado. Crie um plano de treino completo e personalizado em português para o seguinte perfil:

Nome: ${profile.name || "Usuário"}
Idade: ${profile.age} anos
Sexo: ${profile.sex}
Altura: ${profile.heightCm}cm
Peso atual: ${profile.weightKg}kg
Peso desejado: ${profile.targetWeightKg || "não informado"}kg
Objetivo: ${profile.goal}
Nível: ${profile.experienceLevel}
Dias por semana: ${profile.daysPerWeek}
Tempo por treino: ${profile.minutesPerSession} minutos
Tipo de academia: ${profile.gymType}
Restrições físicas: ${profile.physicalRestrictions || "nenhuma"}
Exercícios preferidos: ${profile.preferredExercises || "nenhum"}
Exercícios a evitar: ${profile.avoidedExercises || "nenhum"}

Crie um plano estruturado com:
1. Nome do plano e objetivo
2. Divisão dos treinos por dia (ex: Treino A, B, C...)
3. Para cada treino: lista de exercícios com séries, repetições, carga sugerida e observações
4. Dicas de aquecimento e alongamento
5. Orientações gerais de progressão

Formate a resposta de forma clara e organizada usando Markdown.`;

      try {
        const response = await invokeLLM({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é um personal trainer especializado em criar planos de treino personalizados. Responda sempre em português do Brasil." },
            { role: "user", content: prompt },
          ],
        });

        const content = response.choices[0].message.content as string;
        const title = `Treino Personalizado — ${profile.goal || "Geral"}`;

        const workout = await createWorkout({
          userId: ctx.user.id,
          title,
          content,
          isActive: true,
        });

      // Save version
      const versions = await getWorkoutVersions(ctx.user.id);
      await createWorkoutVersion({
        userId: ctx.user.id,
        workoutId: workout!.id,
        versionNumber: versions.length + 1,
        title,
        content,
        changeDescription: "Treino inicial gerado pela IA",
      });

      return workout;
      } catch (error) {
        console.error("Erro ao gerar treino com Gemini:", error);
        throw new Error("Não conseguimos gerar seu treino agora devido a uma falha na comunicação com o especialista de IA. Por favor, verifique sua conexão ou tente novamente em alguns instantes.");
      }
    }),

    complete: protectedProcedure
      .input(z.object({
        workoutId: z.number(),
        durationMinutes: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addWorkoutCompletion({
          userId: ctx.user.id,
          workoutId: input.workoutId,
          durationMinutes: input.durationMinutes,
          notes: input.notes,
        });
        return { success: true };
      }),

    weekProgress: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      const completions = await getThisWeekCompletions(ctx.user.id);
      return {
        completed: completions.length,
        target: profile?.daysPerWeek ?? 4,
        completions,
      };
    }),
  }),

  // ─── Workout Versions ─────────────────────────────────────────────────────
  workoutHistory: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getWorkoutVersions(ctx.user.id);
    }),

    restore: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const versions = await getWorkoutVersions(ctx.user.id);
        const version = versions.find(v => v.id === input.versionId);
        if (!version) throw new Error("Versão não encontrada");

        const workout = await createWorkout({
          userId: ctx.user.id,
          title: version.title,
          content: version.content,
          isActive: true,
        });

        await createWorkoutVersion({
          userId: ctx.user.id,
          workoutId: workout!.id,
          versionNumber: versions.length + 1,
          title: version.title,
          content: version.content,
          changeDescription: `Restaurado da versão ${version.versionNumber}`,
        });

        return workout;
      }),
  }),

  // ─── AI Chat ──────────────────────────────────────────────────────────────
  chat: router({
    history: protectedProcedure.query(async ({ ctx }) => {
      const messages = await getChatHistory(ctx.user.id, 50);
      return messages.reverse();
    }),

    send: protectedProcedure
      .input(z.object({ message: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const [profile, activeWorkout, history] = await Promise.all([
          getUserProfile(ctx.user.id),
          getActiveWorkout(ctx.user.id),
          getChatHistory(ctx.user.id, 20),
        ]);

        // Save user message
        await addChatMessage({
          userId: ctx.user.id,
          role: "user",
          content: input.message,
        });

        const systemPrompt = `Você é um personal trainer virtual especializado. 
Perfil do usuário: ${profile ? JSON.stringify({ goal: profile.goal, level: profile.experienceLevel, daysPerWeek: profile.daysPerWeek }) : "não disponível"}
Treino atual: ${activeWorkout ? activeWorkout.content.substring(0, 500) + "..." : "nenhum treino ativo"}

Responda de forma direta, amigável e profissional em português. 
Se o usuário pedir para modificar o treino, sugira as alterações de forma clara.
Você pode ajudar com: exercícios, técnicas, nutrição básica, motivação e ajustes no treino.`;

        const messages = history.reverse().map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        messages.push({ role: "user", content: input.message });

        const response = await invokeLLM({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
        });

        const assistantContent = response.choices[0].message.content as string;

        await addChatMessage({
          userId: ctx.user.id,
          role: "assistant",
          content: assistantContent,
        });

        // If user asked to modify workout, create new version
        const modificationKeywords = ["modific", "alter", "troc", "mud", "atualiz", "ajust"];
        const isModification = modificationKeywords.some(k => input.message.toLowerCase().includes(k));
        if (isModification && activeWorkout) {
          const updateResponse = await invokeLLM({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é um personal trainer. Baseado na conversa, atualize o plano de treino incorporando as mudanças solicitadas. Mantenha o formato estruturado original." },
              { role: "user", content: `Treino atual:\n${activeWorkout.content}\n\nSolicitação do usuário: ${input.message}\n\nGere o treino atualizado completo:` },
            ],
          });
          const newContent = updateResponse.choices[0].message.content as string;
          const versions = await getWorkoutVersions(ctx.user.id);
          await createWorkout({ userId: ctx.user.id, title: activeWorkout.title, content: newContent, isActive: true });
          const newWorkout = await getActiveWorkout(ctx.user.id);
          await createWorkoutVersion({
            userId: ctx.user.id,
            workoutId: newWorkout!.id,
            versionNumber: versions.length + 1,
            title: activeWorkout.title,
            content: newContent,
            changeDescription: `Modificado via chat: "${input.message.substring(0, 100)}"`,
          });
        }

        return { content: assistantContent };
      }),
  }),

  // ─── Nutrition ────────────────────────────────────────────────────────────
  nutrition: router({
    todayWater: protectedProcedure.query(async ({ ctx }) => {
      const logs = await getTodayWaterLogs(ctx.user.id);
      const total = logs.reduce((sum, l) => sum + l.amountMl, 0);
      return { total, logs };
    }),

    addWater: protectedProcedure
      .input(z.object({ amountMl: z.number().positive() }))
      .mutation(async ({ ctx, input }) => {
        await addWaterLog({ userId: ctx.user.id, amountMl: input.amountMl });
        const logs = await getTodayWaterLogs(ctx.user.id);
        const total = logs.reduce((sum, l) => sum + l.amountMl, 0);
        return { total, logs };
      }),

    todayMeals: protectedProcedure.query(async ({ ctx }) => {
      return getTodayMeals(ctx.user.id);
    }),

    analyzeMeal: protectedProcedure
      .input(z.object({
        description: z.string().min(1),
        mealType: z.string().optional(),
        photoBase64: z.string().optional(),
        photoMime: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let photoUrl: string | undefined;
        let photoKey: string | undefined;

        if (input.photoBase64) {
          const buffer = Buffer.from(input.photoBase64, "base64");
          const key = `meals/${ctx.user.id}/meal-${Date.now()}.jpg`;
          const stored = await storagePut(key, buffer, input.photoMime || "image/jpeg");
          photoUrl = stored.url;
          photoKey = stored.key;
        }

        const messages: Array<{ role: "system" | "user"; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }> = [
          { role: "system", content: "Você é um nutricionista especializado. Analise os alimentos descritos e forneça os macronutrientes estimados. Responda APENAS com JSON válido no formato: {\"calories\": number, \"proteinG\": number, \"carbsG\": number, \"fatG\": number, \"fiberG\": number, \"summary\": \"string\"}" },
        ];

        if (input.photoBase64) {
          messages.push({
            role: "user",
            content: [
              { type: "text", text: `Analise esta refeição: ${input.description}` },
              { type: "image_url", image_url: { url: `data:${input.photoMime || "image/jpeg"};base64,${input.photoBase64}` } },
            ],
          });
        } else {
          messages.push({ role: "user", content: `Analise esta refeição: ${input.description}` });
        }

        const response = await invokeLLM({ messages: messages as Parameters<typeof invokeLLM>[0]["messages"] });
        const raw = response.choices[0].message.content as string;

        let macros = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, summary: "" };
        try {
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) macros = JSON.parse(jsonMatch[0]);
        } catch { /* use defaults */ }

        const meal = await addMeal({
          userId: ctx.user.id,
          mealType: input.mealType,
          description: input.description,
          calories: macros.calories,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
          fiberG: macros.fiberG,
          photoUrl,
          photoKey,
        });

        return { meal, macros };
      }),

    latestRecommendation: protectedProcedure.query(async ({ ctx }) => {
      return getLatestNutritionRecommendation(ctx.user.id);
    }),

    generateRecommendation: protectedProcedure.mutation(async ({ ctx }) => {
      const [profile, todayMeals, todayWater] = await Promise.all([
        getUserProfile(ctx.user.id),
        getTodayMeals(ctx.user.id),
        getTodayWaterLogs(ctx.user.id),
      ]);

      const totalWater = todayWater.reduce((s, l) => s + l.amountMl, 0);
      const totalCals = todayMeals.reduce((s, m) => s + (m.calories || 0), 0);

      const prompt = `Gere recomendações nutricionais personalizadas para hoje.

Perfil: ${profile ? `Objetivo: ${profile.goal}, Peso: ${profile.weightKg}kg, Nível: ${profile.experienceLevel}` : "não disponível"}
Consumo de hoje: ${totalCals} kcal, ${totalWater}ml de água
Refeições registradas: ${todayMeals.length}

Forneça:
1. Avaliação do consumo atual
2. Sugestões de refeições para o restante do dia
3. Dicas de hidratação
4. Alimentos recomendados para o objetivo
Seja específico e prático. Responda em português.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um nutricionista esportivo especializado. Responda em português do Brasil." },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices[0].message.content as string;
      return addNutritionRecommendation({ userId: ctx.user.id, content });
    }),

    last7DaysStats: protectedProcedure.query(async ({ ctx }) => {
      const [waterLogs, mealLogs] = await Promise.all([
        getWaterLogsLast7Days(ctx.user.id),
        getMealsLast7Days(ctx.user.id),
      ]);
      return { waterLogs, mealLogs };
    }),
  }),

  // ─── Body Progress ────────────────────────────────────────────────────────
  bodyProgress: router({
    history: protectedProcedure.query(async ({ ctx }) => {
      return getBodyProgressHistory(ctx.user.id);
    }),

    add: protectedProcedure
      .input(z.object({
        weightKg: z.number().optional(),
        bodyFatPercent: z.number().optional(),
        chestCm: z.number().optional(),
        waistCm: z.number().optional(),
        armCm: z.number().optional(),
        thighCm: z.number().optional(),
        notes: z.string().optional(),
        photoBase64: z.string().optional(),
        photoMime: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let photoUrl: string | undefined;
        let photoKey: string | undefined;

        if (input.photoBase64) {
          const buffer = Buffer.from(input.photoBase64, "base64");
          const key = `progress/${ctx.user.id}/photo-${Date.now()}.jpg`;
          const stored = await storagePut(key, buffer, input.photoMime || "image/jpeg");
          photoUrl = stored.url;
          photoKey = stored.key;
        }

        return addBodyProgress({
          userId: ctx.user.id,
          weightKg: input.weightKg,
          bodyFatPercent: input.bodyFatPercent,
          chestCm: input.chestCm,
          waistCm: input.waistCm,
          armCm: input.armCm,
          thighCm: input.thighCm,
          notes: input.notes,
          photoUrl,
          photoKey,
        });
      }),

    analyzeEvolution: protectedProcedure.mutation(async ({ ctx }) => {
      const history = await getBodyProgressHistory(ctx.user.id);
      if (history.length < 2) return { content: "Registre pelo menos 2 medições para gerar uma análise de evolução." };

      const recent = history.slice(0, 5).reverse();
      const prompt = `Analise a evolução corporal do usuário com base nos registros:
${recent.map((r, i) => `Registro ${i + 1} (${new Date(r.recordedAt).toLocaleDateString("pt-BR")}): Peso: ${r.weightKg}kg, Gordura: ${r.bodyFatPercent}%, Cintura: ${r.waistCm}cm`).join("\n")}

Forneça uma análise detalhada em português incluindo:
1. Tendências observadas
2. Progresso em relação ao objetivo
3. Recomendações para melhorar os resultados`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um personal trainer especializado em análise de composição corporal. Responda em português." },
          { role: "user", content: prompt },
        ],
      });

      return { content: response.choices[0].message.content as string };
    }),
  }),

  // ─── Goals ────────────────────────────────────────────────────────────────
  goals: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getUserGoals(ctx.user.id);
    }),

    save: protectedProcedure
      .input(z.object({
        mainGoal: z.string().optional(),
        currentWeightKg: z.number().optional(),
        targetWeightKg: z.number().optional(),
        targetBodyFatPercent: z.number().optional(),
        weeklyGoalKg: z.number().optional(),
        targetDate: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertGoals({
          userId: ctx.user.id,
          mainGoal: input.mainGoal,
          currentWeightKg: input.currentWeightKg,
          targetWeightKg: input.targetWeightKg,
          targetBodyFatPercent: input.targetBodyFatPercent,
          weeklyGoalKg: input.weeklyGoalKg,
          targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
