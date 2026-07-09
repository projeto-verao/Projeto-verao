# Code Review - Projeto Verão

## Visão Geral da Arquitetura
O Projeto Verão é uma aplicação full-stack (React + Express/tRPC) que foi recentemente migrada da infraestrutura legada (Manus/Base44) para um modelo mais padrão utilizando Firebase.

## Pontos Positivos
1. **Migração Bem-Sucedida:** A transição do OAuth legado para Firebase Auth foi feita de forma limpa, mantendo a compatibilidade com o backend via JWT de sessão (`sdk.ts`).
2. **Uso de tRPC:** A comunicação entre cliente e servidor está fortemente tipada, o que reduziu significativamente os erros em tempo de execução.
3. **Organização:** O código está bem modularizado, com rotas do servidor e páginas do cliente bem separadas.
4. **Upload de Imagens via Firebase Storage:** Implementação de um hook (`useFirebaseStorage.ts`) no cliente para upload direto de imagens para o Firebase Storage, melhorando a performance e escalabilidade em comparação com o antigo método de Data URLs ou Forge/S3.
5. **Fallback de Autenticação Robusto:** O cliente tRPC agora envia o token de autenticação via header `Authorization`, garantindo que a autenticação funcione mesmo em navegadores que bloqueiam cookies de terceiros (como Safari ITP).
6. **Geração de Treinos com Fallback:** Implementado fallback em sessionStorage para permitir que a geração de treinos funcione mesmo sem DATABASE_URL configurado.

## Débitos Técnicos e Pontos de Atenção

### Críticos
1. **DATABASE_URL Não Configurado:** O projeto atualmente funciona sem DATABASE_URL, usando fallbacks em sessionStorage. Para produção, é essencial configurar DATABASE_URL apontando para um MySQL/TiDB real.
   - *Impacto:* Treinos não são persistidos no banco de dados
   - *Solução:* Configurar DATABASE_URL no ambiente de produção

2. **Remoção Completa de `photoBase64` no Backend:** Embora o cliente agora use `photoUrl`, o backend ainda aceita `photoBase64` como fallback. Para garantir um ambiente de produção mais limpo e eficiente, o suporte a `photoBase64` no backend deve ser removido.
   - *Impacto:* Possível confusão sobre qual formato usar
   - *Solução:* Remover suporte a `photoBase64` e exigir `photoUrl`

### Moderados
1. **Integração com IA (LLM):** O arquivo `llm.ts` ainda mantém um proxy customizado (`ENV.forgeApiUrl`). Funciona bem, mas a longo prazo pode ser simplificado usando diretamente os SDKs oficiais (OpenAI, Google Generative AI).

2. **Tipagem TypeScript:** Houve alguns problemas recentes com a tipagem do `UserProfile` (`minutesPerSession` vs `minutesPerWorkout`). Recomenda-se criar um arquivo de tipos compartilhado (`@shared/types`) para garantir que o cliente e o servidor usem exatamente as mesmas interfaces para o perfil do usuário.

3. **sessionStorage para Treinos:** Embora funcione como fallback, usar sessionStorage para armazenar treinos é uma solução temporária. Quando DATABASE_URL for configurado, remover esta lógica de fallback.

## Conclusão
O projeto está em um estado estável, compilando sem erros e com as dependências legadas removidas. As melhorias de Storage, Autenticação e Geração de Treinos foram implementadas com sucesso, tornando o projeto mais robusto. O próximo passo crítico é configurar DATABASE_URL para garantir persistência de dados em produção.
