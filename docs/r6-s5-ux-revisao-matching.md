# R6 · Sprint S5 — UX de revisão do matching e escolha de candidato

## Objetivo

Melhorar a revisão humana antes da criação oficial da esteira: o utilizador vê o candidato principal da matriz, até três `alternativeCandidates`, e regista decisões explícitas para itens `REVIEW_SIMILAR` e `CREATE_NEW`. Não há criação automática de esteira nem de atividade; o parser Bravo e o núcleo de matching no servidor não foram alterados nesta sprint.

## Decisões possíveis (`ReviewItemCurrentDecision`)

| Valor | Significado |
|--------|-------------|
| `PENDING` | Sem decisão (bloqueia criação só para `REVIEW_SIMILAR` / `CREATE_NEW`). |
| `ACCEPT_SUGGESTED` | Aceitar o candidato principal (`reusedStructure` / matriz sugerida). |
| `SELECT_ALTERNATIVE` | Usar um candidato de `alternativeCandidates` (`selectedAlternativeMatrixNodeId`). |
| `CONFIRM_CREATE_NEW` | Tratar como novo item na esteira (mantém etapa do draft editável). |
| `IGNORE_ITEM` | Não incluir a etapa correspondente na materialização do POST. |

`REUSE_EXISTING` não exige clique para desbloquear: trata-se como pré-selecionado; o utilizador pode abrir alternativas e escolher outra matriz.

## Comportamento por ação

- **Aceitar sugestão:** grava `ACCEPT_SUGGESTED`; no draft convertido, aplicam-se `plannedMinutes` do `reusedStructure` quando existirem.
- **Escolher alternativa:** lista até 3 candidatos; ao confirmar, grava `SELECT_ALTERNATIVE` + id do nó; no draft, aplicam-se `plannedMinutes` e título a partir do candidato escolhido.
- **Criar como novo:** `CONFIRM_CREATE_NEW`; etapa mantém texto e tempos editados pelo utilizador.
- **Ignorar item:** `IGNORE_ITEM`; a etapa alinhada ao índice do plano é removida antes do `POST /conveyors`.
- **Plano com `suggestedAction: IGNORE`:** a etapa não entra na criação (sem decisão do revisor).

## Bloqueios de criação

O botão **Criar esteira no SGP+** permanece desativado enquanto existir pendência em `REVIEW_SIMILAR` ou `CREATE_NEW` (`PENDING` ou `SELECT_ALTERNATIVE` sem id). Mensagem de erro ao tentar submeter: *Revise e confirme os itens similares/novos antes de criar a esteira oficial.*

Continuam a aplicar-se: validação do draft (nome obrigatório), bloqueio de conteúdo financeiro/LGPD no draft e nas notas operacionais do ingest, e falha operacional ARGOS.

## `alternativeCandidates`

Vêm do pipeline de matching (até 3 entradas): `matrixNodeId`, `activity`, `sector`, `step`, `plannedMinutes`, `confidence`, `matchReason`. Na UI são mostrados em lista expansível (“Ver alternativas” / “Escolher alternativa”); o id da matriz aparece em texto discreto para suporte.

## Persistência

As decisões ficam apenas em estado React local da página; **não são persistidas** na base nem enviadas a um endpoint novo. Apenas influenciam o draft clonado imediatamente antes da conversão para `CreateConveyorInput`.

## Próximos passos (S6 — materialização)

- Persistir decisões de revisão ou logs de auditoria, se o produto exigir.
- Enriquecer candidatos alternativos com time/colaborador quando o backend expuser campos estáveis.
