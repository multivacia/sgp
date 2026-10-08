# SESSION_CHECKPOINT — Continuidade entre sessões

> Arquivo de estado transitório.
> Deve ser sobrescrito/atualizado quando houver handoff entre chats ou contexto alto.
> Não usar como fonte da verdade sem validar Git e código.
> Manter compacto; alvo recomendado: até ~120 linhas.

## Identificação

- TASK_ID: `ajustes-tati-2026-10-07`
- Atualizado em: `2026-10-07 23:59 UTC`
- Branch: `ccr-8b9d5816-zloyfa` (base = tip `origin/develop` `ecb26da7`)
- HEAD: ver `git log -1` (commit local do item 1)
- Working tree: limpo após commit; **não publicado** (sem push/PR)

## Objetivo atual

Prompt `docs/ai/prompts/ajustes-tati-2026-10-07.md` (10 itens). Rodada 1: **apenas o item 1** (Guias Práticos de Colaborador e Gestor).

## Estado em uma frase

Item 1 concluído localmente: guias reescritos com 40 capturas fictícias e os capítulos de divergências `GUIA-COL-001…010` e `GUIA-GES-001…010`. Itens 2 a 10 pendentes.

## Concluído

- `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html` reescritos.
- `docs/manual/img/guia-colaborador/` (21) e `docs/manual/img/guia-gestor/` (19).
- Retorno: `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md`.

## Decisões já tomadas

- Guias canônicos = os dois HTML escritos à mão (não o manual integral).
- Uso da branch designada pela sessão em vez de `fix/ajustes-tati-2026-10-07` (restrição do ambiente).

## Pendências

- Autorização humana para push/PR do item 1.
- Itens 2 a 10 do prompt.
- Decidir `GUIA-GES-001` (permissão `time_entries.create_on_behalf` ausente nas migrations).

## Próxima ação exata

- Após a autorização: push da branch e PR para `develop`; depois, o item 2 (pesquisa `esteira & atividade` em Apontar horas).

## Riscos / ressalvas

- Os itens 7, 8 e 9 aparecem nos guias só como ressalvas (`GUIA-COL-005/006`, `GUIA-GES-004/005`); atualizar os guias depois das correções.
- `npx eslint .` tem 94 erros preexistentes, fora do escopo.

## Não repetir

- Não reauditar o manual integral (fora do escopo).
- Não usar dados reais nas capturas.

## Referências úteis

- Retorno: `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md`
- Prompt: `docs/ai/prompts/ajustes-tati-2026-10-07.md`

## Uso de contexto / sessão

- Percentual confiável disponível: `INDISPONÍVEL`
- Observação: não estimar percentuais quando a ferramenta não expuser a métrica.
