# Auditoria Técnica - Biblioteca de Vídeos

## Estado Atual
- **Busca**: Delegada ao Gemini (`geminiService.searchExerciseVideo`).
- **Problema**: A IA alucina URLs inexistentes.
- **Cache**: Firestore (`exerciseVideos`) é consultado, mas armazena links quebrados.
- **Imports**: Corrigidos anteriormente (`getDoc`, `serverTimestamp`).

## Nova Arquitetura Proposta
- **Fonte**: YouTube Data API v3.
- **Cache**: Firestore (`exerciseVideos`) como fonte primária.
- **Estrutura de Dados**:
    - `videoId` (ID real do YouTube).
    - `channelTitle`.
    - `title`.
    - `likes/dislikes/ratingAverage`.
- **Sistema de Avaliação**: Atualização dinâmica de nota e suporte a substituição automática.

## Variáveis Necessárias
- `VITE_YOUTUBE_API_KEY`: Chave da API do YouTube.
