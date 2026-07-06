# Projeto Verão — TODO

## Infraestrutura Backend
- [x] Schema do banco de dados (10 tabelas)
- [x] Migrations executadas
- [x] server/db.ts com helpers base
- [x] Routers tRPC completos (profile, workout, nutrition, goals, bodyProgress, AI)

## Frontend — Layout e CSS
- [x] index.css com design system clean/branco (botões pretos, fundo branco)
- [x] BottomNav component (5 tabs: Treino, Alimentação, IA Trainer, Objetivos, Perfil)
- [x] AppLayout component (wrapper com BottomNav)
- [x] App.tsx com todas as rotas do Projeto Verão

## Frontend — Páginas de Auth e Onboarding
- [x] Login.tsx (OAuth Google + Email via Manus)
- [x] Home.tsx (redirect logic: não autenticado → /login, sem perfil → /onboarding, com perfil → /dashboard)
- [x] Onboarding.tsx (formulário completo + upload de foto câmera/álbum)

## Frontend — Páginas Principais
- [x] Dashboard.tsx (progresso semanal, lista de treinos)
- [x] IATrainer.tsx (tabs: Chat, Perfil, Evolução, Histórico)
- [x] Nutrition.tsx (Módulo de Alimentação Inteligente: tabs Diário, IA, Dashboard)
- [x] Goals.tsx (metas físicas com prazo)
- [x] Profile.tsx (edição de perfil + evolução corporal)
- [x] History.tsx (histórico de versões de treinos)

## Backend — Routers e Schema
- [x] Schema expandido (user_profiles, workouts, workout_versions, water_logs, meals, nutrition_recommendations, body_progress, workout_completions, goals)
- [x] db.ts com todos os helpers de query
- [x] routers.ts completo com todos os procedures

## Testes e Deploy
- [x] TypeScript sem erros (pnpm check)
- [ ] Vitest passando
- [x] Screenshot de todas as páginas
- [x] Checkpoint final salvo
