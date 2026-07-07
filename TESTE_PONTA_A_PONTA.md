# Teste de Ponta a Ponta - Projeto Verão

## 📋 Checklist de Validação Completa

Este documento descreve todos os testes necessários para validar o fluxo completo do Projeto Verão.

---

## 🔐 1. Autenticação e Login

### 1.1 Página de Login
- [ ] Acessar `http://localhost:3000/login`
- [ ] Verificar se a página carrega corretamente
- [ ] Verificar se os botões "Entrar com Google" e "Entrar com Email" estão visíveis
- [ ] Verificar se há abas de "Entrar" e "Criar Conta"

### 1.2 Fluxo de OAuth
- [ ] Clicar em "Entrar com Google"
- [ ] Verificar se é redirecionado para o portal OAuth
- [ ] Fazer login com credenciais válidas
- [ ] Verificar se é redirecionado de volta para a aplicação
- [ ] Verificar se a sessão é criada corretamente

### 1.3 Verificação de Autenticação
- [ ] Verificar se `trpc.auth.me` retorna dados do usuário
- [ ] Verificar se o cookie de sessão é criado
- [ ] Verificar se o usuário é armazenado no banco de dados

---

## 🎯 2. Fluxo de Onboarding

### 2.1 Redirecionamento Pós-Login
- [ ] Após login bem-sucedido, verificar se é redirecionado para `/`
- [ ] Verificar se a Home redireciona para `/welcome` (sem perfil)
- [ ] Verificar se a página de Welcome carrega corretamente

### 2.2 Página Welcome
- [ ] Verificar se o botão "Começar avaliação" está visível
- [ ] Clicar no botão e verificar se redireciona para `/onboarding`

### 2.3 Formulário de Onboarding
- [ ] Verificar se todos os campos obrigatórios estão presentes:
  - [ ] Nome
  - [ ] Idade
  - [ ] Sexo
  - [ ] Altura (cm)
  - [ ] Peso (kg)
  - [ ] Objetivo
  - [ ] Nível de experiência
  - [ ] Dias por semana
  - [ ] Minutos por sessão
  - [ ] Tipo de academia
  - [ ] Restrições físicas
  - [ ] Exercícios preferidos
  - [ ] Exercícios a evitar

### 2.4 Upload de Fotos
- [ ] Verificar se é possível capturar foto de perfil via câmera
- [ ] Verificar se é possível fazer upload de foto de perfil via galeria
- [ ] Verificar se é possível capturar foto de avaliação física via câmera
- [ ] Verificar se é possível fazer upload de foto de avaliação via galeria
- [ ] Verificar se as fotos são redimensionadas corretamente

### 2.5 Validação de Formulário
- [ ] Tentar enviar formulário sem preencher campos obrigatórios
- [ ] Verificar se aparecem mensagens de erro
- [ ] Preencher todos os campos corretamente
- [ ] Clicar em "Finalizar Cadastro"

### 2.6 Salvamento de Perfil
- [ ] Verificar se o perfil é salvo no banco de dados
- [ ] Verificar se as fotos são enviadas para S3
- [ ] Verificar se os URLs das fotos são armazenados

---

## ⚙️ 3. Geração de Treino

### 3.1 Página de Processing
- [ ] Verificar se a página de Processing carrega após onboarding
- [ ] Verificar se aparecem mensagens rotativas ("Analisando...", "Processando...", etc.)
- [ ] Verificar se há animação de carregamento

### 3.2 Análise Visual (se foto fornecida)
- [ ] Verificar se a foto de avaliação é enviada para análise
- [ ] Verificar se a IA analisa corretamente a composição corporal
- [ ] Verificar se o resultado da análise é armazenado

### 3.3 Geração de Treino
- [ ] Verificar se o treino é gerado com base no perfil
- [ ] Verificar se o treino é gerado com base na análise visual (se disponível)
- [ ] Verificar se o JSON do treino é válido
- [ ] Verificar se o treino é salvo no banco de dados
- [ ] Verificar se a versão do treino é criada no histórico

### 3.4 Redirecionamento para Dashboard
- [ ] Após geração bem-sucedida, verificar se redireciona para `/dashboard`
- [ ] Verificar se o treino gerado é exibido corretamente

---

## 📊 4. Dashboard Principal

### 4.1 Carregamento do Dashboard
- [ ] Acessar `/dashboard`
- [ ] Verificar se o treino ativo é carregado
- [ ] Verificar se o progresso semanal é exibido
- [ ] Verificar se a navegação inferior (BottomNav) está visível

### 4.2 Exibição do Treino
- [ ] Verificar se o título do treino é exibido
- [ ] Verificar se todos os dias de treino são listados
- [ ] Verificar se cada dia mostra:
  - [ ] Número do dia
  - [ ] Título do dia (ex: "Peito + Tríceps")
  - [ ] Emoji do grupo muscular
  - [ ] Lista de exercícios

