# Teste E2E - Simulação de Usuário Real

**Data:** 8 de Julho de 2026  
**Objetivo:** Testar fluxo completo como se fosse um usuário real usando o app  
**Método:** Análise de código + Simulação de cenários

---

## FASE 1: CADASTRO, LOGIN E ONBOARDING

### 1.1 Cenário: Novo Usuário - Cadastro com Sucesso

**Passos:**
1. Usuário acessa `/login`
2. Clica em "Criar Conta"
3. Preenche: Nome, E-mail, Senha (6+ caracteres), Confirmação
4. Clica em "Criar Conta"

**Esperado:**
- ✅ Usuário criado no Firebase Auth
- ✅ Perfil inicial salvo no Firestore (`users/{uid}`)
- ✅ Redirecionamento para `/welcome` ou `/onboarding`
- ✅ Toast: "Conta criada com sucesso!"
- ✅ Token salvo em `localStorage.auth_token`

**Resultado:** [ ] PASS [ ] FAIL

**Logs Esperados:**
```
[register] Iniciando com email: ...
[register] Usuario criado com uid: ...
[register] Salvando no Firestore...
[useFirebaseAuth] Chamando /api/auth/firebase
[useFirebaseAuth] Autenticação bem-sucedida
```

---

### 1.2 Cenário: Cadastro com Erros de Validação

**Teste 1: Nome vazio**
- Preencher: E-mail, Senha, Confirmação (válidos)
- Deixar Nome vazio
- Clicar "Criar Conta"
- **Esperado:** Erro "Digite seu nome"
- **Resultado:** [ ] PASS [ ] FAIL

**Teste 2: E-mail inválido**
- Preencher: Nome, Senha, Confirmação (válidos)
- E-mail: "invalido" (sem @)
- **Esperado:** Erro de validação Firebase
- **Resultado:** [ ] PASS [ ] FAIL

**Teste 3: Senha < 6 caracteres**
- Preencher: Nome, E-mail (válidos)
- Senha: "123"
- **Esperado:** Erro "A senha deve ter pelo menos 6 caracteres"
- **Resultado:** [ ] PASS [ ] FAIL

**Teste 4: Senhas não coincidem**
- Preencher: Nome, E-mail, Senha: "123456", Confirmação: "654321"
- **Esperado:** Erro "As senhas não coincidem"
- **Resultado:** [ ] PASS [ ] FAIL

**Teste 5: E-mail já existe**
- Tentar cadastrar com e-mail já usado
- **Esperado:** Erro "E-mail já está em uso"
- **Resultado:** [ ] PASS [ ] FAIL

---

### 1.3 Cenário: Login com Sucesso

**Passos:**
1. Usuário acessa `/login`
2. Preenche: E-mail e Senha corretos
3. Clica "Entrar"

**Esperado:**
- ✅ Redirecionamento para `/` (Dashboard) ou `/welcome`
- ✅ Token salvo em localStorage
- ✅ Usuário autenticado no `AuthContext`
- ✅ Toast: "Login realizado com sucesso!"

**Resultado:** [ ] PASS [ ] FAIL

---

### 1.4 Cenário: Login com Erros

**Teste 1: E-mail não existe**
- E-mail: "naoexiste@test.com", Senha: "123456"
- **Esperado:** Erro "Usuário não encontrado"
- **Resultado:** [ ] PASS [ ] FAIL

**Teste 2: Senha incorreta**
- E-mail: válido, Senha: "errada"
- **Esperado:** Erro "Senha incorreta"
- **Resultado:** [ ] PASS [ ] FAIL

**Teste 3: Campos vazios**
- Deixar E-mail e Senha vazios
- **Esperado:** Erro "Preencha e-mail e senha"
- **Resultado:** [ ] PASS [ ] FAIL

---

### 1.5 Cenário: Logout

**Passos:**
1. Usuário logado
2. Clica em "Logout" (menu ou botão)
3. Confirma logout

