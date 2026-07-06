---
name: sgp-feature-development
description: Fluxo guiado para desenvolver demandas médias/grandes do SGP+ Web com contexto, impacto, spec, implementação e revisão de testes.
---

# Skill: SGP+ Feature Development

Use esta skill quando a demanda tocar mais de um módulo ou envolver regra de negócio do SGP+ Web.

## Quando usar

- Esteiras, matrizes e estrutura operacional.
- Planejamento semanal.
- Produção/kiosk.
- Apontamentos de horas.
- Permissões.
- Impressão térmica.
- Dashboard/evolução.
- Banco de dados.

## Quando não usar

- Troca simples de texto.
- Ajuste visual isolado.
- Correção de uma linha com arquivo já localizado.

## Fluxo

1. Use `sgp-context-reader` para mapear contexto.
2. Use `sgp-impact-analyst` para classificar o impacto.
3. Se o impacto for diferente de `SEGUIR`, pare e devolva ao humano.
4. Use `sgp-feature-spec-writer` para criar uma spec curta.
5. Use `sgp-implementer` para alterar código e testes.
6. Use `sgp-test-reviewer` para validar independentemente.

## Gates

- O implementador é o único que altera código.
- O revisor não altera código.
- A aprovação final é humana.

## Saídas esperadas

- Context map.
- Impact report.
- Spec.
- Implementation report.
- Test report.
