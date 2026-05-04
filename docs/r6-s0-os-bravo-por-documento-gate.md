# R6 S0 - OS Bravo por Documento (GATE)

Status: planejamento tecnico (sem implementacao funcional)

## 1) Resumo executivo

O repositorio ja possui contrato SGP x ARGOS para "Nova Esteira por Documento", com endpoint BFF no SGP, schema `1.0.0`, intent fixa `conveyor_draft_from_document`, fluxo de revisao humana e criacao oficial da esteira no SGP apos revisao.

Para suportar OS Bravo com regras obrigatorias de privacidade (LGPD) e exclusao financeira, o contrato atual e reutilizavel como base, mas ainda tem lacunas importantes: nao ha bloco explicito de redacao/sanitizacao, nao ha separacao formal servico x peca, nao ha plano de matching com Matriz/Esteiras nem rastreabilidade de reaproveitamento.

Recomendacao tecnica desta S0: **opcao B (versionar contrato)** para `schemaVersion: "1.1.0"` mantendo compatibilidade de transporte e intent, com extensao aditiva de campos estruturados para BRAVO e matching operacional. A mudanca permite evolucao segura sem quebrar consumidores existentes de `1.0.0`.

## 2) Contrato atual encontrado (SGP x ARGOS)

### 2.1 Endpoint atual SGP

- `POST /api/v1/conveyors/document-draft`
- Auth: sessao + permissao `conveyors.create`
- Request: `multipart/form-data` com:
  - `file` (binario)
  - `envelope` (JSON string)
- Response: envelope `{ data, meta }`, onde:
  - `data`: `ArgosDocumentIngestResult`
  - `meta.documentDraftExecutionMode`: `remote | local | stub`

Arquivos principais:
- `server/src/modules/conveyors/conveyors.routes.ts`
- `server/src/modules/argos-integration/document-draft.controller.ts`
- `server/src/modules/argos-integration/document-draft.multer.ts`

### 2.2 Endpoint atual ARGOS

Gateway remoto esperado pelo adapter HTTP:
- URL configurada por `ARGOS_INGEST_URL`
- Comentado no repo como tipicamente `POST .../v1/documents`
- Multipart montado em `buildArgosGatewayDocumentFormData`

Arquivos principais:
- `server/src/modules/argos-integration/httpArgosDocumentDraftAdapter.ts`
- `server/src/modules/argos-integration/argosGatewayMultipart.ts`
- `server/.env.example`

### 2.3 Payload enviado pelo SGP

Envelope logico (campo `envelope`):
- `caller.systemId` (obrigatorio)
- `policy` (obrigatorio)
- `intent` (obrigatorio, literal `conveyor_draft_from_document`)
- `metadata` (opcional; ex.: `correlationId`, `locale`)

No adapter remoto, parte do envelope vira `businessContext`:
- `sgpIntent`
- `sgpPolicy`
- `sgpMetadata`

Tipos/schemas:
- `src/domain/argos/ingest-request.types.ts`
- `server/src/modules/argos-integration/document-draft.schemas.ts`

### 2.4 Payload recebido do ARGOS

Contrato logico interno no SGP (`ArgosDocumentIngestResult`):
- `requestId` (obrigatorio)
- `correlationId` (obrigatorio)
- `status`: `completed | partial | failed`
- `specialist` (obrigatorio)
- `strategy` (obrigatorio)
- `document`
- `extractedFacts[]`
- `draft` (`ConveyorDraftV1 | null`)
- `warnings[]` (`ArgosIssue[]`)
- `confidence` (`overall` + `byField?`) ou `null`

Tipos/schemas:
- `src/domain/argos/ingest-response.types.ts`
- `src/domain/argos/draft-v1.types.ts`
- `src/domain/argos/warnings-taxonomy.types.ts`
- `server/src/modules/argos-integration/document-draft.schemas.ts`

### 2.5 schemaVersion, intent, obrigatorios/opcionais, warnings/confidence, erros

- **intent atual**: `conveyor_draft_from_document`
- **schemaVersion atual do draft**: `"1.0.0"`
- **campos obrigatorios do resultado**: `requestId`, `correlationId`, `status`, `specialist`, `strategy`, `document`, `extractedFacts`, `draft` (nullable), `warnings`, `confidence` (nullable)
- **warnings atuais** por categoria:
  - `fatal_error`
  - `revisable_warning`
  - `missing_field`
  - `low_confidence_field`
