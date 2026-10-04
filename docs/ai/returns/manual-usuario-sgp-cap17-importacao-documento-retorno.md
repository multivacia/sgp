# Retorno — manual-usuario-sgp-cap17-importacao-documento

- **TASK_ID:** `manual-usuario-sgp-cap17-importacao-documento`
- **Data/hora:** 2026-10-04 (UTC)
- **Objetivo:** construir o Capítulo 17 — Importação por documento do Manual do Usuário SGP+, somente com comportamento comprovado no código atual.
- **Status final:** CONCLUÍDO (rodada documental). Build, lint e testes da aplicação **não foram executados** (rodada puramente documental).
- **Branch:** `docs/manual-usuario-sgp-cap17-importacao-documento` (criada a partir de `origin/docs/manual-usuario-sgp-fix-situacao-cap14`)
- **SHA inicial (base):** `70518a4c3974aba8ff0b1020b5d7bc73f86f6f89` — confere com o SHA esperado; ancestrais dos capítulos 13 e 14 confirmados.
- **SHA final:** é o commit único desta branch que contém este arquivo (`git log -1` da branch). Não é registrado aqui para evitar commit extra de ajuste.

## Arquivos

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | Capítulo 17 escrito (substitui marcador de pendência); cabeçalho **Situação** atualizado |
| `docs/ai/returns/manual-usuario-sgp-cap17-importacao-documento-retorno.md` | este retorno |

Migrations: nenhuma. Código-fonte, HTML gerado, `docs/ai/reports/`, `docs/audits/`: não tocados.

## Funcionalidades comprovadas e documentadas

| Tema | Evidência |
|---|---|
| Entradas: menu **Gestão → Por documento** e botão **Nova esteira por documento** no Painel operacional | `src/lib/shell/app-nav-config.ts`, `src/pages/BacklogPage.tsx`, `src/routes/AppRoutes.tsx` (rota `importar-os` reexporta `NovaEsteiraPorDocumentoPage`) |
| Permissão `conveyors.create` na rota, no item de menu e no servidor (leitura do documento e criação) | `AppRoutes.tsx`, `server/src/modules/conveyors/conveyors.routes.ts` |
| Envio de PDF por arrastar/escolher; processamento automático ao escolher; trocar arquivo reinicia e descarta decisões | `NovaEsteiraPorDocumentoPage.tsx` (`onPickFile`, `runPipeline`, `resetJourney`) |
| Limite de tamanho (padrão 15 MB, configurável) | `server/src/config/env.ts`, `document-draft.multer.ts` |
| Situação Concluído/Parcial/Falhou, confiança global, referência de suporte | `NovaEsteiraPorDocumentoPage.tsx`, `buildDocumentDraftResult.ts` |
| Avisos exibidos e mensagens | `buildDocumentDraftResult.ts`, `extractDocumentText.ts`, `localPipelineArgosDocumentDraftAdapter.ts` |
| Painel de revisão: resumo, dados protegidos removidos, contadores, pendências, peças excluídas, observações | `DocumentDraftReviewPanel.tsx`, `documentDraftReview.ts` |
| Grupos e botões de decisão; pendência bloqueia criação; REUSE pré-selecionado | `DocumentDraftReviewPanel.tsx`, `documentReviewAcceptance.ts` (+ `documentReviewAcceptance.test.ts`) |
| Efeito das decisões na estrutura (substitui título/tempo, ignora, estrutura composta, deduplicação, responsável/equipe da matriz) | `draftToCreateConveyorInput.ts` (`applyReviewDecisionsToDraftV11`, `mapOptionsOrPlaceholder`) (+ `draftToCreateConveyorInput.test.ts`) |
| Campos editáveis e dados efetivamente gravados | `NovaEsteiraPorDocumentoPage.tsx`, `assembleCreateConveyorInputFromMappedOptions`; teste `bravoOsDocumentImport` |
| Confirmações, resumo de decisões, mensagens de bloqueio | `NovaEsteiraPorDocumentoPage.tsx`, `validateDraftForCreate`, `documentImportCreatePayloadDiagnostics.ts` |
| Resultado: aviso "Esteira criada a partir do documento revisto.", esteira em Rascunho / Em elaboração, auditoria interna das decisões | `NovaEsteiraPorDocumentoPage.tsx`, `EsteiraDetalhePage.tsx`, `conveyors.service.ts` (`metadata_json`) |
| Confirmação "Sair desta página?" | `useRegisterTransientContext`, `TransientLeaveConfirmDialog.tsx` |
| Comparação por palavras contra atividades/tarefas das matrizes, sem fonética | `matchOperationalItems.ts` |

## Pontos NÃO comprovados — por isso NÃO documentados

1. **Correspondência por "código Nano" para nova esteira por documento.** Busca sem diferenciar maiúsculas em `src/`, `server/src/` e `docs/` (e em `main`, `develop`, `homol` e na branch `hotfix/...`) só encontrou "Nano" em `docs/discovery/sdd-nova-matriz.md` ("Painel matching Nano→SGP"), sem implementação. O matching real é textual por palavras (ver acima). **Pista não confirmada; capítulo afirma apenas que não há outro código além do texto da descrição.** Se a feature existe em branch não publicada, ela não está nesta base.
2. Modos **remoto** e **stub** do gerador de rascunho: só descritos como aviso de ambiente; comportamento interno não auditado.
3. Mensagem exata exibida para arquivo acima do limite (o servidor responde 413 com texto próprio); o manual diz apenas que é recusado.
4. Ação "Ignorar" gerada pelo sistema: existe no contrato, mas o servidor local nunca a produz; a seção **Ignorar** da tela, portanto, não foi documentada.

