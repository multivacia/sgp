# Cursor Operating Layer — SGP+ Web

Esta pasta contém a adaptação Cursor da camada operacional de IA do SGP+ Web.

## Peças

- `agents/`: subagents especializados.
- `rules/`: regras persistentes do projeto.
- `skills/`: workflows e conhecimento acionável por demanda.

## Regra principal

Somente `sgp-implementer` altera código.

## Uso sugerido

Para demanda média/grande:

```text
Use o fluxo SGP+. Primeiro contexto, depois impacto, depois spec, depois implementação, depois revisão de testes. Só o sgp-implementer pode alterar código.
```

Para demanda pequena:

```text
Faça alteração mínima e localizada, respeitando AGENTS.md. Não acione o fluxo completo se for apenas texto, label ou CSS isolado sem regra de negócio.
```
