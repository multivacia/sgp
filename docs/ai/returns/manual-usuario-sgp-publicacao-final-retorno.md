# Retorno — manual-usuario-sgp-publicacao-final

- **TASK_ID:** `manual-usuario-sgp-publicacao-final`
- **Data/hora:** 2026-10-04 (UTC)
- **Objetivo:** regenerar e publicar os artefatos finais do Manual do Usuário SGP+ a partir de `docs/manual/source/MANUAL_USUARIO_SGP.md`, usando o mecanismo oficial de geração já existente.
- **Status final:** **BLOQUEADO** — não existe mecanismo oficial de geração no repositório. Nenhum artefato foi gerado. Conforme a regra da Etapa 1, nada foi improvisado.
- **Branch:** `docs/manual-usuario-sgp-publicacao-final` (criada a partir do tip da auditoria final; contém somente este retorno)
- **SHA base:** `7d601e5b1be6cdc199180f2805b56b8a486af757`
- **SHA final:** informado no resumo da execução (o retorno está no próprio commit).
- **PR, merge, rebase, force-push:** nenhum. Nenhuma promoção para `develop`, `main` ou `homol`.

## 1. Validação da base

| Verificação | Resultado |
|---|---|
| `git fetch origin --prune` | executado, exit 0 |
| `origin/docs/manual-usuario-sgp-auditoria-final` existe | sim |
| Tip remoto = SHA esperado | sim — `7d601e5b1be6cdc199180f2805b56b8a486af757` |
| Rodadas documentais anteriores como ancestrais | sim — as 22 outras branches `origin/docs/manual*` (base-p0, cap04 a cap19, os 5 `fix-*`) passaram em `git merge-base --is-ancestor` |
| `main`, `develop`, `homol` e branches documentais anteriores | não alterados |

## 2. Fonte auditada

- `sha256(docs/manual/source/MANUAL_USUARIO_SGP.md)` antes: `f3c5463391501e501ba8aed093f10fddc422a69f666b53080075cb259e842b6b`
- Depois: idêntico (ver seção 6). O arquivo não foi tocado.
- `Revisão deste manual: 2026-10-04`: presente (linha 5).
- Situação: `capítulos 1 a 21 com conteúdo final, revisados na auditoria final de 2026-10-04.` (linha 6).
- Capítulos `# 1.` a `# 21.`: todos presentes, em ordem.
- Marcador `[PENDENTE DE ENRIQUECIMENTO …]`: nenhuma ocorrência.

## 3. Etapa 1 — fluxo de geração: o que foi encontrado

### Artefatos publicados existentes

| Arquivo | Título | Estrutura | Origem |
|---|---|---|---|
| `docs/manual/colaborador.html` | Manual do Colaborador — SGP | 9 seções próprias (O que é o SGP, Primeiro acesso, Minhas Atividades, …, Dúvidas frequentes) | commit `375f7dfe` (2026-10-01) |
| `docs/manual/gestor-esteira.html` | Manual do Gestor de Esteira — SGP | 15 seções próprias (Suas responsabilidades, Login, Backlog, …, Dúvidas frequentes) | commit `375f7dfe` (2026-10-01) |

O commit `375f7dfe` ("converte manuais de .md para .html com design system SGP", coautoria de IA) **removeu** `colaborador.md` e `gestor-esteira.md` e adicionou os HTML com CSS embutido escrito à mão. Ou seja:

- os HTML **não** derivam de `MANUAL_USUARIO_SGP.md`, que nem existia na época (criado na rodada base-p0, 2026-10-03);
- são dois guias por público, com estrutura e capítulos próprios, e não uma versão do manual de 21 capítulos;
- foram produzidos por conversão manual, sem script. Não há comando que os regenere;
- `docs/manual/source/README.md` os descreve como "guias já publicados, derivados de versões anteriores".

### Mecanismo de geração procurado e não encontrado

