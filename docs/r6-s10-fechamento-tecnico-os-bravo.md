# R6 S10 — Fechamento técnico: OS Bravo por documento

Documento de consolidação da **Release R6** (fluxo *OS Bravo por documento* + matching operacional) para ambiente local e preparação a **HML controlado**. Não introduz requisito de produto novo; descreve o que foi entregue e como operar com segurança.

---

## 1. Objetivo da R6

Permitir que o utilizador importe uma **ordem de serviço em PDF (Bravo)** como **origem operacional** exclusivamente: extrair atividades e serviços, alinhar à **Matriz operacional** por matching, **rever e confirmar** no ecrã, e **criar a esteira oficial** no SGP+ com rastreio e guardas de conteúdo (sem finanças, estoque sensível ou dados pessoais indevidos no fluxo operacional).

---

## 2. O que o SGP faz neste fluxo

| Aspecto | Comportamento |
|--------|----------------|
| Interpretação da OS | Apenas como **origem de atividades operacionais** (texto extraído → serviços/itens inferidos). |
| Rascunho | Gera **draft revisável** (schema 1.1.0) antes de qualquer persistência de esteira. |
| Matriz | **Reaproveita** estruturas da Matriz quando há match (TASK / subárvore / ACTIVITY conforme regras R6). |
| Revisão humana | **Exige** decisões do revisor (alinhado, alternativa, novo, ignorar) onde aplicável. |
| Esteira oficial | **Criação** via `POST /api/v1/conveyors` apenas após draft revisto e validações cliente + servidor. |

---

## 3. O que o SGP não faz neste fluxo

- **Financeiro**: valores, totais, pagamentos e linguagem monetária não devem ser persistidos em texto operacional (guardas no draft e na auditoria).
- **Estoque / peças**: não há listagem de peças como linhas operacionais; referências agregadas quando aplicável, sem `partItems` no payload de criação.
- **LGPD / dados sensíveis**: CPF, CNPJ, telefone, e-mail, endereço, chassi em contextos proibidos são bloqueados ou removidos pelas camadas de revisão e validação documentada.

---

## 4. Fluxo ponta a ponta

1. **PDF** — Upload em `/app/importar-os` (multipart para o BFF).
2. **Parser local** — Pipeline Bravo/heurísticas quando `DOCUMENT_DRAFT_ADAPTER=local` (sem LLM obrigatório neste encadeamento).
3. **serviceItems** — Itens operacionais derivados do texto (entidade de ingestão; não confundir com linhas financeiras).
4. **Matching** — Planos de matching contra Matriz (TASK/SECTOR/ACTIVITY, subtrees, alternativas).
5. **Revisão** — UI de revisão e decisões (`applyReviewDecisionsToDraftV11`).
6. **Materialização** — Draft → `CreateConveyorInput`; strip de pseudo-rollup de TASK (S9.4.5/S9.4.6).
7. **Auditoria** — `metadata_json.documentReviewAudit` quando habilitado de forma segura (schema `r6_document_review_audit_v1`).
8. **Criação** — Persistência OPTION → AREA → STEP; backend rejeita pseudo-rollup oficial (`CONVEYOR_SYNTHETIC_ROLLUP_STEP`).

---

## 5. Status local (homologação nos 9 itens principais)

| # | Item | Estado |
|---|------|--------|
| 1 | Importação do PDF Bravo | Homologado localmente |
| 2 | Dados básicos da esteira | Homologado localmente |
| 3 | Matches da Matriz | Homologado localmente |
| 4 | Confirmação reaproveitados / novos | Homologado localmente |
| 5 | Criação da esteira | Homologado localmente |
| 6 | Abertura da esteira criada | Homologado localmente |
| 7 | Query de validação sem pseudo-rollup | Homologado localmente |
| 8 | Times / colaboradores / minutos | Homologado localmente |
| 9 | Ausência de financeiro, peças e LGPD indevida | Homologado localmente |

---

## 6. Principais proteções implementadas

| Proteção | Descrição breve |
|----------|-----------------|
| Financeiro / LGPD | `operationalContentGuard`, sanitização em draft e auditoria; campos proibidos na revisão. |
| partItems | Suprimidos do caminho de criação oficial (`validateDraftForCreate` / ausência no POST). |
| Debug no payload | Draft não deve conter `candidateLines`, `debugLines`, etc.; validação bloqueia envio. |
| Pseudo-rollup | Frontend: strip + detector oficial só no payload final; Backend: `detectSyntheticSubtreeRollupInCreatePayload` / erro `CONVEYOR_SYNTHETIC_ROLLUP_STEP`. |
| Assignees | Schema Zod exige colaborador principal quando há COLLABORATOR; lista sanitizada. |
| Backend | Recusa criação se rollup sintético oficial passar (defesa em profundidade). |

---

## 7. Flags e ambiente (resumo)

Ver secção detalhada no mesmo doc bundle S10 e em `server/.env.example` (comentários):

- **HML/local recomendado**: `DOCUMENT_DRAFT_ADAPTER=local`.
- **Debug**: `SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS`, `SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES`, `CONVEYOR_CREATE_DIAGNOSTICS` — apenas sob demanda; ver `docs/r6-s10-riscos-e-rollback.md`.

---

## 8. Próximo passo

Executar **checklist HML** (`docs/r6-s10-checklist-hml-os-bravo.md`) e **queries** (`docs/r6-s10-queries-validacao-os-bravo.sql`) no ambiente HML com Matriz e utilizadores alinhados ao cenário de negócio.

---

*Sprint S10 — Fechamento técnico local + preparação HML controlado. Sem feature nova.*
