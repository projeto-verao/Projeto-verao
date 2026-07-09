# Auditoria 2: Fluxo do Usuário

## Visão Geral
O fluxo do usuário é claro e bem definido: Cadastro → Avaliação → Geração de Treino → Dashboard. A aplicação utiliza o `wouter` para roteamento e um componente `AuthGuard` para gerenciar o estado de autenticação e onboarding.

## Análise dos Fluxos

1. **Cadastro (Onboarding):** O usuário preenche seus dados básicos e objetivos em 3 etapas. A foto de perfil é enviada diretamente para o Firebase Storage (via `updateProfile` que converte para `photoUrl`).
2. **Avaliação (Processing):** A foto de avaliação física é temporariamente armazenada no `sessionStorage` (base64) para ser consumida pela página `Processing.tsx`, onde é enviada à IA para análise corporal antes da geração do treino.
3. **Geração de Treino:** Ocorre automaticamente na rota `/processing` assim que a autenticação e o perfil são carregados.
4. **Dashboard:** Protegida pelo `AuthGuard`. Só pode ser acessada se `profile.onboardingCompleted` for `true`. Carrega o treino ativo do Firestore.

## Débitos Técnicos e Melhorias Sugeridas

1. **Uso de `sessionStorage` para Avaliação Física:**
   - **Status:** A foto de avaliação é salva em `sessionStorage` no `Onboarding.tsx` e lida no `Processing.tsx`.
   - **Ação:** Para evitar o uso de `sessionStorage` (que pode falhar com imagens grandes ou em certos contextos de segurança), a foto de avaliação deve ser enviada diretamente para o Firebase Storage no Onboarding, e apenas a `photoUrl` (URL pública) deve ser passada para o `Processing.tsx`.

2. **Redirecionamento Inicial (`Home.tsx`):**
   - **Status:** O `Home.tsx` verifica `profile?.goal` para redirecionar para `/dashboard` ou `/welcome`.
   - **Ação:** O `AuthGuard` já verifica `profile?.onboardingCompleted`. Para consistência, o `Home.tsx` deve usar a mesma verificação de `onboardingCompleted` em vez de `goal`, garantindo que o fluxo sempre respeite o estado de onboarding definido no `AuthContext`.

## Conclusão
O fluxo de navegação está correto e protege adequadamente as rotas. A única fragilidade é a passagem de dados base64 via `sessionStorage` entre o Onboarding e o Processing, que deve ser substituída por upload direto no Firebase Storage para maior robustez.
