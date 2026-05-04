# R6 S7 - Auditoria das decisoes de revisao

## Objetivo

Persistir rastreabilidade minima e segura das decisoes de revisao humana da importacao Bravo por documento, sem alterar o fluxo funcional de criacao da esteira.

## Onde persiste

- A auditoria e enviada no `POST /api/v1/conveyors` no campo:
  - `metadata.documentReviewAudit`
- O backend persiste dentro de `conveyors.metadata_json.documentReviewAudit`.
- Nao houve migration: reaproveitamos `metadata_json` ja existente.

## Estrutura persistida

```json
{
  "schemaVersion": "r6_document_review_audit_v1",
  "source": {
    "provider": "BRAVO",
    "documentType": "OS_OR_BUDGET",
    "documentNumber": "7452",
    "requestId": "req-...",
    "correlationId": "corr-..."
  },
  "summary": {
    "totalServiceItems": 9,
    "reusedCount": 4,
    "acceptedSimilarCount": 2,
    "selectedAlternativeCount": 1,
    "createNewConfirmedCount": 2,
    "ignoredCount": 1
  },
  "decisions": [
    {
      "index": 0,
      "extractedServiceDescription": "REVESTIMENTO COMPLETO BANCO...",
      "finalDecision": "ACCEPT_SUGGESTED",
      "finalSourceOrigin": "reaproveitada",
      "matchedMatrixNodeId": "uuid-ou-null",
      "selectedAlternativeMatrixNodeId": "uuid-ou-null",
      "plannedMinutes": 180,
      "confidence": 0.91
    }
  ]
}
```

## Campos permitidos

- Origem do documento: provider, tipo, numero, requestId, correlationId.
- Resumo numerico de decisoes.
- Decisao por item com:
  - descricao operacional sanitizada;
  - decisao final;
  - origem final (`manual`/`reaproveitada`);
  - ids de matriz (quando houver);
  - `plannedMinutes` final;
  - `confidence`.

## Campos proibidos

- PDF bruto / texto bruto;
- `clientName`, `licensePlate`;
- CPF/CNPJ, telefone, e-mail, endereco, CEP, chassi;
- dados financeiros/comerciais (`R$`, pagamento, desconto, troco etc.);
- `partItems`;
- `candidateLines`, `debug*` e metadados de debug.

## Validacao de seguranca

- Frontend monta auditoria com helper puro e valida:
  - `buildDocumentReviewAuditPayload(...)`
  - `validateDocumentReviewAuditIsSafe(...)`
- Backend aplica allowlist estrita (Zod `strict`) em `metadata.documentReviewAudit`.
- Backend rejeita strings com tokens proibidos em campos textuais da auditoria.

## Limitacoes atuais

- Auditoria fica persistida para governanca/suporte, mas ainda nao ha tela dedicada para exibicao amigavel.
- O detalhe atual da esteira nao expoe o JSON bruto da auditoria.

## Proximos passos (S8)

- Expor leitura segura da auditoria em endpoint/detalhe com DTO especifico.
- Criar UX de timeline/auditoria por item sem vazar dados sensiveis.
- (Opcional) assinatura/versao de auditoria para trilha de governanca ampliada.

