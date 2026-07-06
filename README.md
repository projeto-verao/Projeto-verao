# Projeto Verão — IA Fitness Trainer

Aplicativo web de geração de treino personalizado por IA com análise visual de composição corporal.

## 🎯 Funcionalidades

- **Autenticação Segura**: Login com OAuth (Google) e Email (Manus)
- **Avaliação Personalizada**: Formulário completo com dados físicos e objetivos
- **Análise Visual**: Captura de foto de avaliação física para análise por IA
- **Geração de Treino**: Criação automática de plano de treino com base em perfil + análise visual
- **Dashboard Interativo**: Visualização de treino com progresso semanal
- **Chat com IA**: Conversa com personal trainer virtual
- **Rastreamento de Evolução**: Histórico de progresso corporal
- **Múltiplas Abas**: Treino, Alimentação, IA Trainer, Objetivos, Perfil

## 🚀 Fluxo do Usuário

1. **Login** → Autenticação via OAuth ou Email
2. **Welcome** → Tela de boas-vindas com "Começar avaliação"
3. **Onboarding** → Preenchimento de dados e fotos
4. **Processing** → Geração de treino com IA
5. **Dashboard** → Visualização do treino personalizado
6. **Navegação** → Exploração de todas as funcionalidades

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + Tailwind CSS 4 + Vite
- **Backend**: Express.js + tRPC 11
- **Banco de Dados**: MySQL/TiDB + Drizzle ORM
- **IA**: Gemini 2.5 Flash para análise visual e geração de treinos
- **Armazenamento**: S3 para fotos
- **Autenticação**: Manus OAuth

## 📦 Instalação e Desenvolvimento

```bash
# Instalar dependências
pnpm install

# Configurar banco de dados
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Iniciar servidor de desenvolvimento
pnpm dev

# Executar testes
pnpm test

# Build para produção
pnpm build
pnpm start
```

## 🌍 Deploy

O projeto está configurado para deploy automático na plataforma Manus com:
- Autoscaling serverless
- Banco de dados persistente
- Storage S3 integrado
- Integração com LLM

## 📚 Documentação

Veja `FLUXO_ANALISE.md` para documentação completa do fluxo, rotas, procedures e troubleshooting.

## 📝 Licença

MIT
