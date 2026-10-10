# Retorno — guias-praticos-auditoria-final-2026-10-08

- **TASK_ID:** `guias-praticos-auditoria-final-2026-10-08`
- **Data/hora:** 2026-10-08 ~17:30 UTC (14:30 em São Paulo)
- **Prompt:** `docs/ai/prompts/guias-praticos-auditoria-final-2026-10-08.md` (conteúdo integral)
- **Objetivo:** auditar e corrigir os Guias Práticos de Colaborador e Gestor contra o código e a execução da branch de integração, resolver as 20 ressalvas e atualizar as capturas.
- **Status final:** **PRONTO PARA VALIDAÇÃO DA TATI — COM RESSALVAS (de produto, não de texto).** Todas as jornadas críticas listadas no prompt estão cobertas e comprovadas no código e/ou na execução; 20/20 ressalvas classificadas com evidência; nenhuma informação sabidamente desatualizada permanece. Seguem em aberto **limitações reais do sistema** (documentadas nos guias) e **decisões de produto** (GES-001, GES-007 etc.), além do teste do PDF no navegador da fábrica. "Pronto para a Tati" ≠ homologado ≠ em produção.

## Git

| Item | Valor |
|---|---|
| Base | `origin/integration/ajustes-tati-2026-10-07` = `f15483d66e8a81335d91ecbd5dca9d7f8cdd11fd` (revalidado após `git fetch origin --prune`; igual à referência) |
| Branch de trabalho | `docs/guias-praticos-auditoria-final-2026-10-08` (nova, worktree `/home/user/sgp-guias-auditoria`) |
| HEAD inicial | `f15483d6` |
| HEAD final | commit que contém este arquivo (informado na resposta da sessão) |
| Inalteradas | `main` `c611d10f`, `develop` `ecb26da7`, `homol` `6b768c85`, `fix/ajustes-tati-2026-10-07` `f6f1d6a1`, `docs/ajustes-tati-2026-10-07-guias-praticos` `f8eab69e`, `integration/ajustes-tati-2026-10-07` `f15483d6` |

A integração contém as correções funcionais (2c7e458e/f6f1d6a1 → 935dc943/438f8a00) e os guias reconstruídos (f8eab69e → 3d6f1a30) — confirmado por `git log`.

## Arquivos (somente escopo autorizado)

- **Alterados:** `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`.
- **Imagens substituídas (mesmo nome, links preservados) — Colaborador (10):** `02-minha-fila`, `03-minha-fila-cartoes`, `04-registrar-tempo`, `05-apontamento-registrado`, `06-fora-de-sequencia`, `07-apontar-horas-lista`, `08-fora-da-alocacao`, `09-extra-esteira`, `10-minha-jornada-periodo`, `11-minha-jornada-apontamentos`.
- **Imagens novas — Colaborador (3):** `03b-minha-fila-periodo`, `07b-pesquisa-esteira-atividade`, `11b-minha-jornada-extra-esteira`.
- **Imagens substituídas — Gestor (7):** `07-planejamento`, `07b-planejamento-grade`, `09-evolucao-esteiras`, `10-dashboard`, `11-jornada-por-colaborador`, `12-apontamento-gerencial`, `12b-corrigir-apontamento`.
- **Imagens novas — Gestor (4):** `07c-planejamento-periodo`, `09b-pdf-retrato`, `09c-pdf-paisagem`, `11b-jornada-extra-esteira`.
- **Mantidas sem alteração (código da tela não mudou entre `develop` e a integração — `git diff` vazio em `src/features/kiosk`, `src/features/production`, `src/components/AppHeader.tsx`, `src/lib/shell`, e telas de esteira/agenda/colaboradores/equipes/config):** Colaborador `01`, `12`–`21`; Gestor `01`, `02`, `02b`, `03`, `05`, `06`, `08`, `13`, `13c`, `14`, `15`, `16`.
- **Removidas:** nenhuma (0 órfãs).
- **Criados em `docs/ai/`:** prompt e este retorno.
- **Não alterados:** `src/`, `server/`, migrations, testes, `package.json`, versão, manual integral (`docs/manual/manual-usuario.html`, `docs/manual/source/*`), gerador.
- **Migrations:** nenhuma.

Totais: 24 imagens referenciadas no guia do colaborador, 23 no do gestor (47).

## Método de evidência

