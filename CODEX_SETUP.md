# Setup Codex — SGP+ Web

## Onde instalar

Descompacte este pacote na raiz do repositório `sgp-main` / `sgp-argos`, no mesmo nível de `package.json`, `src/` e `server/`.

A raiz do repositório deve ficar assim:

```text
AGENTS.md
CODEX_SETUP.md
.codex/
.agents/
docs/ai/
src/
server/
package.json
```

## O que este pacote contém

```text
.codex/
  config.toml
  agents/
    sgp-context-reader.toml
    sgp-impact-analyst.toml
    sgp-feature-spec-writer.toml
    sgp-implementer.toml
    sgp-test-reviewer.toml

.agents/skills/
  sgp-feature-development/SKILL.md
  sgp-ticket-printing/SKILL.md

AGENTS.md
docs/ai/
```

## Como validar se o Codex carregou

Na raiz do repositório, abra o Codex app ou rode no terminal:

```bash
codex "Liste as instruções de AGENTS.md, os custom agents e as skills disponíveis para este projeto. Não altere arquivos."
```

Resposta esperada: o Codex deve citar `AGENTS.md`, os agentes `sgp_context_reader`, `sgp_impact_analyst`, `sgp_feature_spec_writer`, `sgp_implementer`, `sgp_test_reviewer` e as skills `sgp-feature-development` e `sgp-ticket-printing`.

## Prompt operacional recomendado

Para demanda média/grande:

```text
Use o fluxo SGP+.
Primeiro faça contexto com sgp_context_reader.
Depois impacto com sgp_impact_analyst.
Se o veredito for SEGUIR, gere spec com sgp_feature_spec_writer.
Depois implemente somente com sgp_implementer.
Por fim valide com sgp_test_reviewer.
Não faça merge nem deploy.
```

Para demanda pequena:

```text
Faça uma alteração mínima e localizada, respeitando AGENTS.md. Não acione o fluxo completo se for apenas texto, label ou CSS isolado sem regra de negócio.
```

## Observação importante

No Codex, `AGENTS.md` é a orientação persistente do projeto. Os subagentes ficam em `.codex/agents/` como arquivos TOML. As skills ficam em `.agents/skills/` como diretórios com `SKILL.md`.
