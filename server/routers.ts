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

    analyzeBody: protectedProcedure
      .input(z.object({ photoUrl: z.string() }))
      .mutation(async ({ ctx, input }) => {
        try {
          const profile = await getUserProfile(ctx.user.id);
          
          const systemPrompt = `Você é um especialista em avaliação física e visão computacional. 
          Analise a foto do usuário e forneça uma estimativa amigável e profissional de sua composição corporal.
          Considere os dados do perfil: ${profile ? JSON.stringify({ age: profile.age, weight: profile.weightKg, height: profile.heightCm }) : "N/A"}.
          
          Responda APENAS com um JSON no formato:
          {
            "bfEstimate": "XX%",
            "muscleLevel": "Baixo/Médio/Alto",
            "summary": "Uma breve análise do que é visível na foto.",
            "tip": "Uma dica prática de treino ou dieta baseada na foto."
          }`;

          const response = await invokeLLM({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "Analise minha composição corporal com base nesta foto e nos meus dados de perfil." },
                  { type: "image_url", image_url: { url: input.photoUrl } }
                ]
              }
            ],
          });

          const content = response.choices[0].message.content as string;
          try {
            return JSON.parse(content.replace(/```json\n?/, "").replace(/```\n?$/, "").trim());
          } catch (e) {
            console.error("Erro ao parsear JSON do Gemini:", content);
            throw new Error("Resposta da IA inválida");
          }
        } catch (error: any) {
          console.error("Erro na análise corporal Gemini:", error);
          return {
            bfEstimate: "Erro",
            muscleLevel: "—",
            summary: "Ocorreu um problema ao processar a imagem. Isso pode acontecer se a foto for muito grande ou se houver instabilidade na API.",
            tip: "Tente tirar uma foto mais de longe ou com menor resolução."
          };
        }
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
Objetivo: ${profile.goal}
Nível: ${profile.experienceLevel}
Dias por semana: ${profile.daysPerWeek}
Tempo por treino: ${profile.minutesPerSession} minutos
Restrições físicas: ${profile.physicalRestrictions || "nenhuma"}

Você DEVE responder APENAS com um objeto JSON válido seguindo EXATAMENTE esta estrutura:
{
  "title": "Nome do Plano",
  "days": [
    {
      "dayNumber": 1,
      "title": "Nome do Treino (ex: Peito + Tríceps)",
      "emoji": "💪",
      "exercises": [
        {
          "name": "Nome do Exercício",
          "sets": 4,
          "reps": "8-12",
          "weight": "30-50kg",
          "rest": "60s",
          "notes": "Dica de execução"
        }
      ]
    }
  ]
}

Regras:
1. Escolha um emoji apropriado para cada grupo muscular treinado no dia.
2. A carga (weight) deve ser uma estimativa baseada no nível do usuário.
3. Gere o número de dias solicitado (${profile.daysPerWeek}).
4. Responda APENAS o JSON, sem textos explicativos antes ou depois.`;

      try {
        const response = await invokeLLM({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é um personal trainer especializado em criar planos de treino personalizados em formato JSON. Responda sempre em português do Brasil." },
            { role: "user", content: prompt },
          ],
        });

        let content = response.choices[0].message.content as string;
        
        // Clean potential markdown blocks
        content = content.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
        
        // Validate JSON
        const parsed = JSON.parse(content);
        const title = parsed.title || `Treino Personalizado — ${profile.goal || "Geral"}`;

        const workout = await createWorkout({
          userId: ctx.user.id,
          title,
          content, // Storing the JSON string
          isActive: true,
        });

        const versions = await getWorkoutVersions(ctx.user.id);
        await createWorkoutVersion({
          userId: ctx.user.id,
          workoutId: workout!.id,
          versionNumber: versions.length + 1,
          title,
          content,
          changeDescription: "Treino estruturado gerado pela IA",
        });

        return workout;
      } catch (error) {
        console.error("Erro ao gerar treino com Gemini:", error);
        throw new Error("Não conseguimos gerar seu treino estruturado agora. Por favor, tente novamente em alguns instantes.");
      }
    }),

    // Gera treino com análise opcional de foto de avaliação física (usado no onboarding)
    generateWithPhoto: protectedProcedure
      .input(z.object({
        evalPhotoUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await getUserProfile(ctx.user.id);
        if (!profile) throw new Error("Perfil não encontrado. Complete o onboarding primeiro.");

        // Contexto visual da foto de avaliação (se disponível)
        let visualContext = "";
        if (input.evalPhotoUrl) {
          try {
            const analysisResponse = await invokeLLM({
              model: "gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: "Você é um especialista em avaliação física. Analise a foto e forneça um resumo objetivo da composição corporal visível (estimativa de gordura corporal, massa muscular, postura). Seja conciso e profissional. Responda em português.",
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Analise a composição corporal desta foto para auxiliar na criação de um plano de treino personalizado." },
                    { type: "image_url", image_url: { url: input.evalPhotoUrl } },
                  ],
                },
              ],
            });
            visualContext = `\n\nAnálise visual da foto de avaliação física:\n${analysisResponse.choices[0].message.content as string}`;

            // Salvar como registro inicial de progresso corporal
            try {
              await addBodyProgress({
                userId: ctx.user.id,
                weightKg: profile.weightKg ?? undefined,
                photoUrl: input.evalPhotoUrl,
                notes: "Foto de avaliação inicial — cadastro",
              });
            } catch (e) {
              console.warn("Não foi possível salvar o progresso corporal inicial:", e);
            }
          } catch (e) {
            console.warn("Análise visual da foto falhou, continuando sem ela:", e);
          }
        }

        const prompt = `Você é um personal trainer especializado. Crie um plano de treino completo e personalizado em português para o seguinte perfil:

