# SESSION_CHECKPOINT — Continuidade entre sessões

> Arquivo de estado transitório.
> Deve ser sobrescrito/atualizado quando houver handoff entre chats ou contexto alto.
> Não usar como fonte da verdade sem validar Git e código.
> Manter compacto; alvo recomendado: até ~120 linhas.

## Identificação

- TASK_ID: `ajustes-tati-2026-10-07` (integração: `ajustes-tati-2026-10-07-integracao`)
- Atualizado em: `2026-10-08 01:20 UTC`
- Branch: `integration/ajustes-tati-2026-10-07`
- Base: `origin/develop` @ `ecb26da78c4a4dbfefcfab7f5de494a31445555d`
- HEAD: ver `git log -1`
- Working tree: `clean` após commit

## Objetivo atual

Integrar, para validação com a Tati, as duas frentes desenvolvidas em paralelo a partir da mesma base:

| Frente | Branch de origem | SHA |
|---|---|---|
| A — itens 2–10 (funcionais) | `origin/fix/ajustes-tati-2026-10-07` | `2c7e458e` → `f6f1d6a15de694f36cc49a957e19bfbf8032a6ab` |
| B — item 1 (Guias Práticos, 40 capturas) | `origin/docs/ajustes-tati-2026-10-07-guias-praticos` | `f8eab69eafafd7cb801fc4b0d83c663e8081f185` |

## Estado em uma frase

Três commits aplicados por cherry-pick (ordem: `2c7e458e`, `f6f1d6a1`, `f8eab69e`); conflitos só em docs de contexto, resolvidos por conteúdo. Build/typecheck/testes validados contra a baseline `develop` (sem falha nova) e inspeção funcional local feita; branch publicada por push normal. Sem PR, sem merge em `develop`, sem deploy.

## Concluído

- Frente A: pesquisa `esteira & atividade`; PDF retrato/paisagem; períodos em Minha fila, Planejamento (entre semanas) e Minha jornada; Extra Esteira e justificativas visíveis; Dashboard atualiza após apontamento (evento in-app, sem polling); export para IA (Prompt/Backlog/Planejado/Carga dos colaboradores/Carga por dia).
- Frente B: `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html` reescritos; 21 + 19 capturas fictícias; capítulos `GUIA-COL-001…010` e `GUIA-GES-001…010`.
- Integração: retorno consolidado em `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md` (duas frentes) e `docs/ai/returns/ajustes-tati-2026-10-07-integracao-retorno.md`.

## Decisões já tomadas

- Semânticas de período: fila = data planejada (plano publicado, máx. 92 dias); planejamento = data planejada em todas as semanas do período (máx. 92 dias); jornada = data do apontamento.
- Guias canônicos = os dois HTML escritos à mão (não o manual integral).
- Sem migration; sem mudança de RBAC/Kiosk/versão/dependências.
- Integração por cherry-pick preservando autoria; nenhuma branch de origem alterada.

## Pendências

- Validação com a Tati (inclui PDF no navegador da fábrica — não validado aqui).
- Guias escritos antes das correções da frente A: atualizar texto/capturas de `GUIA-COL-005/006` e `GUIA-GES-004/005` (itens 7, 8, 9) após o aceite.
- Decidir `GUIA-GES-001` (`time_entries.create_on_behalf` ausente nas migrations).
- Card "Alocações em STEPs": possível inconsistência semântica preexistente (decisão de produto).
- Após aceite: decisão humana sobre PR da branch de integração para `develop`.

## Próxima ação exata

- Validar com a Tati seguindo o roteiro de `docs/ai/returns/ajustes-tati-2026-10-07-integracao-retorno.md`.

## Riscos / ressalvas

- Falhas preexistentes idênticas em `develop`: ESLint 146 problemas; vitest frontend 5 (`ApontamentoPage`/`ApontamentoGestorPage`); servidor 4 (`env`, `my-activities-time-entry-candidates`, `my-work-queue.service`, `operational-planning.weekly-view.http`).
- A suíte de integração do servidor altera dados do banco: nunca rodar contra banco compartilhado.

## Não repetir

- Não reauditar o manual integral (fora do escopo).
- Não usar dados reais nas capturas.
- Não fazer force-push nem alterar `main`/`develop`/`homol`.

## Referências úteis

- Retorno consolidado: `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md`
- Retorno da integração: `docs/ai/returns/ajustes-tati-2026-10-07-integracao-retorno.md`
- Prompt: `docs/ai/prompts/ajustes-tati-2026-10-07.md`

## Uso de contexto / sessão

- Percentual confiável disponível: `INDISPONÍVEL`
- Observação: não estimar percentuais quando a ferramenta não expuser a métrica.
