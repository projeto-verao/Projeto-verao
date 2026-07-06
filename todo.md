# Projeto Verão — TODO

## Infraestrutura Backend
- [x] Schema do banco de dados (10 tabelas)
- [x] Migrations executadas
- [x] server/db.ts com helpers base
- [ ] Routers tRPC completos (profile, workout, nutrition, goals, bodyProgress, AI)

## Frontend — Layout e CSS
- [ ] index.css com design system clean/branco (botões pretos, fundo branco)
- [ ] BottomNav component (5 tabs: Treino, Alimentação, IA Trainer, Objetivos, Perfil)
- [ ] AppLayout component (wrapper com BottomNav)
- [ ] App.tsx com todas as rotas do Projeto Verão

## Frontend — Páginas de Auth e Onboarding
- [ ] Login.tsx (OAuth Google + Email via Manus)
- [ ] Home.tsx (redirect logic: não autenticado → /login, sem perfil → /onboarding, com perfil → /dashboard)
- [ ] Onboarding.tsx (formulário completo + upload de foto câmera/álbum)

## Frontend — Páginas Principais
- [ ] Dashboard.tsx (progresso semanal, lista de treinos)
- [ ] IATrainer.tsx (tabs: Chat, Perfil, Evolução, Histórico)
- [ ] Nutrition.tsx (Módulo de Alimentação Inteligente: tabs Diário, IA, Dashboard)
- [ ] Goals.tsx (metas físicas com prazo)
- [ ] Profile.tsx (edição de perfil + evolução corporal)
- [ ] History.tsx (histórico de versões de treinos)

## Backend — Routers e Schema
- [ ] Schema expandido (user_profiles, workouts, workout_versions, water_logs, meals, nutrition_recommendations, body_progress, workout_completions, goals)
- [ ] db.ts com todos os helpers de query
- [ ] routers.ts completo com todos os procedures

## Testes e Deploy
- [ ] TypeScript sem erros (pnpm check)
- [ ] Vitest passando
- [ ] Screenshot de todas as páginas
- [ ] Checkpoint final salvo
