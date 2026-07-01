# AGENTS.md — SGP+ Web

## Projeto

SGP+ Web é uma plataforma operacional para gestão de esteiras, matrizes, planejamento semanal, produção/kiosk, apontamentos, evolução operacional e impressão térmica.

O sistema está sendo implantado na Bravo Tapeçaria e faz parte do ecossistema ARGOS / Multivacia.

## Princípios

- Operação primeiro, visão depois.
- O sistema deve se adaptar à operação, não engessar o time.
- UX operacional deve exigir o mínimo possível de raciocínio extra do colaborador.
- Mudanças devem preservar o fluxo operacional existente.
- Separar análise, especificação, implementação e teste.
- Não alterar código sem escopo claro.
- Não misturar tickets operacionais com documentos que exigem preview.
- Toda alteração relevante deve considerar impacto em admin, gestor, colaborador e kiosk.

## Áreas principais

- Esteiras e matrizes;
- Planejamento semanal;
- Produção/kiosk;
- Apontamentos;
- Evolução das Esteiras;
- Impressão térmica;
- Permissões;
- Dashboard e saúde operacional.

## Camada neutra de IA

A camada neutra de instruções fica em:

`docs/ai/`

Estrutura:

- `agents/`: papéis especializados;
- `skills/`: conhecimento por domínio;
- `playbooks/`: fluxos de trabalho;
- `templates/`: formatos de saída.

## Regra principal

Somente o agente implementador pode alterar código, e apenas com escopo fechado.

Agentes de contexto, impacto, especificação e teste devem trabalhar sem modificar arquivos, salvo instrução explícita em contrário.

## Antes de implementar demandas médias ou grandes

1. Usar `sgp-context-reader` ou ler o contexto equivalente.
2. Usar `sgp-impact-analyst`.
3. Gerar especificação curta.
4. Implementar com escopo fechado.
5. Revisar testes e regressão.
6. Entregar relatório.

## Proibições

- Não fazer refatoração estética fora do escopo.
- Não alterar permissões sem análise.
- Não alterar ciclo de vida de esteira sem revisar impacto.
- Não alterar impressão global do navegador.
- Não quebrar preview de documentos não relacionados a tickets.
- Não criar novo padrão se já existir padrão equivalente no projeto.
- Não executar migrações sem instrução explícita.
- Não assumir comportamento sem indicar onde foi verificado.
