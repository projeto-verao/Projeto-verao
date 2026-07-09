# Auditoria 3: IA (Gemini)

## Visão Geral
A integração com a IA (Google Gemini) é feita diretamente do frontend. O arquivo `gemini.ts` encapsula todas as chamadas à API: geração de treinos, análise corporal, chat e análise nutricional.

## Análise das Funcionalidades

1. **Geração de Treino:** O método `generateWorkout` constrói um prompt com os dados do perfil do usuário e exige uma resposta em JSON estruturado (`GeneratedWorkout`). O tratamento de erros tenta extrair o JSON mesmo se a IA envolver em blocos de código markdown.
2. **Análise Corporal:** O método `analyzeBody` aceita uma foto em base64, prepara o payload correto para o Gemini Vision e exige um JSON com estimativas de gordura e massa muscular.
3. **Chat IA:** O método `chat` aceita o histórico de mensagens, adiciona o contexto do perfil e do treino atual, e encaminha para a API.
4. **Tratamento de Erros:** A função `callGemini` verifica o status HTTP da resposta. Erros 429 (limite de uso) e outros erros de API são capturados e transformados em mensagens de erro amigáveis para o usuário.

## Débitos Técnicos e Melhorias Sugeridas

1. **Segurança da API Key:**
   - **Status:** A chave da API (`VITE_GEMINI_API_KEY`) está exposta no frontend. Como o Firebase Hosting serve apenas arquivos estáticos, isso é atualmente necessário.
   - **Ação:** A chave do Gemini deve ter restrições de API (HTTP Referrers e APIs específicas) ativadas no Google Cloud Console para impedir uso malicioso caso a chave seja exposta.

2. **Prompt Engineering e Tratamento de Erros:**
   - **Status:** O tratamento de erros no `extractJson` é razoável, mas a IA ocasionalmente pode gerar JSONs malformados se o prompt não for muito estrito.
   - **Ação:** Adicionar uma instrução explícita no prompt para não gerar nenhuma formatação extra além do JSON puro. O tratamento atual já funciona bem o suficiente.

3. **Truncamento de Contexto no Chat:**
   - **Status:** O método `chat` pega apenas as últimas 20 mensagens (`history.slice(-20)`).
   - **Ação:** Essa abordagem é boa para economizar tokens. Pode ser mantida.

## Conclusão
A integração com a IA está bem implementada e robusta. O uso de `application/json` como `responseMimeType` na API do Gemini melhora significativamente a taxa de sucesso na extração do JSON. O projeto está pronto para o uso das funcionalidades de IA.
