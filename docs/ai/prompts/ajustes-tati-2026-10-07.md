# SGP+ — Ajustes alinhados com a Tati (07/10/2026)

**Modelo recomendado:** GPT-6.1-Sol ou Claude Opus, com esforço **alto**.

## Objetivo

Investigar, corrigir e validar os nove pontos abaixo no repositório `multivacia/sgp`, sem regressão de funcionalidades existentes. A validação funcional com a Tati ocorrerá em 08/10/2026, entre 09:00 e 09:30 (horário de São Paulo).

1. Revisar Guia Prático e manuais.
2. Em **Apontar horas**, permitir filtrar na mesma pesquisa por **esteira** e **atividade**.
3. Em **Evolução das Esteiras**, verificar e, se tecnicamente seguro, disponibilizar exportação PDF em **retrato** e **paisagem**.
4. Em **Minha Fila**, permitir pesquisa por período.
5. Em **Planejamento**, permitir pesquisa por período.
6. Em **Minha Jornada**, permitir pesquisa por período.
7. Corrigir a não exibição de apontamentos **Extra Esteira**.
8. Corrigir a não exibição das **justificativas dos apontamentos**.
9. Corrigir a falta de atualização dos cards do **Dashboard**.

## Regras obrigatórias

- Leia integralmente `AGENTS.md`, `CLAUDE.md`, `docs/ai/context/PROJECT_CONTEXT.md` e `docs/ai/context/SESSION_CHECKPOINT.md`, se existirem, antes de alterar qualquer arquivo.
- Execute `git fetch origin --prune` e registre os SHAs de `origin/main`, `origin/develop` e `origin/homol`.
- **Não trabalhe no checkout atual**, pois ele pode estar sujo e em uma branch documental. Crie um worktree novo e uma única branch dedicada a partir do tip confirmado de `origin/develop`, por exemplo `fix/ajustes-tati-2026-10-07`.
- Não altere `main`, `develop`, `homol`, branches documentais, versões, infraestrutura, autenticação, RBAC, migrations ou dados de produção, exceto se a investigação demonstrar que uma migration é indispensável. Nesse caso, pare e peça autorização explícita com a justificativa.
- Não faça merge, rebase, force-push, deploy, exclusão de branch, nem publique a branch sem autorização explícita após a revisão do resultado.
- Preserve rotas, guards, permissões, filtros existentes, Kiosk, exportações já disponíveis e a agregação canônica do Dashboard. Não resolva divergência visual com números inventados no frontend.
- Não inclua arquivos gerados, `.env`, `node_modules`, `dist`, chaves ou dados reais de clientes no commit.

## Etapa 1 — Diagnóstico completo antes da alteração

Para cada um dos nove itens, localize tela, rota, controller/service/repository, contratos e testes relacionados. Registre:

- comportamento atual comprovado;
- causa-raiz ou limitação técnica;
- arquivos que precisarão mudar;
- impacto e risco de regressão;
- critério objetivo de aceite;
- se o item é correção, melhoria pequena, ou precisa de uma decisão de produto.

Faça uma execução local com dados simulados ou testes existentes, quando possível. Para os itens 7 a 9, rastreie o dado da origem até a renderização, incluindo filtros, cache/query invalidation, serialização e agregações; não conclua apenas pela inspeção do componente visual.

## Etapa 2 — Implementação delimitada

Após o diagnóstico, implemente somente as soluções compatíveis com as regras abaixo.

### 1. Guia Prático e manuais

Atualize somente as seções afetadas pelos comportamentos efetivamente entregues. O código é a fonte da verdade. Documente permissões, filtros, resultados vazios e limitações relevantes; não descreva comportamento que não exista.

### 2. Apontar horas: filtro Esteira + Atividade

- Os dois critérios devem poder ser informados juntos e funcionar como interseção (`AND`).
- Cada filtro isolado deve continuar funcionando como hoje.
- Limpar um filtro não pode apagar o outro nem alterar resultados sem nova consulta.
- Backend deve continuar sendo a autoridade dos dados; não filtre apenas a lista já carregada caso isso oculte paginação ou registros.

