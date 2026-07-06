# Notas Codex — SGP+ Web

## Adaptação para Codex

No Codex, a organização prática é:

- `AGENTS.md`: orientação persistente do projeto.
- `.codex/agents/*.toml`: custom agents/subagents do projeto.
- `.codex/config.toml`: configuração leve de subagents.
- `.agents/skills/*/SKILL.md`: skills repo-scoped.
- `docs/ai/`: documentação neutra e templates.

## Diferença em relação ao Claude/Cursor

- Claude Code costuma usar `.claude/agents/*.md`.
- Cursor costuma usar `.cursor/agents`, `.cursor/rules` e `.cursor/skills`.
- Codex usa `AGENTS.md`, `.codex/agents/*.toml` e `.agents/skills`.

## Convenção de nomes

Os nomes dos custom agents no Codex usam snake_case:

- `sgp_context_reader`
- `sgp_impact_analyst`
- `sgp_feature_spec_writer`
- `sgp_implementer`
- `sgp_test_reviewer`

## Prompt recomendado

```text
Use o fluxo SGP+ com subagents.
Contexto: sgp_context_reader.
Impacto: sgp_impact_analyst.
Spec: sgp_feature_spec_writer.
Implementação: somente sgp_implementer.
Revisão: sgp_test_reviewer.
```
