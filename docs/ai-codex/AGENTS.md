# AGENTS.md — SGP+ Web / ARGOS

Este arquivo é a orientação principal para o Codex neste repositório.

## Regra soberana

Somente o subagente `sgp_implementer` pode alterar código-fonte.

Os demais papéis são de leitura, análise, especificação ou revisão:

- `sgp_context_reader`: lê contexto e mapeia o fluxo real.
- `sgp_impact_analyst`: avalia impacto, risco e regressão.
- `sgp_feature_spec_writer`: transforma demanda em spec testável.
- `sgp_test_reviewer`: valida diff, testes e critérios de aceite, sem editar fonte.

Quando a demanda for média/grande, siga o fluxo:

1. Contexto.
2. Impacto.
3. Spec.
4. Implementação.
5. Revisão de testes.

Não pule contexto/impacto em mudanças que envolvam planejamento, esteiras, apontamento, fila operacional, kiosk, permissões, banco, impressão térmica ou status de ciclo de vida.

## Regras do produto

- Backend é fonte da verdade para regra de negócio.
- O sistema deve seguir a sequência estrutural da esteira, não a ordem visual/manual do planejamento.
- Plano semanal publicado (`PUBLISHED`) é o que alimenta a operação; plano em rascunho não deve aparecer para apontamento.
- Tempo total previsto não deve ser editável; deve ser calculado com base na estrutura da esteira.
- Colaboradores da Bravo são excelentes no que fazem, mas não gostam de digitar. Priorize listas, botões, atalhos e justificativas padronizadas.
- Kiosk/produção deve permanecer isolado e simples.
- Impressão térmica de tickets pode ser direta via SGP Print Agent; demais documentos devem manter preview.

## Status oficiais da esteira

`EM_ELABORACAO` -> `AGUARDANDO_PLANEJAMENTO` -> `EM_PLANEJAMENTO` -> `A_INICIAR` -> `EM_ANDAMENTO` -> `FINALIZADA` -> `CANCELADA`

Retrocessos operacionais devem preservar apontamentos e exigir motivo quando aplicável.

## Validações padrão

Ajuste conforme o escopo, mas considere:

- raiz: `npm run build`
- raiz: `npm test`
- backend: `cd server && npm run build`
- operacional/planejamento: `cd server && npm run test -- operational-planning`
- fila operacional: `cd server && npm test -- src/tests/my-work-queue.service.test.ts`
- sequência operacional: `cd server && npm run test -- --run src/tests/conveyorActivitySequence.logic.test.ts`

Sempre reporte comando, saída relevante e exit code. Não diga que passou sem evidência.

## Entrega

Toda implementação deve terminar com:

- resumo do que mudou;
- arquivos alterados;
- testes criados/alterados;
- comandos executados com exit code;
- critérios de aceite atendidos;
- riscos residuais.

Não fazer merge nem deploy sem aprovação humana.
