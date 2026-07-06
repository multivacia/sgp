---
name: sgp-feature-development
description: Use para demandas médias/grandes do SGP+ Web que precisam de fluxo disciplinado: contexto, impacto, spec, implementação, testes e relatório. Não use para ajustes triviais de texto/CSS isolado.
---

# Skill: SGP+ feature development

## Objetivo

Conduzir uma demanda do SGP+ Web com rastreabilidade, controle de escopo e validação real.

## Fluxo obrigatório

1. Contexto com `sgp_context_reader`.
2. Impacto com `sgp_impact_analyst`.
3. Se o veredito for `SEGUIR`, spec com `sgp_feature_spec_writer`.
4. Implementação somente com `sgp_implementer`.
5. Revisão independente com `sgp_test_reviewer`.

## Gates

- Se impacto for `SEGUIR`: pode continuar.
- Se impacto for `SEGUIR COM AJUSTES`, `BLOQUEAR ATÉ ESCLARECER` ou `NÃO IMPLEMENTAR`: pare e devolva ao Gustavo.
- Se teste for `PASSA`: entregue relatório final.
- Se teste for `PASSA COM RESSALVAS` ou `REPROVA`: volte para correção no máximo 2 ciclos.

## Definition of done

A entrega só está pronta quando existir:

- spec com critérios de aceite;
- diff objetivo;
- testes ou validação manual explícita;
- comandos executados com exit code;
- relatório final com riscos residuais;
- nenhuma alteração fora de escopo.

## Anti-zoológico

Não acione todos os agentes para mudança trivial.
Use este fluxo para demanda com risco real de regressão, impacto operacional ou múltiplos módulos.