**Esperado:**
- ✅ Token removido do localStorage
- ✅ Redirecionamento para `/login`
- ✅ AuthContext limpo (`user = null`, `profile = null`)

**Resultado:** [ ] PASS [ ] FAIL

---

### 1.6 Cenário: Onboarding Completo

**Passos:**
1. Usuário novo logado
2. Acessa `/welcome` ou `/onboarding`
3. Preenche todos os campos:
   - Nome, Idade, Sexo, Altura, Peso
   - Objetivo, Nível, Dias/Semana, Minutos/Sessão
   - Restrições físicas (opcional)
4. Clica "Continuar" ou "Salvar"

**Esperado:**
- ✅ Dados salvos no Firestore (`users/{uid}`)
- ✅ Campo `onboardingCompleted = true`
- ✅ Redirecionamento para `/` (Dashboard)
- ✅ Toast: "Perfil atualizado com sucesso!"

**Resultado:** [ ] PASS [ ] FAIL

---

## FASE 2: GERAÇÃO DE TREINO POR IA

### 2.1 Cenário: Gerar Primeiro Treino

**Passos:**
1. Usuário no Dashboard (após onboarding)
2. Clica em "GERAR TREINO COM IA"
3. Aguarda resposta da IA (5-30 segundos)

**Esperado:**
- ✅ Spinner de carregamento exibido
- ✅ Treino gerado e exibido com:
  - Título (ex: "Treino Personalizado — Hipertrofia")
  - Dias (1-7 conforme perfil)
  - Exercícios com: nome, séries, repetições, peso, descanso, notas
- ✅ Toast: "Novo treino gerado com sucesso!"
- ✅ Treino salvo no Firestore (`users/{uid}/workouts/`)
- ✅ Campo `isActive = true`

**Resultado:** [ ] PASS [ ] FAIL

**Logs Esperados:**
```
[Dashboard] generateWorkout.mutate() chamado
[routers.ts] workout.generate iniciado
[llm.ts] invokeLLM chamado com Gemini 2.5 Flash
[db.ts] createWorkout tentando Firestore
[FirebaseDb] Treino salvo no Firestore com ID: ...
```

---

### 2.2 Cenário: Gerar Treino Novamente (CRÍTICO)

**Passos:**
1. Treino já exibido no Dashboard
2. Clica em "Atualizar" ou "Gerar Treino" novamente
3. Aguarda novo treino

**Esperado:**
- ✅ Novo treino gerado (diferente do anterior)
- ✅ Treino anterior marcado como `isActive = false` no Firestore
- ✅ Novo treino marcado como `isActive = true`
- ✅ Dashboard exibe novo treino
- ✅ Toast: "Novo treino gerado com sucesso!"

**Resultado:** [ ] PASS [ ] FAIL

**Teste de Estresse:** Gerar 5 treinos consecutivos
- **Esperado:** Cada novo treino é diferente e salvo corretamente
- **Resultado:** [ ] PASS [ ] FAIL

---

### 2.3 Cenário: Gerar Treino com Foto de Avaliação

**Passos:**
1. Usuário no `/processing` (tela de avaliação)
2. Clica "Tirar Foto" ou "Selecionar Foto"
3. Clica "Gerar Treino com Análise"

**Esperado:**
- ✅ Foto enviada para Firebase Storage
- ✅ URL da foto obtida
- ✅ Foto analisada pela IA (composição corporal)
- ✅ Treino gerado considerando análise visual
- ✅ Foto salva em `bodyProgress` no Firestore

**Resultado:** [ ] PASS [ ] FAIL

---

## FASE 3: EDIÇÃO, EXCLUSÃO E HISTÓRICO

### 3.1 Cenário: Editar Treino

**Passos:**
1. Treino exibido no Dashboard
2. Clica em "Editar" ou ícone de edição
3. Modifica: exercício, séries, repetições, peso
4. Clica "Salvar"

