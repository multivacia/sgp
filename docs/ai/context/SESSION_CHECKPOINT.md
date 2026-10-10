# SESSION_CHECKPOINT — Continuidade entre sessões

> Arquivo de estado transitório.
> Deve ser sobrescrito/atualizado quando houver handoff entre chats ou contexto alto.
> Não usar como fonte da verdade sem validar Git e código.
> Manter compacto; alvo recomendado: até ~120 linhas.

## Identificação

- TASK_ID: `pesquisar-asd-ste100` (concluída) → próxima: `linguagem-controlada-sgp`
- Atualizado em: `2026-10-10 UTC`
- Branch: `ccr-50b0b39e-sss9zr` (atualizada com `origin/develop` `b3416c1` via merge)
- HEAD: ver `git log` da branch (commit que atualiza este checkpoint)
- Base/remoto relevante: `origin/develop`
- Working tree: `clean`

## Objetivo atual

Handoff para um novo chat: definir e implantar linguagem controlada PT-BR (inspirada no ASD-STE100 + ISO 24495-1) nos textos do SGP+.

## Estado em uma frase

Pesquisa e análise de complexidade concluídas (somente docs); implementação aguarda decisões humanas.

## Concluído

- Pesquisa ASD-STE100 + aplicação ao PT-BR + avaliação de complexidade (ver retorno).

## Decisões já tomadas

- Não introduzir i18n só para isso.

## Arquivos relevantes

- `docs/ai/returns/pesquisar-asd-ste100-retorno.md`
- `docs/ai/prompts/linguagem-controlada-sgp.md` (prompt de retomada)

## Validações já executadas

- Contagens por grep em `develop` `b3416c1` (ver retorno). Nenhum código alterado.

## Pendências

- Decidir: Etapa x Atividade; glossário inicial; local do guia; fases no escopo.
- Resíduo `STEP: {stepStatus}` em `FactoryIntakeItemCard.tsx:51`.

## Próxima ação exata

- Abrir novo chat com o conteúdo de `docs/ai/prompts/linguagem-controlada-sgp.md`.

## Riscos / ressalvas

- 118 testes com asserção por texto; kiosk isolado; largura dos tickets térmicos.

## Não repetir

- Não medir o código em branch desatualizada: sempre comparar com `origin/develop` antes.
- Não force-push em `develop`.

## Referências úteis

- Retorno: `docs/ai/returns/pesquisar-asd-ste100-retorno.md`
- Prompt: `docs/ai/prompts/linguagem-controlada-sgp.md`
- PR relacionada: https://github.com/multivacia/sgp/pull/35

## Uso de contexto / sessão

- Percentual confiável disponível: `INDISPONÍVEL`
