# ARGOS ↔ SGP+ — Contrato «Nova Esteira por Documento» (R3 · S1)

Documento técnico de referência para o pedido/resposta entre **ARGOS** (interpretação de documento) e **SGP+** (UX, revisão, decisão e persistência).  
**Âmbito:** apenas o fluxo documental novo; **não** altera rotas, telas ou contratos já homologados do SGP+ (incluindo `POST /api/v1/conveyors`).

---

## 1. Intent oficial

| Campo | Valor |
|--------|--------|
| **Intent** | `conveyor_draft_from_document` |

Constante TypeScript: `ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT` em `src/domain/argos/intent.ts`.

---

## 2. Princípios

- O ARGOS devolve **entendimento estruturado** (factos, rascunho versionado, avisos, confiança), não um payload moldado a componentes de UI.
- O **SGP+** mantém responsabilidade por **fluxo de ecrã**, **revisão**, **regras de negócio** e **persistência** (incluindo mapeamento do draft para o modelo interno de esteira).
- O contrato é **agnóstico de transporte**; a serialização concreta (REST multipart, fila, etc.) é definida na camada de integração sem mudar os tipos de domínio.

---

## 3. Entrada (ARGOS)

### 3.1 Binário

- **`file`**: documento de entrada (ex.: PDF). Enviado como parte do protocolo de transporte (ex.: `multipart/form-data`), não embutido no JSON de metadados.

### 3.2 Envelope JSON (campos lógicos)

| Campo | Obrigatório | Descrição |
|--------|-------------|-----------|
| `caller.systemId` | Sim | Identificador do sistema chamador (instância SGP+ ou serviço autorizado). |
| `policy` | Sim | Objeto de políticas acordadas (limites de tamanho, tipos MIME, etc.). |
| `intent` | Sim | Deve ser exatamente `conveyor_draft_from_document`. |
| `metadata` | Não | Correlação, locale, referências opacas; não substitui identificadores oficiais da resposta. |

Tipos: `ArgosDocumentIngestEnvelope` e tipos associados em `src/domain/argos/ingest-request.types.ts`.

---

## 4. Saída (ARGOS)

| Campo | Descrição |
|--------|-----------|
| `requestId` | Identificador único do processamento no ARGOS. |
| `correlationId` | Correlação ponta-a-ponta (pedido ↔ logs ↔ suporte). |
| `status` | `completed` \| `partial` \| `failed` — ver semântica abaixo. |
| `specialist` | Referência à linha lógica de processamento (pipeline / «especialista»). |
| `strategy` | Referência estável à estratégia de extração (ex.: regras, modelo). |
| `document` | Metadados do ficheiro processado (nome, MIME, páginas, hash, …). |
| `extractedFacts` | Lista de factos estruturados extraídos do documento. |
| `draft` | Rascunho de esteira **v1** ou `null` se não aplicável / falha estrutural. |
| `warnings` | Lista de issues com taxonomia mínima (secção 6). |
| `confidence` | Resumo de confiança global e opcionalmente por campo. |

Tipos: `ArgosDocumentIngestResult` em `src/domain/argos/ingest-response.types.ts`.

### 4.1 Semântica de `status`

- **`completed`**: processamento concluído; `draft` pode estar preenchido ou vazio conforme o documento; `warnings` pode ser não vazio (avisos não fatais).
- **`partial`**: resultado utilizável com lacunas ou baixa confiança relevante; o SGP+ deve orientar revisão.
- **`failed`**: falha fatal; `draft` tipicamente `null` e `warnings` deve incluir pelo menos um issue `fatal_error`.

---

## 5. Draft v1 (`schemaVersion`)

| Campo | Valor fixo v1 |
|--------|----------------|
| **`schemaVersion`** | **`"1.0.0"`** |

Constante: `CONVEYOR_DRAFT_SCHEMA_VERSION_V1` em `src/domain/argos/draft-v1.types.ts`.

O objeto `draft` quando presente deve ser do tipo **`ConveyorDraftV1`**:

- `suggestedDados`: campos operacionais sugeridos (título, cliente, veículo, matrícula, notas, prazo, prioridade, etc.).
- `options` → `areas` → `steps`: estrutura hierárquica **proposta**, sem IDs de persistência SGP+.
- `extensions`: mapa opcional para evolução sem quebra do núcleo v1.

Breaking changes ao formato exigem **novo major** em `schemaVersion` (ex.: `2.0.0`).

---

## 6. Taxonomia mínima de issues (`warnings`)

Cada item segue `ArgosIssue`: `category`, `code`, e campos opcionais (`message`, `fieldPath`, `confidence`, …).

| Categoria (`category`) | Significado |
|-------------------------|-------------|
| `fatal_error` | Erro fatal; resultado não deve ser tratado como sucesso operacional. |
| `revisable_warning` | Aviso que exige revisão humana mas não impede encaminhamento controlado. |
| `missing_field` | Campo esperado ausente ou não inferível. |
| `low_confidence_field` | Campo presente com confiança abaixo do limiar acordado. |

### 6.1 Códigos iniciais (`code`)

**Fatal (exemplos):** `document_unreadable`, `unsupported_format`, `file_too_large`, `policy_denied`, `processing_error`

**Revisável:** `ambiguous_segment`, `conflicting_facts`, `review_recommended`

**Ausência:** `missing_license_plate`, `missing_client`, `missing_deadline`, `missing_title`, …

**Baixa confiança:** `low_confidence_field` (tipicamente com `fieldPath`)

Novos códigos podem ser acrescentados sem remover os existentes; clientes devem tolerar códigos desconhecidos na categoria adequada.

---

## 7. Artefactos versionados no repositório

| Artefacto | Caminho |
|-----------|---------|
| Tipos e constantes | `src/domain/argos/` (barrel `index.ts`) |
| Intent | `intent.ts` |
| Pedido | `ingest-request.types.ts` |
| Resposta | `ingest-response.types.ts` |
| Draft v1 | `draft-v1.types.ts` |
| Taxonomia | `warnings-taxonomy.types.ts` |

---

## 8. Isolamento explícito

Esta sprint **não** altera:

- Nova Esteira manual nem fluxos de matriz já existentes;
- `ImportarOsPage` ou outras entradas mock;
- `AppRoutes` ou rotas homologadas;
- Serviços e contratos de `conveyors` / `POST /api/v1/conveyors`.

A integração em tempo de execução (BFF, cliente HTTP, chamadas a partir de UI) fica para entregas posteriores, sobre este contrato.

---

## 9. Critérios de pronto (R3 S1)

- [x] Intent `conveyor_draft_from_document` fixado e exportado.
- [x] `schemaVersion` do draft v1 fixo em `"1.0.0"`.
- [x] Request/response e taxonomia documentados e espelhados em TypeScript.
- [x] Impacto zero nas telas e contratos existentes do SGP+ neste entregável.

---

## 10. Integração BFF (R3 S2)

- **Rota:** `POST /api/v1/conveyors/document-draft`
- **Autorização:** sessão + permissão `conveyors.create`
- **Pedido:** `multipart/form-data` com `file` (binário) e `envelope` (string JSON alinhada a `ArgosDocumentIngestEnvelope` em `src/domain/argos`).
- **Resposta:** envelope `{ data, meta }` com `data` no formato `ArgosDocumentIngestResult` (validação Zod no servidor).
- **ARGOS remoto:** opcional via `ARGOS_INGEST_URL` em `server/.env` (ver `server/.env.example`). Sem URL, o servidor usa o adapter **stub** (sem chamadas externas).