- **Validação funcional real:** backend real (`tsx src/server.ts`) + frontend real (Vite, `VITE_DATA_MODE=real`) da própria branch, PostgreSQL 16 local descartável (`sgp_guias`, migrations 0001–0053 + seed oficial), Playwright/Chromium (`pt-BR`, `America/Sao_Paulo`, viewport 1366×1000, gaveta 576 px).
- **Dados 100% fictícios:** Ana Exemplo, Bruno Fictício, Carla Modelo (colaborador demo do seed renomeado), Diego Teste, Gabriela Gestora (perfil **GESTOR** padrão); OS 7070 "Gol GTI (fictícia)", OS 7071 "Kombi Clássica (fictícia)", OS 7072 "Fusca 1975 (fictício)"; "Equipe Bancos (fictícia)"; e-mails `@exemplo.test`. Planos publicados para as semanas de 05/10 e 12/10/2026, incluindo um item só de equipe. Apontamentos, justificativas e Extra Esteira lançados **pela API real** (não por SQL).
- **Nenhuma captura simulada/mock.** Os PDFs da Evolução foram gerados interceptando `window.print()` e imprimindo o DOM capturado no Chromium headless (mesmo método do retorno de integração); as imagens 09b/09c são a 1ª página de cada PDF.
- Banco reconstruído do zero antes da rodada final de capturas (script de reset), para não haver lançamentos duplicados.

## Matriz 20/20 das ressalvas

| ID | Decisão | Evidência (08/10) |
|---|---|---|
| GUIA-COL-001 | Limitação real — **guia corrigido** | `app-nav-config.ts` (`COLABORADOR_NAV_ITEMS`); menu conferido no navegador |
| GUIA-COL-002 | Limitação real — aguardando decisão | `mapCandidateRow` (pendente = total − realizado do colaborador); gaveta exibe `plannedMinutes` (1 un.). Tela: 2 un. × 1 h → Previsto 1 h, Realizado 1 h 45, Pendente 15 min. Guia explica a leitura (seção 4) |
| GUIA-COL-003 | Limitação real — aguardando correção | `my-activities.repository.ts` linhas 306/434 `false AS is_primary`; tela: "Costura · Apoio" (fila) × "Costura · Principal" (barra) |
| GUIA-COL-004 | Limitação real — aguardando decisão | `JornadaPage.tsx` (`canApontar` por bucket da esteira; senão rótulo "Concluída"); captura 10 |
| GUIA-COL-005 | **Resolvido no sistema** — texto e captura corrigidos | chip "Extra Esteira (período)" + seção "Extra Esteira no período" (capturas 10, 11b); histórico após retirar descrição validado em 07/10 |
| GUIA-COL-006 | **Resolvido no sistema** — texto e captura corrigidos | lista mostra "Justificativa (fora de sequência): … — complemento" e "Observação" (captura 11) |
| GUIA-COL-007 | Limitação real — guia orienta usar a gaveta | `ApontamentoPage.tsx` sem justificativa/conclusão; execução: recusa "Selecione uma justificativa operacional para este apontamento." |
| GUIA-COL-008 | Limitação real — aguardando decisão | `KioskPinPad.tsx`/`KioskChangePin.tsx` `PIN_LENGTH = 4`; `production.schemas.ts` `^\d{4,8}$`; `ProductionWorkQueuePage.tsx` "Concluir etapa" `disabled` ("Disponível na próxima etapa"); código sem diff desde as capturas |
| GUIA-COL-009 | Limitação real (sem efeito) | `AppHeader.tsx`: input `readOnly` "Busca visual (mock)"; Alertas `onClick` vazio "Notificações (mock)" |
| GUIA-COL-010 | Limitação real — correção pela gestão | `AppRoutes.tsx` exige `create_on_behalf`/`edit_any`/`delete_any`; 0053 concede `edit_any`/`delete_any` só a ADMIN/GESTOR |
| GUIA-GES-001 | Limitação real — **aguardando decisão (bloqueado: exige migration)** | nenhuma migration/seed cria `time_entries.create_on_behalf`; `conveyorAssignments.routes.ts` exige; tela sem "Novo lançamento" (captura 12). Nenhuma migration criada |
| GUIA-GES-002 | Limitação real — **guia corrigido** | `conveyorStepAssignmentsApiService.ts` só GET de assignees; "Ver carga de trabalho" inexistente |
| GUIA-GES-003 | Limitação real — aguardando decisão | detalhe: bloco "2 un. × 1 h = 2 h" × tabela "Previsto estrutural 1 h"; Jornada/Minha jornada 9 h 15 min (por unidade) onde o total seria 10 h 15 min |
| GUIA-GES-004 | **Resolvido no sistema** — texto e captura corrigidos | Lançamentos no passo com justificativa e observação (captura 12); também Jornada e PDF |
| GUIA-GES-005 | **Resolvido no sistema** (cenário testado) — texto e captura corrigidos | Dashboard aberto: 3 h 30 → 3 h 55 após apontamento de 25 min pelo cabeçalho; 1 reconsulta; 0 reconsultas em 10 s ocioso. Guia não promete atualização para lançamentos de terceiros |
| GUIA-GES-006 | Limitação real — risco documentado | `EsteiraDetalhePage.tsx` `handlePatchStatus` (linha ~803) sem confirmação; botão linha 1219 |
| GUIA-GES-007 | **Não validado — aguardando decisão** (fora das jornadas críticas) | componentes `conveyor-operational-plan/*` e rotas `/conveyors/:id/operational-plan`; tela "Esta esteira ainda não possui Plano Operacional"; aviso no Backlog sobre "Aguardando encaixe". Fluxo não executado |
| GUIA-GES-008 | Limitação real — aguardando decisão | `ColaboradoresPage.tsx` confirmação "PIN 1234"; `PRODUCTION_DEFAULT_INITIAL_PIN = '1234'` |
| GUIA-GES-009 | Limitação real — **guia corrigido** | menu GESTOR conferido no navegador; seção 8.1 distingue Gerar PDF × Imprimir ticket |
| GUIA-GES-010 | Limitação real (baixo impacto) | captura 07: "2026-10-05 → 2026-10-09"; Pesquisa por período e Ir para a data em dd/mm/aaaa |

