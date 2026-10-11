# Retorno — manual-usuario-sgp-fix-cap05-prazo

- **TASK_ID:** `manual-usuario-sgp-fix-cap05-prazo`
- **Data/hora:** 2026-10-03 (UTC)
- **Repositório:** `multivacia/sgp`
- **Branch:** `docs/manual-usuario-sgp-fix-cap05-prazo`
- **SHA base:** `d8d2408d69c82779ef4caae4e8532e5f7389432b` (tip de `origin/docs/manual-usuario-sgp-cap06-esteiras`, **igual ao esperado** — sem divergência)
- **SHA final:** ver `git rev-parse origin/docs/manual-usuario-sgp-fix-cap05-prazo`
- **Objetivo:** corrigir somente a explicação factual da limitação de prazo/atraso no Capítulo 5.
- **Status final:** concluído. Correção cirúrgica; nenhuma nova auditoria do Painel operacional; nenhuma alteração de aplicação.

---

## 1. Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | Capítulo 5: callout "Limitação atual" substituído (2 → 4 linhas). Capítulo 21: uma cláusula de remissão atualizada (ver §6) |
| `docs/ai/returns/manual-usuario-sgp-fix-cap05-prazo-retorno.md` | criado (este arquivo) |

Total no manual: **5 inserções, 3 remoções**. `MANUAL_FUNCIONAL_SGP.md` não alterado. `SESSION_CHECKPOINT.md` não alterado (sessão única, sem handoff, sem contexto alto). Nenhuma migration. Nenhum arquivo de código.

---

## 2. Texto factual anterior e motivo da correção

Texto removido do Capítulo 5:

> O painel só consegue calcular atraso quando o prazo estimado da esteira foi registrado como uma **data**. No cadastro de **Nova esteira**, porém, o campo **Prazo estimado** pede um **número de dias**. Prazos informados dessa forma não são reconhecidos como data, e a esteira não é contada como atrasada — o cartão pode ficar em zero mesmo havendo esteiras atrasadas na prática. Em alguns casos o efeito é o oposto: a esteira passa a aparecer como atrasada desde a criação.

**Motivo:** a afirmação central — *"o campo Prazo estimado pede um número de dias"* — descreve uma tela que não está mais em uso. O campo numérico pertence ao assistente antigo de Nova esteira, que é **código morto**: nenhuma rota o alcança. A tela ativa pede **duas datas**. A falha de leitura do atraso é real e permanece; o que estava incorreto era a **causa** atribuída a ela — e, em consequência, também o conselho implícito de que o problema estaria no modo de preencher o campo.

---

## 3. Evidências de código reconfirmadas nesta rodada

Reconferidas no tip `d8d2408d`, sem confiar no retorno do Capítulo 6.

### 3.1 Tela ativa de Nova esteira e de Alterar Esteira

| Evidência | Arquivo |
|---|---|
| `/app/nova-esteira` → `NovaEsteiraPage` | `src/routes/AppRoutes.tsx:72-78` |
| `NovaEsteiraPage` → `ConveyorCreateEditPage mode="create"` | `src/features/esteiras/NovaEsteiraPage.tsx` |
| `AlterarEsteiraPage` → `ConveyorCreateEditPage mode="edit"` | `src/features/esteiras/AlterarEsteiraPage.tsx` |

As duas telas são a **mesma implementação**, em dois modos. A correção menciona as duas, como exige o §5 do prompt.

### 3.2 Os campos são dois seletores de data

| Campo | Evidência |
|---|---|
| **Início previsto** / **Fim previsto** (criação) | `nova-esteira/NovaEsteiraCreateTotemShell.tsx:358` e `:367`, ambos `type="date"` |
| **Início previsto** / **Fim previsto** (edição) | `ConveyorCreateEditPage.tsx:1191` e `:1192`, ambos `type="date"` |
| Ausência de campo "Prazo estimado" nessas telas | varredura por `Prazo estimado` nos dois arquivos: **nenhuma ocorrência** |

### 3.3 Como as duas datas são persistidas

`src/features/esteiras/conveyorBasicDataExtras.ts:86-93`:

```text
prazoPartes = []
se Início previsto preenchido -> acrescenta "Início previsto: AAAA-MM-DD"
se Fim previsto preenchido    -> acrescenta "Fim previsto: AAAA-MM-DD"
prazoEstimado = prazoPartes.join(' · ')
```

Resultado gravado no caso normal (ambas preenchidas): `"Início previsto: 2026-10-01 · Fim previsto: 2026-10-20"` — **uma única linha de texto com duas datas**.

### 3.4 A regra de atraso do Painel operacional

`src/lib/backlog/operationalBuckets.ts`:

- `isEsteiraOverdueVersusToday` (linhas 62-72): devolve `false` se a situação é finalizada/cancelada; chama `parseFlexibleDeadlineToDate`; **se o resultado é nulo, devolve `false`** — ou seja, prazo não interpretado equivale a "sem prazo", nunca a atraso. Comparação por dia inteiro (`startOfLocalDay`), confirmando o texto já existente no capítulo;
- `getOperationalBucket` (linhas 74-88): `em_atraso` tem precedência sobre a situação, confirmando o texto já existente;
- `parseFlexibleDeadlineToDate` (linhas 44-60): tenta `Date.parse` do texto **inteiro**; se falhar, tenta o padrão brasileiro `dd/mm/aaaa` **ancorado** (`^…$`); senão devolve `null`.

O painel lê o mesmo campo gravado pelo cadastro: `estimatedDeadline`, em `src/lib/backlog/mapConveyorListToBacklog.ts:45`.

### 3.5 Verificação empírica do parser

A incapacidade do painel de ler o texto composto foi **comprovada por execução**, não inferida. A função foi reproduzida literalmente e exercitada com os formatos reais:

| Valor gravado | Resultado |
|---|---|
| `Início previsto: 2026-10-01 · Fim previsto: 2026-10-20` (caso normal) | **não reconhecido** |
| `Início previsto: 2026-01-05 · Fim previsto: 2026-02-10` | **não reconhecido** |
| `Início previsto: 2026-10-01 Fim previsto: 2026-10-20` (sem separador) | **não reconhecido** |
| `Fim previsto: 2026-10-20` (só o fim preenchido) | reconhecido como 2026-10-20 |
| `Início previsto: 2026-10-01` (só o início preenchido) | reconhecido como 2026-10-01 — **a data de início**, não a de fim |
| `2026-10-20` | reconhecido corretamente |
| `25/12/2026` | reconhecido como 2026-12-25 |
| `01/02/2026` | reconhecido como 2026-01-02 (dia e mês invertidos) |
| `30` | não reconhecido |
| `7` | reconhecido como 2001-07-01 (data no passado) |
| `10,5` | reconhecido como 2001-10-05 |

**Achado refinado:** a causa real não é "o texto composto nunca é lido", e sim que **o texto só é interpretado quando contém exatamente uma data**. Com as duas datas presentes — o caso normal de uso — a leitura falha por completo. Com apenas uma, o painel lê aquela data, inclusive quando é a de **início**, e aí compara com a referência errada.

### 3.6 O campo numérico vive apenas no assistente morto

| Evidência | Conclusão |
|---|---|
| `prazoEstimadoFormatoAceito` definido em `src/mocks/nova-esteira-dados-validacao.ts:22`, com a regra `/^\d+([.,]\d+)?$/` | é o validador que exigia número |
| consumido somente por `nova-esteira/NovaEsteiraDadosIniciais.tsx:8,73` e `nova-esteira/review/NovaEsteiraReviewDadosIniciais.tsx:1,49` | ambos do assistente antigo |
| `NovaEsteiraDadosIniciais` é referenciado apenas por outros arquivos do próprio assistente (`NovaEsteiraPreviewFinal`, `review/*`, `useNovaEsteiraState`) e por `src/mocks/` | nenhuma rota o alcança |
| `NovaEsteiraPreviewFinal` não tem nenhum referenciador | código morto confirmado |

---

## 4. Comportamento real confirmado