**Esperado:**
- ✅ Alterações salvas no Firestore
- ✅ Dashboard atualiza com novas informações
- ✅ Toast: "Treino atualizado com sucesso!"
- ✅ Versão anterior preservada no histórico

**Resultado:** [ ] PASS [ ] FAIL

---

### 3.2 Cenário: Excluir Treino

**Passos:**
1. Treino exibido
2. Clica em "Excluir" ou ícone de lixo
3. Confirma exclusão

**Esperado:**
- ✅ Treino removido do Firestore
- ✅ Dashboard exibe mensagem "Nenhum treino" ou oferece gerar novo
- ✅ Toast: "Treino excluído com sucesso!"

**Resultado:** [ ] PASS [ ] FAIL

---

### 3.3 Cenário: Histórico de Versões

**Passos:**
1. Usuário acessa `/history`
2. Visualiza lista de treinos anteriores
3. Clica em treino anterior para visualizar
4. Clica "Restaurar" para usar versão anterior

**Esperado:**
- ✅ Todas as versões listadas com data/hora
- ✅ Versão atual marcada como "Ativo"
- ✅ Ao restaurar, versão anterior fica `isActive = true`
- ✅ Dashboard atualiza com treino restaurado

**Resultado:** [ ] PASS [ ] FAIL

---

## FASE 4: NAVEGAÇÃO E FUNCIONALIDADES SECUNDÁRIAS

### 4.1 Cenário: Navegação Completa

**Telas a Testar:**
- [ ] `/login` — Login e Cadastro
- [ ] `/welcome` — Welcome/Onboarding
- [ ] `/` — Dashboard (treino, progresso semanal)
- [ ] `/onboarding` — Editar perfil
- [ ] `/profile` — Perfil do usuário
- [ ] `/history` — Histórico de treinos
- [ ] `/ia-trainer` — Treino com IA (execução)
- [ ] `/water` — Registro de água
- [ ] `/nutrition` — Nutrição (se existir)
- [ ] `/processing` — Processamento/Avaliação física

**Para cada tela:**
- ✅ Carrega sem erros
- ✅ Dados exibidos corretamente
- ✅ Botões e links funcionam
- ✅ Redirecionamento correto

**Resultado:** [ ] PASS [ ] FAIL

---

### 4.2 Cenário: Progresso Semanal

**Passos:**
1. Dashboard exibe "Treinos Concluídos: X/4"
2. Usuário marca exercícios como concluídos
3. Contador atualiza

**Esperado:**
- ✅ Contador incrementa
- ✅ Dados salvos no Firestore
- ✅ Ao recarregar, contador permanece

**Resultado:** [ ] PASS [ ] FAIL

---

### 4.3 Cenário: Registro de Água

**Passos:**
1. Usuário acessa `/water`
2. Clica "Adicionar" ou "+" para registrar água
3. Seleciona quantidade (ex: 250ml, 500ml)
4. Clica "Adicionar"

**Esperado:**
- ✅ Registro salvo no Firestore (`users/{uid}/waterLogs/`)
- ✅ Total diário atualiza
- ✅ Toast: "Água registrada com sucesso!"
- ✅ Ao recarregar, registro persiste

**Resultado:** [ ] PASS [ ] FAIL

---

### 4.4 Cenário: Upload de Foto de Progresso

**Passos:**
1. Usuário no `/ia-trainer`
2. Clica "Adicionar Foto de Progresso"
3. Seleciona imagem
4. Clica "Salvar"

**Esperado:**
- ✅ Foto enviada para Firebase Storage
- ✅ URL obtida
- ✅ Foto salva em `bodyProgress` no Firestore
- ✅ Foto exibida na galeria de progresso
- ✅ Toast: "Foto salva com sucesso!"

**Resultado:** [ ] PASS [ ] FAIL

---