Resultado: **4 resolvidos no sistema** (COL-005, COL-006, GES-004, GES-005) · **15 limitações reais documentadas** (4 delas com o guia corrigido: COL-001, GES-002, GES-009 e COL-007 orientando a alternativa) · **1 não validado/aguardando decisão** (GES-007). Nenhum ID foi apagado; os capítulos de ressalvas ganharam tabela-resumo e a linha "Situação em 08/10/2026" em cada item, preservando o registro original.

## Matriz de jornadas

Legenda: Cód = evidência no código; Nav = evidência no navegador nesta revisão; Cap = captura.

### Colaborador

| Jornada | Seção | Caminho | Resultado correto | Cód | Nav | Cap | Status |
|---|---|---|---|---|---|---|---|
| Login, troca de senha | 1–2 | /login; Conta → Alterar senha | entra; senha ≥ 8 | auth schemas | login de Ana/Gabriela | 01, 13 | CONFIRMADO (telas sem diff) |
| Menu real por perfil | 2 | menu lateral | Minha fila, Minha jornada, Alterar senha | nav-config | sim | 02 | CONFIRMADO |
| Minha fila por dia | 3 | Colaborador → Minha fila | cartões do plano publicado do dia | MyWorkQueuePage | sim | 02, 03 | CORRIGIDO (texto + capturas) |
| Minha fila por período (multi-semana, datas invertidas, alternância) | 3 | Por período | 5 atividades de 05/10 a 16/10; mensagem de período inválido; Por dia volta | periodFilter, my-work-queue | sim (+ 07/10) | 03b | CORRIGIDO (novo) |
| Apontar pela fila (campos, validações, justificativa opcional) | 4 | cartão → Apontar horas | "Apontamento registrado com sucesso." | QuickTimeEntryDrawer | sim | 04, 05 | CORRIGIDO |
| Justificativa obrigatória (fora de sequência / fora da alocação) e opcional | 5 | gaveta | campo vira *; catálogo; visível depois na jornada | schemas, drawer | sim | 06 | CORRIGIDO |
| Pesquisa `&`, sem `&`, acentos, OS | 7 | barra → Apontar horas | `7070 & XPTO` só XPTO da OS; sem `&` inalterado; acentos | accentInsensitiveSearch, repository | sim (+ API 07/10) | 07, 07b | CORRIGIDO (novo) |
| Fora da alocação | 7 | Buscar outras atividades | bloco "Fora da sua alocação" | repository | sim | 08 | CONFIRMADO |
| Concluir × apontar | 6 | gaveta / cartão | dois caminhos | drawer | sim (Corte concluído via API) | — | CONFIRMADO |
| Extra Esteira: criar e ver na jornada | 8, 9 | aba Extra esteira | mensagem de sucesso; aparece na Minha jornada | extra-time-entries, JourneyExtra… | sim | 09, 11b | CORRIGIDO |
| Minha jornada: períodos, Extra, justificativas, observações, colunas | 9 | Colaborador → Minha jornada | conforme | JornadaPage | sim | 10, 11, 11b | CORRIGIDO |
| Página Apontamento via jornada | 9 | Minha jornada → Apontar | recusa sem justificativa | ApontamentoPage | sim | — | LIMITAÇÃO documentada |
| Totem: PIN, 1º acesso, apontar, concluir, acima do previsto, Extra, Outra atividade | 10 | /app/kiosk | conforme guia | kiosk (sem diff) | não reexecutado nesta revisão | 14–20 | CONFIRMADO por código inalterado + capturas de 07/10 |
| SGP+ Produção no navegador | 11 | /app/producao | sem concluir/Extra/Outra | production (sem diff) | não reexecutado | 21 | CONFIRMADO por código inalterado |
| Erros comuns e correção gerencial | 12 | — | — | rotas/permissões | parcial | — | CORRIGIDO (3 linhas novas) |

