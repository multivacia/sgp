# Retorno — manual-usuario-sgp-criar-gerador-html-final

- **TASK_ID:** `manual-usuario-sgp-criar-gerador-html-final`. O caminho deste retorno segue o nome definido no prompt (`manual-usuario-sgp-gerador-html-final-retorno.md`), que difere do TASK_ID.
- **Data/hora:** 2026-10-04 (UTC)
- **Objetivo:** criar o gerador oficial e reproduzível do Manual do Usuário em HTML (`MANUAL_USUARIO_SGP.md` → `docs/manual/manual-usuario.html`) e publicar o HTML final.
- **Status final:** **CONCLUÍDO** — gerador criado, HTML gerado e validado, fluxo documentado.
- **Branch:** `docs/manual-usuario-sgp-gerador-html-final` (criada a partir do tip remoto de `docs/manual-usuario-sgp-publicacao-final`)
- **SHA base:** `5bb399acd3615388dd18af6e06d6fa49b0cc2ac4`
- **SHA final:** informado no resumo da execução (este retorno está no próprio commit).
- **PR, merge, rebase, force-push:** nenhum. Nenhuma promoção para `develop`, `main` ou `homol`. PDF não gerado.

## 1. Validação da base

| Verificação | Resultado |
|---|---|
| `git fetch origin --prune` | exit 0 |
| `origin/docs/manual-usuario-sgp-publicacao-final` existe | sim |
| Tip remoto = SHA esperado | sim — `5bb399acd3615388dd18af6e06d6fa49b0cc2ac4` |
| Auditoria final `7d601e5b…` é ancestral | sim (`git merge-base --is-ancestor`) |
| `main`, `develop`, `homol` e branches anteriores | não alterados |

## 2. Inspeção (Etapa 1) e escolha (Etapa 2)

- **Runtime:** Node `v22.14.0`, npm `10.9.7`, `package-lock.json`, projeto ESM (`"type": "module"`). Os scripts avulsos ficam em `scripts/*.mjs` (já existe `scripts/capture-weekly-agenda-mobile.mjs`).
- **Biblioteca Markdown existente:** nenhuma, nem como dependência indireta. Busca no lockfile por `marked`, `markdown-it`, `micromark`, `remark-parse`, `showdown` e `mdast-util-from-markdown`.
- **Escolha:** `marked@^18.0.14`, adicionada como **devDependency**. É uma biblioteca madura, com suporte a GFM (tabelas), **sem nenhuma dependência transitiva** e licença MIT, e exige `node >= 20`. O lockfile ganhou só a entrada `node_modules/marked`.
- **Visual de referência:** CSS embutido de `colaborador.html` e `gestor-esteira.html` (paleta argos-dark, Montserrat/Open Sans, cabeçalho com selo, índice em cartão, `h2` dourado com número, tabelas com cabeçalho em caixa-alta, callouts com borda à esquerda). As variáveis de cor e os componentes foram reaproveitados no CSS embutido do novo HTML. A diferença: os guias antigos carregam fontes do Google Fonts (CDN), e o novo **não**. Ele usa uma pilha de fontes locais que começa por `Open Sans`/`Montserrat` (se estiverem instaladas) e cai para `Segoe UI`/Roboto/Arial.

## 3. O que foi implementado

### Gerador — `scripts/generate-manual-usuario-html.mjs`

- Lê a fonte, converte com `marked` (GFM) e grava um HTML standalone em UTF-8 com CSS embutido. Não usa JS nem recursos externos.
- **Estrutura:** o primeiro `#` vira o `<h1>` do cabeçalho. O preâmbulo (Produto, Versão, Revisão, Situação e o aviso de documento canônico) é renderizado no cabeçalho, preservando as quebras de linha dos metadados. Cada `# N. Título` vira um `<section class="chapter">`, e os níveis Markdown descem um nível no HTML (`#`→`h2` … `####`→`h5`).
- **Âncoras estáveis:** `cap-N` (capítulo), `sec-N-M` (seção numerada, por exemplo `sec-2-3`) e `cap-N-<slug>` para os demais títulos, com sufixo `-2`, `-3`… quando o título se repete no mesmo capítulo. O slug não tem acentos e é determinístico.
- **Índice:** gerado dos títulos — 21 capítulos e, sob cada um, as 112 seções de nível `##` como links. Cada capítulo termina com o link "↑ Voltar ao índice".
- **Elementos preservados:** parágrafos, listas (ordenadas e não ordenadas, aninhadas), 270 tabelas (com contêiner de rolagem horizontal), 3 blocos de código `text` (árvores de estrutura), 40 citações/avisos (`blockquote.callout`), negrito, itálico, código inline e acentuação.
- **Marcadores `[IMAGEM SUGERIDA: …]`** (51, presentes na fonte auditada): o texto é mantido intacto e ganha só um estilo discreto (caixa tracejada, itálico).
- **Determinismo:** não há data de geração nem qualquer valor variável no HTML.
- **Proteção da fonte:** o script nunca escreve na fonte. Ele a relê depois da geração e aborta se ela tiver mudado.
- **Impressão:** `@media print` com fundo branco, quebra de página antes de cada capítulo e depois do índice, e linhas de tabela e avisos protegidos contra quebra.
- **Responsividade:** ajustes até 600 px. Tabelas largas rolam dentro do próprio contêiner.

