# SESSION_CHECKPOINT — Continuidade entre sessões

> Estado transitório. Validar Git e código antes de retomar.

## Identificação

- TASK_ID: `manual-usuario-sgp-cap12-jornada-gerencial`
- Atualizado em: `2026-10-03 21:26 UTC`
- Repositório: `multivacia/sgp`
- Branch: `docs/manual-usuario-sgp-cap12-jornada-gerencial`
- SHA base: `1ea1465fc2a173335212963135884b7b2eb9c415` (tip de `origin/docs/manual-usuario-sgp-cap11-minha-jornada`, igual ao esperado)
- Tip final: obtido pela referência da branch (`git rev-parse origin/docs/manual-usuario-sgp-cap12-jornada-gerencial`); não pode constar dentro de si
- Estado: concluído e publicado; working tree limpo.

## Objetivo e escopo

Enriquecer somente o capítulo 12 de `MANUAL_USUARIO_SGP.md`, auditando o código atual da Jornada por colaborador, e corrigir a linha de situação do cabeçalho.
Sem alteração da aplicação, PR, merge, rebase, force-push ou exclusão de branches.

## Concluído

- Base do capítulo 11 reconferida por `git fetch`: tip igual ao esperado, sem divergência.
- Jornada Gerencial auditada no código: tela, seleção múltipla, serviço, consultas, exportação, permissões e tela de correção.
- Capítulo 12 escrito com os seis blocos, 410 linhas, 3 marcadores de imagem, sem termos técnicos proibidos.
- Linha de situação do cabeçalho corrigida: concluídos 1–3, 5, 7–13, 20, 21; pendentes 4, 6, 14–19.
- Capítulo 21 complementado com duas divergências novas e três linhas de ajuste de texto.
- Matriz técnica reconferida: nenhuma correção necessária, arquivo não alterado.
- Validações Git e editoriais executadas e registradas no retorno.

## Achados que não devem ser esquecidos

- **Defeito aberto (confirmado também no caminho gerencial):** a consulta de atividades por colaborador não seleciona a quantidade prevista; o mapeamento assume 1 unidade. Subestima previsto e pendências e **infla a cobertura**; propaga para a exportação. Registrado nos capítulos 12 e 21.
- Jornada Gerencial **não tem botão Atualizar** e não recarrega após correção; a consulta só é refeita ao mudar seleção/período/esteira ou recarregar a página.
- **Volta do Apontamento gerencial vai ao Dashboard** quando aberto pela jornada: só a origem "esteira" é reconhecida.
- Total de pendências de tempo existe no contrato mas **não é exibido na tela**; lista limitada a 48. O total está na exportação.
- **Em aberto** e **Em risco** se sobrepõem: alocação em atraso aparece nas duas listas.
- Contagem por situação no painel de atraso omite *em planejamento* e *cancelada*.
- Cobertura ≠ acumulado ÷ previsto dos cartões: universos diferentes (só alocadas × todas).
- Extra Esteira ignora o filtro de esteira e fica fora do realizado e da cobertura; até 3 descrições.
- Histórico fixo em 20 linhas no conjunto; exportação sem limite de linhas.
- Tetos distintos: tela 20 colaboradores; contrato de exportação 50 — pela interface o efetivo é 20.
- "Mês atual (UTC)" segue com rótulo incorreto (VAL-017); cálculo em São Paulo.
- Previsto inclui alocações de esteiras finalizadas/canceladas e atividades concluídas/dispensadas.

## Próxima ação exata

Nenhuma pendência nesta atividade. Em atividades futuras e separadas:

1. Decisão humana sobre a correção do defeito de quantidade prevista (código).
2. Decisão humana sobre VAL-017 e sobre o retorno do Apontamento gerencial.
3. **Capítulo 6 — Esteiras**, a partir desta branch publicada.

## Referências úteis

- `docs/ai/returns/manual-usuario-sgp-cap12-jornada-gerencial-retorno.md`
- `docs/manual/source/MANUAL_USUARIO_SGP.md`, capítulos 12 e 21
- `docs/manual/source/MANUAL_FUNCIONAL_SGP.md`, JOG-001/003, 45.7, 45.8, VAL-017
- `src/features/gestor/JornadaColaboradorGestorPage.tsx`; `server/src/modules/operational-journey/`

## Não repetir / limites

Não repetir auditoria completa sem mudança da base. Não editar retornos históricos.
Preservar `main`, `develop`, `homol` e toda a cadeia documental anterior.
Fonte de verdade: código no tip confirmado, não checkpoint ou relatório antigo.

## Uso de contexto / sessão

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
