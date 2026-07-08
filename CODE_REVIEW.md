# Code Review - Projeto Verão

## Visão Geral da Arquitetura
O Projeto Verão é uma aplicação full-stack (React + Express/tRPC) que foi recentemente migrada da infraestrutura legada (Manus/Base44) para um modelo mais padrão utilizando Firebase.

## Pontos Positivos
1. **Migração Bem-Sucedida:** A transição do OAuth legado para Firebase Auth foi feita de forma limpa, mantendo a compatibilidade com o backend via JWT de sessão (`sdk.ts`).
2. **Uso de tRPC:** A comunicação entre cliente e servidor está fortemente tipada, o que reduziu significativamente os erros em tempo de execução.
3. **Organização:** O código está bem modularizado, com rotas do servidor e páginas do cliente bem separadas.
4. **Upload de Imagens via Firebase Storage:** Implementação de um hook (`useFirebaseStorage.ts`) no cliente para upload direto de imagens para o Firebase Storage, melhorando a performance e escalabilidade em comparação com o antigo método de Data URLs ou Forge/S3.
5. **Fallback de Autenticação Robusto:** O cliente tRPC agora envia o token de autenticação via header `Authorization`, garantindo que a autenticação funcione mesmo em navegadores que bloqueiam cookies de terceiros (como Safari ITP).

## Débitos Técnicos e Pontos de Atenção
1. **Remoção Completa de `photoBase64` no Backend:** Embora o cliente agora use `photoUrl`, o backend ainda aceita `photoBase64` como fallback. Para garantir um ambiente de produção mais limpo e eficiente, o suporte a `photoBase64` no backend deve ser removido, exigindo que o cliente sempre envie `photoUrl`.
2. **Integração com IA (LLM):** O arquivo `llm.ts` ainda mantém um proxy customizado (`ENV.forgeApiUrl`). Funciona bem, mas a longo prazo pode ser simplificado usando diretamente os SDKs oficiais (OpenAI, Google Generative AI).
3. **Tipagem TypeScript:** Houve alguns problemas recentes com a tipagem do `UserProfile` (`minutesPerSession` vs `minutesPerWorkout`). Recomenda-se criar um arquivo de tipos compartilhado (`@shared/types`) para garantir que o cliente e o servidor usem exatamente as mesmas interfaces para o perfil do usuário.

## Conclusão
O projeto está em um estado estável, compilando sem erros e com as dependências legadas removidas. As melhorias de Storage e Autenticação foram implementadas com sucesso, tornando o projeto mais robusto e pronto para produção. O próximo passo é remover o suporte a `photoBase64` no backend para otimização final do fluxo de upload de imagens.