## Inconsistências e limitações registradas (não corrigidas)

1. **Cliente, Placa e Prazo estimado exibidos/editáveis, mas não gravados**; Modelo/versão, Placa, Prazo e Observações travados. Em modo local, `interpretBravoDeterministic` define `heuristicSource: 'bravo_deterministic'` incondicionalmente, então **todo PDF** é tratado como "Bravo". Documentado no capítulo em linguagem funcional.
2. **Divergência com outros capítulos (não alterados nesta rodada):** capítulo 6 (6.8) diz que o **Prazo estimado** é "geralmente já preenchido pela leitura do documento" e o capítulo 21 diz que a criação por documento grava "o texto como veio do documento ou como foi digitado". No código atual (modo padrão), o prazo **não é gravado**. Recomenda-se corrigir 6.8 e 21.3 em rodada própria.
3. Interface com termos técnicos: "Situação ARGOS", "Estratégia/Especialista", "Hash do arquivo", "draft", "(partItems)", "Matriz (suporte): <id>", código do aviso em fonte monoespaçada, banners "Modo local/remoto/stub" com nomes de variáveis de ambiente (`DOCUMENT_DRAFT_ADAPTER`). Pendência de texto de interface.
4. Textos em português europeu na tela: "Ficheiro", "Factos extraídos", "aceite", "controlo de stock".
5. O botão **Criar esteira no SGP+** fica desativado sem mensagem explicativa; a pista é o contador "Pendências de revisão".
6. Em **Reaproveitar da Matriz** não há botão de ignorar nem "criar como novo"; só trocar por alternativa.
7. Criação por documento não mostra o banner com atalhos **Ver backlog / Ir a Minha fila** (só o aviso de toast), diferente da Nova esteira.
8. Edição de título/tempo de item reaproveitado é sobrescrita pela matriz ao decidir, sem aviso na tela.
9. Mensagem "Revise e confirme os itens similares/novos…" existe no código, mas não é alcançável (botão já desativado); não documentada.
10. Se todos os itens forem ignorados, é criada atividade provisória "Defina as etapas do serviço" (0 min) — documentado.
11. Revisão não é salva; sair descarta tudo — documentado.
12. `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` (46.x) lista mensagens e fluxo; tratado como pista, confirmado no código. Não alterado.

## Fluxo funcional documentado

Enviar PDF → ler situação/avisos → conferir resumo e contadores → decidir itens (reaproveitar / revisar similar / novo / ignorar / alternativa) até zerar pendências → ajustar dados e itens → **Criar esteira no SGP+** → confirmar com resumo das decisões → esteira em Rascunho / Em elaboração com aviso de sucesso.

## Validações realizadas

| Validação | Resultado |
|---|---|
| `git fetch origin --prune`; tip da base = SHA esperado | OK |
| Base contém ancestrais cap13 e cap14 | OK |
| `git diff --check` | sem saída (OK) |
| Região fora do capítulo 17 e do cabeçalho Situação idêntica ao HEAD (comparação programática) | OK: texto antes do 17 idêntico (exceto linha Situação), texto depois do 18 idêntico |
| Capítulos 1–16 e 18–21 intactos | OK |
| Marcador de pendência do capítulo 17 removido | OK; restam 5 capítulos pendentes (4, 15, 16, 18, 19) + menção em 2.6 |
| Cabeçalho Situação | só mudou: "5 a 14, 20 e 21" → "5 a 14, 17, 20 e 21"; "4 e 15 a 19" → "4, 15, 16, 18 e 19" |
| Busca por termos técnicos no texto novo (`STEP`, endpoint, schema, enum, DTO, ARGOS etc.) | apenas dentro de mensagens da tela citadas literalmente (stub, draft, partItems, debug, fallback), com explicação |
| Build, lint, testes da aplicação | **NÃO executados** (rodada documental). Testes lidos como evidência: `documentReviewAcceptance.test.ts`, `draftToCreateConveyorInput.test.ts` |

## Demais capítulos

Comparação textual: nenhum capítulo além do 17 e da linha Situação foi alterado.

## Metadado "Revisão deste manual"

Mantido `2026-10-03` (não alterado, conforme instrução). **Pendência de metadado:** continua desatualizado em relação às rodadas de 2026-10-04. A versão da aplicação (1.9.8) não foi reverificada nesta rodada.

## Observações de processo

- A sessão veio com a branch designada `claude/new-session-u9hnvr`; a instrução da atividade exige a branch `docs/manual-usuario-sgp-cap17-importacao-documento`, que prevaleceu. Nada foi publicado em outra branch.
- Sem PR, merge, rebase ou force-push.

## Próximo passo recomendado

Rodada própria para (a) corrigir 6.8 e 21.3 quanto ao prazo; (b) decidir produto sobre campos travados/não gravados e sobre a eventual feature "código Nano".

## Git

- `git status` final: ver resposta de encerramento (working tree limpa após commit).
- Commit/push: commit único, push apenas da branch `docs/manual-usuario-sgp-cap17-importacao-documento`.
- PR: não criado.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