1. A tela ativa de **Nova esteira** e de **Alterar Esteira** pede **Início previsto** e **Fim previsto**, em seletores de data.
2. O sistema grava as duas datas juntas, em **uma única linha de texto**.
3. O Painel operacional tenta interpretar o prazo como **uma data única**.
4. Com duas datas na mesma linha, **nenhuma é identificada** e a esteira é tratada como **sem prazo**.
5. Logo, **esteira cadastrada normalmente pela tela atual pode nunca entrar em Em atraso**, mesmo passado o fim previsto.
6. Esteiras antigas, ou criadas por outros caminhos, têm formatos diferentes e produzem **resultados inconsistentes** — algumas corretas, algumas atrasadas desde a criação, e, quando só uma das datas foi preenchida, comparação com a data errada.
7. Enquanto o defeito existir, **Em atraso não serve como fonte única de prioridade**.

Os sete pontos exigidos pelo §5 do prompt estão cobertos. O texto **não** afirma que a tela pede número de dias e **não** ensina formato manual alternativo: a leitura parcial (uma só data) aparece como sintoma de inconsistência, nunca como receita de contorno.

---

## 5. Diff restrito — Capítulo 5

Bloco único, dentro de **Como o atraso é calculado**. A explicação funcional anterior (comparação por dia inteiro, precedência do atraso sobre a situação, exceções Finalizada/Cancelada, esteira sem prazo) foi **preservada integralmente**. Só o callout mudou.

Texto novo:

> **Limitação atual — leia antes de confiar no cartão Em atraso.**
> O painel só reconhece o prazo da esteira quando consegue interpretá-lo como **uma data única**. O cadastro, porém, não guarda o prazo assim: a tela de **Nova esteira** — e a de **Alterar Esteira** — pede **Início previsto** e **Fim previsto**, e o sistema grava as duas datas juntas, em uma única linha de texto. Com duas datas nessa linha, o painel não identifica nenhuma delas e trata a esteira como **sem prazo**.
> O efeito prático é direto: **uma esteira cadastrada normalmente pela tela atual pode nunca entrar em Em atraso, mesmo depois de passar do fim previsto.** O cartão fica em zero enquanto há esteiras atrasadas de fato.
> Esteiras antigas, ou criadas por outros caminhos, podem ter o prazo gravado em formatos diferentes e aí o resultado é inconsistente: algumas são reconhecidas corretamente, outras aparecem atrasadas desde a criação, e quando só uma das duas datas foi preenchida o painel pode acabar comparando com a data errada. Não há como saber pelo cartão em que caso cada esteira se encaixa.
> Enquanto isso não for corrigido, **não use o cartão Em atraso como fonte única** para decidir prioridade. Confira o prazo na própria esteira. O registro desta pendência está no capítulo 21.

Nada mais do Capítulo 5 foi tocado: cartões, filtros, recortes, permissões, mensagens, atalho **Ativas**, atualização da lista e bloqueios permanecem idênticos.

---

## 6. Alteração no Capítulo 21 — e por que foi necessária

O §4 do prompt permite tocar o Capítulo 21 apenas se a reconferência provar erro factual remanescente no mesmo ponto. Foi o caso, por efeito **desta própria rodada**: a nota de correção do Capítulo 21 terminava com

> "O texto equivalente no capítulo 5 ainda não foi corrigido."

Essa frase passa a ser **falsa** no instante em que esta correção é publicada. Uma cláusula foi atualizada:

```diff
-O texto equivalente no capítulo 5 ainda não foi corrigido.
+O texto equivalente no capítulo 5 foi corrigido na mesma data, em rodada própria.
```

**Nenhuma outra alteração no Capítulo 21.** A reconferência empírica (§3.5) validou **todas** as linhas da tabela de efeitos já existente lá — inclusive `30` → não reconhecido, `7` → data no passado, `01/02/2026` → dia e mês invertidos, e o par Início/Fim → não reconhecido. Não havia erro factual a corrigir nessa tabela.

**Refinamento disponível para rodada futura, não aplicado:** a tabela do Capítulo 21 não cobre o caso de **uma só data preenchida** (§3.5). Isso é lacuna, não erro — e o escopo desta rodada não autoriza ampliá-la.

