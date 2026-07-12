# Diagnóstico: Falha no Upload de Fotos no Projeto Verão

## 1. O Diagnóstico Completo

A falha no upload de fotos no Projeto Verão foi causada pela **migração da infraestrutura de armazenamento e pela alteração das políticas de cobrança do Firebase**. 

Originalmente, o projeto não utilizava o Firebase Storage; as imagens eram convertidas para `base64` no frontend, enviadas via tRPC para o backend e armazenadas em um bucket S3 gerido pelo `Manus Forge`. Durante a refatoração do projeto (iniciada em 8 de julho de 2026), o backend foi removido e o sistema foi migrado para uma arquitetura serverless (apenas frontend) usando Firebase.

O problema ocorreu porque o projeto foi configurado para usar o **Firebase Storage no plano gratuito (Spark)**. No entanto, o Firebase alterou suas regras e, desde o final de 2024, **novos buckets do Firebase Storage exigem o plano pago (Blaze)**.

### A Mudança que Causou a Perda do Funcionamento

1. **Migração para Firebase Storage:** O commit `3d8c706` introduziu o hook `useFirebaseStorage.ts` e o commit `f92454e` removeu completamente a infraestrutura antiga do Manus Forge/S3.
2. **Novo Formato de Bucket:** O projeto foi configurado com o bucket `projeto-verao-3a6a1.firebasestorage.app` no arquivo `client/src/lib/firebase.ts`.
3. **Bloqueio pelo Plano Spark:** O domínio `.firebasestorage.app` é o novo formato de buckets do Firebase. De acordo com a documentação oficial do Firebase (atualizada em setembro de 2024), projetos no plano gratuito (Spark) **não têm mais acesso a buckets de armazenamento** (seja leitura ou escrita), e qualquer tentativa de upload retorna erros `402 Payment Required` ou `403 Forbidden` (Unauthorized).

Portanto, o código do frontend (`Onboarding.tsx`, `IATrainer.tsx`, `ImageService.ts`) está correto e implementa o upload via Firebase SDK perfeitamente, mas a operação é bloqueada pelos servidores do Google porque o projeto `projeto-verao-3a6a1` está no plano gratuito (Spark).

## 2. Como Funcionava Anteriormente

Antes da migração, o upload funcionava da seguinte maneira:

1. **Frontend:** O usuário selecionava a foto no `Onboarding.tsx`. A imagem era redimensionada e convertida para uma string `base64`.
2. **Comunicação:** A string `base64` era enviada para o backend via tRPC (`trpc.profile.uploadPhoto.useMutation()`).
3. **Backend:** O arquivo `server/routers.ts` recebia o `base64`, convertia para um `Buffer` e chamava a função `storagePut` do arquivo `server/storage.ts`.
4. **Armazenamento:** O `storage.ts` original solicitava uma URL pre-assinada (presigned URL) para a API do Manus Forge (`ENV.forgeApiUrl`) e fazia um `PUT` direto para um bucket AWS S3. A URL da imagem retornada era algo como `/manus-storage/profiles/...`.

## 3. Arquivos Envolvidos

* **`client/src/lib/firebase.ts`**: Onde o `storageBucket` está configurado como `projeto-verao-3a6a1.firebasestorage.app`.
* **`client/src/lib/ImageService.ts`**: Contém a lógica atual de upload direto para o Firebase Storage usando `uploadBytesResumable` e `getDownloadURL`.
* **`client/src/pages/Onboarding.tsx`**: Tela onde o usuário envia as fotos de perfil e avaliação. O commit `4415bf0` tentou corrigir o travamento do upload adicionando um timeout, mas o problema raiz era o bloqueio do Firebase.
* **`server/storage.ts` (Removido/Modificado)**: Arquivo original que fazia a ponte com o S3 via Manus Forge.
* **`server/routers.ts` (Modificado)**: Onde o endpoint tRPC `uploadPhoto` foi alterado.

## 4. Commits Relevantes

