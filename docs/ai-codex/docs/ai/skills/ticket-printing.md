# Skill: ticket-printing

## Objetivo

Orientar análise, especificação, implementação e testes de funcionalidades relacionadas à impressão térmica de tickets operacionais do SGP+ Web.

## Contexto operacional conhecido

O SGP+ Web usa uma impressora térmica genérica de 80mm com guilhotina automática.

A decisão operacional atual é:

- tickets operacionais do SGP+ podem imprimir direto;
- demais documentos devem continuar com preview;
- o corte deve ocorrer por atividade impressa;
- a impressão direta deve passar pelo SGP Print Agent local;
- silent printing global no navegador não é o caminho preferido.

## Componentes envolvidos

Verificar, quando aplicável:

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
- agrupamento por colaborador;
- corte por atividade;
- tratamento de erro de impressora offline.
