# CHANGELOG

## SGP+ v1.9.3 — 2026-08-25

Tipo: Evolução operacional / Planejamento semanal

Inclui:

- Alerta visual quando o planejamento diário excede a capacidade
  operacional do colaborador.
- Capacidade disponível desde a criação de um novo planejamento,
  antes do primeiro salvamento.
- Aplicação dos ajustes individuais de capacidade conforme a vigência.
- Planejamento e publicação continuam permitidos mesmo acima da
  capacidade.

## SGP+ v1.9.2 — 2026-08-25

Tipo: Correção operacional / Apontamento de horas

Inclui:

- Correção do salvamento de apontamentos com justificativa operacional
  selecionada.
- Aproveitamento da justificativa escolhida quando o backend identifica
  apontamento fora de sequência ou colaborador não alocado.
- Preservação da obrigatoriedade e validação das justificativas
  operacionais.

## SGP+ v1.9.1 — 2026-08-24

Tipo: Evolução operacional / Matriz de operações

Inclui:

- Seleção e edição do colaborador responsável na pré-visualização da matriz.
- Responsável opcional, filtrado pelos colaboradores ativos da equipe da atividade.
- Limpeza imediata do responsável ao trocar a equipe da atividade.

## SGP+ v1.9.0 — 2026-08-24

Tipo: Evolução operacional / Governança de atividades

Inclui:

- Dispensa operacional de atividades com preservação do histórico.
- Catálogo administrativo configurável de motivos de dispensa.
- Complemento obrigatório para motivos configurados com essa exigência.
- Responsável na atividade da matriz operacional.
- Melhorias nas consultas e alterações da estrutura das esteiras.
- Datas da esteira apresentadas sem horário.
- Justificativas operacionais sem seleção automática.
- Apontamento extra esteira sem motivo pré-selecionado.
- Preservação das correções do planejamento operacional.

Migrations relacionadas:

- 0050_conveyor_nodes_step_aborted.sql
- 0051_conveyor_step_abort_reasons.sql

## SGP+ v1.8.3 — 2026-07-09

Tipo: Fix visual / Rastreabilidade operacional

Inclui:
- Correção de contraste no tema `light-executive` para tela de apontamento/kiosk.
- Melhoria de legibilidade em alertas, badges, textos secundários e mensagens operacionais.
- Inclusão de identificação funcional de versão no app.
- Inclusão de ambiente visível: Produção, Homologação ou Desenvolvimento.
- Inclusão de endpoint de versão da API.
- Preparação dos deploys para informar versão, ambiente, commit e build time.
