# Bugs e Issues Conhecidos

## Resolvidos (Julho 2026)
- [x] **Erro de compilação no Onboarding:** O campo `targetWeightKg` estava recebendo `null`, o que violava a tipagem `number | undefined`.
- [x] **Inconsistência de Nomenclatura:** O formulário de onboarding usava `minutesPerWorkout`, enquanto a interface esperava `minutesPerSession`.
- [x] **Propriedade Inexistente:** O campo `onboardingCompleted` era usado no `App.tsx` e `Profile.tsx`, mas não existia na interface `UserProfile`.
- [x] **Falha de Importação no Storage:** O arquivo `storage.ts` tentava importar dinamicamente o `firebase-admin`, que não estava listado no `package.json`, causando erro no build.

## Pendentes / Em Observação
- [ ] **Armazenamento de Imagens em Produção:** Atualmente, as imagens de perfil e progresso são convertidas para Base64 (Data URLs) devido à remoção do proxy S3. Isso funciona para testes, mas causará problemas de performance e limite de tamanho no banco de dados em produção.
  - *Solução Proposta:* Implementar upload direto via Firebase Storage no cliente e salvar apenas a URL pública no banco de dados.
- [ ] **Fallback de Autenticação no Safari/WebView:** O `sdk.ts` usa o header `Authorization` como fallback quando os cookies são bloqueados. É necessário garantir que o frontend envie consistentemente esse header em todas as chamadas tRPC se o cookie falhar.