* **`2e42ea6` (6 de Julho):** Infraestrutura original. Mostra o uso de `base64`, tRPC e S3/Forge.
* **`3d8c706` (8 de Julho):** "feat: implementar Firebase Storage para upload de fotos". Introduziu o `useFirebaseStorage.ts`.
* **`f92454e` (8 de Julho):** "refactor(server): migrar backend para Firebase, remover dependências Manus/Base44". Removeu o código do S3.
* **`d84edf2` (9 de Julho):** "feat: migra frontend completo para Gemini direto + Firestore (sem backend)". Consolidou a arquitetura serverless.
* **`4415bf0` (11 de Julho):** "fix: corrigir travamento do onboarding ao adicionar fotos". Tentativa de corrigir o travamento causado pelo Firebase Storage que não respondia devido ao bloqueio de plano.

## 5. Soluções Propostas e Passo a Passo

Existem duas formas de resolver este problema.

### Solução A: Migrar corretamente para Firebase Storage no plano Blaze (Recomendada)

Esta é a solução ideal, pois mantém a arquitetura atual (serverless) e é a mais eficiente.

**Passo a Passo:**
1. Acesse o [Console do Firebase](https://console.firebase.google.com/).
2. Selecione o projeto `projeto-verao-3a6a1`.
3. No menu lateral inferior esquerdo, clique em **"Fazer upgrade"** (Upgrade).
4. Selecione o plano **Blaze (Pagamento por uso)**.
5. Vincule um cartão de crédito ou conta de faturamento do Google Cloud.
   * *Nota:* O plano Blaze possui uma cota gratuita generosa (5GB de armazenamento, 1GB de download/dia). Se o uso for pequeno, você não pagará nada.
6. Após o upgrade, o upload de fotos no aplicativo voltará a funcionar instantaneamente, sem necessidade de alterar nenhuma linha de código.

### Solução B: Restaurar o funcionamento anterior (Armazenamento em Base64 no Firestore)

Se você não puder ou não quiser inserir um cartão de crédito no Firebase, a alternativa é armazenar as imagens diretamente no banco de dados (Firestore) como strings `base64`. O Firestore tem um limite de 1MB por documento, então as imagens precisarão ser fortemente comprimidas.

**Passo a Passo (Alterações de Código):**

1. **Em `client/src/lib/ImageService.ts`**, altere a compressão para garantir que fique abaixo de 1MB:
   ```typescript
   // Mude a qualidade de 0.75 para 0.5 e o maxSize para 500
   export function resizeImage(file: File | Blob, maxSize = 500, quality = 0.5): Promise<string> {
     // ...
   }
   ```

2. **Em `client/src/pages/Onboarding.tsx`**, remova a tentativa de upload para o Storage e salve o `base64` diretamente no perfil:
   ```typescript
   // Remova a chamada para uploadWithTimeout
   // Salve o dataUrl diretamente no Firestore
   await updateProfile({
     // ... outros campos ...
     photoUrl: profilePhoto || undefined, // profilePhoto já é o base64
     evalPhotoUrl: evalPhoto || undefined, // evalPhoto já é o base64
     onboardingCompleted: true,
   });
   ```

3. **Em `client/src/pages/IATrainer.tsx`**, faça o mesmo para as fotos de evolução:
   ```typescript
   // Remova: const photoUrl = await imageService.uploadImage(...)
   // Salve diretamente:
   await firestoreService.addBodyProgress(user.uid, {
     weightKg: parseFloat(weight),
     photoUrl: compressedBase64, // Salva o base64 direto
     notes: notes || undefined
   });
   ```

4. **Em `client/src/hooks/useFirebaseFirestore.ts`**, remova a rotina de "Migração" (`[Migration] Migrating base64 photo for entry...`) que tenta forçar o upload de fotos base64 para o Storage.

**Aviso sobre a Solução B:** Esta abordagem fará com que o banco de dados fique muito pesado rapidamente e o carregamento do perfil e histórico ficará lento, pois as strings de imagem trafegarão junto com os dados de texto. A Solução A é amplamente superior.