### Gestor

| Jornada | Seção | Caminho | Resultado correto | Cód | Nav | Cap | Status |
|---|---|---|---|---|---|---|---|
| Menu/permissões, Painel operacional | 1–2 | Gestão | menu igual à tabela | nav-config, 0053 | sim | 01 | CONFIRMADO |
| Criar/alterar esteira, estrutura, alocação | 3 | Nova esteira | conforme | conveyors (sem diff) | não reexecutado | 02, 02b | CONFIRMADO por código inalterado |
| Ciclo de vida, cancelar/finalizar, retrocessos | 4 | detalhe | conforme; risco GES-006 | EsteiraDetalhePage | código | 03, 06 | CONFIRMADO |
| Concluir/reabrir/dispensar | 5 | Estrutura operacional | conforme | sem diff | detalhe aberto | 05 | CONFIRMADO |
| Planejamento semanal, publicação | 6 | Planejamento | publicado alimenta fila | operational-planning | plano publicado pelo serviço; fila confirmou | 07, 07b | CORRIGIDO (capturas) |
| Agenda da semana | 7 | Agenda | mesmo plano | sem diff | não reexecutado | 08 | CONFIRMADO por código inalterado |
| Pesquisa por período + Ver semana | 6.1 | barra Pesquisa por período | 8 itens em 2 semanas; Ver semana abre 12/10 | PlanningPeriodSearchPanel | sim | 07c | CORRIGIDO (novo) |
| Exportação para IA (semana/período, 5 abas, itens só de equipe) | 6.2 | Exportar para IA | 5 abas; equipe fora da carga | ai-export.ts; handleExportAi salva rascunho | download pela tela 08/10; conteúdo validado em 07/10 (405 × 360 min) | — (texto + tabela) | CORRIGIDO (novo) |
| Evolução: PDF Retrato/Paisagem, paginação, PDF × ticket | 8.1 | Evolução | 612×792 e 792×612, 2 págs cada, sem branco | conveyorProgress* | sim | 09, 09b, 09c | CORRIGIDO (navegador da fábrica pendente) |
| Dashboard após apontamento | 8.2 | Dashboard | atualiza sem polling | DashboardPage + operationalDataEvents | sim | 10 | CORRIGIDO |
| Jornada por colaborador | 8.3 | Jornada por colaborador | Extra, justificativas, observações | JornadaColaboradorGestorPage | sim | 11, 11b | CORRIGIDO |
| Apontamento gerencial (editar/remover, campos, sem lançamento em nome) | 9 | Apontamento gerencial | só Minutos/Quantidade; sem Novo lançamento | ApontamentoGestorPage, rotas | sim | 12, 12b | CORRIGIDO |
| PIN, equipes, saúde, configurações | 10–12 | Cadastros | conforme | sem diff | não reexecutado | 13, 13c, 14–16 | CONFIRMADO por código inalterado |

**Ressalva de cobertura:** Totem, SGP+ Produção, criação de esteira, Agenda, PIN, equipes, saúde e configurações **não foram reexecutados no navegador nesta revisão**. Foram considerados confirmados porque o código dessas telas não mudou desde as capturas de 07/10 (`git diff origin/develop..integration` vazio nesses caminhos) e porque as capturas e textos de 07/10 vieram de execução real. Se a Tati exigir prova reexecutada, essas jornadas ficam como PENDENTE de reexecução (baixo risco).

