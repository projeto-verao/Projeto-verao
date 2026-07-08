# Análise de Código - Teste E2E Achados

**Data:** 8 de Julho de 2026

## Achados Positivos

### 1. Validação de Cadastro ✅
- ✅ Nome obrigatório
- ✅ E-mail obrigatório
- ✅ Senha >= 6 caracteres
- ✅ Confirmação de senha
- ✅ Tratamento de erros Firebase

### 2. Validação de Login ✅
- ✅ E-mail obrigatório
- ✅ Senha obrigatória
- ✅ Tratamento de erros Firebase
- ✅ Redirecionamento para `/`

### 3. Logout ✅
- ✅ Token removido do localStorage
- ✅ Usuário setado como null
- ✅ Perfil setado como null

### 4. Persistência de Dados ✅
- ✅ Perfil salvo no Firestore durante cadastro
- ✅ Token salvo em localStorage
- ✅ Token enviado via header Authorization em requisições tRPC

### 5. Fallback Firestore ✅
- ✅ `saveWorkoutToFirestore()` implementado
- ✅ `getActiveWorkoutFromFirestore()` implementado
- ✅ Fallback em `db.ts` para quando MySQL não está disponível

## Achados Negativos / Potenciais Problemas

### 1. Falta de Validação de E-mail
**Problema:** Login.tsx não valida formato de e-mail
```typescript
if (!email) { // Apenas verifica se está vazio
  toast.error("Digite seu e-mail");
  return;
}
```
**Esperado:** Validar formato com regex ou biblioteca
**Impacto:** Usuário pode tentar login com "invalido" em vez de "invalido@test.com"
**Severidade:** Baixa (Firebase rejeitará)

### 2. Falta de Feedback de Carregamento
**Problema:** Botão não fica desabilitado durante login/cadastro
**Esperado:** Botão desabilitado enquanto `loading = true`
**Impacto:** Usuário pode clicar múltiplas vezes
**Severidade:** Média

### 3. Falta de Recuperação de Senha
**Problema:** Função `resetPassword()` implementada mas não testada
**Esperado:** Testar fluxo completo de recuperação
**Impacto:** Usuário não consegue recuperar senha
**Severidade:** Alta

### 4. Falta de Validação de Idade/Altura/Peso
**Problema:** Onboarding não valida valores numéricos
**Esperado:** Validar ranges (ex: idade 13-100, altura 100-250cm)
**Impacto:** Usuário pode salvar dados inválidos
**Severidade:** Média

### 5. Falta de Tratamento de Erro em Firestore
**Problema:** Se `setDoc()` falhar no Firestore, usuário não é informado
**Esperado:** Mostrar erro e permitir retry
**Impacto:** Usuário pensa que cadastro funcionou mas dados não foram salvos
**Severidade:** Alta

### 6. Falta de Validação de Permissões Firestore
**Problema:** Sem testar se regras de segurança estão corretas
**Esperado:** Usuário só consegue ler/escrever seus próprios dados
**Impacto:** Possível vazamento de dados
**Severidade:** Crítica

## Próximos Passos

1. Implementar validação de e-mail
2. Desabilitar botões durante loading
3. Testar fluxo de recuperação de senha
4. Adicionar validação de campos numéricos
5. Melhorar tratamento de erros Firestore
6. Validar regras de segurança Firestore