- `docs/manual/`: só os dois HTML acima e `source/` (2 Markdown + README). Nenhum template, CSS separado, imagem ou script.
- `docs/manual/source/README.md`: diz que "HTML e PDF devem ser derivados deste arquivo", mas **não indica ferramenta, comando nem destino**.
- `package.json` (raiz e subprojetos) e `scripts/`: nenhum script que trate de manual (busca por `manual`, `MANUAL_USUARIO_SGP`, `docs/manual`).
- Dependências e configs: nenhuma ferramenta Markdown→HTML/PDF (`pandoc`, `marked`, `markdown-it`, `remark`, `showdown`, `md-to-pdf`, `wkhtmltopdf`). `pandoc` não está instalado no ambiente. O único uso de Playwright (`scripts/capture-weekly-agenda-mobile.mjs`) é prova de runtime da agenda, sem relação com o manual.
- `.github/workflows/` (`deploy-hml.yml`, `deploy-hostgator-vps.yml`, `verify-deploy.yml`, `legacy/`): nenhuma etapa de geração de manual.
- Nenhuma referência aos HTML do manual fora de `docs/` (a aplicação não os serve nem os linka).
- Retornos anteriores (base-p0, auditoria de cobertura, auditoria final): registram "HTML não gerado" e não definem pipeline.

### Conclusão

Não há mecanismo oficial, confiável e documentado para gerar HTML ou PDF a partir de `MANUAL_USUARIO_SGP.md`. Também não há artefato existente que corresponda a essa fonte: sobrescrever `colaborador.html` ou `gestor-esteira.html` com os 21 capítulos mudaria o objetivo e o público desses arquivos, e criar um HTML novo seria inventar formato e pipeline. As duas coisas estão vedadas pelo prompt. Por isso as Etapas 3 e 4 não foram executadas.

## 4. Artefatos

- **Existentes antes:** `docs/manual/colaborador.html`, `docs/manual/gestor-esteira.html`.
- **Regenerados:** nenhum.
- **Esperado e não gerado:** HTML (e PDF, citado no README) do manual canônico. Motivo: falta de gerador oficial.
- **Validação de links, revisão, 21 capítulos e acentuação no artefato final:** não aplicável, porque não houve artefato. Os HTML atuais não trazem a revisão 2026-10-04 e não têm os 21 capítulos. Estão desatualizados em relação à fonte.
- **Inspeção visual:** não realizada (não houve artefato novo).
- **Warnings de gerador:** não aplicável.

## 5. Decisão humana necessária

Para destravar a publicação, é preciso definir o fluxo oficial. Opções, sem recomendação de produto:

1. **Adotar um gerador** (por exemplo, pandoc ou um script Node com `marked`/`markdown-it`) e reaproveitar o design system já usado nos HTML atuais. Definir destino (por exemplo, `docs/manual/manual-usuario.html`), comando (script em `package.json`) e documentação no `source/README.md`.
2. **Definir o destino dos guias atuais** (`colaborador.html`, `gestor-esteira.html`): mantê-los como guias por público, regenerá-los a partir de recortes do manual canônico ou aposentá-los.
3. **Definir se haverá PDF** e com qual ferramenta.

Depois da decisão, abrir uma atividade própria para criar o pipeline (isso muda tooling/`package.json`, que está fora do escopo desta rodada) e, em seguida, repetir esta publicação.

## 6. Validações executadas

| Comando | Resultado |
|---|---|
| `git fetch origin --prune` | exit 0 |
| `git rev-parse origin/docs/manual-usuario-sgp-auditoria-final` | `7d601e5b1be6cdc199180f2805b56b8a486af757` |
| `git merge-base --is-ancestor <branch> <base>` (23 branches `docs/manual*`) | todas ancestrais |
| `sha256sum docs/manual/source/MANUAL_USUARIO_SGP.md` (antes/depois) | `f3c54633…842b6b` / idêntico |
| `git diff --check` | sem saída, exit 0 |
| `git status --short` antes do commit | somente `?? docs/ai/returns/manual-usuario-sgp-publicacao-final-retorno.md` |
| Build/lint/testes da aplicação | não executados: não fazem parte de nenhum fluxo de geração do manual, e nenhum código foi alterado |

## 7. Arquivos

- **Criado:** `docs/ai/returns/manual-usuario-sgp-publicacao-final-retorno.md` (este arquivo).
- **Alterados/removidos:** nenhum. Código da aplicação, migrations, testes, HTML do manual, `MANUAL_USUARIO_SGP.md`, `MANUAL_FUNCIONAL_SGP.md` e `README.md`: intactos.
- **Migrations:** nenhuma.
- **Pendências de produto** (saúde operacional sem permissão no backend, sessão de usuário inativado etc.): não tocadas. Continuam como decisões separadas.

## 8. Estado final

- Commit único, contendo somente este retorno, na branch `docs/manual-usuario-sgp-publicacao-final`, publicada só nessa branch. O working tree fica limpo após o push.
- Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
