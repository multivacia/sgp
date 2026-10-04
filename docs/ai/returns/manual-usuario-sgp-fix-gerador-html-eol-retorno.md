# Retorno — manual-usuario-sgp-fix-gerador-html-eol

- **TASK_ID:** `manual-usuario-sgp-fix-gerador-html-eol`
- **Data/hora:** 2026-10-04 (UTC-3)
- **Objetivo:** tornar o gerador do Manual do Usuário multiplataforma e determinístico quanto a fim de linha: a mesma fonte lógica deve gerar exatamente o mesmo HTML em Linux e Windows.
- **Status final:** **CONCLUÍDO**. A aprovação definitiva ainda depende da rodada manual de validação em Windows (seção 8).
- **Branch:** `docs/manual-usuario-sgp-fix-gerador-html-eol`, criada a partir do SHA base.
- **SHA base:** `a10d4bf1817b4fde405a35a74766f4f00486dfa0` (tip de `docs/manual-usuario-sgp-gerador-html-final`, conferido com `git ls-remote`).
- **SHA final:** informado no resumo da execução (este retorno está no próprio commit).
- **PR, merge, rebase, force-push:** nenhum. `main`, `develop` e `homol` não foram alterados. PDF não gerado.

## 1. Ambiente de execução

- **SO:** Windows 10.0.26200, PowerShell, `core.autocrlf=true`. **Não** é um ambiente Linux/Cloud.
- **Runtime:** Node `v22.22.0`, npm `10.8.2`.
- **`npm ci`:** exit 0. A primeira tentativa falhou com `EPERM` porque um dev server (Vite + backend) rodando no mesmo clone bloqueava `lightningcss.win32-x64-msvc.node`. Depois que o dev server foi parado, a execução passou.
- **Clone de publicação:** o desenvolvimento foi feito em `Documents\sgp-argos`. Os testes de clone limpo (7.2) usaram clones locais, que compartilham os arquivos de pack por hardlink. Na limpeza desses clones, os `.pack` compartilhados ficaram com exclusão pendente enquanto um processo do Cursor os mantinha abertos, e o Git de `sgp-argos` deixou de ler objetos até o Cursor ser reiniciado. Por isso, o commit foi recriado com o mesmo conteúdo num clone HTTPS novo e independente (`Documents\sgp-argos-eol`), validado de novo ali (7.4) e publicado a partir dele.

## 2. Causa raiz

1. O repositório não tinha `.gitattributes`. Com `core.autocrlf=true`, o Git materializa no Windows os arquivos versionados em LF como CRLF. Estado inicial (`git ls-files --eol`): `i/lf w/crlf` para a fonte, o HTML e o gerador.
2. O gerador lia a fonte sem normalizar. As quebras CRLF passavam pelo `marked` e chegavam ao HTML pelos trechos que reaproveitam o texto cru dos tokens, como o preâmbulo (`token.raw`) e os blocos de código. Já os trechos vindos dos template literals do próprio script saem em LF, porque o JavaScript normaliza CRLF em template literals. O resultado era um HTML com EOL misto.
3. O `--check` compara o HTML gerado com o HTML em disco byte a byte. O HTML em disco (CRLF, por causa do checkout) nunca batia com o gerado (EOL misto), e por isso o check falhava no Windows.

Reprodução antes da correção, neste ambiente: `npm run manual:usuario:html:check` retornou exit 1 com "`docs/manual/manual-usuario.html` está desatualizado em relação à fonte". Com o gerador já corrigido e o HTML ainda em CRLF, o check passou a acusar "difere apenas nos fins de linha (esperado LF)". Isso confirma que a única divergência era LF × CRLF.

## 3. Alterações realizadas

### 3.1 `.gitattributes` (novo; não existia)

```gitattributes
docs/manual/source/MANUAL_USUARIO_SGP.md text eol=lf
docs/manual/manual-usuario.html text eol=lf
scripts/generate-manual-usuario-html.mjs text eol=lf
```

Contém só as regras mínimas pedidas, sem nenhuma regra global, então os demais arquivos do repositório não mudam de comportamento.

