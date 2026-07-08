# Plano de Teste E2E - Projeto Verão

**Data:** 8 de Julho de 2026  
**Objetivo:** Validar todo o fluxo da aplicação, com foco especial em geração de treinos por IA  
**Ambiente:** Sandbox com Firebase emulator (ou live Firebase)

---

## 1. Teste de Autenticação (Firebase Auth)

### 1.1 Cadastro de Novo Usuário
- [ ] Acessar página de Login
- [ ] Clicar em "Criar Conta"
- [ ] Preencher: Nome, E-mail, Senha (6+ caracteres), Confirmação de Senha
- [ ] Validar: Erro se campos vazios
- [ ] Validar: Erro se senhas não coincidem
- [ ] Validar: Erro se e-mail já existe
- [ ] **Esperado:** Usuário criado no Firebase Auth e perfil salvo no Firestore
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 1.2 Login com Credenciais Válidas
- [ ] Acessar página de Login
- [ ] Preencher e-mail e senha corretos
- [ ] Clicar em "Entrar"
- [ ] **Esperado:** Redirecionamento para Dashboard ou Welcome
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 1.3 Login com Credenciais Inválidas
- [ ] Tentar login com e-mail incorreto
- [ ] **Esperado:** Erro "Usuário não encontrado"
- [ ] Tentar login com senha incorreta
- [ ] **Esperado:** Erro "Senha incorreta"
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 1.4 Logout
- [ ] Fazer login com sucesso
- [ ] Clicar em Logout
- [ ] **Esperado:** Redirecionamento para Login, token removido do localStorage
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

---

## 2. Teste de Onboarding

### 2.1 Fluxo de Onboarding Completo
- [ ] Após login, acessar tela de Onboarding
- [ ] Preencher: Nome, Idade, Sexo, Altura, Peso, Objetivo, Nível, Dias/Semana, Minutos/Sessão
- [ ] Validar: Campos obrigatórios
- [ ] Salvar dados
- [ ] **Esperado:** Dados salvos no Firestore e `onboardingCompleted = true`
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

---

## 3. Teste de Geração de Treino por IA (PRIORIDADE MÁXIMA)

### 3.1 Gerar Primeiro Treino
- [ ] Acessar Dashboard
- [ ] Clicar em "GERAR TREINO COM IA"
- [ ] **Esperado:** Spinner de carregamento
- [ ] **Esperado:** Treino gerado em 5-30 segundos
- [ ] **Esperado:** Treino exibido com dias, exercícios, séries, repetições
- [ ] **Esperado:** Toast "Novo treino gerado com sucesso!"
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 3.2 Gerar Treino Novamente (CRÍTICO)
- [ ] Com treino já exibido, clicar em "Atualizar" ou "Gerar Treino" novamente
- [ ] **Esperado:** Novo treino gerado (diferente do anterior)
- [ ] **Esperado:** Treino anterior marcado como `isActive = false`
- [ ] **Esperado:** Novo treino marcado como `isActive = true`
- [ ] **Esperado:** Interface atualizada com novo treino
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 3.3 Validar Formato do Treino
- [ ] Verificar se o JSON do treino está correto
- [ ] Validar: `title`, `days`, `exercises`, `sets`, `reps`, `weight`, `rest`, `notes`
- [ ] **Esperado:** Todos os campos preenchidos corretamente
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 3.4 Validar Persistência no Firestore
- [ ] Após gerar treino, recarregar a página
- [ ] **Esperado:** Treino permanece exibido (salvo no Firestore ou sessionStorage)
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

---

## 4. Teste de Persistência no Firestore

### 4.1 Salvar Treino no Firestore
- [ ] Gerar treino
- [ ] Verificar no Firebase Console se documento foi criado em `users/{uid}/workouts/`
- [ ] **Esperado:** Documento com `isActive = true`, `title`, `content` (JSON)
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 4.2 Histórico de Versões
- [ ] Gerar treino 2 vezes
- [ ] Acessar página de Histórico
- [ ] **Esperado:** Ambas as versões exibidas
- [ ] **Esperado:** Versão mais recente marcada como "Atual"
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 4.3 Restaurar Versão Anterior
- [ ] No Histórico, clicar em versão anterior
- [ ] **Esperado:** Versão anterior restaurada como `isActive = true`
- [ ] **Esperado:** Dashboard exibe treino restaurado
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

---

## 5. Teste de Navegação

### 5.1 Navegação Entre Telas
- [ ] Dashboard → Onboarding (se necessário)
- [ ] Dashboard → IATrainer
- [ ] Dashboard → History
- [ ] Dashboard → Profile
- [ ] Dashboard → Nutrition
- [ ] Dashboard → Water
- [ ] **Esperado:** Todas as telas carregam sem erros
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 5.2 Voltar do Dashboard
- [ ] De qualquer tela, voltar ao Dashboard
- [ ] **Esperado:** Dados persistem
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

---

## 6. Teste de Edição e Exclusão de Treinos

### 6.1 Editar Treino (se funcionalidade existir)
- [ ] Abrir treino
- [ ] Editar exercícios (séries, repetições, peso)
- [ ] Salvar
- [ ] **Esperado:** Mudanças persistem
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 6.2 Excluir Treino (se funcionalidade existir)
- [ ] Abrir treino
- [ ] Clicar em "Excluir"
- [ ] Confirmar
- [ ] **Esperado:** Treino removido do Firestore
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

---

## 7. Teste de Funcionalidades Adicionais

### 7.1 Progresso Semanal
- [ ] No Dashboard, verificar "Treinos Concluídos"
- [ ] Marcar exercícios como concluídos
- [ ] **Esperado:** Contador atualiza
- [ ] **Esperado:** Dados salvos no Firestore
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 7.2 Registro de Água
- [ ] Acessar tela de Água
- [ ] Adicionar registros
- [ ] **Esperado:** Registros salvos no Firestore
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 7.3 Upload de Foto de Progresso
- [ ] No IATrainer, clicar em "Adicionar Foto"
- [ ] Selecionar imagem
- [ ] **Esperado:** Upload para Firebase Storage
- [ ] **Esperado:** URL salva no Firestore
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

---

## 8. Teste de Logs e Console

### 8.1 Verificar Console do Navegador
- [ ] Abrir DevTools (F12)
- [ ] Executar fluxo completo
- [ ] **Esperado:** Nenhum erro crítico (warnings são aceitáveis)
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 8.2 Verificar Logs do Servidor
- [ ] No terminal do servidor, verificar logs
- [ ] **Esperado:** Logs de autenticação, geração de treino, persistência
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

### 8.3 Verificar Permissões do Firebase
- [ ] No Firebase Console, verificar Firestore Rules
- [ ] **Esperado:** Regras permitem leitura/escrita para usuários autenticados
- [ ] **Resultado:** ✓ PASS / ✗ FAIL

---

## 9. Resumo de Resultados

| Teste | Status | Notas |
|-------|--------|-------|
| Cadastro | ? | |
| Login | ? | |
| Logout | ? | |
| Onboarding | ? | |
| Gerar Treino | ? | |
| Gerar Novamente | ? | |
| Persistência Firestore | ? | |
| Histórico | ? | |
| Navegação | ? | |
| Progresso | ? | |
| Upload Foto | ? | |
| Console/Logs | ? | |

---

## 10. Problemas Encontrados

(A ser preenchido durante os testes)

---

## 11. Correções Realizadas

(A ser preenchido durante os testes)

---

## 12. Commits Realizados

(A ser preenchido durante os testes)

