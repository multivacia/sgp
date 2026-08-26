# Redesign de UX — material de referência

Protótipos de **validação de interação** e especificação normativa que originaram o
trabalho de reformulação de UX das telas do SGP.

> **Estes `.jsx` não são código de produção e não devem ser importados.**
> Foram escritos fora do projeto, com paleta hardcoded, estilo inline e sem os
> componentes reais (`PageCanvas`, `SgpToast`, `SgpContextActionsMenu`, etc.).
> Servem como especificação de estrutura de tela e fluxo de interação — a
> implementação usa os componentes e padrões que já existem no projeto.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `prompt-claude-code-redesign.md` | Briefing original: escopo, regras de branch, Definition of Done |
| `spec-sugestao-planejamento.md` | **Normativa.** Heurística de sugestão de planejamento semanal (v1) |
| `sgp-prototipo.jsx` | Dashboard, trilho da esteira, apontamento, kiosk, wizard "Nova Esteira a partir da Matriz" |
| `sgp-matriz.jsx` | Lista de matrizes + wizard de criação/edição (3 passos) |
| `sgp-planejamento.jsx` | Backlog operacional + Agenda Semanal com motor de sugestão |

## Divergências conhecidas entre protótipo e projeto real

Registradas aqui para que ninguém replique o protótipo literalmente:

- **Cores:** os protótipos hardcodam a paleta. A implementação usa os tokens de
  `src/styles/semantic-tokens.css` (argos-dark, slate-dark, light-executive).
- **Fontes:** os protótipos usam Oswald/IBM Plex. O design system do projeto é
  Montserrat (display) + Open Sans (body).
- **Drag-and-drop:** os protótipos usam HTML5 nativo por limitação de sandbox. O
  projeto usa `@dnd-kit`, com `PointerSensor` + `TouchSensor`, mantendo o fluxo de
  toque (selecionar → tocar no destino) como paridade em touch.
- **Dados mock:** nomes inventados (Val/Bruno/Edu/Marli/Sula, "Sedan Premium"). A
  implementação usa os mocks e fixtures reais do projeto.

## Lacunas do material

- **`sgp-admin.jsx` não existe.** O briefing o lista como referência obrigatória e
  inclui Admin (Usuários, Permissões/RBAC, Auditoria) no escopo, mas o artifact nunca
  foi produzido. Admin está fora do escopo desta rodada.
- **Sequência de colaboradores na Matriz exige backend.** A spec §9 descreve herança
  Matriz → Esteira → Planejamento e afirma "nada novo no modelo", mas `matrix_nodes`
  só tem `default_responsible_id` (responsável único) e não existe `matrix_node_assignees`.
  No nível da Esteira, `conveyor_node_assignees` já tem `order_index` + `is_primary` e
  suporta a sequência. Ver o relatório de impacto antes de implementar a herança completa.
- **Contradição spec × protótipo:** a spec §9 diz que a sequência é "mesma referência,
  nunca cópia paralela"; o protótipo (`sgp-planejamento.jsx`, `SequenciaEditor`) exibe
  "reordenar aqui vale só pra esta atividade", que é override local. Pendente de decisão.