### 4.3 Detalhes dos Exercícios
- [ ] Clicar em um dia para expandir
- [ ] Verificar se cada exercício mostra:
  - [ ] Nome do exercício
  - [ ] Número de séries
  - [ ] Repetições
  - [ ] Peso estimado
  - [ ] Tempo de descanso
  - [ ] Notas de execução

### 4.4 Progresso Semanal
- [ ] Verificar se o progresso semanal é exibido (ex: 0/4 dias)
- [ ] Verificar se há indicador visual do progresso

### 4.5 Funcionalidades do Dashboard
- [ ] Verificar se é possível marcar exercícios como concluídos
- [ ] Verificar se o timer de descanso funciona corretamente
- [ ] Verificar se é possível gerar novo treino
- [ ] Verificar se há opção de visualizar histórico

---

## 💬 5. Chat com IA (IATrainer)

### 5.1 Acesso ao Chat
- [ ] Clicar na aba "IA Trainer" na navegação inferior
- [ ] Verificar se a página carrega corretamente

### 5.2 Histórico de Chat
- [ ] Verificar se o histórico de mensagens é carregado
- [ ] Verificar se as mensagens aparecem em ordem cronológica

### 5.3 Envio de Mensagens
- [ ] Digitar uma mensagem
- [ ] Enviar a mensagem
- [ ] Verificar se a mensagem aparece no chat
- [ ] Verificar se a IA responde

### 5.4 Atualização de Treino via Chat
- [ ] Enviar mensagem pedindo para alterar o treino
- [ ] Verificar se a IA reconhece o pedido
- [ ] Verificar se a tag `<UPDATE_WORKOUT>` é processada
- [ ] Verificar se o treino é atualizado corretamente

### 5.5 Abas Adicionais
- [ ] Verificar se há aba de "Perfil" para editar dados
- [ ] Verificar se há aba de "Evolução" para análise corporal
- [ ] Verificar se há aba de "Histórico" para restaurar versões anteriores

---

## 🥗 6. Nutrição

### 6.1 Acesso à Nutrição
- [ ] Clicar na aba "Alimentação" na navegação inferior
- [ ] Verificar se a página carrega corretamente

### 6.2 Rastreamento de Água
- [ ] Verificar se há contador de água do dia
- [ ] Clicar em "Adicionar água"
- [ ] Verificar se a quantidade é adicionada
- [ ] Verificar se o progresso visual é atualizado

### 6.3 Registro de Refeições
- [ ] Clicar em "Adicionar refeição"
- [ ] Descrever uma refeição
- [ ] Enviar foto (opcional)
- [ ] Verificar se a IA analisa os macronutrientes
- [ ] Verificar se a refeição é salva

### 6.4 Recomendações Nutricionais
- [ ] Clicar em "Gerar recomendações"
- [ ] Verificar se a IA gera recomendações personalizadas
- [ ] Verificar se as recomendações são baseadas no perfil e consumo do dia

### 6.5 Dashboard de Nutrição
- [ ] Verificar se há gráfico de consumo de 7 dias
- [ ] Verificar se há resumo de macronutrientes do dia

---

## 🎯 7. Objetivos

### 7.1 Acesso aos Objetivos
- [ ] Clicar na aba "Objetivos" na navegação inferior
- [ ] Verificar se a página carrega corretamente

### 7.2 Gerenciamento de Objetivos
- [ ] Verificar se há campos para:
  - [ ] Objetivo principal
  - [ ] Peso atual
  - [ ] Peso alvo
  - [ ] Gordura corporal alvo
  - [ ] Meta semanal
  - [ ] Data alvo
- [ ] Preencher os campos
- [ ] Salvar objetivos
- [ ] Verificar se os objetivos são salvos no banco de dados

---

## 📈 8. Histórico de Evolução

### 8.1 Acesso ao Histórico
- [ ] Clicar na aba "Histórico" na navegação inferior
- [ ] Verificar se a página carrega corretamente

### 8.2 Registro de Progresso
- [ ] Verificar se há opção de adicionar novo registro de progresso
- [ ] Preencher dados de:
  - [ ] Peso
  - [ ] Gordura corporal
  - [ ] Medidas (peito, cintura, braço, coxa)
  - [ ] Notas
  - [ ] Foto (opcional)
- [ ] Salvar registro

### 8.3 Visualização de Evolução
- [ ] Verificar se há gráfico de evolução de peso
- [ ] Verificar se há análise de tendências
- [ ] Verificar se há recomendações baseadas na evolução

---

## 👤 9. Perfil do Usuário

### 9.1 Acesso ao Perfil
- [ ] Clicar na aba "Perfil" na navegação inferior
- [ ] Verificar se a página carrega corretamente

