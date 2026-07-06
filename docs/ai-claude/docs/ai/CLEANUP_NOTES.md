# Notas da versão limpa

Esta árvore remove duplicações acidentais do pacote original:

- remove `mnt/user-data/outputs/...`;
- evita duplicar agentes dentro de `playbooks/`;
- centraliza templates em `docs/ai/templates/`;
- separa documentação neutra (`docs/ai/...`) dos adaptadores do Claude (`.claude/agents/...`);
- adiciona adaptador `.claude/agents/sgp-impact-analyst.md`, ausente no pacote original;
- remove `Bash` do `sgp-context-reader` para reduzir risco de alteração por agente de leitura.
