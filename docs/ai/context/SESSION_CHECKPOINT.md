# SESSION_CHECKPOINT — Continuidade entre sessões

> Arquivo de estado transitório.
> Deve ser sobrescrito/atualizado quando houver handoff entre chats ou contexto alto.
> Não usar como fonte da verdade sem validar Git e código.
> Manter compacto; alvo recomendado: até ~120 linhas.

## Identificação

- TASK_ID: `redesenho-ux-mobile`
- Atualizado em: `2026-10-17 UTC`
- Branch: `ccr-683413c7-571rnk`
- HEAD: ver `git log -1` (commit "feat(v2): Fase 5 — Tablet do colaborador …")
- Base/remoto relevante: `origin/ccr-683413c7-571rnk`
- Working tree: `clean` após o push da Fase 5

## Objetivo atual

SGP+ V2 (`apps/sgp-v2`, link `/V2`) — todas as fases 0–5 implementadas para demonstrar à gestora. V1 intocada.

## Estado em uma frase

Código das Fases 0–5 pronto e testado (20/20, build, lint, e2e headless); falta publicar em HML (nginx + deploy manual, aprovação humana).

## Concluído

- Fases 0 a 5 (ver `docs/v2/SGP_V2.md` §4 e §10–§16).

## Decisões já tomadas

- Ver `docs/v2/SGP_V2.md` §2 (regras) e §6 (decisões). Backend só da V1; nenhuma migration.

## Pendências

- Humanas: aplicar `deploy/nginx/sgp-v2.location.example` em HML; rodar `deploy-v2.yml` (homologacao).
- Decisões abertas: `docs/v2/SGP_V2.md` §8 (motivos reais, QR do ticket, token do tablet, corrigir apontamento, fotos reais).

## Próxima ação exata

- Aguardar o retorno da demonstração com a gestora / aprovação de deploy em HML.

## Não repetir

- Não alterar `src/` nem `server/` (guarda `guard-v1` no CI).
- Não usar `pkill -f` no shell da sessão (mata o shell); matar por PID.

## Referências úteis

- Documento vivo: `docs/v2/SGP_V2.md`
- Retorno: `docs/ai/returns/redesenho-ux-mobile-retorno.md` (§24–§31 = V2)
- Protótipo: https://claude.ai/artifact/QBY3svGbjp7ALeewX1w9n2

## Uso de contexto / sessão

- Percentual confiável disponível: `INDISPONÍVEL`
- Observação: não estimar percentuais quando a ferramenta não expuser a métrica.
