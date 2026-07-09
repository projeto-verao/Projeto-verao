# Bugs e Issues Conhecidos

## Resolvidos (Julho 2026)
- [x] **Erro de compilação no Onboarding:** O campo `targetWeightKg` estava recebendo `null`, o que violava a tipagem `number | undefined`.
- [x] **Inconsistência de Nomenclatura:** O formulário de onboarding usava `minutesPerWorkout`, enquanto a interface esperava `minutesPerSession`.
- [x] **Propriedade Inexistente:** O campo `onboardingCompleted` era usado no `App.tsx` e `Profile.tsx`, mas não existia na interface `UserProfile`.
- [x] **Falha de Importação no Storage:** O arquivo `storage.ts` tentava importar dinamicamente o `firebase-admin`, que não estava listado no `package.json`, causando erro no build.
- [x] **Erro de tipagem no IATrainer.tsx:** `profile?.uid` corrigido para `profile?.userId` ao construir o caminho do Firebase Storage.
- [x] **Falha na Geração de Treinos:** DATABASE_URL não estava configurado, causando falha na persistência de treinos. Implementado fallback em sessionStorage no cliente para permitir que o frontend funcione mesmo sem banco de dados.

## Pendentes / Em Observação
- [ ] **Armazenamento de Imagens em Produção:** Atualmente, as imagens de perfil e progresso são convertidas para Base64 (Data URLs) devido à remoção do proxy S3. Embora o cliente agora faça upload para o Firebase Storage, o backend ainda aceita `photoBase64` como fallback. É crucial garantir que o frontend sempre envie `photoUrl` para o backend e que o backend não processe `photoBase64` em produção.
  - *Solução Proposta:* Remover completamente o suporte a `photoBase64` no backend e exigir `photoUrl`.
- [ ] **Fallback de Autenticação no Safari/WebView:** O `sdk.ts` usa o header `Authorization` como fallback quando os cookies são bloqueados. O `main.tsx` já envia o token do `localStorage` nesse header. É importante monitorar se essa solução é robusta em todos os cenários de bloqueio de cookies.
- [ ] **DATABASE_URL em Produção:** O projeto atualmente funciona sem DATABASE_URL configurado, usando fallbacks em sessionStorage. Para produção, é essencial configurar DATABASE_URL apontando para um MySQL/TiDB real para garantir persistência de dados.
  - *Solução Proposta:* Configurar DATABASE_URL no ambiente de produção e remover os fallbacks de mock/sessionStorage.

### [Resolvido] Falha na Geração de Treinos (Erro de Permissão Firestore)

**Descrição:** O botão "Gerar Treino" chamava a API da IA corretamente, mas a persistência falhava, interrompendo o fluxo e não criando o treino na interface.
**Causa Raiz:** Incompatibilidade entre os dados enviados pelo frontend (`title`, `days`, `isActive`, `version`) e a função de validação `isValidWorkout` no arquivo `firestore.rules` (que esperava os campos legados `name`, `exercises`, `duration`, `difficulty`). Isso causava um erro `Permission denied` no Firestore. A mesma incompatibilidade ocorria com `bodyProgress`.
**Correção:** Atualização das regras do Firestore para validar os campos corretos enviados pela versão atual do aplicativo. As regras foram corrigidas localmente em `firestore.rules` e feito deploy via Firebase Admin REST API. Além disso, foram adicionadas permissões de leitura/escrita para as subcoleções `completions` e `meta`.
