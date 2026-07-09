# Auditoria 4: Banco de Dados (Firestore)

## Visão Geral
O banco de dados do projeto é o Google Firestore, estruturado com uma coleção principal `users` e diversas subcoleções aninhadas (`workouts`, `completions`, `bodyProgress`, `meta`, `meals`, `waterLogs`, `chatMessages`). O acesso é feito pelo `firestoreService` no cliente.

## Análise da Estrutura e Operações

1. **Estrutura de Dados:** O uso de subcoleções (`collection(db, "users", userId, name)`) é excelente para o modelo de "single-tenant", garantindo que cada usuário tenha seus dados isolados e escáveis.
2. **Permissões (Regras):** As regras do Firestore foram recentemente corrigidas (Auditoria 1/2) para permitir a gravação de `workouts` com os campos corretos (`title`, `days`, etc.) e incluíram permissões para `completions` e `meta`.
3. **Salvamento e Leitura:** O `firestoreService` encapsula operações básicas (create, read, update, delete) e consultas com filtros (`where`, `orderBy`, `limit`). O tratamento de `Timestamp` do Firestore está correto.

## Débitos Técnicos e Melhorias Sugeridas

1. **Consultas com Filtros Locais (Ineficientes):**
   - **Status:** Métodos como `getWeekCompletions`, `getTodayMeals`, `getTodayWater` e `getLast7DaysMeals` baixam *todas* as subcoleções do Firestore e filtram o array no JavaScript (`Array.filter()`). Isso é ineficiente e pode gerar problemas de escala.
   - **Ação:** O Firestore deve filtrar as datas no servidor. No entanto, o Firestore não suporta facilmente comparações de `Timestamp` com datas relativas no cliente sem índices compostos ou cálculos complexos de range. Uma alternativa é criar um campo `dayOfMonth` ou `weekOfYear` no documento para permitir consultas exatas (`where("dayOfMonth", "==", day)`).

2. **Índices Compostos:**
   - **Status:** Consultas complexas podem exigir índices compostos no Firestore.
   - **Ação:** Monitorar o console do Firestore para verificar se algum índice faltante está sendo gerado automaticamente pelo Firebase.

3. **Leitura de Subcoleções:**
   - **Status:** O método `getChatHistory` usa `orderBy("createdAt", "desc")` e `limit(50)`. Isso é uma boa prática.
   - **Ação:** As demais consultas (workouts, bodyProgress) não usam `limit` na query do Firestore, baixando todo o histórico. Recomenda-se adicionar `limit` para otimizar o uso.

## Conclusão
A estrutura do banco de dados é sólida e apropriada para o projeto. A principal oportunidade de melhoria é a otimização das consultas de histórico (água, refeições) para evitar o download de dados desnecessários e a filtragem excessiva no lado do cliente.
