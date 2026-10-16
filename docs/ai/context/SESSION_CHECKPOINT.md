# SESSION_CHECKPOINT — Continuidade entre sessões

> Arquivo de estado transitório.
> Deve ser sobrescrito/atualizado quando houver handoff entre chats ou contexto alto.
> Não usar como fonte da verdade sem validar Git e código.
> Manter compacto; alvo recomendado: até ~120 linhas.

## Identificação

- TASK_ID: `release-tati-kiosk-main-2026-10-16`
- Atualizado em: `2026-10-16 19:20 UTC`
- Branch: `release/tati-kiosk-main-2026-10-16` (a partir de `origin/main` `c611d10f`)
- HEAD: ver `git log -1 origin/release/tati-kiosk-main-2026-10-16`
- Base/remoto relevante: `origin/main`
- Working tree: `clean` após o commit de docs

## Objetivo atual

Release candidata para `main` com os itens 1–10 da Tati e a pesquisa `OS & atividade` do Kiosk, **sem** a regra de apontamento somente em atividade planejada.

## Estado em uma frase

Candidata **PRONTA PARA HOMOLOGAR**; PR aberta para `main`, **sem merge**, sem deploy.

## Concluído

- Cherry-pick com `-x` de `935dc943` e `438f8a00` (Tati) e de `f4d38a42`, `ba9adf06` e `4a0bc0bf` (Kiosk).
- Gate de privacidade: fila do Kiosk sem cliente, veículo e placa; contrato testado com lista não vazia.
- Item 1: Guias Práticos no menu "? Ajuda" (só os guias; sem manual integrado nem ajuda contextual).
- `verify:deploy` exit 0; servidor com banco sem falha nova contra a `main`.
- Versão proposta: 1.10.0 (commit isolado e revertível).

## Decisões já tomadas

- A regra `apontamento-somente-planejado` ficou fora (os commits do Kiosk são anteriores a ela).
- O plugin de Vite manteve o nome da `develop` para facilitar a integração.

## Pendências

- Homologação humana item a item (roteiro no retorno).
- Decidir:
  - Kiosk sem busca por cliente, veículo e placa;
  - dados sensíveis preexistentes em "Outra atividade";
  - versão 1.10.0.
- Gate de produção (prompt, seção 8) não iniciado.
- Integração posterior com a `develop`: ver o plano no retorno, que inclui `seedPublishedPlanItem` no teste `&` de "Outra atividade" na `develop`.
- Falhas preexistentes:
  - `env.test` (espera 1.9.4);
  - `weekly-view.http` (`=SUM`).

## Próxima ação exata

- Homologar a candidata em ambiente isolado e registrar o aceite na PR.

## Não repetir

- Não fazer merge da `develop` inteira na release.
- Não reintroduzir cliente, veículo e placa na fila do Kiosk.
- Não force-push.

## Referências úteis

- Retorno da atividade: `docs/ai/returns/release-tati-kiosk-main-2026-10-16-retorno.md`
- Prompt da atividade: `docs/ai/prompts/release-tati-kiosk-main-2026-10-16.md`

## Uso de contexto / sessão

- Percentual confiável disponível: `INDISPONÍVEL`
- Observação: não estimar percentuais quando a ferramenta não expuser a métrica.
