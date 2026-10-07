# Retorno — manual-usuario-sgp-capturas-telas

- **TASK_ID:** `manual-usuario-sgp-capturas-telas`
- **Data/hora:** 2026-10-07 (UTC)
- **Objetivo:** gerar capturas reais e auditáveis da interface do SGP+ para o Manual do Usuário, com frontend real + Playwright + API 100% mockada, sem banco/backend.
- **Status final:** CONCLUÍDO com ressalvas — 50 `CAPTURED`, 2 `BLOCKED` por divergência/defeito real documentado.

## Base

- `origin/develop` usado: `8da7540fe50fd7c4c74e1f6a7d45369bd04a2e34` (SHA inicial)
- Branch criada: `docs/manual-usuario-sgp-capturas-telas` (a partir de `origin/develop`)
- `origin/main` = `c611d10f…`, `origin/homol` = `6b768c85…` (não alterados)
- SHA final / working tree final: ver seção **Git** (commit final desta entrega).

## Inventário

| Item | Quantidade |
|---|---|
| Marcações `[IMAGEM SUGERIDA: …]` encontradas no manual (recontadas por script) | **51** |
| Capturas adicionais | **1** (`extra-ajuda-menu.png`) |
| Total de itens | **52** |
| `CAPTURED` | **50** |
| `BLOCKED` | **2** (cap08-04, cap19-04) |
| `REQUIRES_EXTERNAL_VIEWER` | 0 |
| `NOT_APPLICABLE` | 0 |

Cada marcação casa com exatamente um item (`--list` / `--validate`). O manifesto registra capítulo, seção, linha, texto da marcação, rota, viewport, usuário, permissões exigidas, cenário, endpoints mockados, chamadas inesperadas, status e notas.

## Ambiente

- Node `v22.22.0` / npm `10.9.4`.
- Frontend: `VITE_APP_ENV=production VITE_SUPPORT_TICKETS_ENABLED=true npx vite --host 127.0.0.1 --port 5174` (as variáveis só alinham a barra superior com produção: botão *Abrir chamado* e selo de versão sem divergência). Nenhum `.env` criado/alterado.
- Playwright: `npm install --no-save playwright` falhou no sandbox (`Cannot read properties of null (reading 'edgesOut')`); usado o Playwright **1.56.1 já instalado globalmente** (`/opt/node-tools`) via symlink efêmero em `node_modules/` (ignorado pelo Git) e o Chromium pré-instalado (`/opt/pw-browsers`, `channel: 'chromium'`). Nenhum `playwright install`.
- `server/`: `npm ci` efêmero (sem alterar lockfile) **apenas** para executar com `tsx` código real do backend sem banco (serviço de evolução das esteiras com pool *stub*, regras de saúde operacional e builders de Excel).
- Planilhas renderizadas com LibreOffice headless + `pdftoppm` já presentes no sistema.
- **Backend, PostgreSQL, migrations, seed e Docker não foram usados.** Todas as chamadas `/api/**` foram interceptadas; chamadas sem mock são registradas como inesperadas — resultado final: **0 inesperadas**.

## Arquivos

Criados (somente infraestrutura isolada de captura + artefatos):

- `scripts/capture-manual-screenshots.mjs` — CLI (`--id`, `--chapter`, `--list`, `--validate`, `--base-url`).
- `scripts/lib/manual-capture/inventory.mjs`, `mock-api.mjs`, `clip.mjs`, `compose.mjs`, `xlsx-render.mjs`
- `scripts/lib/manual-capture/fixtures/*.mjs` — dados fictícios (Ana Demo, Carlos Demo, Bruno/Diana Exemplo, Eduardo/Fernanda Teste, Cliente Exemplo, Veículo Exemplo, `ABC1D23`, e-mails `*.example`).
- `scripts/lib/manual-capture/items/cap04…cap19.mjs`, `extra.mjs`, `index.mjs` — um módulo por capítulo.
- `scripts/lib/manual-capture/server/*.ts` + `run.mjs` — pontes para código real do backend (sem banco).
- `docs/manual/assets/screenshots/` — 51 PNG, 3 XLSX de evidência, `manifest.json`, `README.md`.
- `docs/ai/returns/manual-usuario-sgp-capturas-telas-retorno.md` (este arquivo).

Não alterados: código-fonte da aplicação (`src/`, `server/`), manual (`docs/manual/source/*`, `manual-usuario.html`), `package.json`, `package-lock.json`, migrations, versão.

Migrations envolvidas: nenhuma.

## Decisões técnicas