## Validação (comandos reais)

| Comando | Resultado |
|---|---|
| `git fetch origin --prune` + `rev-parse` das refs | base = `f15483d6` |
| Verificação de imagens/âncoras/IDs/recursos remotos/órfãs (script Python) | 24 + 23 imagens, 0 ausentes, 0 âncoras quebradas, 0 IDs duplicados, 0 remotos, 0 órfãs |
| Renderização Playwright 390 px e 1280 px (ambos HTML) | 0 imagens quebradas, largura do documento = viewport, 0 transbordamento, 0 requisições falhas |
| `npm run manual:usuario:html:check` | exit 0 (manual integral intacto) |
| `npm run build` | exit 0 |
| `npx vitest run` focados (periodFilter, timeEntryJustificationDisplay, conveyorProgressPage, planningBoardFilters, operationalDataEvents, operationalPlanningApiService, `src/lib/help`) | 7 arquivos, **77/77** |
| `npx vitest run` servidor focados com banco descartável (accent-insensitive-search, my-work-queue-period, operational-planning-range, time-entry-candidates-http, work-queue-period) | 5 arquivos, **22/22** |
| `git diff --cached --check` | exit 2 **apenas** por 5 quebras de linha Markdown (dois espaços finais) nas linhas 3–7 do prompt salvo, que vieram do original; mantidas porque o prompt exige conteúdo integral. HTML e retorno sem problemas |
| Escopo do diff | somente `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`, `docs/manual/img/guia-*/`, `docs/ai/` |

PDFs dos guias (opcional): gerados para teste (34 e 30 páginas A4), mas **não entregues**. O tema escuro sai com fundo preto e há figuras quebradas entre páginas. Seria preciso um CSS de impressão, que fica fora desta rodada.

## Pendências e riscos

| # | Pendência | Severidade | Impacto na entrega |
|---|---|---|---|
| 1 | Validação com a Tati (inclui leitura dos dois guias) | Alta | aceite |
| 2 | PDF da Evolução no **navegador da fábrica** | Média | validado só no Chromium |
| 3 | GES-001 (`create_on_behalf`) — decisão + migration | Média | gestor não lança em nome do colaborador; guia já diz isso |
| 4 | GES-007 Plano Operacional — decidir se entra na rotina; se sim, auditar | Baixa | fora do guia |
| 5 | Limitações de produto: COL-002/003/004/007/008, GES-003/006/008/010 | Baixa a média | documentadas; correção é de sistema |
| 6 | Jornadas não reexecutadas (Totem, Produção, criação de esteira, Agenda, PIN, equipes, saúde, config) | Baixa | código sem alteração |
| 7 | Disponibilidade em produção depende de merge/deploy da integração | — | nota nos guias |
| 8 | Capturas 12 (menu do usuário) e 14–21 usam os dados fictícios de 07/10 (outros nomes de atividades) | Baixa | telas idênticas |

## Roteiro de validação com a Tati (09:00–09:30)

1. **(5 min) Abrir os guias.** `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html`, no computador e no celular. Ler a nota "material validado contra a branch de integração".
2. **(8 min) Colaborador.**
   - Minha fila *Por dia* → *Por período* atravessando duas semanas (seção 3).
   - Apontar horas: `OS real & palavra da atividade` e uma busca sem `&` (seção 7).
   - Apontar com justificativa opcional (seções 4–5).
   - Extra Esteira e conferência na Minha jornada (seções 8–9).
3. **(10 min) Gestor.**
   - Planejamento → Pesquisa por período → Ver semana (6.1).
   - Exportar para IA e abrir as 5 abas (6.2).
   - Evolução → PDF Retrato e Paisagem **no navegador da fábrica** (8.1).
   - Dashboard aberto, apontar pelo cabeçalho e ver o card mudar (8.2).
   - Jornada por colaborador e Apontamento gerencial (8.3, 9).
4. **(7 min) Ressalvas.** Ler as tabelas-resumo dos capítulos 13 (Colaborador) e 14 (Gestor). Decidir GES-001, GES-007 e quais limitações entram na fila de correção.

## Estado final

- Commit e push normais **somente** de `docs/guias-praticos-auditoria-final-2026-10-08` (sem PR, merge, deploy ou force).
- `git status`: limpo após o commit (os symlinks locais de `node_modules` são ignorados pelo `.gitignore`).
- `SESSION_CHECKPOINT.md` atualizado de forma compacta para o handoff.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.
