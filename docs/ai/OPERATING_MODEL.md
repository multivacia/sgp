# Modelo operacional — IA no SGP+ Web

## Ideia central

Não é um enxame livre de agentes. É uma linha de produção com gates.

```text
Demanda
  → Contexto
  → Impacto
  → Spec
  → Implementação
  → Teste/Revisão
  → Aprovação humana
```

## Quando usar fluxo completo

Use o fluxo completo quando a demanda tocar:

- regra de negócio;
- backend;
- banco/migrations;
- permissões/RBAC;
- planejamento semanal;
- sequência operacional;
- kiosk/produção;
- impressão térmica;
- fluxo publicado para colaboradores;
- telas críticas da Bravo.

## Quando não usar fluxo completo

Não acione todos os agentes para:

- texto/label simples;
- CSS isolado sem regra de negócio;
- correção pequena e evidente;
- ajuste em documentação sem impacto operacional.

Mesmo nesses casos, o escopo deve ser fechado e a validação deve ser real.

## Vereditos do impacto

- `SEGUIR`: pode gerar spec e implementar.
- `SEGUIR_COM_RESTRICOES`: precisa listar restrições e confirmar com humano.
- `PARAR`: não implementar até decisão humana.

## Critério de pronto

Uma entrega só está pronta quando houver:

- escopo atendido;
- diff revisável;
- testes/builds relevantes executados;
- falhas explicitadas;
- regressões críticas consideradas;
- aprovação humana antes de merge/deploy.
