# Configuração da YouTube Data API v3

## Objetivo
A YouTube Data API v3 é responsável por pesquisar vídeos de exercícios em português no YouTube. A aplicação consulta primeiro o Firestore (cache), e apenas se o vídeo não existir, realiza uma busca na API.

## Arquivos Modificados
- `client/src/lib/youtubeService.ts` - Novo serviço de integração com YouTube API
- `client/src/components/VideoModal.tsx` - Atualizado para usar YouTube API em vez de Gemini
- `client/src/hooks/useFirebaseFirestore.ts` - Adicionado campo `videoId` e função `updateVideoUrl`
- `.env.example` - Adicionada variável `VITE_YOUTUBE_API_KEY`

## Como Configurar

### 1. Obter a Chave da API do YouTube

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **YouTube Data API v3**:
   - Vá para "APIs e Serviços" → "Biblioteca"
   - Pesquise por "YouTube Data API v3"
   - Clique em "Ativar"
4. Crie uma chave de API:
   - Vá para "Credenciais"
   - Clique em "Criar Credenciais" → "Chave de API"
   - Copie a chave gerada

### 2. Configurar a Variável de Ambiente

#### Desenvolvimento Local
Crie um arquivo `.env.local` na raiz do projeto:
```
VITE_YOUTUBE_API_KEY=sua_chave_aqui
```

#### Build/Deploy
Adicione a variável ao arquivo `.env.production`:
```
VITE_YOUTUBE_API_KEY=sua_chave_aqui
```

#### Firebase Hosting
Configure a variável de ambiente no Firebase:
```bash
firebase functions:config:set youtube.api_key="sua_chave_aqui"
```

### 3. Permissões Necessárias da API

A YouTube Data API v3 requer as seguintes permissões (escopos):
- `youtube.readonly` - Apenas leitura de dados públicos do YouTube (recomendado para segurança)

**Nota**: A chave de API gerada é suficiente para leitura pública. Não é necessário configurar OAuth2 para este caso de uso.

## Fluxo de Funcionamento

1. **Usuário clica em "Como Fazer"** → Abre o `VideoModal`
2. **Consulta Firestore** → Verifica se o vídeo já está em cache
3. **Se encontrado** → Exibe o vídeo em cache (sem chamar a API)
4. **Se não encontrado** → Chama `youtubeService.searchExerciseVideo()`
5. **YouTube API retorna** → Primeiro resultado em português
6. **Salva no Firestore** → Para reutilização futura
7. **Exibe o vídeo** → No iframe do modal

## Estrutura de Dados Armazenada no Firestore

```typescript
{
  id: "supino-reto-com-barra",           // slug do exercício
  exerciseName: "Supino Reto com Barra",
  videoId: "dQw4w9WgXcQ",                // ID do YouTube
  videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  videoTitle: "Supino Reto - Técnica Correta",
  channelTitle: "Renato Cariani",
  language: "pt-BR",
  likes: 5,
  dislikes: 1,
  totalRatings: 6,
  ratingAverage: 4.2,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Sistema de Avaliação Inteligente

Quando um vídeo acumula muitas avaliações negativas (>20% de dislikes com mínimo 5 avaliações), o sistema automaticamente:
1. Pesquisa vídeos alternativos via `youtubeService.searchAlternativeVideos()`
2. Substitui o vídeo atual pelo melhor resultado
3. Reseta os contadores de likes/dislikes
4. Mantém o vídeo anterior como backup em `backupVideoUrl`

## Limites da API

- **Quota Diária**: 10.000 unidades por dia (padrão)
- **Custo por Requisição**: ~100 unidades
- **Limite de Requisições**: ~100 buscas por dia com quota padrão

Para aumentar a quota, configure um projeto de produção no Google Cloud Console.

## Troubleshooting

### Erro: "YouTube API Key não configurada"
- Verifique se a variável `VITE_YOUTUBE_API_KEY` está definida
- Certifique-se de que a chave não está vazia

### Erro: "YouTube API Error: quotaExceeded"
- A quota diária foi atingida
- Aguarde até o próximo dia ou aumente a quota no Google Cloud Console

### Erro: "Nenhum vídeo encontrado"
- A pesquisa não retornou resultados para o exercício
- Tente com um termo de busca diferente ou verifique a conectividade

## Segurança

- A chave da API é pública (necessário para chamadas do frontend)
- Restrinja a chave no Google Cloud Console para apenas YouTube Data API v3
- Considere usar um backend proxy em produção para maior controle