### Validação estrutural (embutida no gerador)

Executada em toda geração. Se houver problema, o comando sai com código 1 **e o HTML não é gravado**. Checa:

- DOCTYPE, `<html lang="pt-BR">`, `<head>`, `<body>`, `<meta charset="UTF-8">`, `<title>` não vazio, `</html>` no fim;
- exatamente um `<h1>`;
- capítulos 1 a 21, nessa ordem, com título no corpo e entrada no índice;
- IDs sem duplicidade;
- todo `href="#…"` aponta para um ID existente;
- nenhuma referência `http(s)://` ou `//` em `link`/`script`/`img`/`iframe`;
- ausência de `PENDENTE DE ENRIQUECIMENTO`, de U+FFFD e de padrões típicos de mojibake (`Ã`/`Â` seguidos de byte de continuação);
- revisão encontrada na fonte e presente no HTML.

O modo `--check` faz a mesma validação sem gravar e também falha se o HTML em disco divergir do que a fonte atual geraria.

### Comandos oficiais (`package.json`)

- `npm run manual:usuario:html` — gera e valida.
- `npm run manual:usuario:html:check` — só valida, e acusa HTML desatualizado.

### Documentação — `docs/manual/source/README.md`

Mudança mínima: nova seção "Gerar o manual do usuário em HTML" (HTML derivado, comandos, gerador, biblioteca, validação, PDF sem fluxo oficial). A linha sobre `docs/manual/*.html` passou a separar os dois guias por público, que **não** substituem o manual integral nem são gerados pelo comando. O resto do README não mudou.

## 4. Arquivos

| Arquivo | Ação |
|---|---|
| `scripts/generate-manual-usuario-html.mjs` | criado |
| `docs/manual/manual-usuario.html` | criado (gerado) — 691.020 bytes (~675 KB) |
| `package.json` | alterado — 2 scripts e devDependency `marked` |
| `package-lock.json` | alterado — somente `marked@18.0.14` |
| `docs/manual/source/README.md` | alterado — seção de geração e linha dos guias |
| `docs/ai/returns/manual-usuario-sgp-gerador-html-final-retorno.md` | criado (este arquivo) |

Não alterados: `MANUAL_USUARIO_SGP.md`, `MANUAL_FUNCIONAL_SGP.md`, `colaborador.html`, `gestor-esteira.html`, `src/`, `server/`, migrations e testes. **Migrations:** nenhuma.

## 5. Integridade

| Arquivo | SHA-256 antes | Depois |
|---|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | `f3c5463391501e501ba8aed093f10fddc422a69f666b53080075cb259e842b6b` | idêntico (`sha256sum -c`: OK) |
| `docs/manual/colaborador.html` | `d26f78301bb0655dbe9e1350bb073e1b0cccdaf766dd6a61bc057821c942c95e` | idêntico |
| `docs/manual/gestor-esteira.html` | `a61b9450e5728525630bc1ffa7520faaeba1eb3c8b3e00d1ebef25acde11a3e2` | idêntico |

A fonte confirma, antes da geração: `Revisão deste manual: 2026-10-04`, Situação "capítulos 1 a 21 com conteúdo final, revisados na auditoria final de 2026-10-04", capítulos `# 1.` a `# 21.` e nenhum marcador `PENDENTE DE ENRIQUECIMENTO`.

## 6. Validações executadas