## FASE 5: PERSISTÊNCIA E RECARREGAMENTO

### 5.1 Cenário: Recarregar Página e Verificar Dados

**Passos:**
1. Usuário logado com treino ativo
2. Pressiona F5 para recarregar
3. Verifica se dados permanecem

**Esperado:**
- ✅ Usuário permanece autenticado (token em localStorage)
- ✅ Treino ativo exibido no Dashboard
- ✅ Perfil carregado do Firestore
- ✅ Histórico de água persiste
- ✅ Fotos de progresso exibidas

**Resultado:** [ ] PASS [ ] FAIL

---

### 5.2 Cenário: Fechar e Reabrir App

**Passos:**
1. Usuário logado, com dados salvos
2. Fecha o navegador completamente
3. Reabre e acessa o app

**Esperado:**
- ✅ Usuário permanece autenticado (token em localStorage)
- ✅ Todos os dados carregam do Firestore
- ✅ Nenhum dado é perdido

**Resultado:** [ ] PASS [ ] FAIL

---

## FASE 6: TESTES DE ERRO E EDGE CASES

### 6.1 Cenário: Campos Vazios em Formulários

**Teste 1: Onboarding com campos vazios**
- Deixar campos obrigatórios em branco
- Clicar "Salvar"
- **Esperado:** Erro de validação
- **Resultado:** [ ] PASS [ ] FAIL

**Teste 2: Edição de treino com valores inválidos**
- Tentar salvar séries: "-5", repetições: "abc"
- **Esperado:** Erro de validação
- **Resultado:** [ ] PASS [ ] FAIL

---

### 6.2 Cenário: Timeout e Lentidão

**Teste 1: Gerar treino com delay simulado**
- Gerar treino
- Aguardar > 30 segundos
- **Esperado:** Timeout ou mensagem de erro
- **Resultado:** [ ] PASS [ ] FAIL

**Teste 2: Upload de foto grande**
- Tentar upload de imagem > 10MB
- **Esperado:** Erro ou compressão automática
- **Resultado:** [ ] PASS [ ] FAIL

---

### 6.3 Cenário: Permissões do Firebase

**Verificações:**
- ✅ Usuário só vê seus próprios dados
- ✅ Usuário não consegue acessar dados de outro usuário
- ✅ Usuário não autenticado não consegue ler/escrever

**Resultado:** [ ] PASS [ ] FAIL

---

## FASE 7: LOGS E CONSOLE

### 7.1 Verificar Console do Navegador

**Esperado:**
- ✅ Nenhum erro crítico (warnings aceitáveis)
- ✅ Logs de autenticação visíveis
- ✅ Logs de geração de treino visíveis
- ✅ Sem erros de tipagem ou referência

**Resultado:** [ ] PASS [ ] FAIL

---

### 7.2 Verificar Logs do Servidor

**Esperado:**
- ✅ Logs de autenticação Firebase
- ✅ Logs de geração de treino (LLM)
- ✅ Logs de persistência (Firestore)
- ✅ Sem erros críticos

**Resultado:** [ ] PASS [ ] FAIL

---

## RESUMO DE RESULTADOS

| Fase | Testes | Aprovados | Falhados | Status |
|------|--------|-----------|----------|--------|
| 1. Cadastro/Login | 15 | ? | ? | ? |
| 2. Geração de Treino | 5 | ? | ? | ? |
| 3. Edição/Exclusão | 6 | ? | ? | ? |
| 4. Navegação | 10 | ? | ? | ? |
| 5. Persistência | 4 | ? | ? | ? |
| 6. Erros/Edge Cases | 6 | ? | ? | ? |
| 7. Logs | 2 | ? | ? | ? |
| **TOTAL** | **48** | **?** | **?** | **?** |

---

## BUGS ENCONTRADOS

(A ser preenchido durante os testes)

---

## COMMITS REALIZADOS

(A ser preenchido durante os testes)

