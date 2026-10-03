# SESSION_CHECKPOINT — Continuidade entre sessões

> Estado transitório. Validar Git e código antes de retomar.

## Identificação

- TASK_ID: `manual-usuario-sgp-cap11-minha-jornada`
- Atualizado em: `2026-10-03 20:46 UTC`
- Repositório: `multivacia/sgp`
- Branch: `docs/manual-usuario-sgp-cap11-minha-jornada`
- SHA base: `673a65e613442b9b8c58c7a31d2401d04962a3c8`
- SHA do commit de conteúdo: `__SHA_CONTEUDO__`
- Tip final: `__SHA_TIP__`
- Estado: concluído e publicado; working tree limpo.

## Objetivo e escopo

Enriquecer somente o capítulo 11 de `MANUAL_USUARIO_SGP.md`, com auditoria do código atual.
Sem alteração da aplicação, PR, merge, force-push ou exclusão de branches.

## Concluído

- Base do capítulo 10 reconferida por `git fetch` nativo: tip `673a65e6…`, publicado.
- Ancestralidade das 8 branches da cadeia documental confirmada por `git merge-base --is-ancestor`.
- Patch integral do repasse verificado por SHA-256 (`89900d58…`) e aplicado sem força.
- Pontos críticos reconferidos no código da base: nenhuma divergência contra o repasse.
- Validações Git e editoriais executadas e registradas no retorno.
- Capítulo 11, matriz, retorno e checkpoint commitados e publicados na branch do capítulo 11.

## Achados que não devem ser esquecidos

- Previsto estrutural por atribuição direta, sem plano semanal/período.
- **Defeito aberto:** o SELECT de `listActivitiesRawForCollaborator` omite `step.planned_quantity`; o mapeamento assume 1 unidade, subestimando previsto e cobertura.
- Realizado usa minutos e data de realização; excluídos não contam; quantidade não multiplica tempo.
- Extra Esteira e cobertura são calculados, mas não aparecem na Minha Jornada.
- Coluna Concluídas sem fonte de itens encerrados; cartões seguem o bucket da esteira.
- Botão Apontar não leva período/filtro; sucesso volta ao padrão de 7 dias.
- "Mês atual (UTC)" exibido na própria jornada; cálculo do mês é São Paulo (VAL-017).
- Jornada não atualiza continuamente nem ao fechar a gaveta global.

## Próxima ação exata

Nenhuma pendência nesta atividade. Em atividades futuras e separadas:

1. Decisão humana sobre a correção do defeito de quantidade prevista (código).
2. Decisão humana sobre VAL-017.
3. Capítulo 12 a partir desta branch publicada.

## Referências úteis

- `docs/ai/returns/manual-usuario-sgp-cap11-minha-jornada-retorno.md`
- `docs/manual/source/MANUAL_USUARIO_SGP.md`, capítulo 11
- `docs/manual/source/MANUAL_FUNCIONAL_SGP.md`, JOR-001/003, 45.3–45.7, VAL-017

## Não repetir / limites

Não repetir auditoria completa sem mudança da base. Não editar retornos históricos.
Preservar `main`, `develop`, `homol` e toda a cadeia documental anterior.
Os SHAs da sessão de origem (`ff338e38…`, `b17cbbfe…`) nunca foram publicados; usar apenas como auditoria.
Fonte de verdade: código no tip confirmado, não checkpoint ou relatório antigo.

## Uso de contexto / sessão

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
