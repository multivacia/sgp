# R6 S1 — Parser Bravo: baseline técnico (congelamento)

**Release:** R6 — OS Bravo por Documento + Matching Operacional  
**Sprint:** S1 — Fechamento técnico do parser Bravo  
**Estado:** baseline estabilizado para regressões

## Comportamento congelado (fixture `BRAVO_OS_SANITIZED_TEXT`)

### Dados básicos no JSON final (`buildDocumentDraftResult` + pipeline local)

| Campo | Valor esperado |
|--------|----------------|
| `sourceDocument.provider` | `BRAVO` |
| `sourceDocument.documentType` | `OS_OR_BUDGET` |
| `sourceDocument.documentNumber` | `7452` |
| `sourceDocument.issuedAt` | `2026-01-15` |
| `sourceDocument.entryDate` | `2026-01-26` |
| `draft.suggestedDados.title` | `7452` |
| `draft.suggestedDados.clientName` | `DENILSON DE FRETAS GTI` (sem CPF colado — TD10.6) |
| `draft.suggestedDados.vehicleDescription` | `GOL GTI 2000` |
| `draft.suggestedDados.modelVersion` | `""` |
| `draft.suggestedDados.licensePlate` | `AWW2C00` |
| `draft.suggestedDados.estimatedDeadline` | ausente / vazio (TD10.5) |
| `draft.suggestedDados.notes` | `""` |
| `operationalContext.vehicle.model` | `GOL GTI 2000` |
| `operationalContext.vehicle.year` | `1993` |
| `operationalContext.vehicle.color` | `PRETA` |

### Serviços operacionais (`extractedItems.serviceItems` / `draft.options` steps)

Trechos obrigatórios (concatenação de linhas conforme parser tabular): ver `BRAVO_EXPECTED_SERVICE_SAMPLES` em `bravo-os-sanitized.fixture.ts`.

### Peças / insumos

- `extractedItems.partItems` = `[]` no resultado oficial entregue ao cliente.
- `draft.extensions.documentPartsExcludedFromOperationalUi` > 0 — métrica agregada only; **sem listagem** na UI operacional.

### Financeiro / LGPD no payload operacional

Não devem aparecer em serviços, factos operacionais editáveis, steps ou estrutura espelhada sem revisão humana:

- Valores monetários, `R$`, Total, Sub Total, Pagamento, Desconto, Recebido, Troco, Valor Unit., etc.
- Padrões típicos da fixture: `16816,36`, `13681,15`, `30497,51`, linhas `UN @`, códigos isolados de item (`342`, `401`…) dentro de descrições de serviço.
- LGPD: CPF/CNPJ, e-mail, telefone, endereço, chassi em fluxo operacional; **exceção**: `draft.suggestedDados.clientName` e `draft.suggestedDados.licensePlate` apenas na aba Dados básicos (ver TD10.5).

### Flags de debug (`documentDraftPipelineDebug.ts`)

| Variável | Comportamento |
|-----------|----------------|
| `SGP_DOCUMENT_DRAFT_PIPELINE_FLAGS` | Só ativa logs/diagnóstico quando `=== '1'`. **Ausente ou ≠ `1` → desligado.** |
| `SGP_DOCUMENT_DRAFT_DEBUG_CANDIDATE_LINES` | Só junto com a flag acima **e** `NODE_ENV !== 'production'`. |

- Logs de candidate lines usam `sanitizeBravoDebugLine` — sem PII completa (placa mascarada como `[PLATE]`, etc.).
- Financeiros podem aparecer nas linhas candidatas **somente** em ambiente local com flags explícitas (diagnóstico tabular).

### UI (Nova esteira por documento)

- Dados básicos: valores acima; observações e prazo vazios para import Bravo; modelo/versão vazio.
- Peças: não listadas; apenas mensagem agregada quando aplicável (`partsExcludedFromOperationalUiCount`).
- Conteúdo proibido bloqueia criação oficial (`editableDraftContainsForbiddenOperationalContent` / validação).

## Próximos passos (S2+)

- **S2 (feito no código):** diagnóstico `matching.failed`, warnings `matching.unavailable` / `matching.no_candidates`, query + fallback — ver `docs/r6-s2-matching-failed-diagnostico.md`.
- **S3+:** matching determinístico refinado; depois fuzzy/LIKE e semântica/LLM só em ambiguidade, com **revisão humana obrigatória** antes de materializar.

## Testes que protegem este baseline

- `server/src/tests/parse-bravo-basic-fields.test.ts`
- `server/src/tests/interpret-bravo-deterministic.test.ts`
- `server/src/tests/document-draft-pipeline.test.ts`
- `server/src/tests/document-draft-pipeline-debug.test.ts`
- `server/src/tests/local-pipeline-bravo-wiring.test.ts`
- Frontend: `draftV11EditorNormalize.test.ts`, `draftToCreateConveyorInput.test.ts`, `documentDraftReview.test.ts`, etc.