- Relógio fixo 01/07/2026 10:00 (America/Sao_Paulo), locale pt-BR, tema Light Executive, viewport 1440×1000 (exceções no manifesto: totem 1280×800 e viewports altos para blocos longos).
- Fidelidade de payload: onde existia lógica pura no backend, ela foi usada em vez de números inventados — `serviceConveyorProgress` (cap. 14), `mapSnapshotToOperationalHealthSummaryRow`/`computeOperationalHealthSummaryTotals` (cap. 18) e builders ExcelJS das exportações (cap08-05, cap12-03).
- Comparações (cap05-02, cap08-05): duas capturas/renderizações reais compostas lado a lado (empilhadas) por página HTML local capturada pelo Playwright — sem biblioteca de imagem.
- XLSX: planilhas reais geradas e preservadas; imagem = renderização LibreOffice (registrado no manifesto; não é captura do Excel).
- Erro de comunicação (cap19-02/03): falha de rede real (requisição abortada pelo Playwright), não um texto simulado.
- Menu Ajuda (extra): capturado no Painel operacional (tela inicial da gestão) com "Como usar esta tela", "Manual do usuário" e "Abrir chamado".

## Resultado por item

| ID | Capítulo | Arquivo | Status | Observação |
|---|---|---|---|---|
| cap04-01 | 4 | cap04-01-permissoes-por-papel.png | CAPTURED | — |
| cap04-02 | 4 | cap04-02-trilha-administrativa.png | CAPTURED | — |
| cap05-01 | 5 | cap05-01-painel-operacional-filtro-ativo.png | CAPTURED | — |
| cap05-02 | 5 | cap05-02-esteira-antes-depois-prazo.png | CAPTURED | Imagem composta (duas capturas reais lado a lado via HTML local), conforme regra de comparação |
| cap06-01 | 6 | cap06-01-detalhe-esteira.png | CAPTURED | DIVERGÊNCIA PARCIAL: no código atual (EsteiraDetalhePage |
| cap06-02 | 6 | cap06-02-estrutura-operacional.png | CAPTURED | Observação de auditoria: cada atividade exibe abaixo o painel "STEP · Equipe e apontamentos" (StepAnaliticoPanel), com o termo técnico STEP visível ao usuário;  |
| cap06-03 | 6 | cap06-03-nova-esteira-estrutura.png | CAPTURED | — |
| cap06-04 | 6 | cap06-04-cabecalho-acoes-status.png | CAPTURED | — |
| cap06-05 | 6 | cap06-05-atividade-dispensada-e-concluida.png | CAPTURED | — |
| cap06-06 | 6 | cap06-06-incluir-novo-item.png | CAPTURED | — |
| cap07-01 | 7 | cap07-01-gaveta-apontar-horas.png | CAPTURED | — |
| cap07-02 | 7 | cap07-02-registrar-tempo-fora-de-sequencia.png | CAPTURED | — |
| cap07-03 | 7 | cap07-03-apontamento-gerencial.png | CAPTURED | — |
| cap08-01 | 8 | cap08-01-planejamento-da-semana.png | CAPTURED | — |
| cap08-02 | 8 | cap08-02-capacidade-diaria-ultrapassada.png | CAPTURED | — |
| cap08-03 | 8 | cap08-03-adicionar-ao-plano.png | CAPTURED | Observação de auditoria: no tema Light Executive a janela é renderizada com fundo escuro e o título "Adicionar ao plano" fica com contraste muito baixo (Operati |
| cap08-04 | 8 | — | BLOCKED | DIVERGÊNCIA: no código atual os três painéis não são exibidos no Planejamento |
| cap08-05 | 8 | cap08-05-exportacoes-comparadas.png | CAPTURED | Imagem composta de duas renderizações por LibreOffice headless (não é captura do Excel) |
| cap09-01 | 9 | cap09-01-agenda-da-semana.png | CAPTURED | — |
| cap09-02 | 9 | cap09-02-arraste-em-andamento.png | CAPTURED | — |
| cap09-03 | 9 | cap09-03-gaveta-backlog-operacional.png | CAPTURED | — |
| cap09-04 | 9 | cap09-04-alocacao-em-lote.png | CAPTURED | — |
| cap09-05 | 9 | cap09-05-gaveta-itens-de-atencao.png | CAPTURED | — |
| cap10-01 | 10 | cap10-01-minha-fila.png | CAPTURED | — |
| cap10-02 | 10 | cap10-02-cartao-proxima-recomendada.png | CAPTURED | — |
| cap10-03 | 10 | cap10-03-faixa-acima-da-capacidade.png | CAPTURED | — |
| cap10-04 | 10 | cap10-04-execucao-rapida.png | CAPTURED | — |
| cap11-01 | 11 | cap11-01-periodo-e-filtros.png | CAPTURED | — |
| cap12-01 | 12 | cap12-01-quadro-de-consulta.png | CAPTURED | Observação de auditoria: o popover de busca abre sobre a linha de confirmação dos nomes ("3 colaboradores: …"), que fica parcialmente encoberta enquanto o popov |
| cap12-02 | 12 | cap12-02-resumo-do-escopo.png | CAPTURED | — |
| cap12-03 | 12 | cap12-03-exportacao-aba-resumo.png | CAPTURED | Renderização da aba Resumo por LibreOffice headless (não é captura do Excel) |
| cap13-01 | 13 | cap13-01-totem-quem-e-voce.png | CAPTURED | — |
| cap13-02 | 13 | cap13-02-teclado-de-pin.png | CAPTURED | Observação de auditoria: no tema Light Executive os dois pontos ainda não preenchidos ficam praticamente invisíveis (KioskPinPad |
| cap13-03 | 13 | cap13-03-cartao-atividade-carrossel.png | CAPTURED | — |
| cap13-04 | 13 | cap13-04-tempo-acima-do-previsto.png | CAPTURED | — |
| cap13-05 | 13 | cap13-05-outra-atividade-revisao.png | CAPTURED | — |
| cap14-01 | 14 | cap14-01-evolucao-das-esteiras.png | CAPTURED | Payload de /management/conveyor-progress produzido pelo serviceConveyorProgress real (server/src) sobre pool stub com fixtures (scripts/lib/manual-capture/serve |
| cap14-02 | 14 | cap14-02-atividade-dispensada.png | CAPTURED | Payload de /management/conveyor-progress produzido pelo serviceConveyorProgress real (server/src) sobre pool stub com fixtures (scripts/lib/manual-capture/serve |
| cap15-01 | 15 | cap15-01-dashboards-operacional-cards.png | CAPTURED | Observação de auditoria: o cartão "Alocações em STEPs" expõe o termo técnico STEP ao usuário |
| cap16-01 | 16 | cap16-01-colaboradores-operacionais.png | CAPTURED | — |
| cap16-02 | 16 | cap16-02-editar-colaborador.png | CAPTURED | — |
| cap16-03 | 16 | cap16-03-capacidade-operacional.png | CAPTURED | — |
| cap17-01 | 17 | cap17-01-nova-esteira-por-documento.png | CAPTURED | Resultado do interpretador mockado (fixtures/document-import |
| cap17-02 | 17 | cap17-02-revisar-similaridade.png | CAPTURED | Resultado do interpretador mockado (fixtures/document-import |
| cap18-01 | 18 | cap18-01-saude-operacional.png | CAPTURED | Linhas, sinais e totais produzidos por mapSnapshotToOperationalHealthSummaryRow / computeOperationalHealthSummaryTotals reais (server/src) a partir de snapshots |
| cap18-02 | 18 | cap18-02-painel-de-detalhe.png | CAPTURED | Linhas, sinais e totais produzidos por mapSnapshotToOperationalHealthSummaryRow / computeOperationalHealthSummaryTotals reais (server/src) a partir de snapshots |
| cap19-01 | 19 | cap19-01-barra-superior-chamados.png | CAPTURED | — |
| cap19-02 | 19 | cap19-02-nao-foi-possivel-continuar.png | CAPTURED | — |
| cap19-03 | 19 | cap19-03-abrir-chamado-preenchido.png | CAPTURED | — |
| cap19-04 | 19 | — | BLOCKED | DIVERGÊNCIA/DEFEITO: o POST /api/v1/support/tickets é enviado e responde 200 (protocolo CHM-2026-000123), mas a janela "Chamado registrado" nunca aparece |
| cap19-05 | 19 | cap19-05-chamados.png | CAPTURED | — |
| extra-ajuda-menu | extra | extra-ajuda-menu.png | CAPTURED | — |

## Validações

| Comando | Resultado |
|---|---|
| `node scripts/capture-manual-screenshots.mjs` (execução completa, ~2,5 min) | 50 CAPTURED, 2 BLOCKED, 0 chamadas `/api` inesperadas, 0 erros JS |
| `node scripts/capture-manual-screenshots.mjs --validate` | `problems: []` — 51 marcações; todo item no manifesto; todo CAPTURED com arquivo não vazio; nenhum arquivo órfão; `extra-ajuda-menu.png` presente; fixtures sem e-mail/domínio real (exit 0) |
| `npm run build` | sucesso (exit 0); apenas o aviso preexistente de chunk > 500 kB |
| `npx eslint scripts/capture-manual-screenshots.mjs scripts/lib/manual-capture` | sem erros |
| `git diff origin/develop -- package.json package-lock.json` | vazio (inalterados) |
| `git diff --name-only origin/develop` | somente `scripts/…manual-capture…` e `docs/…` |

Revisão visual: todas as 51 imagens foram abertas e conferidas (tela correta, estado pedido, sem loading/erro inesperado, modais inteiros, dados fictícios); itens ajustados foram regenerados individualmente com `--id`.

## Divergências encontradas (auditoria do manual)

1. **cap08-04 — BLOCKED.** Manual: "três painéis de diagnóstico lado a lado" no Planejamento. Código: os painéis ficam em abas secundárias desligadas por `SHOW_PLANNING_SECONDARY_TABS = false` (`src/features/operational-planning/planningUiFlags.ts`; `OperationalPlanningPage.tsx` ~L1572 força a aba "backlog"); mesmo ativos seriam abas, não lado a lado. Pendências de sincronização e Fora do planejado aparecem na gaveta "Itens de atenção" da Agenda (cap09-05); "Esteiras aguardando encaixe" não tem acesso. O cartão do Planejamento ainda diz "revise na aba Pendências". **Recomendação:** revisar o texto do cap. 8 ou reativar a flag.
2. **cap19-04 — BLOCKED (defeito).** Manual: janela "Chamado registrado" com Protocolo, E-mail e WhatsApp. Código: o POST é enviado e responde 200, mas a janela nunca aparece — `OpenSupportTicketDialog.tsx` chama `setSuccessResult` e `onClose()`; com `open=false` o componente retorna `null` (~L38) e desmonta o `SupportTicketSuccessDialog` (~L141). **Recomendação:** corrigir o componente antes da próxima rodada de capturas (fora do escopo desta tarefa).
3. **cap06-01 — divergência parcial.** O bloco Estrutura operacional não aparece junto do resumo: fica abaixo de Dados básicos, Pendência/concentração, Plano Operacional e Eventos. A imagem cobre cabeçalho/situação/resumo/dados; a estrutura está em cap06-02.
4. **cap12-02** — não existe título literal "Resumo do escopo"; entre os números e os painéis há o bloco "Extra esteira (período)".
5. **cap17-01** — recorte termina nas "Pendências de revisão"; as seções de itens seguem abaixo (cap17-02).

Observações de UX/linguagem registradas no manifesto (não bloqueiam): termo técnico **STEP** visível (painel "STEP · Equipe e apontamentos" no detalhe da esteira; cartão "Alocações em STEPs" no Dashboard; "Tipo: TASK/ACTIVITY" na importação); "Ficheiro selecionado" (pt-PT) na importação; códigos crus de categoria (ERRO, BLOQUEIO_OPERACIONAL) na lista de Chamados; contraste baixo no tema Light Executive (título da janela "Adicionar ao plano", pontos vazios do teclado de PIN, título "Carga" no detalhe de Saúde operacional); popover da Jornada cobre a linha de confirmação dos nomes. Também foi observado que prazos só-data (`YYYY-MM-DD`) são interpretados como UTC em `parseFlexibleDeadlineToDate` (`src/lib/backlog/operationalBuckets.ts`), o que em BRT pode antecipar o "Em atraso" em um dia — vale verificação pela equipe (as fixtures evitam o caso).

## Pendências, riscos e ressalvas

- 2 itens BLOCKED aguardam decisão humana (texto do manual ou correção de código).
- Imagens de planilha são renderizações LibreOffice (fonte e grade podem diferir levemente do Excel).
- Reexecutar exige o ambiente descrito no `README.md` (Playwright/Chromium; `server/` com `npm ci` para 4 itens; LibreOffice para 2 itens).
- Próximo passo recomendado: revisão humana das imagens → inserir assets no manual e regenerar o HTML (etapa seguinte, fora deste escopo).

## Git

- Commits na branch `docs/manual-usuario-sgp-capturas-telas` (WIP intermediários + commit final), sem rebase, sem force-push.
- Push somente de `docs/manual-usuario-sgp-capturas-telas`. Sem PR, sem merge.
- `main`, `develop` e `homol` não foram alterados.
- `git status` final: limpo (ver resposta da sessão para o SHA final).

## Contexto/tokens

Percentual de tokens/contexto restante: indisponível nesta interface.