### 9.2 Informações do Perfil
- [ ] Verificar se todos os dados do perfil são exibidos
- [ ] Verificar se é possível editar os dados
- [ ] Verificar se há foto de perfil

### 9.3 Análise Corporal
- [ ] Clicar em "Analisar composição corporal"
- [ ] Tirar/selecionar foto
- [ ] Verificar se a IA analisa corretamente
- [ ] Verificar se o resultado é exibido

### 9.4 Logout
- [ ] Clicar em "Sair"
- [ ] Verificar se o usuário é desconectado
- [ ] Verificar se é redirecionado para `/login`
- [ ] Verificar se o cookie de sessão é removido

---

## 🔄 10. Navegação e Fluxo

### 10.1 Navegação Inferior
- [ ] Verificar se todas as abas estão presentes:
  - [ ] Treino
  - [ ] Alimentação
  - [ ] IA Trainer
  - [ ] Objetivos
  - [ ] Perfil
- [ ] Clicar em cada aba e verificar se navega corretamente

### 10.2 Proteção de Rotas
- [ ] Fazer logout
- [ ] Tentar acessar `/dashboard` diretamente
- [ ] Verificar se é redirecionado para `/login`
- [ ] Fazer login novamente
- [ ] Verificar se consegue acessar `/dashboard`

### 10.3 Redirecionamentos Automáticos
- [ ] Fazer login
- [ ] Verificar se é redirecionado para `/welcome` (sem perfil)
- [ ] Completar onboarding
- [ ] Verificar se é redirecionado para `/processing`
- [ ] Aguardar geração de treino
- [ ] Verificar se é redirecionado para `/dashboard`

---

## 🗄️ 11. Banco de Dados

### 11.1 Tabelas Criadas
- [ ] Verificar se a tabela `users` foi criada
- [ ] Verificar se a tabela `user_profiles` foi criada
- [ ] Verificar se a tabela `workouts` foi criada
- [ ] Verificar se a tabela `workout_versions` foi criada
- [ ] Verificar se a tabela `chat_messages` foi criada
- [ ] Verificar se a tabela `body_progress` foi criada
- [ ] Verificar se a tabela `meals` foi criada
- [ ] Verificar se a tabela `water_logs` foi criada
- [ ] Verificar se a tabela `goals` foi criada

### 11.2 Dados Persistentes
- [ ] Fazer login
- [ ] Completar onboarding
- [ ] Gerar treino
- [ ] Fechar o navegador
- [ ] Abrir novamente
- [ ] Fazer login
- [ ] Verificar se o treino ainda está lá

---

## 🚨 12. Tratamento de Erros

### 12.1 Erros de Rede
- [ ] Desconectar da internet
- [ ] Tentar enviar mensagem no chat
- [ ] Verificar se aparece mensagem de erro
- [ ] Reconectar à internet
- [ ] Tentar novamente
- [ ] Verificar se funciona

### 12.2 Erros de Validação
- [ ] Tentar enviar formulário com campos vazios
- [ ] Verificar se aparecem mensagens de erro
- [ ] Tentar enviar dados inválidos
- [ ] Verificar se aparecem mensagens de erro

### 12.3 Erros de IA
- [ ] Se a IA falhar ao gerar treino
- [ ] Verificar se aparece mensagem de erro
- [ ] Verificar se há opção de tentar novamente

---

## 📊 Resumo de Testes

| Categoria | Testes | Status |
|-----------|--------|--------|
| Autenticação | 3 | ⏳ Pendente |
| Onboarding | 6 | ⏳ Pendente |
| Geração de Treino | 4 | ⏳ Pendente |
| Dashboard | 5 | ⏳ Pendente |
| Chat com IA | 5 | ⏳ Pendente |
| Nutrição | 5 | ⏳ Pendente |
| Objetivos | 2 | ⏳ Pendente |
| Histórico | 3 | ⏳ Pendente |
| Perfil | 4 | ⏳ Pendente |
| Navegação | 3 | ⏳ Pendente |
| Banco de Dados | 2 | ⏳ Pendente |
| Tratamento de Erros | 3 | ⏳ Pendente |
| **Total** | **48** | **⏳ Pendente** |

---

## 🎯 Critérios de Sucesso

- [ ] Todos os 48 testes passam
- [ ] Nenhum erro de TypeScript
- [ ] Build completo sem erros
- [ ] Fluxo completo funciona sem interrupções
- [ ] Dados persistem corretamente
- [ ] Mensagens de erro são claras e úteis
- [ ] Performance é aceitável
- [ ] Interface é responsiva

---

## 📝 Notas

- Todos os testes devem ser executados em ordem
- Se um teste falhar, anotar o problema e continuar
- Ao final, revisar todos os problemas encontrados
- Criar issues no GitHub para cada problema
- Priorizar correção de problemas críticos

---

**Data**: 7 de Julho de 2026  
**Status**: Pronto para Testes