Nome: ${profile.name || "Usuário"}
Idade: ${profile.age} anos
Sexo: ${profile.sex}
Altura: ${profile.heightCm}cm
Peso atual: ${profile.weightKg}kg
Objetivo: ${profile.goal}
Nível: ${profile.experienceLevel}
Dias por semana: ${profile.daysPerWeek}
Tempo por treino: ${profile.minutesPerSession} minutos
Restrições físicas: ${profile.physicalRestrictions || "nenhuma"}
Exercícios preferidos: ${profile.preferredExercises || "nenhuma preferência"}
Exercícios a evitar: ${profile.avoidedExercises || "nenhum"}${visualContext}

Você DEVE responder APENAS com um objeto JSON válido seguindo EXATAMENTE esta estrutura:
{
  "title": "Nome do Plano",
  "days": [
    {
      "dayNumber": 1,
      "title": "Nome do Treino (ex: Peito + Tríceps)",
      "emoji": "💪",
      "exercises": [
        {
          "name": "Nome do Exercício",
          "sets": 4,
          "reps": "8-12",
          "weight": "30-50kg",
          "rest": "60s",
          "notes": "Dica de execução"
        }
      ]
    }
  ]
}

Regras:
1. Escolha um emoji apropriado para cada grupo muscular treinado no dia.
2. A carga (weight) deve ser uma estimativa baseada no nível do usuário.
3. Gere o número de dias solicitado (${profile.daysPerWeek}).
4. Responda APENAS o JSON, sem textos explicativos antes ou depois.`;

        try {
          const response = await invokeLLM({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: "Você é um personal trainer especializado em criar planos de treino personalizados em formato JSON. Responda sempre em português do Brasil." },
              { role: "user", content: prompt },
            ],
          });

          let content = response.choices[0].message.content as string;
          content = content.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
          const parsed = JSON.parse(content);
          const title = parsed.title || `Treino Personalizado — ${profile.goal || "Geral"}`;

          const workout = await createWorkout({
            userId: ctx.user.id,
            title,
            content,
            isActive: true,
          });

          const versions = await getWorkoutVersions(ctx.user.id);
          await createWorkoutVersion({
            userId: ctx.user.id,
            workoutId: workout!.id,
            versionNumber: versions.length + 1,
            title,
            content,
            changeDescription: input.evalPhotoUrl
              ? "Treino gerado com análise visual de avaliação física"
              : "Treino gerado no cadastro inicial",
          });

          return workout;
        } catch (error) {
          console.error("Erro ao gerar treino no onboarding:", error);
          throw new Error("Não conseguimos gerar seu treino agora. Por favor, tente novamente em alguns instantes.");
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
          getChatHistory(ctx.user.id, 10),
        ]);

        await addChatMessage({
          userId: ctx.user.id,
          role: "user",
          content: input.message,
        });

        const systemPrompt = `Você é um personal trainer virtual que tem poder de editar o treino do usuário.
Perfil: ${profile ? JSON.stringify({ goal: profile.goal, level: profile.experienceLevel }) : "N/A"}
Treino Atual: ${activeWorkout ? activeWorkout.content : "Nenhum"}

Se o usuário pedir para mudar, trocar, remover ou adicionar algo ao treino:
1. Responda amigavelmente confirmando a mudança.
2. No final da sua resposta, inclua EXATAMENTE a tag <UPDATE_WORKOUT> seguida do JSON COMPLETO do novo treino estruturado.

Estrutura do JSON:
{
  "title": "Nome do Plano",
  "days": [
    {
      "dayNumber": 1,
      "title": "Título do Dia",
      "emoji": "💪",
      "exercises": [
        { "name": "Exercício", "sets": 3, "reps": "10", "weight": "20kg", "rest": "60s", "notes": "" }
      ]
    }
  ]
}

Se NÃO houver pedido de mudança no treino, responda normalmente sem a tag.
Responda sempre em português do Brasil.`;

        const chatMessages = history.reverse().map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));
        chatMessages.push({ role: "user", content: input.message });

        const response = await invokeLLM({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...chatMessages,
          ],
        });

        let aiMessage = response.choices[0].message.content as string;
        let updatedWorkout = false;

        if (aiMessage.includes("<UPDATE_WORKOUT>")) {
          const parts = aiMessage.split("<UPDATE_WORKOUT>");
          aiMessage = parts[0].trim();
          let jsonStr = parts[1].replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
          
          try {
            const parsed = JSON.parse(jsonStr);
            const workout = await createWorkout({
              userId: ctx.user.id,
              title: parsed.title || activeWorkout?.title || "Treino Atualizado",
              content: jsonStr,
              isActive: true,
            });

            await createWorkoutVersion({
              userId: ctx.user.id,
              workoutId: workout!.id,
              versionNumber: (await getWorkoutVersions(ctx.user.id)).length + 1,
              title: workout!.title,
              content: jsonStr,
              changeDescription: `Ajuste via chat: ${input.message.substring(0, 50)}...`,
            });
            updatedWorkout = true;
          } catch (e) {
            console.error("Erro ao processar atualização de treino via chat:", e);
          }
        }

        await addChatMessage({
          userId: ctx.user.id,
          role: "assistant",
          content: aiMessage,
        });

        return { content: aiMessage, updatedWorkout };
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
