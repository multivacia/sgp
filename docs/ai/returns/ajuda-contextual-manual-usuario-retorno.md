# Retorno — ajuda-contextual-manual-usuario

- **TASK_ID:** `ajuda-contextual-manual-usuario`
- **Data/hora:** 2026-10-04 21:08 UTC
- **Objetivo:** adicionar "? Ajuda" na barra superior, ajuda contextual por tela e abertura do Manual do Usuário dentro e fora do SGP+.
- **Status final:** BLOQUEADO — nenhuma alteração de código feita; aguardando decisão humana.
- **Branch:** `ccr-cb361aed-hpqyg5` (a branch `feature/ajuda-contextual-manual-usuario` não foi criada)
- **SHA inicial:** `c611d10feacf329bdc217fe391ebf47a90a6ea7a` (igual a `origin/develop`)
- **SHA final:** igual ao inicial para código; este retorno é o único arquivo novo.

## Motivo do bloqueio

O prompt afirma que o manual, o gerador e os comandos `manual:usuario:*` já existem. Em `origin/develop` (e `main`) eles **não existem**:

| Item citado no prompt | Em `origin/develop` |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | ausente (existe apenas `MANUAL_FUNCIONAL_SGP.md`) |
| `docs/manual/manual-usuario.html` | ausente (existem `colaborador.html` e `gestor-esteira.html`) |
| `scripts/generate-manual-usuario-html.mjs` | ausente |
| `npm run manual:usuario:html` e `:check` | ausentes no `package.json` |

Esse material existe somente em branches `docs/manual-usuario-sgp-*` ainda **não mergeadas**:

- `origin/docs/manual-usuario-sgp-gerador-html-final` (`a10d4bf1`): 35 commits à frente de develop, 0 atrás.
- `origin/docs/manual-usuario-sgp-fix-gerador-html-eol` (`1924ae01`): 36 commits à frente de develop, 0 atrás. Contém tudo da anterior mais um ajuste de fim de linha.

A promoção autorizada leva a feature para `origin/develop`. Sem o manual na base, isso exigiria trazer junto 36 commits de conteúdo (cerca de 12 mil linhas de HTML gerado), o que não foi autorizado e foge de "diff limitado ao necessário".

## Divergências documentação × Git

- O checkpoint cita HEAD `4798efba`; o tip real de develop é `c611d10f` (versão 1.9.8).
- O prompt pede o retorno em `docs/ai/returns/ajuda-contextual-manual-usuario.md`; o CLAUDE.md exige `<TASK_ID>-retorno.md`. Foi usado o padrão do CLAUDE.md.

## Decisão necessária (uma das opções)

1. **Mergear antes** a branch `docs/manual-usuario-sgp-fix-gerador-html-eol` em `develop` (fluxo próprio de revisão) e depois reexecutar esta tarefa. Recomendado: mantém um único gerador e diff pequeno.
2. **Autorizar** que esta tarefa parta de `docs/manual-usuario-sgp-fix-gerador-html-eol` como base e promova tudo junto para `develop`.
3. **Outra base** indicada por você.

## Validações

Nenhum build, lint ou teste foi executado, pois não houve alteração. Estado verificado: `git fetch origin --prune` ok, árvore limpa, HEAD igual a `origin/develop`.

## Migrations, arquivos de código, commit

- Migrations: nenhuma.
- Arquivos criados: este retorno. Alterados/removidos: nenhum.
- Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
