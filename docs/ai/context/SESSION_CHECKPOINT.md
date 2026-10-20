# SESSION_CHECKPOINT — Continuidade entre sessões

> Arquivo de estado transitório.
> Deve ser sobrescrito/atualizado quando houver handoff entre chats ou contexto alto.
> Não usar como fonte da verdade sem validar Git e código.
> Manter compacto; alvo recomendado: até ~120 linhas.

## Identificação

- TASK_ID: `hotfix-listagem-atividades-tati`
- Atualizado em: `2026-10-20 ~17:10 UTC`
- Branch: `hotfix/listagem-atividades-tati` (a partir de `origin/main` `40a519dd`)
- HEAD: ver `git log -1 origin/hotfix/listagem-atividades-tati`
- Base/remoto relevante: `origin/main`
- Working tree: `clean` após o commit

## Objetivo atual

Hotfix: atividades ausentes em Apontar horas (web/Kiosk) e no backlog do Planejamento, por LIMIT fixo sem continuação. Correção: paginação keyset + "Carregar mais".

## Estado em uma frase

Correção **implementada e validada em ambiente isolado** (dados sintéticos); **não homologada**; sem merge, deploy ou migration.

## Concluído

- Diagnóstico sintético: cortes exatos 50/51 (Ombreira → Forros de portas) e 100/101 (bancos traseiros → dianteiros).
- Backend:
  - candidatos em um único SQL (`UNION ALL` + `DISTINCT ON`), sem LIMIT interno;
  - cursor opaco e `nextCursor`;
  - cursor inválido → 400;
  - backlog com keyset e `meta.nextCursor`.
- Frontend:
  - hook `useCursorPagedList` (geração, anti-duplicidade e retry);
  - drawer, Kiosk e Planejamento com "Carregar mais";
  - correção de `handleCardPointTime`.
- Testes: integração em banco local (12 cenários, que falham na main), componentes, hook e visual (notebook/celular).

## Decisões já tomadas

- O Kiosk mantém página de 20 (apresentação inalterada).
- "Agenda da semana" ficou fora do escopo (mesmo endpoint; pendência registrada).
- Sem migration e sem índice.

## Pendências

- Homologação da Tati (roteiro no retorno).
- Verificação visual do Kiosk.
- Desempenho com o volume de produção.
- Agenda da semana.
- Falhas preexistentes no servidor:
  - `env.test`;
  - `weekly-view.http` (`=SUM`).
- Depois da aprovação: PR para `main` e reconciliação na `develop` em operação separada.

## Próxima ação exata

- Homologar `hotfix/listagem-atividades-tati` em ambiente isolado e registrar o aceite.

## Não repetir

- Não reintroduzir LIMIT por origem nos candidatos.
- Não usar offset.
- Não force-push.
- Não rodar lint com `server/dist` presente: ele gera 29 erros falsos.

## Referências úteis

- Retorno: `docs/ai/returns/hotfix-listagem-atividades-tati-retorno.md`
- Prompt: `docs/ai/prompts/hotfix-listagem-atividades-tati.md`

## Uso de contexto / sessão

- Percentual confiável disponível: `INDISPONÍVEL`
- Observação: não estimar percentuais quando a ferramenta não expuser a métrica.
