/**
 * Variáveis de ambiente do Projeto Verão.
 * Migrado de Manus/Base44 para Firebase + JWT próprio.
 */
export const ENV = {
  // Segredo para assinar/verificar tokens JWT de sessão (obrigatório)
  cookieSecret: process.env.JWT_SECRET ?? "",

  // Banco de dados MySQL/TiDB (Drizzle ORM)
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Ambiente
  isProduction: process.env.NODE_ENV === "production",

  // IA — Google Gemini (preferencial, chave nativa)
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",

  // IA — Proxy OpenAI-compatível (fallback quando GEMINI_API_KEY não está disponível)
  // Usado pelo llm.ts para todos os modelos via proxy
  forgeApiUrl: process.env.OPENAI_API_BASE ?? process.env.OPENAI_BASE_URL ?? "",
  forgeApiKey: process.env.OPENAI_API_KEY ?? "",

  // Firebase Storage bucket (opcional — para upload via Firebase Admin SDK)
  firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",
};
