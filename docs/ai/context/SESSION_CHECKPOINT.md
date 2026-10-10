# SESSION_CHECKPOINT — Continuidade entre sessões

> Arquivo de estado transitório.
> Deve ser sobrescrito/atualizado quando houver handoff entre chats ou contexto alto.
> Não usar como fonte da verdade sem validar Git e código.
> Manter compacto; alvo recomendado: até ~120 linhas.

## Identificação

- TASK_ID: `linguagem-controlada-sgp`
- Atualizado em: `2026-10-10 UTC`
- Branch: `ccr-8c61f152-k8drvu` (fast-forward de `c611d10` para `origin/develop` `b3416c1`)
- HEAD: `7f379eb` (checkpoint/prompt); implementação ainda **sem commit**
- Base/remoto relevante: `origin/develop`
- Working tree: `dirty` — implementação completa da spec (66 arquivos alterados + 2 testes novos), aguardando revisão e commit do orquestrador

## Objetivo atual

Implantar linguagem controlada PT-BR (ISO 24495-1 + princípios do ASD-STE100) nos textos de tela: guia, checklist dos agentes, gate no CI e limpeza dos termos bloqueados.

## Estado em uma frase

Spec aprovada implementada pelo `sgp-implementer` no working tree (seções a–h, CA-01..CA-37), com validação verde; falta revisão (`sgp-test-reviewer`), retorno e commit/PR.

## Decisões já tomadas (humano, 2026-10-10)

- D1: hierarquia Tarefa → Setor → Atividade; "etapa" não é conceito. Etapa (trabalho) → atividade; etapa (assistente) → passo. Nas linhas tocadas e mensagens irmãs: opção → tarefa, área → setor.
- D2: CI bloqueia a 1ª onda: STEP/step, etapa, Kiosk, membership e PT-PT. 2ª onda (opção/área, bucket, preset, soft delete, Daily, status cru) só no guia. `backlog` fora. Ticket `STEP-XXXX` → `ATV-XXXX`.
- D3: guia = subseção de "Linguagem do produto" em `docs/sgp-decisoes-praticas-de-ux.md`; aprovados = manual cap. 20 (link); proibidos executáveis em `scripts/auditar-textos-tela.mjs`; 1 linha no PROJECT_CONTEXT. Nenhum `.md` novo.
- D4: fases 0+1+2 + limpeza + citações no manual principal. Guias práticos (PR #34) e `MANUAL_FUNCIONAL_SGP.md` fora.
- D5: alinhar o doc de UX inteiro (etapa → passo; tarefa no sentido de atividade → atividade).
- D6: PT-PT no `--ci` só com palavras inequívocas; ambíguas (guardar, rever, carregue, gerir, numa, âmbito…) e gerúndio só no relatório.
- D7: placeholder 'Opção 1' → 'Tarefa 1' (esteiras novas); 'Serviço' não muda.
- D8: "planeados" → "planejados"; "Factos" → "Fatos"; dicionário ganha planeado(s)/facto(s).

## Arquivos relevantes

- Prompt: `docs/ai/prompts/linguagem-controlada-sgp.md`
- `scripts/auditar-textos-tela.mjs`, `package.json`, `vitest.config.ts`
- `docs/sgp-decisoes-praticas-de-ux.md`, `docs/ai/context/PROJECT_CONTEXT.md`, `docs/ai/templates/{spec,test-report}.md`
- `docs/manual/source/MANUAL_USUARIO_SGP.md` + `docs/manual/manual-usuario.html` (gerado)

## Validações já executadas (linha de base em `b3416c1`)

- front: `tsc -b` ok; vitest 218 arquivos / 1440 testes ok; build ok; lint 117 problemas (pré-existente).
- server: `tsc --noEmit` ok; vitest 1 falha pré-existente (`env.test.ts`, versão fixa), 849 ok, 448 pulados.
- `npm run auditoria:textos`: 71 achados (1 PT-PT falso positivo + 70 TECNICO).

## Validações após a implementação (working tree, 2026-10-10)

- `auditoria:textos:ci` exit 0 (GLOSSARIO 0 · PT-PT 0); `auditoria:textos` 68 achados, todos TECNICO (antes 70).
- front: `tsc -b` ok; `npm test` 220 arquivos / 1508 testes ok; build ok; lint 117 (idêntico por arquivo à base).
- server: `tsc --noEmit` ok; `server:build` ok; `server:test` só a falha pré-existente `env.test.ts` (849 ok, 448 pulados).
- `manual:usuario:html:check` ok; `verify:deploy` exit 0.
- Atenção: `npm run lint` sobe para 146 se `server/dist` existir (gerado por `server:build`/`verify:deploy`; o `eslint .` não o ignora). Medir lint sem `server/dist`.

## Pendências

- sgp-test-reviewer → retorno `docs/ai/returns/linguagem-controlada-sgp-retorno.md` → commit/push/PR para `develop` (sem merge).

## Próxima ação exata

- Revisar o working tree com o `sgp-test-reviewer`.

## Riscos / ressalvas

- Não tocar placeholders 'Área'/'Serviço' nem reconhecedores por texto (sustentam o 422 de rollup sintético).
- Regerar o HTML do manual (`manual-help.test.ts` lê o HTML no CI).

## Não repetir

- Não medir em branch desatualizada; não force-push em `develop`.
- Não criar `.md` novo para o guia.

## Referências úteis

- Pesquisa: `docs/ai/returns/pesquisar-asd-ste100-retorno.md` (branch `ccr-50b0b39e-sss9zr`, `74720e4`)
- PRs relacionados: #35 (textos de tela, mergeado) · #34 (guias práticos, aberto)

## Uso de contexto / sessão

- Percentual confiável disponível: `INDISPONÍVEL`