- **confidence atual**:
  - global em `confidence.overall`
  - opcional por campo em `confidence.byField`
- **tratamento de erro**:
  - 422 em envelope/file invalido
  - 413 em arquivo acima do limite
  - 502/504 em erro/timeout de integracao ARGOS remota
  - 500 se resposta interna violar schema

### 2.6 Fronteira arquitetural atual (aderencia)

O fluxo atual ja respeita a fronteira principal:
- SGP faz upload, UX, revisao e criacao oficial (`POST /api/v1/conveyors` separado).
- ARGOS retorna entendimento/draft.
- Nao ha persistencia de esteira oficial no ARGOS.

## 3) Avaliacao de suporte ao caso OS Bravo

### 3.1 O que ja suporta

- Upload PDF e ingestao documental via SGP.
- Draft revisavel com etapa humana antes de criar esteira.
- Rastreabilidade basica (`requestId`, `correlationId`, `strategy`, `specialist`).
- Estrutura candidata de esteira (`options/areas/steps`).
- Taxonomia de avisos e confianca.

### 3.2 O que nao suporta completamente

- Origem documental BRAVO declarada e tipada (`provider`, `documentType`).
- Bloco formal de sanitizacao LGPD/financeiro com evidencias do que foi removido.
- Distincao estruturada `serviceItems` vs `partItems`.
- Regra explicita de "peca como insumo/observacao, nao atividade automatica".
- Matching com matrizes/esteiras existentes antes de criar novos nodes.
- Acoes de matching (`REUSE_EXISTING`, `REVIEW_SIMILAR`, `CREATE_NEW`, `IGNORE`).
- Rastreabilidade do match (`matrixNodeId`, `conveyorNodeId`, `matchReason`).
- Reaproveitamento explicito de `plannedMinutes`, time e responsavel no contrato de draft.

## 4) Gaps detalhados para OS Bravo

1. **Sanitizacao financeira insuficiente**  
   Nao existe bloco contratual obrigatorio que declare remocao de `valor unitario`, `subtotal`, `total`, `desconto`, `troco`, `pagamento` etc.

2. **Sanitizacao LGPD insuficiente**  
   O pipeline atual ainda pode promover `clientName` e capturar identificadores sensiveis em texto livre se nao houver bloqueio dedicado por categoria.

3. **Falta de metadado de origem BRAVO**  
   Nao ha `sourceDocument.provider = BRAVO` no contrato atual.

4. **Falta de separacao servico x peca**  
   O contrato v1 materializa principalmente linhas de servico; peca/insumo nao esta formalizada em bloco proprio.

5. **Sem plano de matching com patrimonio operacional existente**  
   Nao ha mecanismo contratual de reaproveitamento com Matriz/Esteiras.

6. **Sem acao recomendada por item extraido**  
   Ausencia de `REUSE_EXISTING / REVIEW_SIMILAR / CREATE_NEW / IGNORE`.

7. **Sem rastreabilidade de origem de match**  
   Ausencia de `matchedMatrixNodeId`, `matchedConveyorNodeId`, origem e justificativa.

8. **Warnings especificos de redacao e matching inexistentes**  
   Faltam warnings dedicados para "dado financeiro removido", "PII removida", "item ignorado por regra", "ambiguo para matching".

## 5) Proposta de evolucao do contrato (decisao)

## Decisao recomendada: Opcao B - Nova versao de contrato (`1.1.0`)

### Justificativa

- Evita quebrar clientes atuais em `1.0.0`.
- Permite introduzir semantica nova relevante (redaction + matchingPlan + separacao item operacional) de forma explicita.
- Mantem fronteira SGP/ARGOS e endpoint atual.
- Reduz risco de "extensoes soltas" em `extensions` sem governanca.

### Estrategia de compatibilidade

- Manter intent `conveyor_draft_from_document`.
- Manter transporte em `POST /api/v1/conveyors/document-draft`.
- Permitir coexistencia temporaria:
  - `draft.schemaVersion = "1.0.0"` (legado)
  - `draft.schemaVersion = "1.1.0"` (OS Bravo-ready)

## 6) Contrato alvo proposto (OS Bravo)

Exemplo alvo (JSON de referencia, nao implementado nesta S0):

