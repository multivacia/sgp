# AGENTS.md — SGP+ Web

## Propósito

Este repositório usa uma camada operacional de IA para acelerar demandas do SGP+ Web sem perder rastreabilidade, segurança operacional e controle humano.

## Regra soberana

Somente o agente `sgp-implementer` pode alterar código.

Agentes de contexto, impacto, especificação e revisão de testes devem operar em modo somente leitura. Eles podem ler arquivos, mapear riscos, escrever relatórios quando explicitamente solicitado, mas não devem editar produção nem testes.

## Fluxo recomendado para demandas médias/grandes

1. `sgp-context-reader`: mapear contexto real do código.
2. `sgp-impact-analyst`: avaliar impacto e riscos.
3. `sgp-feature-spec-writer`: transformar a demanda em spec curta e testável.
4. `sgp-implementer`: implementar somente a spec aprovada.
5. `sgp-test-reviewer`: reexecutar validações e conferir cobertura dos critérios de aceite.

## Gates

- Se o impacto for diferente de `SEGUIR`, parar e devolver para decisão humana.
- Nenhum merge em `develop` ou `main` deve ser feito por agente sem aprovação humana.
- Relatório em prosa não é prova. A prova é `git diff`, saída real de build/lint/testes e exit code.

## Convenções essenciais do SGP+ Web

- Backend é fonte da verdade para regra de negócio.
- Evitar refatoração oportunista.
- Preservar ciclo de vida oficial das esteiras.
- Preservar regra de planejamento semanal publicado como fonte da fila operacional.
- Preservar o isolamento do kiosk/produção.
- UX Bravo: reduzir digitação; priorizar listas, botões, atalhos e justificativas padronizadas.
- Impressão térmica: tickets operacionais podem imprimir direto via SGP Print Agent; demais documentos mantêm preview.
