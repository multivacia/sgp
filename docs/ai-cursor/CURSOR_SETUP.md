# Como usar este pacote no Cursor

## Instalação

Copie estas pastas/arquivos para a raiz do repositório `sgp-main`:

```text
.cursor/
docs/ai/
AGENTS.md
```

Depois abra o repositório no Cursor e confirme que as Rules, Skills e Subagents foram carregados.

## Estrutura

```text
.cursor/agents/
  sgp-context-reader.md
  sgp-impact-analyst.md
  sgp-feature-spec-writer.md
  sgp-implementer.md
  sgp-test-reviewer.md

.cursor/rules/
  sgp-guardrails.mdc
  sgp-architecture.mdc
  sgp-testing.mdc

.cursor/skills/
  sgp-feature-development/SKILL.md
  sgp-ticket-printing/SKILL.md

docs/ai/
  documentação neutra, templates e playbooks
```

## Uso recomendado

Para demanda média/grande, abra o Agent/Plan Mode no Cursor e peça explicitamente:

```text
Use o fluxo SGP+: context-reader -> impact-analyst -> spec-writer -> implementer -> test-reviewer.
Nenhum agente deve alterar código exceto o sgp-implementer.
```

Para ajuste pequeno e localizado, use o agente principal normalmente, mas mantenha os guardrails de escopo fechado.

## Observação

O Cursor evolui rápido. Se alguma chave de frontmatter de subagent não aparecer na UI, mantenha o corpo do prompt e ajuste as opções pela própria interface do Cursor.