```json
{
  "requestId": "f77b2d58-3b2f-4cf3-a5c0-e50d7f2d20a2",
  "correlationId": "9b0f7f92-2d7f-4af5-b5cf-dc7f4e0fd043",
  "status": "partial",
  "specialist": "argos_document_bravo_v1",
  "strategy": "deterministic_rules_first",
  "document": {
    "fileName": "os-bravo-123.pdf",
    "mimeType": "application/pdf",
    "pageCount": 2,
    "contentSha256": "..."
  },
  "sourceDocument": {
    "provider": "BRAVO",
    "documentType": "OS_OR_BUDGET",
    "documentNumber": "OS-12345",
    "issuedAt": "2026-05-01T10:30:00Z",
    "receivedAt": "2026-05-01T10:35:00Z"
  },
  "operationalContext": {
    "vehicle": {
      "model": "Onix",
      "year": 2020,
      "color": "Prata"
    },
    "maskedIdentifiers": {
      "customerNameMasked": "J*** S****",
      "licensePlateMasked": "ABC*D**"
    }
  },
  "extractedItems": {
    "serviceItems": [
      {
        "id": "svc-1",
        "description": "Reforma de bancos dianteiros",
        "confidence": 0.88
      }
    ],
    "partItems": [
      {
        "id": "part-1",
        "description": "Courvin preto",
        "quantity": 2,
        "confidence": 0.71
      }
    ],
    "operationalNotes": [
      "Priorizar entrega ate sexta."
    ]
  },
  "redaction": {
    "personalDataRemoved": true,
    "financialDataRemoved": true,
    "removedCategories": [
      "cpf_cnpj",
      "address",
      "phone",
      "email",
      "pricing",
      "payment_terms"
    ]
  },
  "matchingPlan": [
    {
      "extractedServiceDescription": "Reforma de bancos dianteiros",
      "suggestedAction": "REUSE_EXISTING",
      "confidence": 0.9,
      "matchReason": "Alta similaridade semantica com atividade existente",
      "matchedMatrixNodeId": "matrix-node-123",
      "matchedConveyorNodeId": null,
      "reusedStructure": {
        "step": "Reforma de bancos",
        "sector": "Tapeçaria",
        "activity": "Revestimento",
        "plannedMinutes": 180,
        "teamId": "team-10",
        "teamName": "Equipe A",
        "collaboratorId": "collab-7",
        "collaboratorName": "Responsavel X",
        "isPrimary": true
      }
    },
    {
      "extractedServiceDescription": "Higienizacao completa",
      "suggestedAction": "REVIEW_SIMILAR",
      "confidence": 0.54,
      "matchReason": "Similaridade moderada com duas atividades candidatas",
      "matchedMatrixNodeId": null,
      "matchedConveyorNodeId": null
    }
  ],
  "draft": {
    "schemaVersion": "1.1.0",
    "titleSuggestion": "OS 12345 - Onix 2020",
    "options": [
      {
        "orderIndex": 1,
        "title": "Servico principal",
        "areas": [
          {
            "orderIndex": 1,
            "title": "Tapeçaria",
            "steps": [
              {
                "orderIndex": 1,
                "title": "Reforma de bancos dianteiros",
                "plannedMinutes": 180
              }
            ]
          }
        ]
      }
    ],
    "warnings": [
      {
        "category": "revisable_warning",
        "code": "redaction.personal_data_removed"
      },
      {
        "category": "revisable_warning",
        "code": "matching.review_similar_required"
      }
    ],
    "humanReviewRequired": true
  },
  "confidence": {
    "overall": 0.74
  }
}
```

## 7) Impacto por camada

### 7.1 Backend SGP

Impactados (futuro S1+):
- Endpoints:
  - `server/src/modules/conveyors/conveyors.routes.ts`
  - `server/src/modules/argos-integration/document-draft.controller.ts`
- Services/integracao:
  - `server/src/modules/argos-integration/httpArgosDocumentDraftAdapter.ts`
  - `server/src/modules/argos-integration/argosGatewayMultipart.ts`
  - `server/src/modules/argos-integration/argosGatewayResponseMapper.ts`
  - `server/src/modules/argos-integration/localPipelineArgosDocumentDraftAdapter.ts`
  - `server/src/modules/argos-integration/pipeline/*`
