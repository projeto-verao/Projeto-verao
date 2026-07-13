# Projeto Verão

## Visão geral

Projeto Verão é um app fitness/nutrição (React + Vite no cliente, Express/tRPC no
servidor, Drizzle ORM sobre MySQL/TiDB). Autenticação e mensageria usam Firebase
(Auth, Firestore, Cloud Messaging); upload de mídia usa Cloudinary. O projeto
migrou para longe das dependências antigas Manus/Base44 — esse legado não deve
ser reintroduzido.

**Fonte oficial única:** `https://github.com/projeto-verao/Projeto-verao.git`
(remote `origin`). Este Repl é o ambiente principal de desenvolvimento e deve
permanecer conectado a esse repositório.

## Stack

- Cliente: React + Vite, Wouter (rotas), TanStack Query, tRPC client, Tailwind.
- Servidor: Express + tRPC, `tsx watch server/_core/index.ts` (dev), `server/`.
- Dados: Drizzle ORM + MySQL/TiDB via `DATABASE_URL` (não usar o Postgres
  embutido da Replit — driver do projeto é `mysql2`, incompatível).
- Firebase: Auth, Firestore (`server/_core/firebaseDb.ts`, `server/fcm.ts`),
  Cloud Messaging. Config do client é fixa em `client/src/lib/firebase.ts`.
- Cloudinary: upload de fotos (`VITE_CLOUDINARY_CLOUD_NAME`,
  `VITE_CLOUDINARY_UPLOAD_PRESET`, já preenchidas no repo).
- IA: Gemini (`GEMINI_API_KEY` server, `VITE_GEMINI_API_KEY` client), com
  fallback opcional para `OPENAI_API_KEY`/`OPENAI_API_BASE`.

## User preferences (regras obrigatórias para todas as tarefas)

- Nunca alterar funcionalidades que já estejam funcionando sem necessidade.
- Ao corrigir bugs, preservar o comportamento existente.
- Antes de implementar qualquer funcionalidade, analisar o impacto em todo o
  sistema.
- Evitar código duplicado; reutilizar componentes e serviços existentes sempre
  que possível.
- Sempre manter compatibilidade com Firebase Authentication, Firestore e
  Cloudinary.
- Nunca reintroduzir dependências antigas do Manus/Base44.
- Sempre explicar resumidamente o plano antes de alterar qualquer arquivo.
- Após concluir uma tarefa:
  1. Verificar se o projeto continua compilando (`npm run check` / `tsc --noEmit`).
  2. Corrigir automaticamente erros de TypeScript que surgirem.
  3. Revisar para garantir que nenhuma funcionalidade existente foi quebrada.
- Só fazer commit, push ou deploy quando o usuário solicitar explicitamente.
- Tratar o repositório GitHub oficial (`projeto-verao/Projeto-verao`) como a
  única fonte de verdade do projeto.
