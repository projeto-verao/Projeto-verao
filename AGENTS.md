# AGENTS.md

# Projeto Verão - Regras Obrigatórias para Agentes de IA

Este documento contém regras permanentes. Antes de modificar qualquer arquivo, leia este documento integralmente.

## 1. Não alterar configurações críticas

É proibido:

- Remover variáveis de ambiente.
- Renomear variáveis de ambiente.
- Criar chaves hardcoded.
- Alterar a forma como as APIs são configuradas.

As seguintes variáveis são obrigatórias:

- VITE_GEMINI_API_KEY
- Chave da API do YouTube
- Todas as variáveis do Firebase
- Todas as variáveis do Cloudinary

Caso alguma esteja ausente, informe o usuário. Nunca substitua ou invente valores.

---

## 2. Antes de modificar qualquer código

Sempre:

- analisar a arquitetura existente;
- reutilizar a lógica atual;
- evitar refatorações desnecessárias;
- preservar funcionalidades existentes.

Nunca reescrever módulos inteiros para implementar pequenas alterações.

---

## 3. Escopo das alterações

Modificar apenas os arquivos necessários para a tarefa solicitada.

É proibido alterar arquivos que não tenham relação direta com a solicitação.

---

## 4. Compatibilidade

Toda alteração deve preservar:

- login;
- cadastro;
- treinos;
- progresso semanal;
- histórico;
- IA;
- vídeos;
- lembretes;
- notificações.

---

## 5. Antes do commit

Obrigatório:

- verificar erros de compilação;
- executar testes;
- confirmar que nenhuma funcionalidade existente foi quebrada.

---

## 6. Commit

No final informar:

- arquivos modificados;
- motivo de cada alteração;
- possíveis impactos.

Nunca realizar mudanças ocultas.