- Tipos/schemas:
  - `server/src/modules/argos-integration/document-draft.schemas.ts`
  - `src/domain/argos/*`
- Testes:
  - `server/src/tests/document-draft.integration.test.ts`
  - `server/src/tests/argosGatewayResponseMapper.test.ts`
  - `server/src/tests/document-draft-pipeline.test.ts`

### 7.2 Frontend SGP

Impactados (futuro S1+):
- Paginas/componentes:
  - `src/features/documentos/nova-esteira-documento/NovaEsteiraPorDocumentoPage.tsx`
  - `src/features/documentos/ImportarOsPage.tsx`
- Servicos API:
  - `src/services/conveyors/documentDraftApiService.ts`
- Tipos de dominio:
  - `src/domain/argos/*`
- Conversao draft -> criacao oficial:
  - `src/features/documentos/nova-esteira-documento/draftToCreateConveyorInput.ts`
- Testes:
  - `src/features/documentos/nova-esteira-documento/*.test.ts`

### 7.3 ARGOS

Impactos esperados (futuro S1+):
- Parser/interpreter documental para BRAVO.
- Classificador deterministico servico x peca.
- Blocos de redacao financeira e LGPD obrigatorios antes da saida.
- Matching planner com Matriz/Esteiras (sem persistir esteira oficial).
- Politica "deterministico primeiro, LLM apenas em ambiguidade".

### 7.4 Banco de dados

Nesta S0: sem alteracao.

Para backlog futuro:
- Reuso de tabelas existentes para criacao oficial de esteira no SGP.
- Avaliar necessidade de trilha de rastreabilidade (ex.: importacao documental e match) sem armazenar PDF bruto.
- Se houver persistencia de draft futuro, tratar como escopo separado e opcional.

### 7.5 Seguranca / LGPD

Obrigatorio no desenho alvo:
- Proibir envio/persistencia de campos financeiros no payload operacional.
- Minimizar/remover PII no processamento e no retorno.
- Garantir logs sem PDF bruto e sem dados pessoais em claro.
- Introduzir bloco `redaction` no contrato para auditabilidade funcional.

## 8) Riscos e mitigacoes

1. **Risco de regressao em clientes `1.0.0`**  
   Mitigar com coexistencia `1.0.0` + `1.1.0` e testes de contrato.

2. **Risco de falso matching e criacao indevida de atividade**  
   Mitigar com `suggestedAction`, limiar de confianca e revisao humana obrigatoria.

3. **Risco LGPD/financeiro por vazamento acidental**  
   Mitigar com sanitizacao deterministica antes de montar payload e testes dedicados.

4. **Risco de acoplamento excessivo ingestao x draft operacional**  
   Mitigar com separacao clara de blocos no contrato e governanca de versao.

## 9) Pontos reutilizaveis

- Endpoint e transporte multipart ja existentes.
- Taxonomia de warnings/confidence ja estabelecida.
- Fluxo de revisao humana e criacao oficial no SGP ja funcional.
- Rastreabilidade com `requestId/correlationId`.
- Estrutura de adapter remoto/local/stub ja pronta para evolucao gradual.

## 10) Plano proximo (S1-S6)

- **S1 - Contrato 1.1.0 e sanitizacao base**
  - Formalizar schema `1.1.0` com `sourceDocument`, `extractedItems`, `redaction`.
  - Testes de contrato e validacao de backward compatibility.
- **S2 - Parser BRAVO deterministico**
  - Extracao operacional OS/veiculo/servicos/pecas/notas.
  - Ignorar financeiro e PII por regra.
- **S3 - Matching com Matriz/Esteiras**
  - Introduzir `matchingPlan` e `suggestedAction`.
  - Rastreabilidade de origem (`matrixNodeId`/`conveyorNodeId`).
- **S4 - UX de revisao enriquecida no SGP**
  - Exibir reaproveitado/novo/ignorado.
  - Confirmacoes humanas para CREATE_NEW.
- **S5 - Hardening LGPD e observabilidade**
  - Politica de logs seguros e testes de nao-vazamento.
- **S6 - Go-live controlado**
  - Feature flag, rollout progressivo, metricas de qualidade.

## 11) Checklist de aceite S0

