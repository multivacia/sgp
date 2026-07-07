---
name: sgp-ticket-printing
description: Orienta análise e implementação de impressão térmica de tickets operacionais no SGP+ Web.
---

# Skill: SGP+ Ticket Printing

Use esta skill quando a demanda envolver impressão de tickets, planejamento semanal, impressão dentro da esteira ou integração com o SGP Print Agent.

## Contexto operacional

- Impressora térmica genérica 80mm com guilhotina automática.
- Tickets operacionais do SGP+ podem imprimir direto.
- Demais documentos devem continuar com preview.
- Impressão direta passa pelo SGP Print Agent local.
- Endpoint local esperado: `127.0.0.1:8765`.
- Corte deve ocorrer por atividade.

## Verificar componentes

- Frontend de esteiras.
- Frontend de planejamento semanal.
- Componentes de ticket.
- Integração com SGP Print Agent.
- Rotas `/health` e `/print/*`.
- Configuração de impressora, token e CORS.
- Agrupamento por tarefa.
- Agrupamento por colaborador/responsável.
- Tratamento de erro de impressora offline.

## Regras funcionais

- Não quebrar preview de documentos que não são tickets.
- Não criar dependência global de silent printing no navegador.
- Não duplicar tickets.
- Respeitar agrupamento escolhido.
- Na impressão semanal, considerar atividades planejadas para o período.
- Na impressão dentro da esteira, considerar estrutura da esteira selecionada.

## Testes esperados

- Impressão de uma atividade.
- Impressão de tickets de uma esteira.
- Agrupamento por tarefa.
- Agrupamento por colaborador/responsável.
- Impressão do planejamento semanal.
- Falha do SGP Print Agent.
- Ausência de impressora configurada.
- Preview preservado para documentos não operacionais.
