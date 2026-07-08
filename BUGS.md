# Bugs e Issues Conhecidos

## Resolvidos (Julho 2026)
- [x] **Erro de compilação no Onboarding:** O campo `targetWeightKg` estava recebendo `null`, o que violava a tipagem `number | undefined`.
- [x] **Inconsistência de Nomenclatura:** O formulário de onboarding usava `minutesPerWorkout`, enquanto a interface esperava `minutesPerSession`.
- [x] **Propriedade Inexistente:** O campo `onboardingCompleted` era usado no `App.tsx` e `Profile.tsx`, mas não existia na interface `UserProfile`.
- [x] **Falha de Importação no Storage:** O arquivo `storage.ts` tentava importar dinamicamente o `firebase-admin`, que não estava listado no `package.json`, causando erro no build.
- [x] **Erro de tipagem no IATrainer.tsx:** `profile?.uid` corrigido para `profile?.userId` ao construir o caminho do Firebase Storage.

## Pendentes / Em Observação
- [ ] **Armazenamento de Imagens em Produção:** Atualmente, as imagens de perfil e progresso são convertidas para Base64 (Data URLs) devido à remoção do proxy S3. Embora o cliente agora faça upload para o Firebase Storage, o backend ainda aceita `photoBase64` como fallback. É crucial garantir que o frontend sempre envie `photoUrl` para o backend e que o backend não processe `photoBase64` em produção.
  - *Solução Proposta:* Remover completamente o suporte a `photoBase64` no backend e exigir `photoUrl`.
- [ ] **Fallback de Autenticação no Safari/WebView:** O `sdk.ts` usa o header `Authorization` como fallback quando os cookies são bloqueados. O `main.tsx` já envia o token do `localStorage` nesse header. É importante monitorar se essa solução é robusta em todos os cenários de bloqueio de cookies.
