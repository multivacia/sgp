# Relatório de organização do pacote `agentes.zip`

## Diagnóstico

O pacote enviado misturava três coisas diferentes:

1. Camada de agentes (`.claude`, `.cursor`, `.codex`, `.agents`, `AGENTS.md`).
2. Código/projeto do `sgp-print-agent`.
3. Artefatos locais de desenvolvimento (`node_modules`, `dist`, `logs`, `.env`, arquivos temporários e configurações de IDE).

Isso cria risco de:

- versionar dependências e binários desnecessários;
- subir arquivo local sensível ou semi-sensível;
- confundir agentes com código de produto;
- duplicar instruções divergentes;
- fazer a IA ler contexto errado.

## O que foi removido do pacote organizado

- `sgp-print-agent/node_modules/`
- `sgp-print-agent/dist/`
- `sgp-print-agent/logs/`
- `.env`, `.env.production` e configurações locais reais
- `tmp.txt`
- arquivos de template Vite/React que não pertencem à camada de agentes
- `.vscode/`
- `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`
- regra duplicada `argos-rules.mdc` foi consolidada nas regras SGP do Cursor

## O que ficou

- 5 papéis oficiais de agentes.
- 2 skills oficiais.
- 3 rules persistentes para Cursor.
- Adaptadores separados para Claude, Cursor e Codex.
- Documentação neutra em `docs/ai/`.
- Arquivos de instalação/checklist.

## Decisão de arquitetura

A camada neutra fica em `docs/ai/`.

As pastas `.claude/`, `.cursor/`, `.codex/` e `.agents/` são apenas adaptadores para as ferramentas.
