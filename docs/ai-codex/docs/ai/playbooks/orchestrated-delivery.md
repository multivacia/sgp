# Playbook: orchestrated-delivery — Codex

## Objetivo

Entregar uma demanda média/grande do SGP+ Web com subagents, mantendo rastreabilidade e validação real.

## Papéis

| Etapa | Agente | Altera código? |
|---|---|---|
| Contexto | `sgp_context_reader` | Não |
| Impacto | `sgp_impact_analyst` | Não |
| Especificação | `sgp_feature_spec_writer` | Não |
| Implementação | `sgp_implementer` | Sim, único |
| Teste | `sgp_test_reviewer` | Não altera fonte |

## Fluxo

### 1. Contexto

Spawn `sgp_context_reader` para mapear arquivos, fluxo real e regras.

### 2. Impacto

Spawn `sgp_impact_analyst`.

- `SEGUIR`: continua.
- Outro veredito: para e devolve ao humano.

### 3. Spec

Spawn `sgp_feature_spec_writer` para gerar critérios de aceite verificáveis.

### 4. Implementação

Spawn `sgp_implementer`, único autorizado a alterar código.

### 5. Revisão

Spawn `sgp_test_reviewer` para reexecutar validações e conferir critérios.

### 6. Encerramento

Entregar resumo com diff, comandos, exit codes, critérios atendidos e riscos residuais.

Não fazer merge nem deploy sem aprovação humana.
