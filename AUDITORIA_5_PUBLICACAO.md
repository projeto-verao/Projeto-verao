# Auditoria 5: Publicação

## Visão Geral
A publicação do Projeto Verão é feita via Firebase Hosting, utilizando o `firebase.json` como configuração. O build é gerado pelo Vite no diretório `dist/public` e o reescrita de rotas (`rewrites`) garante que o SPA (Single Page Application) funcione corretamente.

## Análise da Configuração

1. **Link Estável:** O site está configurado no site ID `projeto-verao-3a6a1` do Firebase Hosting. O URL estável será `https://projeto-verao-3a6a1.web.app` (ou `.firebaseapp.com`).
2. **Configuração de Build:** O `vite.config.ts` está configurado corretamente com `root: "client"` e `outDir: "../dist/public"`, alinhando com o `public: "dist/public"` do `firebase.json`.
3. **Rewrites (SPA):** O rewrite `"**" -> "/index.html"` está presente, garantindo que qualquer rota do React Router (como `/dashboard`, `/onboarding`) seja servida corretamente.
4. **Firestore Rules:** O `firebase.json` também inclui a seção de `firestore.rules`, garantindo que as regras de segurança sejam publicadas junto com o build.

## Débitos Técnicos e Melhorias Sugeridas

1. **Variáveis de Ambiente no Build:**
   - **Status:** O `.env.example` ainda contém variáveis legadas (OAuth Manus, AWS S3) que não são mais usadas. A única variável essencial para o build atual é `VITE_GEMINI_API_KEY`.
   - **Ação:** Para publicar, é necessário criar um arquivo `.env.production` contendo apenas `VITE_GEMINI_API_KEY=seu_chave_gemini`. O build do Vite injetará essa variável no código frontend.

2. **Deploy Completo:**
   - **Status:** Atualmente o repositório não possui um arquivo `.env.production`.
   - **Ação:** Para publicar, execute os seguintes comandos:
     ```bash
     # 1. Crie o .env.production
     echo "VITE_GEMINI_API_KEY=SUA_CHAVE_GEMINI" > .env.production
     
     # 2. Faça o build
     npm run build
     
     # 3. Faça o deploy no Firebase
     npx firebase deploy --project projeto-verao-3a6a1
     ```
   - **Nota:** O deploy do Firebase Hosting publicará o site em `https://projeto-verao-3a6a1.web.app`.

## Conclusão
A configuração de publicação está pronta. O único passo necessário é configurar a variável de ambiente `VITE_GEMINI_API_KEY` e executar o build/deploy. O Firebase Hosting serve perfeitamente como uma CDN para este SPA.
