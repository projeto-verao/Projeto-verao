# Projeto Verão

Projeto Verão é um aplicativo fitness com inteligência artificial focado em criar treinos personalizados, acompanhar a evolução do usuário e oferecer um personal trainer virtual.

---

## Objetivo

Criar um aplicativo profissional para Android e iOS que permita ao usuário:

- Criar uma conta
- Fazer login
- Realizar avaliação física inicial
- Gerar treino personalizado com IA
- Acompanhar evolução
- Conversar com IA para dúvidas
- Receber recomendações de treino
- Futuramente incluir alimentação e integração com academias

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| **Frontend** | React + TypeScript + Vite + TailwindCSS |
| **Backend** | Node.js + tRPC + Express |
| **Banco de Dados** | MySQL / TiDB + Drizzle ORM |
| **Inteligência Artificial** | Google Gemini 2.5 Flash |
| **Repositório** | GitHub (fonte oficial) |

---

## Fluxo do Aplicativo

```
Tela Inicial
     ↓
   Login
     ↓
 Criar Conta
     ↓
Avaliação Física
     ↓
Geração do Treino IA
     ↓
  Dashboard
     ↓
   Treinos
     ↓
  Progresso
     ↓
  Chat IA
     ↓
   Perfil
```

---

## Funcionalidades

- **Cadastro** — criação de conta com dados pessoais e físicos
- **Login** — autenticação própria do Projeto Verão
- **Recuperação de senha** — fluxo de redefinição de acesso
- **Avaliação física** — coleta de dados e foto para análise pela IA
- **Geração automática de treino** — treino personalizado criado pelo Google Gemini com base no perfil e na avaliação visual
- **Histórico de evolução** — registro de progresso físico ao longo do tempo
- **Chat IA** — personal trainer virtual disponível para dúvidas e ajustes
- **Perfil do usuário** — visualização e edição dos dados pessoais
- **Configurações** — preferências do aplicativo

---

## Regras do Projeto

> Estas regras devem ser seguidas em todas as etapas de desenvolvimento.

- **Nunca remover funcionalidades existentes.**
- **Nunca utilizar autenticação do Manus.** Todo login pertence ao Projeto Verão.
- **Sempre trabalhar utilizando GitHub** como repositório oficial.
- **Toda alteração deve terminar com Commit + Push.**

---

## Como Contribuir

1. Faça `git pull` antes de qualquer alteração
2. Trabalhe em pequenas etapas — cada etapa gera um commit
3. Nunca acumule alterações sem commitar
4. Ao finalizar, sempre informe:
   - O que foi feito
   - Hash do commit
   - Próxima etapa sugerida
5. Faça `git push` ao concluir

---

## Estrutura do Projeto

```
Projeto-verao/
├── client/              # Frontend React
│   └── src/
│       ├── pages/       # Telas do aplicativo
│       ├── components/  # Componentes reutilizáveis
│       └── _core/       # Hooks e utilitários base
├── server/              # Backend tRPC + Express
│   ├── _core/           # Configurações base (LLM, env, auth)
│   ├── routers.ts       # Endpoints da API
│   ├── db.ts            # Funções de banco de dados
│   └── storage.ts       # Upload de arquivos
├── drizzle/             # Schema e migrações do banco
├── PROJECT_CONTEXT.md   # Contexto e regras do projeto
└── README.md            # Este arquivo
```

---

*Projeto Verão — Seu personal trainer com IA, sempre com você.*