### 3.2 Gerador — `scripts/generate-manual-usuario-html.mjs`

- Nova função `normalizeEol(text)`, que troca `\r\n` e `\r` isolado por `\n` (`text.replace(/\r\n?/g, '\n')`).
- `readSource()` devolve a fonte já normalizada, **antes** do parsing. A proteção que relê a fonte e aborta se ela mudar durante a geração também compara as versões normalizadas.
- O HTML final passa por `normalizeEol(renderHtml(doc))` antes da validação, da comparação e da escrita, então a saída é sempre LF, independentemente do SO e de `core.autocrlf`.
- O `--check` continua comparando byte a byte (determinismo estrito). Se o arquivo em disco diferir **apenas** no EOL, a mensagem diz isso explicitamente e indica como corrigir: regenerar ou fazer novo checkout depois do `.gitattributes`.
- O comentário de cabeçalho do script documenta a política de LF.
- Nenhuma mudança de parsing, renderização, CSS, âncoras ou validações estruturais.

### 3.3 HTML — `docs/manual/manual-usuario.html`

Foi regenerado com o gerador corrigido. O blob resultante é **idêntico** ao do SHA base (`a316dfe471b94920dc8459067314a6c63bde350a`), então não entra no diff do commit. O HTML versionado já estava em LF no índice; o problema estava só na materialização e na geração no Windows. Os números da geração ficaram iguais: 21 capítulos, 112 seções no índice, 691020 bytes.

### 3.4 `docs/manual/source/README.md`

Não alterado. A política de EOL ficou documentada no `.gitattributes` e no cabeçalho do gerador.

## 4. Arquivos alterados no commit

| Arquivo | Alteração |
|---|---|
| `.gitattributes` | novo (3 regras) |
| `scripts/generate-manual-usuario-html.mjs` | normalização de EOL na entrada e na saída e mensagem de check específica |
| `docs/ai/returns/manual-usuario-sgp-fix-gerador-html-eol-retorno.md` | este retorno |

`docs/manual/manual-usuario.html` foi regenerado sem diferença de conteúdo (mesmo blob). Arquivos não rastreados que já existiam no clone (`docs/ai/reports/auditoria-cores-estilos-2026-09-29/`, `docs/audits/`, `sgp-manual-validacao/`) não foram tocados nem incluídos.

## 5. Fonte canônica — conteúdo inalterado

| Verificação | Antes | Depois |
|---|---|---|
| SHA-256 do conteúdo normalizado em LF | `f3c5463391501e501ba8aed093f10fddc422a69f666b53080075cb259e842b6b` | `f3c5463391501e501ba8aed093f10fddc422a69f666b53080075cb259e842b6b` |
| Blob Git | `9c4ce0b2666e7738c67adda0bcd565d183c28642` | inalterado |
| Revisão | `2026-10-04` | `2026-10-04` |
| Capítulos `# N.` | 1–21, em ordem | 1–21, em ordem |
| Marcador `PENDENTE DE ENRIQUECIMENTO` | ausente | ausente |

`git diff --quiet a10d4bf -- docs/manual/source/MANUAL_USUARIO_SGP.md docs/manual/manual-usuario.html docs/manual/colaborador.html docs/manual/gestor-esteira.html` retornou exit 0. Nenhum desses quatro arquivos mudou em relação à base. `colaborador.html` (`787059ff…`) e `gestor-esteira.html` (`a51a20ce…`) seguem intactos e sem regra nova de EOL.

## 6. Validação de EOL

**`git diff --check`** (staged e working tree): limpo, exit 0.

**`git check-attr -a`:**

```text
docs/manual/source/MANUAL_USUARIO_SGP.md: text: set
docs/manual/source/MANUAL_USUARIO_SGP.md: eol: lf
docs/manual/manual-usuario.html: text: set
docs/manual/manual-usuario.html: eol: lf
scripts/generate-manual-usuario-html.mjs: text: set
scripts/generate-manual-usuario-html.mjs: eol: lf
```

**`git ls-files --eol` depois da correção (clone de trabalho no Windows):**

