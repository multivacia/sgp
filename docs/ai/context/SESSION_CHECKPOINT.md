# SESSION_CHECKPOINT — Continuidade entre sessões

> Arquivo de estado transitório.
> Deve ser sobrescrito/atualizado quando houver handoff entre chats ou contexto alto.
> Não usar como fonte da verdade sem validar Git e código.
> Manter compacto; alvo recomendado: até ~120 linhas.

## Identificação

- TASK_ID: `promocao-main-deploy-producao-2026-10-16`
- Atualizado em: `2026-10-16 17:40 UTC`
- Branch: `ccr-fbc450f2-g81mhb` (a partir de `origin/main`)
- Base/remoto relevante: `origin/main` `c611d10f` · `origin/develop` `247b6985` · `origin/homol` `6b768c85`
- Working tree: `clean` após o commit do retorno

## Objetivo atual

Promover `develop` (1.9.9) para `main` e publicar em produção após a homologação da pesquisa `OS & Atividade` do Kiosk (PR #37).

## Estado em uma frase

**BLOQUEADO POR GATE** na Fase A: a `develop` tem outras frentes funcionais sem aceite documentado, e a pesquisa não pode sair isolada sem backport de `438f8a00`.

## Decisões já tomadas

- Nada promovido; `main`, `homol`, produção e banco intocados.
- Nenhum backport ou branch de release criado.

## Pendências

- Aceite humano: ajustes da Tati, apontamento só em planejadas, menu Ajuda/Manual, Guias, textos pt-BR (tabela no retorno).
- Decidir exposição de cliente/veículo/placa na fila do Kiosk (teste de contrato falha com banco).
- Corrigir fixture do teste `&` em `production-unassigned-time-entries.integration.test.ts` (falta item de plano publicado).
- Acesso à VPS bloqueado nesta sessão (proxy 403, sem SSH); migrations de `sgp_prod` não verificadas.
- `homol` 76 commits atrás de `main`.

## Próxima ação exata

Aguardar decisão humana: aceite integral da 1.9.9 **ou** autorização de release isolada. Depois, confirmar que `develop` não avançou (Fase B, item 6) e seguir para a Fase B.

## Não repetir

- Não interpretar merge de PR como homologação.
- Não promover sem backup validado de `sgp_prod`.
- Não force-push.

## Referências úteis

- Retorno: `docs/ai/returns/promocao-main-deploy-producao-2026-10-16-retorno.md`
- Prompt: `docs/ai/prompts/promocao-main-deploy-producao-2026-10-16.md`
- PR #37: https://github.com/multivacia/sgp/pull/37

## Uso de contexto / sessão

- Percentual confiável disponível: `INDISPONÍVEL`
