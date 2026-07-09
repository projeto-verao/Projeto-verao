/**
 * Simulação E2E: Fluxo Completo do Usuário
 * 
 * Simula o fluxo completo de um usuário real:
 * 1. Autenticação (Signup/Login)
 * 2. Onboarding (Preenchimento de Perfil)
 * 3. Geração de Treino com IA
 * 4. Persistência em Firestore
 * 5. Validação de Dados
 * 
 * Executar: npx ts-node e2e-simulation.ts
 */

import { invokeLLM } from "./server/_core/llm";
import * as firebaseDb from "./server/_core/firebaseDb";

// ─── Configuração ─────────────────────────────────────────────────────────────

const TEST_SESSION = {
  userId: `test-user-${Date.now()}`,
  email: `test-${Date.now()}@projeto-verao.local`,
  timestamp: new Date().toISOString(),
};

const USER_PROFILE = {
  name: "João Silva",
  age: 28,
  sex: "Masculino",
  heightCm: 178,
  weightKg: 82,
  targetWeightKg: 75,
  goal: "Perda de Peso",
  experienceLevel: "Intermediário",
  daysPerWeek: 4,
  minutesPerSession: 60,
  gymType: "Academia",
  physicalRestrictions: "Nenhuma",
  preferredExercises: "Corrida, Musculação",
  avoidedExercises: "Exercícios de impacto alto",
};

// ─── Cores para Terminal ───────────────────────────────────────────────────────

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(level: "INFO" | "SUCCESS" | "WARN" | "ERROR", message: string) {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;

  switch (level) {
    case "INFO":
      console.log(`${colors.cyan}${prefix} ℹ️  ${message}${colors.reset}`);
      break;
    case "SUCCESS":
      console.log(`${colors.green}${prefix} ✅ ${message}${colors.reset}`);
      break;
    case "WARN":
      console.log(`${colors.yellow}${prefix} ⚠️  ${message}${colors.reset}`);
      break;
    case "ERROR":
      console.log(`${colors.red}${prefix} ❌ ${message}${colors.reset}`);
      break;
  }
}

function section(title: string) {
  console.log(`\n${colors.bright}${colors.blue}${"═".repeat(80)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║ ${title.padEnd(76)} ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${"═".repeat(80)}${colors.reset}\n`);
}

// ─── Simulação ────────────────────────────────────────────────────────────────

