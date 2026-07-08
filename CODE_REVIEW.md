# Code Review - Projeto Verão

## Visão Geral da Arquitetura
O Projeto Verão é uma aplicação full-stack (React + Express/tRPC) que foi recentemente migrada da infraestrutura legada (Manus/Base44) para um modelo mais padrão utilizando Firebase.

## Pontos Positivos
1. **Migração Bem-Sucedida:** A transição do OAuth legado para Firebase Auth foi feita de forma limpa, mantendo a compatibilidade com o backend via JWT de sessão (`sdk.ts`).
2. **Uso de tRPC:** A comunicação entre cliente e servidor está fortemente tipada, o que reduziu significativamente os erros em tempo de execução.
3. **Organização:** O código está bem modularizado, com rotas do servidor e páginas do cliente bem separadas.

## Débitos Técnicos e Pontos de Atenção
1. **Armazenamento de Imagens:** Atualmente, o módulo `storage.ts` converte imagens para Base64 (Data URLs) como fallback, já que o `Forge/S3` foi removido. Para um ambiente de produção, é altamente recomendável implementar o Firebase Storage usando o SDK do cliente (para upload direto) ou configurar o Firebase Admin SDK no backend.
2. **Integração com IA (LLM):** O arquivo `llm.ts` ainda mantém um proxy customizado (`ENV.forgeApiUrl`). Funciona bem, mas a longo prazo pode ser simplificado usando diretamente os SDKs oficiais (OpenAI, Google Generative AI).
3. **Tipagem TypeScript:** Houve alguns problemas recentes com a tipagem do `UserProfile` (`minutesPerSession` vs `minutesPerWorkout`). Recomenda-se criar um arquivo de tipos compartilhado (`@shared/types`) para garantir que o cliente e o servidor usem exatamente as mesmas interfaces para o perfil do usuário.

## Conclusão
O projeto está em um estado estável, compilando sem erros e com as dependências legadas removidas. O próximo grande passo deve ser a implementação de um serviço de Storage definitivo para produção.
