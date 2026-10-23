# Retorno — elegibilidade do apontamento e listagens 1.10.2

- **TASK_ID:** `hotfix-elegibilidade-apontamento-1102`
- **Data:** 22/10/2026 (horário de São Paulo)
- **Branch:** `hotfix/correcao-extra-esteira-1.10.2`
- **Base:** `493267931a3dacb3b5a8ddcbffc2fe913274c731`
- **Último commit funcional antes deste retorno:** `0359c579f51510595af620c175708f72762a51bc`
- **Estado:** **IMPLEMENTADO NO GIT, SEM VALIDAÇÃO EXECUTADA (BLOQUEADO PARA MERGE/DEPLOY)**.
- **Autorização:** implementação somente na branch da hotfix; sem alteração de `main`, `develop`, `homol`, VPS, banco, migrations ou deploy.

## Regra funcional desta entrega (não copiar regras antigas automaticamente)

1. Somente atividades com itens `PLANNED`, não excluídos, com colaborador explícito, em planos `PUBLISHED` vigentes **por semana** são elegíveis.
2. Planos publicados substituídos, itens `MOVED` ou `CANCELLED`, itens sem colaborador, rascunhos e atividades concluídas/dispensadas não autorizam novo apontamento.
3. Planejada para o próprio colaborador: lista principal Web/Kiosk e lançamento normal, mesmo sem alocação estrutural (cria suporte quando necessário).
4. Planejada somente para outros colaboradores: apenas na pesquisa excepcional; exige justificativa, mesmo se existir alocação estrutural antiga do apontador.
5. Não planejada para nenhum colaborador: não listar nem gravar, mesmo com justificativa ou alocação estrutural.
6. Vale para semanas passadas, atuais e futuras; apontamentos parciais podem ocorrer várias vezes por dia, sem conclusão automática.
7. O backend reconsulta a autorização antes de inserir lançamentos Web, Kiosk principal, Kiosk Outra Atividade e gerencial. O código de recusa é `TIME_ENTRY_NOT_PLANNED`.
8. Histórico existente é preservado; nenhum dado foi alterado.

## Telas

- **Apontar horas:** SQL único deduplicado e ordenado, com paginação keyset da 1.10.1 (50 por página na web, conforme chamada); pesquisa por OS/atividade, plano vigente aplicado antes da paginação.
- **Kiosk:** fila principal de planos publicados de todas as semanas, consolidando atividade repetida, somando o planejado e usando apontado do próprio colaborador; `Outra atividade` com exceção obrigatória para plano de terceiros.
- **Jornada por colaborador / Em aberto:** usa planejamento publicado no período, colaboradores selecionados, filtro por esteira e código exato da OS, antes de paginação por offset (20 por página).
- **Jornada / Histórico recente:** 20 por página, filtro por data, colaborador, esteira e OS.
- **Jornada / Extra Esteira:** 20 por página, filtro de data e colaborador, sem filtro de OS; preserva a exibição auditada de correções e exclusões, sem contar excluídos nos totais.
- **Frontend da Jornada:** botões Carregar mais independentes nas três seções; remove somente as seções visuais “Em risco” e “Pendência de tempo”, preservando sinais no backend.
- **Totais e exportação:** filtro de OS também aplicado ao total de horas de esteira e à exportação de apontamentos; resumo de Extra Esteira permanece independente de OS.

## Arquivos de maior impacto

- `server/src/modules/operational-planning/time-entry-planning.repository.ts` (novo).
- `server/src/modules/my-activities/my-activities.repository.ts`.
- `server/src/modules/conveyors/conveyorAssignments.service.ts`.
- `server/src/modules/production/production-{plan-assignee,time-entries,unassigned-time-entries,work-queue}.ts` (caminhos correspondentes).
- `server/src/modules/my-work-queue/{my-work-queue.repository,my-work-queue.service}.ts`.
- `server/src/modules/operational-journey/{operational-journey.repository,operational-journey.service,operational-journey.schemas,operational-journey.controller}.ts`.
- `src/features/gestor/JornadaColaboradorGestorPage.tsx`; `src/services/operational-journey/operationalJourneyApiService.ts`; tipos de Jornada.
- `server/src/tests/time-entry-planning-1102.test.ts` (novo, 8 cenários); `server/src/tests/production-plan-assignee.test.ts` (ajustado).

## Verificação objetiva realizada

- O GitHub confirmou o avanço normal da branch até o HEAD acima (19 commits acima da base; 22 arquivos alterados).
- Consulta às verificações do commit: **nenhum status de CI e nenhum workflow executado**.
- **Não foi possível executar** `npm ci`, `tsc`, `vitest`, builds, testes de integração nem browser/E2E neste acesso somente via conector GitHub. Não há checkout Git acessível no runtime.
- Revisão estática dos principais módulos feita via leitura da branch; isso **não substitui build e testes**.
- Nenhuma requisição em produção, nenhuma alteração de banco, sem migração, sem PR/merge/deploy.

## Gates obrigatórios antes de declarar candidata para homologação

1. Em checkout limpo da branch, `npm ci`, `npm --prefix server ci`, `npm --prefix server run build`, `npm run build`, `npm run verify:deploy`, typecheck/lint pertinentes e ambos os conjuntos de Vitest.
2. Executar `server/src/tests/time-entry-planning-1102.test.ts` e `server/src/tests/production-plan-assignee.test.ts`.
3. **Atualizar e executar testes legados que dependem das origens antigas de candidatos**, especialmente `listing-pagination.integration.test.ts`, `time-entry-candidates-http.integration.test.ts`, testes do Kiosk e da Jornada. Os cenários que pressupunham alocação sem plano não devem ser tratados como regressão sem atualizar seus fixtures para a regra aprovada.
4. Testar em banco PostgreSQL 18 isolado: sem plano, plano para próprio colaborador, plano só para outro, item sem colaborador, itens movidos/cancelados, republicação da semana, alocação estrutural antiga, dias de trabalho retroativos, 51+ candidatos, várias semanas, 21+ itens por seção, OS exata, horas excedentes, colaborador multi-seleção, históricos auditados.
5. Validar no navegador real o Web e o Kiosk, inclusive PIN e fluxo de justificativa; conferir perfil Gestor/Admin/Colaborador e exportação.
6. Revisar consistência concorrente no caso de **republicação exatamente durante a gravação**: há reconsulta dentro da transação, mas a publicação pode exigir sincronização transacional adicional para garantir ausência de corrida sob concorrência.
7. Medir performance e EXPLAIN das consultas que examinam planos de todas as semanas, com volume semelhante ao de produção.
8. Somente após todos os gates e aceite humano explícito, deliberar promoção; **não publicar automaticamente para Tati**.

**Conclusão:** código enviado exclusivamente à hotfix, em status de implementação para validação. Não afirmar homologação, testes verdes ou prontidão para produção.
