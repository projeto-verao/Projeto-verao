# PROJECT_CONTEXT

> **Este documento deve ser lido antes de qualquer alteração no projeto.**

---

## Fonte Oficial

O **GitHub** é a única fonte oficial do projeto.

- Sempre iniciar realizando **`git pull`**
- Sempre finalizar realizando **`git commit` + `git push`**

---

## Objetivo

Criar o **melhor aplicativo fitness com IA do mercado.**

---

## Inteligência Artificial

- Toda geração de treino utiliza **Google Gemini** (modelo: `gemini-2.5-flash`)
- **Nunca depender da IA do Manus**
- A chave de API do Gemini deve ser configurada via variável de ambiente `GEMINI_API_KEY`
- Quando `GEMINI_API_KEY` não estiver disponível, o sistema usa o proxy OpenAI como fallback (configurado via `OPENAI_API_KEY` + `OPENAI_API_BASE`)

---

## Fluxo Obrigatório do Aplicativo

```
Login
  ↓
Cadastro
  ↓
Avaliação Física
  ↓
Gerar Treino (IA)
  ↓
Dashboard
  ↓
Treinos
  ↓
Progresso
  ↓
Chat IA
```

---

## Autenticação

- O login deve ser **próprio do Projeto Verão**
- **Nunca utilizar login do Manus**
- O sistema de autenticação usa JWT + cookies seguros

---

## Banco de Dados

Todo usuário deve possuir os seguintes dados:

| Campo | Tipo | Descrição |
|---|---|---|
| `nome` | string | Nome completo |
| `email` | string | E-mail de acesso |
| `senha` | string | Senha criptografada |
| `idade` | number | Idade em anos |
| `peso` | number | Peso atual em kg |
| `altura` | number | Altura em cm |
| `sexo` | enum | Masculino / Feminino / Outro |
| `objetivo` | string | Meta de treino |
| `nível de treino` | enum | Iniciante / Intermediário / Avançado |

---

## Regras de Desenvolvimento

| Regra | Descrição |
|---|---|
| **Nunca apagar código sem necessidade** | Manter compatibilidade com funcionalidades existentes |
| **Sempre corrigir bugs mantendo compatibilidade** | Não quebrar o que já funciona |
| **Sempre testar o fluxo completo antes de finalizar** | Verificar login → cadastro → treino → dashboard |
| **Sempre fazer Commit + Push** | Nenhuma alteração fica apenas local |

---

## Processo de Desenvolvimento

Trabalhar apenas em **pequenas etapas**. Cada etapa deve:

1. Gerar um **commit** com mensagem descritiva
2. Ser seguida de **push** para o GitHub
3. Informar ao final:
   - **O que foi feito** — descrição clara da alteração
   - **Hash do commit** — identificador do commit no GitHub
   - **Próxima etapa** — o que deve ser feito a seguir

---

## Variáveis de Ambiente Necessárias

```env
# Banco de dados
DATABASE_URL=

# Autenticação
JWT_SECRET=
OAUTH_SERVER_URL=

# Armazenamento de arquivos
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=

# IA — Google Gemini (preferencial)
GEMINI_API_KEY=

# IA — Fallback OpenAI/proxy (usado quando GEMINI_API_KEY não está disponível)
OPENAI_API_KEY=
OPENAI_API_BASE=
```

---

## Telas do Aplicativo

| Rota | Tela | Descrição |
|---|---|---|
| `/` | Home | Redirecionamento inteligente |
| `/login` | Login | Autenticação do usuário |
| `/welcome` | Boas-vindas | Apresentação antes do cadastro |
| `/onboarding` | Cadastro | Dados pessoais + fotos |
| `/processing` | Processamento | Geração do treino com animação |
| `/dashboard` | Dashboard | Tela principal com treino ativo |
| `/trainer` | IA Trainer | Chat com personal trainer virtual |
| `/nutrition` | Nutrição | Registro e recomendações alimentares |
| `/goals` | Metas | Objetivos e acompanhamento |
| `/history` | Histórico | Evolução e registros anteriores |
| `/profile` | Perfil | Dados do usuário e configurações |

---

*Última atualização: Julho 2026*
