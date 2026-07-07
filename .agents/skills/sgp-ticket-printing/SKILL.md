---
name: sgp-ticket-printing
description: Use quando a demanda envolver impressão térmica, tickets operacionais, SGP Print Agent, planejamento semanal, agrupamento por tarefa/responsável ou preview de documentos.
---

# Skill: SGP+ ticket printing

## Contexto operacional

O SGP+ Web usa uma impressora térmica genérica de 80mm com guilhotina automática.

Decisão operacional atual:

- tickets operacionais do SGP+ podem imprimir direto;
- demais documentos devem continuar com preview;
- corte deve ocorrer por atividade impressa;
- impressão direta deve passar pelo SGP Print Agent local;
- silent printing global no navegador não é o caminho preferido.

## Componentes a verificar

- frontend de esteiras;
- frontend de planejamento semanal;
- componentes de ticket;
- integração com SGP Print Agent;
- endpoint local `127.0.0.1:8765`;
- rotas `/health` e `/print/*`;
- configuração de impressora;
- token de autenticação;
- CORS;
- agrupamento por tarefa;
- agrupamento por colaborador/responsável;
- corte por atividade;
- tratamento de erro de impressora offline.

## Riscos comuns

- quebrar preview de documentos que não são tickets;
- criar dependência global de silent printing;
- imprimir tickets duplicados;
- não respeitar agrupamento;
- não tratar impressora offline;
- vazar token do print-agent;
- misturar impressão de planejamento com impressão de execução.

## Testes esperados

Verificar:

- impressão manual de uma atividade;
- impressão de tickets de uma esteira;
- impressão agrupada por tarefa;
- impressão agrupada por colaborador/responsável;
- impressão do planejamento semanal;
- falha do SGP Print Agent;
- ausência de impressora configurada;
- manutenção do preview para documentos não operacionais.