- [x] Contrato atual SGP x ARGOS localizado e documentado.
- [x] Definido caminho de evolucao: versionamento para `1.1.0`.
- [x] Documentado tratamento sem dados financeiros e sem dados sensiveis.
- [x] Definido como matching com Matriz/Esteiras entra no fluxo (proposta de contrato).
- [x] Registrado que novas atividades so surgem quando nao houver similaridade confiavel ou apos confirmacao humana.
- [x] Nenhuma alteracao funcional feita fora de `docs/`.

## 12) Lista de arquivos encontrados (levantamento S0)

### 12.1 Documentacao existente

- `docs/argos-r3-s1-contrato-nova-esteira-por-documento.md`
- `docs/deploy-ec2-automatico.md` (referencias indiretas por busca textual)

### 12.2 Backend - contrato, rota, adapters, pipeline

- `server/src/modules/conveyors/conveyors.routes.ts`
- `server/src/modules/argos-integration/document-draft.controller.ts`
- `server/src/modules/argos-integration/document-draft.schemas.ts`
- `server/src/modules/argos-integration/document-draft.multer.ts`
- `server/src/modules/argos-integration/argosDocumentDraftPort.ts`
- `server/src/modules/argos-integration/createArgosDocumentDraftAdapter.ts`
- `server/src/modules/argos-integration/httpArgosDocumentDraftAdapter.ts`
- `server/src/modules/argos-integration/argosGatewayMultipart.ts`
- `server/src/modules/argos-integration/argosGatewayResponseMapper.ts`
- `server/src/modules/argos-integration/localPipelineArgosDocumentDraftAdapter.ts`
- `server/src/modules/argos-integration/stubArgosDocumentDraftAdapter.ts`
- `server/src/modules/argos-integration/pipeline/classifyDocumentLine.ts`
- `server/src/modules/argos-integration/pipeline/interpretHeuristicBr.ts`
- `server/src/modules/argos-integration/pipeline/buildDocumentDraftResult.ts`
- `server/src/app.ts`
- `server/src/config/env.ts`
- `server/.env.example`

### 12.3 Frontend - pagina, service, tipos

- `src/features/documentos/ImportarOsPage.tsx`
- `src/features/documentos/nova-esteira-documento/NovaEsteiraPorDocumentoPage.tsx`
- `src/services/conveyors/documentDraftApiService.ts`
- `src/domain/argos/intent.ts`
- `src/domain/argos/ingest-request.types.ts`
- `src/domain/argos/ingest-response.types.ts`
- `src/domain/argos/draft-v1.types.ts`
- `src/domain/argos/warnings-taxonomy.types.ts`
- `src/routes/AppRoutes.tsx`

### 12.4 Testes relacionados

- `server/src/tests/document-draft.integration.test.ts`
- `server/src/tests/argosGatewayResponseMapper.test.ts`
- `server/src/tests/document-draft-pipeline.test.ts`
- `src/features/documentos/nova-esteira-documento/argosIssues.test.ts`
- `src/features/documentos/nova-esteira-documento/draftToCreateConveyorInput.test.ts`

## 13) Prompt sugerido para R6 S1

```
R6 S1 - Implementar evolucao de contrato para OS Bravo (sem quebrar 1.0.0).

Objetivo:
- Introduzir schemaVersion 1.1.0 para draft/document ingest.
- Adicionar blocos: sourceDocument, extractedItems, redaction, matchingPlan.
- Garantir regras de remocao de dados financeiros e pessoais.
- Manter endpoint /api/v1/conveyors/document-draft e intent conveyor_draft_from_document.
- Preservar revisao humana no SGP antes da criacao oficial.

Escopo tecnico:
1) Atualizar tipos de dominio em src/domain/argos/* para suportar 1.0.0 e 1.1.0.
2) Atualizar Zod schemas em server/src/modules/argos-integration/document-draft.schemas.ts.
3) Adaptar mapper remoto e pipeline local para preencher redaction e extractedItems.
4) Incluir matchingPlan inicial com suggestedAction e campos de rastreabilidade.
5) Atualizar frontend para renderizar itens reaproveitados/novos/ignorados sem alterar fluxo principal.
6) Atualizar testes backend/frontend de contrato e regressao.

Criterios:
- Sem regressao em payload 1.0.0.
- Sem dados financeiros/sensiveis no draft operacional.
- Novas atividades apenas quando sem match confiavel ou confirmacao humana.
```