### 3. Evolução das Esteiras: PDF

- Primeiro confirme qual biblioteca/rota gera o PDF e se já há suporte nativo à orientação.
- Caso seja seguro, ofereça escolha explícita de **Retrato** ou **Paisagem**, com retrato como padrão para preservar o comportamento atual.
- Valide que os dois arquivos são gerados, abrem e não cortam título, colunas, legendas ou conteúdo de mais de uma página.
- Caso a solução exija reescrever motor de PDF, dependência nova de alto impacto ou gere regressão, não implemente por aproximação: registre alternativa, esforço e bloqueio para decisão.

### 4–6. Pesquisa por período

Aplicar em **Minha Fila**, **Planejamento** e **Minha Jornada**, reutilizando o padrão de filtro de período já canônico no sistema, se houver.

- Definir claramente a semântica de cada tela antes de codificar: qual data o período filtra (criação, planejamento, execução/apontamento ou vigência) e por quê.
- Intervalo inclusivo, data inicial e final opcionais, validação `início <= fim`, timezone `America/Sao_Paulo` e feedback visível ao usuário.
- O filtro deve ser refletido na consulta/endpoint e na exportação, se a tela tiver exportação vinculada.
- Não usar filtro apenas no frontend quando a tela for paginada ou possuir totais agregados.
- Preservar demais filtros e a compatibilidade de links/URLs existentes.

### 7. Extra Esteira não exibido

Confirme quais tipos/status de apontamento são considerados Extra Esteira e em quais telas deveriam aparecer. Corrija a origem, contrato, agregação e/ou renderização necessária, preservando apontamentos normais e Kiosk. Inclua ao menos um caso de teste que cubra a exibição e os totais, quando aplicável.

### 8. Justificativas não exibidas

Rastreie o campo desde a persistência até a API e a tela. Verifique inclusive diferenças entre justificativa de catálogo, texto livre e permissão de visualização. Não exponha justificativa a um perfil que hoje não tenha permissão para consultar o apontamento. Cubra com teste ou cenário reprodutível.

### 9. Cards do Dashboard não atualizam

- Reproduza o problema alterando um dado que deva afetar os cards.
- Preserve a arquitetura: a projeção operacional e a fila/backlog têm eixos distintos; filtros se aplicam somente ao agregado central, conforme a implementação canônica.
- Corrija invalidação de cache, refetch, estado derivado ou consulta de origem que for comprovadamente responsável.
- Não adicione atualização contínua/polling sem necessidade e não duplique regra de negócio no frontend.

## Validação obrigatória

1. Execute os testes específicos descobertos no repositório para cada domínio alterado.
2. Execute typecheck/lint quando houver scripts aplicáveis; se houver falhas preexistentes, diferencie-as com evidência.
3. Execute `npm run build` (e o build do servidor, se separado e aplicável).
4. Faça validação manual local das nove jornadas, usando dados fictícios/mocks quando necessário.
5. Confirme explicitamente que os filtros combinados, períodos, exportações, Extra Esteira, justificativas e Dashboard não afetaram permissões, paginação, totais ou telas não relacionadas.

## Entregáveis antes de qualquer publicação

- Um retorno em `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md` com: branch, SHA base/final, status do worktree, diagnóstico item a item, arquivos alterados, decisões de semântica, testes/comandos/resultados reais, limitações, riscos e roteiro objetivo de validação com a Tati.
- Atualização de `docs/ai/context/SESSION_CHECKPOINT.md` somente se as regras do repositório exigirem.
- Commit local coeso, limitado ao escopo, sem publicar.

Pare e reporte antes de continuar caso encontre dados sensíveis, alteração estrutural/migration necessária, ambiguidade de regra de negócio, ou impossibilidade de reproduzir algum dos defeitos.
