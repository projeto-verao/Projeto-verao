/**
 * Serviço de IA — Google Gemini (chamada direta do frontend)
 *
 * O Firebase Hosting serve apenas arquivos estáticos, portanto toda a
 * inteligência do app (geração de treino, análise corporal, chat e nutrição)
 * é feita chamando a API do Gemini diretamente daqui.
 */

// A chave é substituída pelo Vite no build time
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash";

// Garantir que a chave seja sempre uma string válida no runtime
const API_KEY = String(GEMINI_API_KEY || "");

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiContent {
  role?: string;
  parts: GeminiPart[];
}

async function callGemini(
  contents: GeminiContent[],
  systemInstruction?: string,
  jsonMode = false
): Promise<string> {
  // Validação no runtime (evita tree-shaking do Rollup)
  if (API_KEY.length < 5) {
    throw new Error(
      "Chave da API Gemini não configurada. Defina VITE_GEMINI_API_KEY no build."
    );
  }

  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  if (jsonMode) {
    body.generationConfig = { responseMimeType: "application/json" };
  }

  const res = await fetch(
    `${GEMINI_BASE}/${MODEL}:generateContent?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Gemini] Erro HTTP", res.status, errText);
    if (res.status === 429) {
      throw new Error("Limite de uso da IA atingido. Aguarde alguns minutos e tente novamente.");
    }
    throw new Error(`Erro na IA (HTTP ${res.status}). Tente novamente.`);
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: GeminiPart) => p.text ?? "")
      .join("") ?? undefined;

  if (!text) {
    console.error("[Gemini] Resposta sem texto:", JSON.stringify(data).slice(0, 500));
    throw new Error("A IA não retornou uma resposta válida. Tente novamente.");
  }
  return text;
}

function extractJson(text: string): any {
  // Remove blocos markdown e extrai o primeiro objeto JSON válido
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("A IA retornou um formato inesperado. Tente novamente.");
  }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  weight: string;
  rest: string;
  notes: string;
}

export interface GeneratedDay {
  dayNumber: number;
  title: string;
  emoji: string;
  exercises: GeneratedExercise[];
}

export interface GeneratedWorkout {
  title: string;
  days: GeneratedDay[];
}

export interface ProfileData {
  name?: string;
  age?: number;
  sex?: string;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number | null;
  goal?: string;
  experienceLevel?: string;
  experience?: string;
  daysPerWeek?: number;
  minutesPerSession?: number;
  minutesPerWorkout?: number;
  gymType?: string;
  physicalRestrictions?: string;
  restrictions?: string;
  preferredExercises?: string;
  likes?: string;
  avoidedExercises?: string;
  dislikes?: string;
}

export interface BodyAnalysis {
  bfEstimate: string;
  muscleLevel: string;
  summary: string;
  tip: string;
}

// ─── Serviços ─────────────────────────────────────────────────────────────────

export const geminiService = {
  /**
   * Gera um plano de treino completo com base no perfil (e opcionalmente
   * em uma análise corporal previamente feita).
   */
  async generateWorkout(
    profile: ProfileData,
    bodyAnalysisSummary?: string
  ): Promise<GeneratedWorkout> {
    const daysPerWeek = profile.daysPerWeek || 4;
    const visual = bodyAnalysisSummary
      ? `\nAnálise visual da composição corporal (via foto): ${bodyAnalysisSummary}`
      : "";

    const prompt = `Crie um plano de treino completo e personalizado em português para o seguinte perfil:

Nome: ${profile.name || "Usuário"}
Idade: ${profile.age || "não informada"} anos
Sexo: ${profile.sex || "não informado"}
Altura: ${profile.heightCm || "?"}cm
Peso atual: ${profile.weightKg || "?"}kg${profile.targetWeightKg ? `\nPeso alvo: ${profile.targetWeightKg}kg` : ""}
Objetivo: ${profile.goal || "condicionamento geral"}
Nível: ${profile.experienceLevel || profile.experience || "Iniciante"}
Dias por semana: ${daysPerWeek}
Tempo por treino: ${profile.minutesPerSession || profile.minutesPerWorkout || 60} minutos
Local: ${profile.gymType || "Academia completa"}
Restrições físicas: ${profile.physicalRestrictions || profile.restrictions || "nenhuma"}
Exercícios preferidos: ${profile.preferredExercises || profile.likes || "sem preferência"}
Exercícios a evitar: ${profile.avoidedExercises || profile.dislikes || "nenhum"}${visual}

Responda APENAS com um objeto JSON válido seguindo EXATAMENTE esta estrutura:
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
1. Escolha um emoji apropriado para cada grupo muscular do dia.
2. A carga (weight) deve ser estimada pelo nível do usuário.
3. Gere exatamente ${daysPerWeek} dias de treino.
4. Cada dia deve ter entre 5 e 8 exercícios.
5. Respeite as restrições físicas e preferências informadas.`;

    const text = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      "Você é um personal trainer especializado em criar planos de treino personalizados em formato JSON. Responda sempre em português do Brasil.",
      true
    );

    const parsed = extractJson(text) as GeneratedWorkout;
    if (!parsed.title || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      throw new Error("A IA retornou um treino incompleto. Tente novamente.");
    }
    return parsed;
  },

  /**
   * Analisa uma foto de corpo inteiro (base64) e retorna composição corporal.
   */
  async analyzeBody(photoBase64: string, profile?: ProfileData): Promise<BodyAnalysis> {
    // Remove prefixo data URL se presente
    const base64 = photoBase64.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = photoBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const contextText = profile
      ? `Dados do usuário: idade ${profile.age || "?"}, sexo ${profile.sex || "?"}, altura ${profile.heightCm || "?"}cm, peso ${profile.weightKg || "?"}kg, objetivo: ${profile.goal || "?"}.`
      : "";

    const prompt = `Analise esta foto de corpo inteiro para avaliação física. ${contextText}

Responda APENAS com JSON válido:
{
  "bfEstimate": "estimativa de percentual de gordura, ex: 18-22%",
  "muscleLevel": "nível de massa muscular: Baixo, Médio ou Alto",
  "summary": "resumo objetivo da composição corporal em 2-3 frases",
  "tip": "uma dica prática personalizada"
}`;

    const text = await callGemini(
      [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
      "Você é um especialista em avaliação física. Seja objetivo, profissional e respeitoso. Responda em português do Brasil.",
      true
    );

    return extractJson(text) as BodyAnalysis;
  },

  /**
   * Chat com o personal trainer IA.
   */
  async chat(
    history: { role: "user" | "assistant"; content: string }[],
    profile?: ProfileData,
    workoutContext?: string
  ): Promise<string> {
    const systemPrompt = `Você é o Coach IA do Projeto Verão, um personal trainer virtual especializado, motivador e amigável. Responda em português do Brasil de forma clara e objetiva.
${profile ? `\nPerfil do aluno: ${profile.name || ""}, ${profile.age || "?"} anos, objetivo: ${profile.goal || "?"}, nível: ${profile.experienceLevel || profile.experience || "?"}.` : ""}
${workoutContext ? `\nTreino atual do aluno: ${workoutContext.slice(0, 2000)}` : ""}`;

    const contents: GeminiContent[] = history.slice(-20).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    return callGemini(contents, systemPrompt);
  },

  /**
   * Analisa descrição (e opcionalmente foto) de refeição, retornando macros.
   */
  async analyzeMeal(description: string, photoBase64?: string): Promise<{
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    summary: string;
  }> {
    const parts: GeminiPart[] = [
      {
        text: `Analise esta refeição e estime os macronutrientes: "${description}"

Responda APENAS com JSON válido:
{
  "calories": 0,
  "proteinG": 0,
  "carbsG": 0,
  "fatG": 0,
  "fiberG": 0,
  "summary": "análise breve da refeição em 1-2 frases"
}`,
      },
    ];

    if (photoBase64) {
      const base64 = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const mimeMatch = photoBase64.match(/^data:(image\/\w+);base64,/);
      parts.push({
        inline_data: {
          mime_type: mimeMatch ? mimeMatch[1] : "image/jpeg",
          data: base64,
        },
      });
    }

    const text = await callGemini(
      [{ role: "user", parts }],
      "Você é um nutricionista especializado em análise de refeições. Responda em português do Brasil.",
      true
    );

    return extractJson(text);
  },

  /**
   * Gera recomendação nutricional diária com base no perfil.
   */
  async generateNutritionRecommendation(profile: ProfileData): Promise<string> {
    const prompt = `Crie uma recomendação nutricional diária personalizada para:
Idade: ${profile.age || "?"} | Sexo: ${profile.sex || "?"} | Altura: ${profile.heightCm || "?"}cm | Peso: ${profile.weightKg || "?"}kg
Objetivo: ${profile.goal || "condicionamento geral"} | Nível de atividade: ${profile.daysPerWeek || 4} treinos/semana

Inclua: meta calórica diária, distribuição de macros (proteína/carbo/gordura), 3 dicas práticas de alimentação e meta de água. Seja conciso (máximo 300 palavras). Use formatação com emojis e tópicos.`;

    return callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      "Você é um nutricionista esportivo. Responda em português do Brasil."
    );
  },
};
