# Changelog

Todas as mudanças notáveis no projeto serão documentadas neste arquivo.

## [1.2.0] - 2026-07-08

### Adicionado
- Hook `useFirebaseStorage.ts` para upload de arquivos diretamente para o Firebase Storage no cliente.
- Funcionalidade de upload de fotos de progresso no `IATrainer.tsx` usando o `useFirebaseStorage`.

### Modificado
- **Armazenamento de Imagens:** O endpoint `bodyProgress.add` no `routers.ts` agora aceita `photoUrl` (URL pública do Firebase Storage) como entrada principal para fotos de progresso. Mantém compatibilidade com `photoBase64` como fallback.
- **Fallback de Autenticação:** Confirmado que o `main.tsx` já configura o cliente tRPC para enviar o header `Authorization` com o token do `localStorage` em todas as requisições, garantindo autenticação em ambientes com bloqueio de cookies.

### Corrigido
- Erro de tipagem no `IATrainer.tsx` (`profile?.uid` corrigido para `profile?.userId`) ao construir o caminho do Firebase Storage.

## [1.1.0] - 2026-07-08

### Adicionado
- Campo `onboardingCompleted` no modelo `UserProfile` (useFirebaseAuth.ts) para controlar o fluxo de entrada de novos usuários.
- Novo módulo `storage.ts` configurado para armazenar uploads (como fotos de progresso) localmente usando Data URLs (base64) como fallback para desenvolvimento, substituindo o antigo `Forge/S3`.

### Modificado
- **Autenticação:** Migração completa do sistema de autenticação de Manus/Base44 OAuth para Firebase Auth + JWT próprio.
  - O backend agora valida sessões usando cookies assinados (`sdk.ts`) baseados nos UIDs do Firebase.
  - Hooks do cliente (`useAuth.ts`) agora utilizam o `AuthContext` baseado em Firebase em vez do antigo tRPC.
- **Armazenamento:** Substituído o proxy de armazenamento (`storageProxy.ts`) por uma rota legada que retorna `410 Gone`.
- **Dependências:** Limpeza do `package.json` removendo bibliotecas não utilizadas: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `vite-plugin-manus-runtime`, `@builder.io/vite-plugin-jsx-loc`.
- **Configuração:** `vite.config.ts` simplificado, removendo plugins do Manus.
- **Variáveis de Ambiente:** `env.ts` atualizado para remover variáveis antigas (`VITE_APP_ID`, `OAUTH_SERVER_URL`, etc.) e mapear corretamente as chaves da API de IA (`OPENAI_API_BASE`, `OPENAI_API_KEY`).

### Removido
- Arquivos de documentação antigos da plataforma Manus (`references/`).
- Componentes não utilizados (`ManusDialog.tsx`, `ComponentShowcase.tsx`, `FirebaseLogin.tsx`).
- Arquivos de configuração obsoletos (`median.json`, `template.json`, `MEDIANIZE_GUIA.md`).
- Lógica de OAuth legado e Data API (`oauth.ts`, `dataApi.ts`, `manusTypes.ts`).

### Corrigido
- Erro de compilação no `Onboarding.tsx` onde `targetWeightKg` recebia `null` em vez de `undefined`.
- Inconsistência no nome do campo `minutesPerWorkout` corrigido para `minutesPerSession` no `Onboarding.tsx` para coincidir com a interface `UserProfile`.
