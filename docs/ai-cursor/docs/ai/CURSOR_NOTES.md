# Notas da versão Cursor

Esta versão adapta a camada original do Claude Code para Cursor.

## O que mudou

- `.claude/agents` foi substituído por `.cursor/agents`.
- Playbooks viraram skills em `.cursor/skills`.
- Guardrails gerais viraram rules em `.cursor/rules`.
- Foi adicionado `AGENTS.md` como contexto cruzado e curto.
- A documentação neutra em `docs/ai` foi preservada.

## Decisão importante

Os agentes de leitura/análise/spec/revisão foram marcados como readonly no prompt e no frontmatter. Ainda assim, permissões reais dependem da configuração da sessão no Cursor. Para demandas críticas, mantenha approvals ligados.
