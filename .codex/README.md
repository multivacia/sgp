# Codex Operating Layer — SGP+ Web

Camada operacional do Codex para o SGP+ Web.

## Peças

- `config.toml`: configuração leve de subagents.
- `agents/`: custom agents do Codex, em TOML.
- `../.agents/skills/`: skills reutilizáveis do Codex.
- `../AGENTS.md`: regras persistentes do projeto.

## Regra principal

Somente `sgp_implementer` altera código-fonte.

## Uso sugerido

Peça explicitamente ao Codex para usar os agentes:

```text
Use o fluxo SGP+ e spawn os subagents apropriados: contexto, impacto, spec, implementação e revisão de testes.
```

O Codex só cria subagents quando você pede explicitamente.
