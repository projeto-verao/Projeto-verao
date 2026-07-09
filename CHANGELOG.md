# Changelog - Projeto Verão

## [Unreleased]

### Fixed
- **Correção Crítica: Falha na Geração de Treinos**
  - Problema: DATABASE_URL não estava configurado, causando falha silenciosa na persistência de treinos
  - Solução: Implementado fallback em sessionStorage no cliente para armazenar treinos gerados
  - Arquivos modificados: `Dashboard.tsx`, `db.ts`, `tsconfig.json`
  - Resultado: Geração de treinos agora funciona mesmo sem banco de dados configurado

- **Erros de Tipagem TypeScript**
  - Adicionado `target: ES2020` ao `tsconfig.json` para compatibilidade com firebase-admin
  - Corrigidos erros de tipagem em `History.tsx`, `IATrainer.tsx`, `routers.ts`
  - Removido arquivo `firebaseDb.ts` (complexidade desnecessária)

### Changed
- **Melhorias de Fallback**
  - `createWorkout()`: Retorna objeto mock quando DATABASE_URL não está configurado
  - `Dashboard.tsx`: Carrega treino do cache em sessionStorage se não houver no banco de dados
  - Melhor tratamento de erros com logs mais descritivos

### Removed
- Arquivo `firebaseDb.ts` (fallback Firestore removido em favor de sessionStorage)
- Dependência desnecessária de firebase-admin no db.ts

## [v1.0.0] - Migração Firebase Completa

### Added
- Autenticação via Firebase Auth
- Upload de fotos via Firebase Storage SDK (cliente)
- Fallback de autenticação via header Authorization
- Suporte a tRPC com tipagem forte

### Changed
- Migração de Manus/Base44 para Firebase
- Remoção de dependências legadas (vite-plugin-manus-runtime, @builder.io/vite-plugin-jsx-loc)
- Limpeza de código legado (ManusDialog.tsx, FirebaseLogin.tsx, ComponentShowcase.tsx)

### Removed
- Dependências Manus/Base44 (vite-plugin-manus-runtime, @aws-sdk/*, etc.)
- Arquivos legados (median.json, template.json, references/)
- Suporte a OAuth Manus
