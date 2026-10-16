# Retorno — integration/release-tati-kiosk-develop-2026-10-16

- TASK_ID: `integrar-correcoes-tati-kiosk-develop`
- Objetivo: levar correções pontuais validadas na candidata 1.10.0 para a develop sem substituir seus comportamentos mais novos.
- Base remota: `develop` @ `247b698589edf78d90f01461b264821f143ccd5a`
- Origem das correções: `release/tati-kiosk-main-2026-10-16` @ `32a02eec15782df2a8d6f49a9148654e392ce7bd`
- Publicação: branch de integração e PR para `develop`, não para `main`; produção inalterada.
- Escopo: privacidade da fila principal do Kiosk (manter somente código OS); pesquisa local limitada a OS/nome/atividade; contrato e testes de privacidade, caso com lista não vazia; corrigir fixture do teste de pesquisa "Outra atividade" para plano publicado; testes da Tati para Extra Esteira e justificativa.
- Mantidos integralmente da develop: todos os 67 commits relativos à main, regra `apontamento-somente-planejado` e `allOpenPlanned`, textos pt-BR, menu Ajuda completo, manuais, guias e os dados de fila por colaborador.
- Decisão pendente: Outro fluxo de "Outra atividade" mantém campos de cliente/veículo/placa no contrato preexistente. Esta integração não altera essa rota.
- Versão: não alterar `app-version.json` (develop = 1.9.9, candidata para main = 1.10.0; são pacotes diferentes).
- Segurança: nenhuma migration, secret ou deploy; `main` e `homol` intactas.
- Testes: **não executados localmente nesta integração GitHub**. Exigir CI do PR e, antes da publicação em produção, testes completos com banco isolado; não confundir CI sem banco com integração real.
- Atenção: homologar na develop NÃO é equivalente a homologar PR #38, porque a develop inclui `apontamento-somente-planejado` e mudanças adicionais.
- Estado do working tree remoto: sem checkout local nesta sessão.
- Uso/tokens disponíveis: INDISPONÍVEL.
