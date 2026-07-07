# Cursor Operating Layer — SGP+ Web

Esta pasta contém a adaptação Cursor da camada operacional de IA do SGP+ Web.

## Peças

- `agents/`: subagents especializados.
- `rules/`: regras persistentes do projeto.
- `skills/`: workflows e conhecimento acionável por demanda.

## Regra principal

Somente `sgp-implementer` altera código.

## Uso sugerido

Em demandas médias/grandes, peça ao Cursor:

```text
Use o fluxo SGP+ e delegue para os subagents apropriados. Primeiro contexto, depois impacto, depois spec, depois implementação, depois revisão de testes.
```

Em demandas pequenas, mantenha escopo fechado e use as rules gerais.