---

## 7. Validações executadas

```
$ git status --short
 M docs/manual/source/MANUAL_USUARIO_SGP.md     (antes de criar este retorno)

$ git diff --check
(sem saída — nenhum problema de whitespace)

$ git diff --name-only d8d2408d69c82779ef4caae4e8532e5f7389432b
docs/manual/source/MANUAL_USUARIO_SGP.md

$ git diff --stat d8d2408d..  -- docs/manual/source/MANUAL_USUARIO_SGP.md
 1 file changed, 5 insertions(+), 3 deletions(-)
```

### Escopo, verificado programaticamente

Comparação capítulo a capítulo entre a base `d8d2408d` e o estado atual:

```
cap  1: INTACTO   cap  2: INTACTO   cap  3: INTACTO   cap  4: INTACTO
cap  5: ALTERADO (esperado)
cap  6: INTACTO   cap  7: INTACTO   cap  8: INTACTO   cap  9: INTACTO
cap 10: INTACTO   cap 11: INTACTO   cap 12: INTACTO   cap 13: INTACTO
cap 14: INTACTO   cap 15: INTACTO   cap 16: INTACTO   cap 17: INTACTO
cap 18: INTACTO   cap 19: INTACTO   cap 20: INTACTO
cap 21: ALTERADO (uma cláusula — ver §6)
cabeçalho: INTACTO
```

**Capítulos 6 a 20 intactos**, conforme exigido. **Cabeçalho não mudou.** Nenhuma alteração em código.

### A frase incorreta saiu do Capítulo 5

Varredura no Capítulo 5 por `número de dias`, `Prazo estimado** pede` e `pede um número`: **nenhuma ocorrência**. Varredura por receita de formato manual (`registre o prazo como`, `digite a data no formato`, `use o formato ano-mês-dia`): **nenhuma ocorrência**.

As três ocorrências restantes de "número de dias" no arquivo estão **todas no Capítulo 21** e são legítimas:

| Linha | Natureza |
|---|---|
| 3841 | a nota de correção **citando** a afirmação retratada, entre aspas |
| 3863, 3870 | o bloco do selo **Atrasada** do backlog, descrevendo como um valor numérico **é lido** — não afirmando que alguma tela o peça. Validado em §3.5 |

### Execução visual

**Não houve.** A reconferência foi por leitura de código e por **execução da função de interpretação de prazo** em Node, reproduzida literalmente a partir de `operationalBuckets.ts` (§3.5). Nenhuma tela foi aberta; nenhum dado real foi consultado.

### Build / lint / testes

**Não executados.** Tarefa exclusivamente documental, sem alteração de `src/`, `server/`, migrations, testes, CSS, assets ou configurações — e o §7 do prompt os dispensa. **Não se alega execução que não houve.**

---

## 8. Branches preservadas

`main`, `develop`, `homol` e todas as branches documentais anteriores — incluindo `docs/manual-usuario-sgp-cap06-esteiras`, base desta rodada — **intactas**. Sem PR, merge, rebase, force-push ou exclusão de branches.

---

## 9. Pendências e próximo passo

Pendências de produto inalteradas e ainda abertas: correção do cálculo de atraso (prazo em texto livre), do selo **Atrasada** do backlog, e os demais itens já listados no retorno do Capítulo 6.

Refinamento documental disponível: acrescentar ao Capítulo 21 o caso de **uma só data preenchida** (§6).

Próxima rodada, conforme §10 do prompt: **Capítulo 14 — Evolução das Esteiras**, usando o tip final desta branch como base. Não iniciada automaticamente.

---

## 10. Estado final

- **Branch:** `docs/manual-usuario-sgp-fix-cap05-prazo`
- **SHA base:** `d8d2408d69c82779ef4caae4e8532e5f7389432b`
- **SHA final:** obtido por `git rev-parse origin/docs/manual-usuario-sgp-fix-cap05-prazo`
- **Working tree após commit:** limpo
- **Commit/push:** commit documental único, push para a branch acima. Sem PR, sem merge, sem rebase, sem force-push.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.
