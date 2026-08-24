# CHANGELOG

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