```text
i/lf    w/lf    attr/text eol=lf      	docs/manual/manual-usuario.html
i/lf    w/lf    attr/text eol=lf      	docs/manual/source/MANUAL_USUARIO_SGP.md
i/lf    w/lf    attr/text eol=lf      	scripts/generate-manual-usuario-html.mjs
```

**Bytes CR (`\r`) nos blobs versionados:** 0 na fonte, 0 no HTML, 0 no gerador e 0 no `.gitattributes`.

## 7. Comandos de geração/check e idempotência

### 7.1 Clone de trabalho (Windows, `core.autocrlf=true`, já materializado antes da correção)

| Rodada | `manual:usuario:html:check` | `manual:usuario:html` | `git status --short` (arquivos do manual) |
|---|---|---|---|
| 1 | exit 1: "difere apenas nos fins de linha" (HTML ainda em CRLF, materializado antes do `.gitattributes`) | exit 0, HTML regravado em LF | conteúdo do HTML igual ao blob base |
| 2 | **exit 0** ("Validado (em dia com a fonte)") | exit 0 | sem diferença de conteúdo |

A rodada 1 falha por um motivo esperado: o `.gitattributes` não reescreve sozinho arquivos já materializados. Clones existentes no Windows precisam rodar `npm run manual:usuario:html` uma vez ou refazer o checkout dos três arquivos. Clones novos não precisam de nada (7.2).

### 7.2 Clones limpos da branch (depois do commit)

Foram feitos dois clones novos a partir do commit local, cada um rodando duas vezes "check → geração → `git status --short`":

| Clone | EOL materializado | Check 1 | Geração 1 | Status 1 | Check 2 | Geração 2 | Status 2 |
|---|---|---|---|---|---|---|---|
| `core.autocrlf=false` (checkout equivalente ao Linux/Cloud) | `w/lf` | exit 0 | exit 0 | vazio | exit 0 | exit 0 | vazio |
| `core.autocrlf=true` (checkout padrão do Windows) | `w/lf` | exit 0 | exit 0 | vazio | exit 0 | exit 0 | vazio |

### 7.3 Linux/Cloud

**Não executado em Linux nativo**: o ambiente desta rodada é Windows. O clone com `core.autocrlf=false` reproduz o checkout do Linux (tudo em LF) e passou com idempotência. Pelo desenho da correção (normalização de entrada e saída), o comportamento em Linux é o mesmo, mas a execução nativa em Linux/Cloud não foi feita nesta rodada.

### 7.4 Clone de publicação (HTTPS novo, Windows, `core.autocrlf=true`)

Fonte e HTML foram materializados de novo com o `.gitattributes` presente (`w/lf`). Depois do `npm ci` (exit 0), duas rodadas: `check` exit 0, geração exit 0 e `git status --short` sem alteração nos arquivos do manual, nas duas. HTML gerado com blob `a316dfe471b94920dc8459067314a6c63bde350a` (igual ao base), `git diff --check` limpo e SHA-256 da fonte normalizada `f3c54633…842b6b` (igual ao base).

## 8. Validação Windows (rodada manual)

Os resultados de 7.1 e 7.2 vieram de execução real neste Windows, não são simulados. Ainda assim, como pede a tarefa, a aprovação formal **depende da rodada manual de validação em Windows**:

```bash
npm ci
npm run manual:usuario:html:check
npm run manual:usuario:html
git status --short
```

Resultado esperado num clone novo (ou num checkout refeito depois do `.gitattributes`): `--check` aprovado na primeira execução, geração sem alterar o HTML e `git status --short` vazio.

## 9. Restrições respeitadas

- O conteúdo textual do Manual do Usuário não foi alterado (seção 5).
- `docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html` não foram alterados.
- Código funcional da aplicação, migrations e testes não foram alterados.
- `main`, `develop` e `homol` não foram alterados.
- Nenhum PR, merge, rebase ou force-push. PDF não gerado.
- Um único commit, publicado somente em `docs/manual-usuario-sgp-fix-gerador-html-eol`.
