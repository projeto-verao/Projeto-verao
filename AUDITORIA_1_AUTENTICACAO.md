# Auditoria 1: Autenticação Firebase

## Visão Geral
A autenticação do projeto foi migrada com sucesso do Manus/Base44 para o Firebase Auth. O fluxo atual suporta criação de conta, login, logout e recuperação de senha diretamente pelo Firebase.

## Análise dos Fluxos

1. **Criação de conta:** O hook `useFirebaseAuth.ts` utiliza `createUserWithEmailAndPassword` e atualiza o perfil do usuário no Firestore (`users` collection) e no Auth (displayName).
2. **Login:** Utiliza `signInWithEmailAndPassword` do Firebase Auth.
3. **Logout:** Chama `signOut(auth)` e limpa o `localStorage` de tokens.
4. **Recuperação de senha:** Utiliza `sendPasswordResetEmail(auth)`.
5. **Persistência de sessão:** No hook `useFirebaseAuth`, o listener `onAuthStateChanged` mantém o estado do usuário. Para compatibilidade com o backend (quando existe), o `tryBackendSession` tenta trocar o token do Firebase por um JWT de sessão local, salvando no `localStorage` e chamando `/api/auth/firebase`. Se falhar (ex: Firebase Hosting estático), o erro é silencioso e o app continua funcionando apenas com o Firebase.

## Débitos Técnicos e Melhorias Sugeridas

1. **Dependência do Login Manus/Base44:** 
   - **Status:** O código de compatibilidade com Manus/Base44 foi reduzido ao mínimo. O `sdk.ts` ainda contém uma classe `OAuthService` e métodos para trocar tokens, mas o frontend não depende mais disso para o fluxo principal. O `firebaseAuth.ts` no servidor ainda usa o `sdk` para criar o token de sessão, o que é aceitável para manter a compatibilidade com o backend Express/tRPC, caso o projeto volte a usar a rota `/api`.
   - **Ação:** Nenhuma ação imediata necessária. O projeto está desacoplado do OAuth do Manus para o cliente. Se o backend for descontinuado, a chamada `tryBackendSession` pode ser removida do `useFirebaseAuth.ts`.

2. **Tipagem do Firestore:** O `createdAt` e `updatedAt` do `UserProfile` estão como `any`.
   - **Ação:** Recomenda-se tipar explicitamente como `Timestamp` do Firestore para evitar erros de tipagem no frontend.

## Conclusão
A autenticação está saudável e funcionando independentemente da infraestrutura Manus. O fluxo é robusto e lida bem com ambientes sem backend (Firebase Hosting estático).
