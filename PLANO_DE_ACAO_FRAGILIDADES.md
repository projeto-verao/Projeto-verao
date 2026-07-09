# Plano de Ação: Correção de Fragilidades Identificadas

Este documento detalha o plano de ação para resolver as fragilidades mapeadas na Auditoria Geral do Projeto Verão.

## 1. Fragilidade no Fluxo de Avaliação Física
**Problema:** A foto de avaliação física é passada do `Onboarding.tsx` para o `Processing.tsx` usando `sessionStorage` (em formato base64). Isso é frágil, pois imagens grandes podem estourar o limite de armazenamento ou ser perdidas em certos contextos de segurança (ex: navegação via iframe).
**Solução:** A foto deve ser enviada diretamente para o Firebase Storage durante o Onboarding. A `photoUrl` (URL pública) será salva no perfil do Firestore, e o `Processing.tsx` a baixará diretamente do Storage.

## 2. Ineficiência no Carregamento de Histórico (Firestore)
**Problema:** Métodos como `getWeekCompletions`, `getTodayMeals` e `getTodayWater` baixam *todos* os registros da subcoleção do Firestore e filtram via JavaScript (`Array.filter()`).
**Solução:** A consulta deve ser limitada no lado do servidor. Adicionaremos um campo `dayOfMonth` e `weekOfYear` ao criar os registros, permitindo que o Firestore filtre exatamente os dados do dia/semana desejados, evitando downloads excessivos.

## 3. Inconsistência na Verificação de Onboarding
**Problema:** O `AuthGuard` verifica `profile?.onboardingCompleted`, mas o `Home.tsx` (que serve como rota raiz após o login) verifica apenas `profile?.goal`.
**Solução:** O `Home.tsx` deve ser atualizado para verificar `profile?.onboardingCompleted`, garantindo que o roteamento seja 100% consistente com o estado de cadastro do usuário.

---
*As implementações destas correções serão realizadas nos commits seguintes.*
