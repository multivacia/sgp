# Prompt — linguagem-controlada-sgp

TASK_ID: `linguagem-controlada-sgp`

## Contexto

Na atividade anterior (`pesquisar-asd-ste100`), pesquisamos o ASD-STE100 (Simplified Technical English) e avaliamos como aplicar os princípios de **língua controlada** aos textos do SGP+ em PT-BR. Resultado completo e fontes:
`docs/ai/returns/pesquisar-asd-ste100-retorno.md` (leia as seções "Complemento", "Complemento 2" e "Correção do Complemento 2"; a correção vale sobre o Complemento 2).

Resumo do que já foi estabelecido:
- O STE vale só para inglês. O conceito se aplica ao PT-BR com base na **ABNT NBR ISO 24495-1:2024 (Linguagem Simples)**, mais um glossário controlado do domínio e regras de microcopy (frases curtas, imperativo, uma ação por frase, condição antes da ação, instrução separada de explicação).
- A PR #35 (`dfdaba7`) já removeu STEP, pt-PT e nomes técnicos da maior parte das telas.
- Resíduos levantados em `develop` (`b3416c1`):
  - `src/features/operational-planning/FactoryIntakeItemCard.tsx:51` ainda mostra `STEP: {stepStatus}`;
  - ~26 linhas visíveis com "etapa(s)": rótulos `(etapas)` em `src/components/dashboard/charts/OperationalDashboardCharts.tsx` e `ExecutiveDashboardCharts.tsx`, `src/features/kiosk/KioskActivityCard.tsx:448`, `src/features/colaborador/MinhasAtividadesPage.tsx:174`;
  - quase todo "passo(s)" restante é legítimo (assistente "Três passos", "Primeiros passos").
- Pontos já centralizados: `src/lib/sgp-semantica-labels.ts`, `src/lib/transversalUxCopy.ts`, `src/lib/errors/errorCatalog.ts`. Não há i18n; não introduzir i18n.
- Riscos: 118 arquivos de teste fazem asserção por texto; o kiosk tem fluxo isolado; os tickets térmicos (`operational-tickets`) têm largura limitada.

Fases propostas (complexidade):
0. Guia curto + glossário PT-BR (termos aprovados/proibidos) — baixa, só docs.
1. Aplicar o guia a todo texto novo (checagem na spec/revisão dos agentes) — baixa.
2. Script/lint de glossário no CI (termos proibidos em texto visível) — baixa–média.
3. Revisar os textos existentes por área, em PRs pequenos — média.

## Tarefa

1. Siga a inicialização obrigatória do `CLAUDE.md` (AGENTS.md, PROJECT_CONTEXT, SESSION_CHECKPOINT, branch/HEAD/status). Parta da `develop` atual e confira o estado real; não confie nas contagens acima sem validar.
2. **Antes de alterar qualquer arquivo**, apresente-me as decisões de negócio necessárias, com recomendação para cada uma:
   - "Etapa" é sinônimo de "Atividade" (então trocar) ou é um conceito diferente (então definir)?
   - Lista inicial de termos aprovados/proibidos do glossário.
   - Onde fica o guia: arquivo novo ou seção em documento existente? Justifique pelo critério anti-zoológico do `AGENTS.md`.
   - Quais fases entram nesta atividade.
3. Depois da minha decisão, siga o fluxo do `AGENTS.md` para demanda média: contexto → impacto → spec → `sgp-implementer` → `sgp-test-reviewer`. Alteração de código só pelo `sgp-implementer`.
4. Validação real: typecheck do frontend e do backend, `vitest` focado nos arquivos alterados e regressão pertinente. Registre falhas pré-existentes separadas das novas.
5. Entrega: branch própria a partir de `develop`, commit, push e PR para `develop`. Sem merge sem minha aprovação.
6. Gere `docs/ai/returns/linguagem-controlada-sgp-retorno.md` conforme o `CLAUDE.md`.
