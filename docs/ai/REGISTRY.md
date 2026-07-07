# Registry — Camada de IA do SGP+ Web

## Papéis oficiais

| Papel | Claude/Cursor | Codex | Pode alterar código? | Função |
|---|---|---|---:|---|
| Contexto | `sgp-context-reader` | `sgp_context_reader` | Não | Mapeia arquivos, fluxo atual e regras envolvidas. |
| Impacto | `sgp-impact-analyst` | `sgp_impact_analyst` | Não | Avalia risco, regressão, permissões, banco e acoplamentos. |
| Spec | `sgp-feature-spec-writer` | `sgp_feature_spec_writer` | Não | Escreve escopo, critérios de aceite e plano de validação. |
| Implementação | `sgp-implementer` | `sgp_implementer` | Sim | Implementa somente a spec aprovada. |
| Teste/revisão | `sgp-test-reviewer` | `sgp_test_reviewer` | Não para código-fonte | Roda/analisa build, testes e regressões. |

## Skills oficiais

| Skill | Onde fica | Uso |
|---|---|---|
| Desenvolvimento de feature | `.cursor/skills/sgp-feature-development/` e `.agents/skills/sgp-feature-development/` | Fluxo ponta a ponta para demandas médias/grandes. |
| Impressão de tickets | `.cursor/skills/sgp-ticket-printing/` e `.agents/skills/sgp-ticket-printing/` | Mudanças relacionadas a tickets, preview, térmica e SGP Print Agent. |

## Regras de duplicação permitida

A documentação neutra fica em `docs/ai/`.

Duplicação só é aceita quando a ferramenta exige caminho/formato próprio:

- Claude: `.claude/agents/*.md`
- Cursor: `.cursor/agents/*.md`, `.cursor/rules/*.mdc`, `.cursor/skills/*/SKILL.md`
- Codex: `.codex/agents/*.toml`, `.agents/skills/*/SKILL.md`

Duplicação não aceita:

- templates dentro de `.claude/agents/`;
- playbooks dentro de `agents/`;
- cópias geradas com caminhos temporários;
- `node_modules`, `dist`, `logs`, `.env` ou código-fonte dentro de pacote de agentes.