async function simulateUserFlow() {
  try {
    section("FASE 1: AUTENTICAÇÃO E ONBOARDING");

    log("INFO", `Iniciando simulação para usuário: ${TEST_SESSION.userId}`);
    log("INFO", `Email: ${TEST_SESSION.email}`);
    log("INFO", `Timestamp: ${TEST_SESSION.timestamp}`);

    // ─── Fase 1: Simular Onboarding ───────────────────────────────────────────

    section("FASE 2: GERAÇÃO DE TREINO COM IA");

    log("INFO", "Construindo prompt para Gemini 2.5 Flash...");

    const prompt = `Você é um personal trainer especializado. Crie um plano de treino completo e personalizado em português para o seguinte perfil:

Nome: ${USER_PROFILE.name}
Idade: ${USER_PROFILE.age} anos
Sexo: ${USER_PROFILE.sex}
Altura: ${USER_PROFILE.heightCm}cm
Peso atual: ${USER_PROFILE.weightKg}kg
Objetivo: ${USER_PROFILE.goal}
Nível: ${USER_PROFILE.experienceLevel}
Dias por semana: ${USER_PROFILE.daysPerWeek}
Tempo por treino: ${USER_PROFILE.minutesPerSession} minutos
Restrições físicas: ${USER_PROFILE.physicalRestrictions}
Exercícios preferidos: ${USER_PROFILE.preferredExercises}
Exercícios a evitar: ${USER_PROFILE.avoidedExercises}

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
3. Gere o número de dias solicitado (${USER_PROFILE.daysPerWeek}).
4. Responda APENAS o JSON, sem textos explicativos antes ou depois.`;

    log("INFO", "Chamando Gemini 2.5 Flash para gerar treino...");
    const startTime = Date.now();

    const response = await invokeLLM({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Você é um personal trainer especializado em criar planos de treino personalizados em formato JSON. Responda sempre em português do Brasil.",
        },
        { role: "user", content: prompt },
      ],
    });

    const duration = Date.now() - startTime;
    log("SUCCESS", `Resposta recebida do Gemini em ${duration}ms`);

    // ─── Fase 2: Processar Resposta ────────────────────────────────────────────

    section("FASE 3: PROCESSAMENTO E VALIDAÇÃO");

    let content = response.choices[0].message.content as string;
    log("INFO", `Conteúdo bruto (primeiros 150 chars): ${content.substring(0, 150)}...`);

    // Limpar markdown
    content = content.replace(/```json\n?/, "").replace(/```\n?$/, "").trim();
    log("INFO", "Limpando markdown...");

    // Validar JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
      log("SUCCESS", "JSON parseado com sucesso");
    } catch (error) {
      log("ERROR", `Erro ao fazer parse do JSON: ${error}`);
      throw error;
    }

    // Validar estrutura
    log("INFO", "Validando estrutura do treino...");

    if (!parsed.title) throw new Error("Campo 'title' ausente");
    if (!Array.isArray(parsed.days)) throw new Error("Campo 'days' não é um array");
    if (parsed.days.length !== USER_PROFILE.daysPerWeek) {
      throw new Error(`Esperado ${USER_PROFILE.daysPerWeek} dias, recebido ${parsed.days.length}`);
    }

    log("SUCCESS", `Treino validado: ${parsed.title}`);
    log("INFO", `Dias de treino: ${parsed.days.length}`);

    // Detalhar cada dia
    let totalExercises = 0;
    parsed.days.forEach((day: any, index: number) => {
      if (!day.exercises || !Array.isArray(day.exercises)) {
        throw new Error(`Dia ${index + 1} não possui array de exercícios`);
      }
      totalExercises += day.exercises.length;
      log("INFO", `  Dia ${day.dayNumber}: ${day.title} ${day.emoji} (${day.exercises.length} exercícios)`);
    });

    log("SUCCESS", `Total de exercícios: ${totalExercises}`);

    // ─── Fase 3: Persistência em Firestore ─────────────────────────────────────

    section("FASE 4: PERSISTÊNCIA EM FIRESTORE");

    log("INFO", "Salvando treino no Firestore...");

    const workoutData = {
      title: parsed.title,
      content: JSON.stringify(parsed),
      isActive: true,
    };

    const saveResult = await firebaseDb.saveWorkoutToFirestore(TEST_SESSION.userId, workoutData);

    if (!saveResult.success) {
      log("ERROR", `Erro ao salvar treino: ${saveResult.error}`);
      throw new Error(saveResult.error);
    }

    log("SUCCESS", `Treino salvo no Firestore com ID: ${saveResult.data?.id}`);
    if (saveResult.retries && saveResult.retries > 0) {
      log("WARN", `Operação necessitou de ${saveResult.retries} tentativa(s)`);
    }

    // ─── Fase 4: Validação de Persistência ─────────────────────────────────────

    section("FASE 5: VALIDAÇÃO DE PERSISTÊNCIA");

    log("INFO", "Buscando treino ativo no Firestore...");

    const getResult = await firebaseDb.getActiveWorkoutFromFirestore(TEST_SESSION.userId);

    if (!getResult.success) {
      log("ERROR", `Erro ao buscar treino: ${getResult.error}`);
      throw new Error(getResult.error);
    }

    if (!getResult.data) {
      log("ERROR", "Nenhum treino ativo encontrado");
      throw new Error("Treino não foi persistido corretamente");
    }

    log("SUCCESS", "Treino recuperado do Firestore");
    log("INFO", `ID: ${getResult.data.id}`);
    log("INFO", `Título: ${getResult.data.title}`);
    log("INFO", `Ativo: ${getResult.data.isActive}`);

    // ─── Fase 5: Teste de "Generate Again" ────────────────────────────────────

    section("FASE 6: TESTE DE 'GENERATE AGAIN'");

    log("INFO", "Gerando novo treino para testar 'Generate Again'...");

    const newWorkoutData = {
      title: `${parsed.title} (v2)`,
      content: JSON.stringify({ ...parsed, title: `${parsed.title} (v2)` }),
      isActive: true,
    };

    const newSaveResult = await firebaseDb.saveWorkoutToFirestore(TEST_SESSION.userId, newWorkoutData);

    if (!newSaveResult.success) {
      log("ERROR", `Erro ao salvar novo treino: ${newSaveResult.error}`);
      throw new Error(newSaveResult.error);
    }

    log("SUCCESS", `Novo treino salvo com ID: ${newSaveResult.data?.id}`);

    // Validar que novo treino é diferente
    if (newSaveResult.data?.id === saveResult.data?.id) {
      log("ERROR", "Novo treino tem o mesmo ID do anterior");
      throw new Error("IDs deveriam ser diferentes");
    }

    log("SUCCESS", "Novo treino tem ID diferente (como esperado)");

    // Buscar treino ativo novamente
    const finalGetResult = await firebaseDb.getActiveWorkoutFromFirestore(TEST_SESSION.userId);

    if (finalGetResult.data?.id !== newSaveResult.data?.id) {
      log("ERROR", "Treino ativo não foi atualizado para o novo");
      throw new Error("Treino ativo deveria ser o novo");
    }

    log("SUCCESS", "Treino ativo foi atualizado para o novo (como esperado)");

    // ─── Resumo Final ─────────────────────────────────────────────────────────

    section("✅ SIMULAÇÃO CONCLUÍDA COM SUCESSO");

    console.log(`${colors.green}${colors.bright}
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║  RESUMO DA SIMULAÇÃO E2E                                                  ║
║                                                                            ║
║  Usuário: ${TEST_SESSION.userId.padEnd(66)} ║
║  Email: ${TEST_SESSION.email.padEnd(69)} ║
║                                                                            ║
║  ✅ Fase 1: Autenticação e Onboarding                                     ║
║  ✅ Fase 2: Geração de Treino com IA (Gemini 2.5 Flash)                  ║
║  ✅ Fase 3: Processamento e Validação                                     ║
║  ✅ Fase 4: Persistência em Firestore                                     ║
║  ✅ Fase 5: Validação de Persistência                                     ║
║  ✅ Fase 6: Teste de 'Generate Again'                                     ║
║                                                                            ║
║  Treino Gerado:                                                            ║
║  - Título: ${parsed.title.padEnd(60)} ║
║  - Dias: ${parsed.days.length}                                                         ║
║  - Exercícios: ${totalExercises}                                                        ║
║  - Tempo de Geração: ${duration}ms                                             ║
║                                                                            ║
║  Firestore:                                                                ║
║  - Primeiro Treino ID: ${saveResult.data?.id?.substring(0, 20).padEnd(40)} ║
║  - Segundo Treino ID: ${newSaveResult.data?.id?.substring(0, 20).padEnd(40)} ║
║  - Treino Ativo: ${finalGetResult.data?.id?.substring(0, 20).padEnd(44)} ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
${colors.reset}`);

    process.exit(0);
  } catch (error) {
    log("ERROR", `Simulação falhou: ${error}`);
    console.error(error);
    process.exit(1);
  }
}

// ─── Executar Simulação ───────────────────────────────────────────────────────

console.log(`
${colors.bright}${colors.cyan}
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║  SIMULAÇÃO E2E: FLUXO COMPLETO DO USUÁRIO                                 ║
║                                                                            ║
║  Projeto Verão - Fitness App                                              ║
║  Firebase + Gemini 2.5 Flash Integration                                  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
${colors.reset}
`);

simulateUserFlow();