| Comando / verificação | Resultado |
|---|---|
| `rm docs/manual/manual-usuario.html && npm run manual:usuario:html` (do zero) | exit 0 — 21 capítulos, 112 seções no índice, revisão 2026-10-04, versão 1.9.8, 691.020 bytes |
| Segunda e terceira gerações | SHA-256 idêntico: `1caaa5f10719f67e120f7d37acbf42fe53844d5ef3092b09f8ecfbd1b3ebe5df`; sem diff |
| `npm run manual:usuario:html:check` | exit 0 ("em dia com a fonte") |
| `--check` com o HTML adulterado (linha extra) | exit 1 — "desatualizado em relação à fonte" |
| Teste negativo em cópia temporária fora do repo (sem cap. 21, sem revisão, com marcador pendente e U+FFFD) | exit 1, 6 problemas acusados, HTML não gravado |
| Fidelidade de contagem (fonte × HTML) | tabelas 270/270; blocos de citação 40/40; blocos de código 3/3; marcadores de imagem 51/51; títulos 503/503 (502 com ID + `h1`); itens de lista 660 + 21 do índice = 681 |
| Fidelidade textual (contagem de cada palavra, fonte × texto do HTML) | todas as diferenças se explicam pela moldura do HTML: selo e `<title>`, 21 links "Voltar ao índice", números de listas ordenadas convertidos em `<ol>` e a etiqueta `text` dos blocos de código. **Nenhuma palavra do conteúdo se perdeu.** |
| Acentuação | 13.260 caracteres acentuados no HTML; nenhum U+FFFD; o único `Ã` é o "NÃO" do comentário de cabeçalho |
| Texto antigo de "capítulos pendentes" | ausente (busca por "capítulo(s) pendente(s)/não concluído(s)" e "PENDENTE DE ENRIQUECIMENTO") |
| `npx eslint scripts/generate-manual-usuario-html.mjs` | exit 0. Ressalva: a config atual não aplica regras a `.mjs` em `scripts/` (`rules: {}` em `--print-config`), então o lint não é evidência de qualidade desse arquivo |
| `git diff --check` | sem saída, exit 0 |
| Build/testes da aplicação | não executados: só entrou uma devDependency usada por script avulso, e nenhum código da aplicação foi tocado |

## 7. Inspeção visual

O HTML foi renderizado no Google Chrome headless (via DevTools Protocol, com um script descartável fora do repositório), em 1280×1000 e 390×844 (celular), e com mídia de impressão emulada.

- **Medições no navegador:** 0 recursos de rede carregados; sem overflow horizontal no desktop nem no celular; 154 links internos, **0 quebrados**; 270 tabelas no DOM.
- **Amostras conferidas:** topo/cabeçalho (metadados em linhas separadas e aviso canônico), índice, capítulo 1, tabela da seção 2.3, árvore de estrutura e marcador de imagem no capítulo 6, capítulos 15, 18 e 21, final da página com rodapé "Revisão 2026-10-04", celular no capítulo 5 (aviso e tabela de 3 colunas com rolagem interna) e impressão (capítulo 6 em fundo branco).
- **Resultado:** títulos alinhados, tabelas íntegras, acentuação correta, avisos destacados e navegação funcionando. Na impressão, o PDF gerado pelo Chrome em A4 tem cerca de 276 páginas (descartado, não versionado).
- **Achado só do ambiente de captura:** na primeira rodada, a rolagem suave (`scroll-behavior: smooth`) deslocou as capturas, que foram refeitas com rolagem instantânea. Não afeta o uso real.

## 8. Warnings, limitações e pontos para a próxima decisão

1. `npm install` reportou vulnerabilidades **pré-existentes** do projeto ("npm audit fix"). `marked` não tem dependências, e nada foi corrigido por oportunismo.
2. As fontes Montserrat/Open Sans só aparecem se estiverem instaladas na máquina. Caso contrário, a pilha de fallback é usada. Isso foi deliberado, para não depender de CDN.
3. As **referências cruzadas em texto** ("capítulo 7", "seção 3.6") seguem como texto: a fonte não tem links Markdown, e o gerador não cria links novos. A navegação é pelo índice e pelas âncoras estáveis.
4. Os capítulos 4 a 19 usam os mesmos títulos de bloco ("Para que serve", "Onde fica"…). No índice eles aparecem repetidos sob cada capítulo, o que é correto, mas deixa o índice longo.
5. Os 51 marcadores `[IMAGEM SUGERIDA: …]` fazem parte da fonte auditada e aparecem no HTML, com estilo discreto. Removê-los ou trocá-los por imagens é decisão de conteúdo, fora desta rodada.
6. O HTML não é servido nem linkado pela aplicação. Onde disponibilizá-lo é decisão futura.
7. PDF continua sem fluxo oficial.

## 9. Estado final

- Commit único (gerador + HTML + `package.json`/lockfile + README + retorno) na branch `docs/manual-usuario-sgp-gerador-html-final`, publicada só nessa branch. O working tree fica limpo após o push.
- Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
