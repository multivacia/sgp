# AGENTS.md — SGP+ Web / ARGOS

## Propósito

Este repositório usa uma camada operacional de IA para acelerar demandas do SGP+ Web sem perder rastreabilidade, segurança operacional e controle humano.

A camada é **multi-ferramenta**: Claude, Cursor e Codex podem usar os mesmos papéis, mas cada ferramenta tem seu adaptador próprio.

## Regra soberana

Somente o agente implementador pode alterar código-fonte:

- Claude/Cursor: `sgp-implementer`
- Codex: `sgp_implementer`

Agentes de contexto, impacto, especificação e revisão são somente leitura para código-fonte. Eles podem ler arquivos, mapear riscos, escrever relatórios quando explicitamente solicitado e sugerir testes, mas não devem editar produção nem testes.

## Fonte da verdade

- `docs/ai/` é a documentação neutra.
- `.claude/`, `.cursor/`, `.codex/` e `.agents/` são adaptadores de ferramenta.
- Se houver conflito entre adaptador e `docs/ai/`, pare e peça decisão humana.
- Se houver conflito entre IA e código real, o código real vence.

## Fluxo recomendado para demandas médias/grandes

1. `sgp-context-reader` / `sgp_context_reader`: mapear contexto real do código.
2. `sgp-impact-analyst` / `sgp_impact_analyst`: avaliar impacto, risco e regressão.
3. `sgp-feature-spec-writer` / `sgp_feature_spec_writer`: transformar a demanda em spec curta, testável e aprovada.
4. `sgp-implementer` / `sgp_implementer`: implementar somente a spec aprovada.
5. `sgp-test-reviewer` / `sgp_test_reviewer`: validar build, testes, regressão e critérios de aceite.

Demandas pequenas podem pular o fluxo completo, desde que tenham escopo fechado e não alterem regra de negócio, banco, permissões, ciclo de vida, planejamento semanal, produção/kiosk ou impressão térmica.

## Gates de segurança

- Se o impacto for diferente de `SEGUIR`, parar e devolver para decisão humana.
- Nenhum agente faz merge, deploy, alteração de secret ou migração em ambiente compartilhado sem aprovação humana.
- Relatório em prosa não é prova. A prova é `git diff`, saída real de build/lint/testes e exit code.
- Não maquiar falha de teste/build. Falhou = falhou.
- Não fazer refatoração oportunista fora do escopo.
- Não criar padrão novo quando já existir padrão equivalente no projeto.

## Convenções essenciais do SGP+ Web

- Backend é fonte da verdade para regra de negócio.
- Preservar ciclo de vida oficial das esteiras.
- Preservar regra de planejamento semanal publicado como fonte da fila operacional.
- Preservar sequência estrutural da esteira e regras de apontamento fora de sequência.
- Preservar isolamento do kiosk/produção.
- UX Bravo: reduzir digitação; priorizar listas, botões, atalhos e justificativas padronizadas.
- Impressão térmica: tickets operacionais podem imprimir direto via SGP Print Agent; demais documentos mantêm preview.

## Anti-zoológico

Todo Markdown nasce culpado até provar utilidade.

Um arquivo só deve existir se tiver objetivo claro, quando usar, quando não usar, entrada esperada, saída esperada e relação com demanda real do SGP+.
