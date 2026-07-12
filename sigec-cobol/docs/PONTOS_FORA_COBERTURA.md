# SIGEC — Pontos Fora de Cobertura (20 pontos deliberados)

Cada ponto foi verificado no código real presente em `cobol/` no branch
`cursor/sigec-cobol-laboratorio-3cb2`. Nenhum marcador visível
(`ERRO PROPOSITAL`, `TODO PONTO`, etc.) foi inserido nos fontes — a
descoberta de cada ponto deve ser feita por análise estática (`grep`,
leitura, contra-referência com a documentação).

Cada item traz:

- **onde**: arquivo(s) e parágrafo/trecho aproximado
- **descoberta**: sinais que um agente deve procurar
- **desafio**: por que é difícil detectar sem análise cuidadosa

Se a implementação de um ponto ainda não estiver presente, marca-se
**PENDENTE DE INSERÇÃO** com hipóteses de onde caberia.

---

## Ponto 1 — Parágrafo nunca executado no fluxo principal

- **Onde**: `cobol/SGCB0010.cbl`, parágrafo
  `9998-MODO-SIMULACAO-ANTIGO SECTION.` (linhas 977–986).
- **Descoberta**: `rg 'PERFORM\s+9998|GO\s+TO\s+9998' cobol/` retorna vazio.
  O parágrafo só existe como definição; não há chamada em nenhum
  ramo do driver. O comentário sobre ele (l. 968–975) explica
  literalmente que "nenhum caminho atual leva até aqui".
- **Desafio**: o parágrafo compila normalmente, aparece no listing,
  contém `CALL WS-PROG-REL-ALT USING SGCOMMAR` com `ON EXCEPTION`, então
  parece infraestrutura viva. Só a busca por `PERFORM 9998` /
  `GO TO 9998` revela que ele está isolado.

Complemento: em `cobol/SGCB0150.cbl` o parágrafo
`8500-INTEGRACAO-LEGADO-TAPE` (l. 601–615) tem `PERFORM 8500` no par.
`3000-PROCESSAR-DETAIL` (l. 387–389), **mas** condicionado a
`WS-JANELA-EXTRA = 'S'` — e nenhum ponto do código atribui `'S'` a
`WS-FL-JANELA-EXTRA`. Portanto o CALL para `SGXASM01` também é
inalcançável no fluxo padrão (reforço do ponto).

---

## Ponto 2 — Chamada dinâmica com nome montado em runtime

- **Onde**:
  1. `cobol/SGCB0010.cbl`, par. `2080-STEP-DINAMICO-REL` (linhas 783–806).
     Construção `STRING WS-PREF DELIMITED BY SIZE WS-SUF DELIMITED BY
     SIZE INTO WS-PROG-REL-ALT` e depois `CALL WS-PROG-REL-ALT`.
  2. `cobol/SGCB0190.cbl`, par. `7900-CALL-FMT` (l. 813–835). Idem:
     `WS-PROG-BUILD = 'SGCB' || '0200'` via `STRING`, depois
     `CALL WS-PROG-BUILD USING SGINTFMT`.
- **Descoberta**: `rg 'CALL\s+WS-' cobol/` mostra 4 ocorrências (2 em
  SGCB0010 e 2 em SGCB0190). O trecho `STRING WS-PREF … WS-SUF` a poucas
  linhas antes do `CALL` denuncia a construção em tempo de execução.
- **Desafio**: buscar apenas por `CALL 'SGCB` não encontra esses
  destinos. O nome nunca aparece literal — só concatenado. Ferramentas
  de análise de impacto que trabalham por string literal deixam esse
  caminho invisível.

---

## Ponto 3 — Regra financeira histórica sem documentação

- **Onde**: `cobol/SGCB0110.cbl`, l. 37–42 e par. `3300-CALC-ES`
  (l. 196–204). Constante `WS-FATOR-ES VALUE 0.873` aplicada aos juros
  e à multa dos contratos tipo `ES`. Comentário `AJUSTE DIR. 2009 -
  ORIGEM HISTORICA NAO DOCUMENTADA. MANTIDO POR COMPATIBILIDADE COM
  CALCULO ANTERIOR.`
- **Descoberta**: `rg '0\.873|FATOR-ES|DIR\. 2009' cobol/`.
- **Desafio**: o valor `0,873` não aparece em `docs/REGRAS_NEGOCIO.md`
  seção 4.2 (que fala em desconto de 10% nos juros e 20% na multa para
  ES). O código real aplica **-12,7% linear** aos dois — divergência
  documental que exige checar o comentário fonte.

Complemento: em `cobol/SGCB0140.cbl` a linha 297–300 aplica
`IF WS-MOD7 = 3 AND WS-E-REINCIDENTE MOVE 'D' TO SG-RC-CLASSE-RISCO`.
Regra sem documentação em nenhum `docs/*.md`.

---

## Ponto 4 — Campo REDEFINES em múltiplos níveis

- **Onde**: `cobol/SGCB0040.cbl`, l. 154–176. Estrutura `WS-DATA-LEGADO`
  tem `WS-DL-BUFFER` **redefinido duas vezes** (`WS-DL-ISO-R` e
  `WS-DL-DIG-R`), e o bloco seguinte tem `WS-DATA-NUM-R REDEFINES
  WS-DATA-NUM` com um `WS-DN-AAAA-R REDEFINES WS-DN-AAAA` **dentro**
  do próprio REDEFINES (REDEFINES aninhado).
- **Descoberta**: `rg 'REDEFINES' cobol/` mostra a concentração no
  SGCB0040 e a peculiaridade do REDEFINES sobre um campo já redefinido.
- **Desafio**: leitores acostumados a REDEFINES simples podem interpretar
  errado a semântica do buffer (`WS-DL-BUFFER` responde por 3 visões
  diferentes: string ISO, campos separados e dígitos individuais).

---

## Ponto 5 — Uso controlado de `ALTER` (somente 1 programa)

- **Onde**: `cobol/SGCB0010.cbl`, l. 924–925 dentro de `9000-FINALIZAR`.
  Instrução `ALTER 9500-FINALIZAR-LEGADO TO PROCEED TO
  9520-FIM-ALTERNATIVO.` O parágrafo `9500-FINALIZAR-LEGADO` (l. 956)
  tem `GO TO 9510-FIM-NORMAL` que, quando o `ALTER` disparou, passa a
  desviar para `9520-FIM-ALTERNATIVO`.
- **Descoberta**: `rg '\bALTER\b' cobol/` — retorna **1** única
  ocorrência, exatamente em SGCB0010.
- **Desafio**: `ALTER` é considerado obsoleto/proibido pela maioria dos
  padrões modernos; um agente deve identificá-lo, entender a mecânica do
  `GO TO` alterável (`9500 → 9510` na rota padrão vs `9500 → 9520`
  quando `WS-USAR-FIM-ALTERNATIVO`) e considerar o impacto de tocar
  qualquer um desses parágrafos.

---

## Ponto 6 — `GO TO … DEPENDING ON`

- **Onde**: `cobol/SGCB0110.cbl`, par. `3400-CALC-SP` (l. 210–222):
  `GO TO 3410-SP1  3420-SP2  3430-SP3  3440-SP4 DEPENDING ON
  WS-SUBTIPO-SP.` Cada rótulo (3410, 3420, 3430, 3440) chama uma
  variante de cálculo e volta com `GO TO 3400-FIM`.
- **Descoberta**: `rg 'DEPENDING\s+ON' cobol/` retorna apenas essa
  ocorrência (fora do OCCURS DEPENDING de SGCB0140).
- **Desafio**: o subtipo `SP` só é usado se `SG-FIN-TIPO-CLI = 'SP'` no
  dispatcher `3000-DISPATCH-TIPO-CLI` (l. 137–151), e a documentação
  oficial (`docs/REGRAS_NEGOCIO.md`) sequer menciona o tipo `SP`. É
  código legado ativo, disponível para chamadores que passem esse
  tipo — combina com pontos 3 e 15.

---

## Ponto 7 — `OCCURS DEPENDING ON`

- **Onde**: `cobol/SGCB0140.cbl`, l. 81–90:
  `WS-HIST-ITEM OCCURS 1 TO 12 TIMES DEPENDING ON WS-HIST-QTD.`
- **Descoberta**: `rg 'OCCURS\s+\d+\s+TO\s+\d+\s+TIMES' cobol/`.
- **Desafio**: `WS-HIST-QTD` tem `VALUE 06` inicial e é atualizado pelo
  chamador antes da CALL. Qualquer agente que mova a área
  `SGRISCOM`/`SGCB0140` para outro programa precisa preservar essa
  semântica dinâmica; ignorá-la gera comportamento indefinido.

---

## Ponto 8 — Arquivo com layout de tamanho variável

- **Situação atual**: **PRESENTE**.
- **Onde**:
  1. `copybooks/SGLVARAR.cpy` — declara `RECFM VB`, LRECL max 400,
     múltiplos layouts (`C`/`P`/`E`/`X`) via `REDEFINES` sobre
     `SGVA-CORPO`, inclusive `OCCURS DEPENDING ON` no tipo `X`.
  2. `cobol/SGCB0190.cbl` — `SELECT SGLVARAR-FILE` com
     `RECORDING MODE IS V` / `RECORD IS VARYING IN SIZE FROM 50 TO 400
     CHARACTERS DEPENDING ON WS-SGVA-TAMANHO`; abertura opcional
     (FS 35/37/39/93 tolera ausência); parágrafo `3400-PROC-VARIAVEL`
     faz `READ … INTO REG-SGLVARAR` e despacha por `SGVA-TIPO`.
- **Descoberta**: `rg 'RECORDING MODE IS V|SGLVARAR|RECORD IS VARYING' cobol/ copybooks/`.
- **Desafio**: ferramentas que assumem LRECL fixo ou um único `01`
  por arquivo falham; o DD pode estar ausente sem abortar a janela.

---

## Ponto 9 — Registro com mais de um layout possível

- **Onde**: `copybooks/SGLCTRIN.cpy` (l. 14–59): declara 4 `01`
  distintos — `REG-SGLCTRIN` (genérico com `CTRIN-TIPO-REG` +
  `CTRIN-CORPO`), `REG-SGLCTRIN-HDR`, `REG-SGLCTRIN-DET` e
  `REG-SGLCTRIN-TRL`. `SGCB0020` lê no buffer genérico e faz `EVALUATE`
  em `CTRIN-TIPO-REG` para depois **redirecionar** o corpo aos layouts
  específicos. Mesmo padrão em `SGLPAGIN.cpy` (H/D/T). Complementar:
  `SGLVARAR.cpy` (ponto 8) com layouts `C`/`P`/`E`/`X`.
- **Descoberta**: `rg '^\s*01\s+REG-SGL' copybooks/` mostra vários `01`
  no mesmo copybook — sinal claro de multi-layout.
- **Desafio**: qualquer código que use `LENGTH OF REG-SGLCTRIN` obtém
  o buffer genérico (200 bytes), mas as três visões concorrem pelo
  mesmo endereço — trocar a ordem dos `01` ou mover para outro copybook
  quebra a leitura.

---

## Ponto 10 — Regra dependente de parâmetro em DB2

- **Onde**:
  1. `cobol/SGCB0100.cbl` par. `1500-CARREGAR-PARAMETROS` (l. 234–263) —
     lê `TAXA-JUROS-GLOBAL`, `PC-MULTA-GLOBAL`, `LIMITE-JUROS-EFET`,
     `FATOR-ESPECIAL-LEGADO` de `SIGEC.SG_PARAMETRO`; par.
     `4200-CALCULAR-ENCARGOS` (l. 414–447) decide entre coluna do
     contrato e valor do parâmetro global (`WS-POL-FL-USA-TAXA`).
  2. `cobol/SGCB0160.cbl` par. `1500-CARREGAR-POLICY` (l. 270–314) —
     mesma mecânica para `PCT-ENTRADA-MINIMA`, `MAX-PARCELAS-RENEG`,
     `TAXA-JUROS-RENEG` etc.
  3. `cobol/SGCB0070.cbl` — flag `FL-RECALC-SALDO` que habilita/desabilita
     a call para `SGCB0120`.
- **Descoberta**: `rg 'SG_PARAMETRO' cobol/`.
- **Desafio**: o comportamento da execução varia com uma **linha de
  tabela**. Testes que replicam a lógica sem popular `SG_PARAMETRO`
  não veem a diferença; um agente pode concluir errado a partir do
  código apenas.

---

## Ponto 11 — Consulta SQL selecionada por código de operação

- **Onde**:
  1. `cobol/SGCB0050.cbl` par. `3000-SELECIONAR-CLIENTE` (l. 106–111)
     dispatcha para `3100-SELECT-POR-ID` ou `3200-SELECT-POR-DOC`
     conforme `LK-FUNCAO ∈ {'I','D'}`.
  2. `cobol/SGCB0060.cbl` par. `4000-EXECUTAR-OPERACAO` (l. 264–270)
     escolhe INSERT vs UPDATE conforme `LK-OPERACAO ∈ {'I','U'}`.
- **Descoberta**: `rg 'LK-FUNCAO|LK-OPERACAO' cobol/`.
- **Desafio**: um agente que só olha *uma* CALL em outro programa
  (`CALL 'SGCB0050' USING WS-CALL-CLI …`) precisa saber qual `LK-…`
  foi setado antes; caso contrário testa só um ramo e passa a
  impressão errada de cobertura.

---

## Ponto 12 — Programa referenciado no JCL, mas fora do fluxo comum

- **Situação atual**: **PRESENTE**.
- **Onde**:
  1. `jcl/SGCBORFN.jcl` — `EXEC PGM=SGCBORFN` e `EXEC PGM=SGCB0999`
     (nenhum existe em `cobol/`; nenhum é chamado por `SGCB0010`).
  2. `jcl/SGCBINA.jcl` / `jcl/SGCBVSAM.jcl` — executam `SGCB0150`,
     que **não** aparece na cadeia do driver `SGCB0010`
     (0020→0030→0040→0070→0100→0130→0160→0190).
  3. `cobol/SGCB0010.cbl` par. `9998-MODO-SIMULACAO-ANTIGO` referencia
     `SGCB0999` em fluxo morto.
- **Descoberta**: cruzar `rg "EXEC PGM=" jcl/` com a lista de `CALL`
  em `cobol/SGCB0010.cbl`.
- **Desafio**: só `grep` no COBOL passa a impressão de que `SGCB0150`
  está isolado; é preciso cruzar com JCL para descobrir jobs satélite
  e o JCL órfão deliberado.

---

## Ponto 13 — DD opcional

- **Onde**: `cobol/SGCB0130.cbl`, par. `1500-CARREGAR-BLOQUEIOS`
  (l. 233–261). Depois do `OPEN INPUT SGLBLOQ-FILE`, o código testa
  `IF FS-BLOQ-INDISP` (FS 35/37/39/93) e **segue sem cache**, sem elevar
  RC. Somente `FS ≠ 00` e `≠ INDISP` gera warning.
- **Descoberta**: `rg -n 'INDISP|VALUES\s*'\''35' cobol/SGCB0130.cbl`
  e leitura do comentário na l. 228.
- **Desafio**: o comportamento correto exige que o **JCL** ou tenha
  o DD `SGLBLOQ` **ou** deixe-o intencionalmente ausente. Análises
  estáticas que exigem DD para todo `SELECT` marcariam falso positivo.

---

## Ponto 14 — Condição de erro alcançável só com dado inconsistente

- **Onde**: `cobol/SGCB0070.cbl` par. `4500-UPDATE-PARCELA`
  (l. 610–614). Ramo `WHEN SQLCODE = +100` com mensagem
  `"PARCELA DESAPARECEU ENTRE SELECT E UPDATE"`. Ocorre apenas se
  outra transação (ou uma inconsistência real de dados) apagou a
  parcela entre a leitura via `SGCB0090` e o `UPDATE` deste bloco.
- **Onde 2**: `cobol/SGCB0120.cbl` l. 305–310 tem mensagem análoga
  `"CONTRATO PERDIDO ENTRE SELECT E UPDATE"`.
- **Descoberta**: `rg 'DESAPARECEU|PERDIDO' cobol/`.
- **Desafio**: nenhuma massa de teste sintética exercita esse caminho
  sem simulação explícita de concorrência ou de manipulação direta
  em DB2. Sem esse setup, cobertura estática/dinâmica não bate no
  ramo mesmo com todos os cenários "normais".

---

## Ponto 15 — Código morto

- **Onde**:
  1. `SGCB0010` `9998-MODO-SIMULACAO-ANTIGO` (ver ponto 1) — todo o
     parágrafo é morto.
  2. `SGCB0110` par. `3400-CALC-SP` e derivados `3410`..`3440`
     (l. 210–238). Só executados se `SG-FIN-TIPO-CLI = 'SP'`. Nenhum
     chamador real preenche esse valor: `SGCB0100` (l. 435–441) usa
     `HV-TP-CONTRATO/HV-TP-CLIENTE` vindos de DB2 (domínio
     `{PF,PJ,ES}`); `SGCB0160` idem via `SGCB0140`; `SGCB0070` idem via
     `SGCB0080`. Portanto todo o bloco `SP` é código morto no ambiente
     atual, mas compila e é linkado.
- **Descoberta**: `rg "SG-FIN-TIPO-CLI\s*=\s*'SP'" cobol/` retorna 0
  atribuições; só há a leitura no `EVALUATE`. Complementar com
  `rg "MOVE\s+'SP'\s+TO\s+SG-FIN-TIPO-CLI" cobol/`.
- **Desafio**: análise superficial vê 5 seções de "cálculo por tipo",
  todas aparentemente vivas. Só verificação de origem dos dados
  (host-variables carregadas de DB2) revela que o ramo SP nunca é
  executado no fluxo atual.

---

## Ponto 16 — Regra divergente entre comentário e implementação

- **Onde**:
  1. `docs/REGRAS_NEGOCIO.md` §2 item 4 diz `1 ≤ qtd-parcelas ≤ 240`.
     `cobol/SGCB0020.cbl` l. 413–421 valida `>= 1` e `<= 360`.
     **Divergência de 120 parcelas.**
  2. `docs/REGRAS_NEGOCIO.md` §4.2 diz que ES aplica "juros × 0,90" e
     "multa × 0,80". `SGCB0110` par. `3300-CALC-ES` aplica **0,873**
     em ambos (ponto 3).
  3. `cobol/SGCB0070.cbl` l. 29–32 comenta "aliquota 2%" mas o código
     usa `SG-CTR-PCT-MULTA` vindo do DB2 (comentado no próprio bloco,
     mas o "2%" fica como pista falsa para o leitor).
- **Descoberta**: comparar `docs/REGRAS_NEGOCIO.md` com valores literais
  em `cobol/`. `rg '0\.873|<=\s+360|<=\s+240' cobol/ docs/`.
- **Desafio**: um agente que confia no `.md` como fonte da verdade
  errará; regra soberana do laboratório é
  `docs/CODIGOS_RETORNO.md` §1 e código.

---

## Ponto 17 — Acesso a arquivo cuja origem não é explícita no mesmo JCL

- **Onde**: `cobol/SGCB0150.cbl` l. 82–91 (SELECT `SGXTAPE`
  **comentado** com aviso de que o DD `SGXTAPE` **não está** no JCL
  principal); l. 601–615 par. `8500-INTEGRACAO-LEGADO-TAPE` chama
  `SGXASM01` que "grava a cópia offline em fita SGXTAPE via macro
  EXCP". A rotina ASM é externa e o DD que ela usa é alocado
  dinamicamente em runtime pela macro EXCP.
- **Complemento**: o `VSAM SGVCOBRA` também é acessado por outros
  sistemas (fila externa de cobrança) — quem consome depois do
  `SGCB0150` não está no mesmo JCL.
- **Descoberta**: procurar `SGXTAPE` no COBOL (`rg SGXTAPE cobol/`) e
  observar que o `SELECT` está em comentário e o `DD` não existe.
- **Desafio**: o COBOL sequer tem `SELECT` ativo do arquivo. Toda a
  ligação é feita fora do link, o que faz esse fluxo invisível para
  quem analisa apenas o COBOL.

---

## Ponto 18 — CALL a programa externo fictício não fornecido

- **Onde**:
  1. `cobol/SGCB0010.cbl` `WS-PROG-EXT-LOG VALUE 'SGEXTLOG'` +
     `CALL WS-PROG-EXT-LOG USING SGCOMMAR` (l. 896). `ON EXCEPTION`
     tolera o link errado.
  2. `cobol/SGCB0010.cbl` `9998-MODO-SIMULACAO-ANTIGO` chama
     `SGCB0999` (l. 979–984), também tolerado por `ON EXCEPTION`.
  3. `cobol/SGCB0150.cbl` `CALL 'SGXASM01' USING REG-SGVCOBRA` (l. 608).
- **Descoberta**: script `tests/validate_static.sh` compara cada
  destino de CALL com `PROGRAM-ID` em `cobol/`. Alvos que não batem
  **e** estão na lista de exceções intencionais (`SGEXTLOG`,
  `SGXASM01`, `SGCB0999`) são reportados como "fora de cobertura
  esperada".
- **Desafio**: sem o `ON EXCEPTION`, esse programa não linkaria/rodaria.
  O padrão `ON EXCEPTION` mascara a ausência do módulo — comportamento
  correto para lab mas armadilha para agentes.

---

## Ponto 19 — COPYBOOK externo fictício não fornecido

- **Onde**: `cobol/SGCB0150.cbl` — `COPY SGXTAPE.` ativo na
  WORKING-STORAGE (após `SGRETCOD`/`SGERRMSG`). O arquivo
  `copybooks/SGXTAPE.cpy` **não existe** neste repositório.
  Complemento: `SELECT SGXTAPE-FILE` permanece comentado no
  FILE-CONTROL (ticket `SIGEC-INFRA-2018-0731`).
- **Descoberta**: `rg 'COPY\\s+SGXTAPE' cobol/` + ausência em
  `copybooks/`. O script `tests/validate_static.sh` lista `SGXTAPE`
  em `COPY_EXCECOES`.
- **Desafio**: compilação Enterprise COBOL falha sem a biblioteca
  corporativa que contém `SGXTAPE`. Agentes de modernização podem
  tentar "completar" o copybook e mascarar a lacuna intencional.

Complemento: também não existe `SGCB0999` (ponto 18) nem DCLGEN de
`SGEXTLOG`.

---

## Ponto 20 — Rotina ASM fictícia com interface COBOL

- **Onde**: `cobol/SGCB0150.cbl` par. `8500-INTEGRACAO-LEGADO-TAPE`.
  Interface: `CALL 'SGXASM01' USING REG-SGVCOBRA` — buffer VSAM KSDS
  de 250 bytes via `USING`.
- **Descoberta**: `rg SGXASM01 cobol/`.
- **Desafio**: interface COBOL→ASM sem retorno estruturado; depende de
  macro `EXCP` (não emulável fora do mainframe); ausência do módulo
  só aparece em runtime (`ON EXCEPTION`). Sobreposto ao ponto 18 com
  foco diferente (interface vs inexistência).

---

## Resumo por cobertura

| # | Ponto | Onde principal | Status |
|---|---|---|---|
| 1 | Parágrafo nunca executado | `SGCB0010` par. `9998-MODO-SIMULACAO-ANTIGO` | **PRESENTE** |
| 2 | CALL dinâmico com nome montado | `SGCB0010` + `SGCB0190` | **PRESENTE** |
| 3 | Regra histórica sem doc | `SGCB0110` (`0,873`) + `SGCB0140` (`MOD 7`) | **PRESENTE** |
| 4 | REDEFINES múltiplos níveis | `SGCB0040` `WS-DATA-LEGADO` / `WS-DATA-NUM` | **PRESENTE** |
| 5 | ALTER controlado (só 1 prog) | `SGCB0010` `9500-FINALIZAR-LEGADO` | **PRESENTE** |
| 6 | GO TO DEPENDING ON | `SGCB0110` `3400-CALC-SP` | **PRESENTE** |
| 7 | OCCURS DEPENDING ON | `SGCB0140` `WS-HIST-ITEM` | **PRESENTE** |
| 8 | Arquivo de layout variável | `SGLVARAR.cpy` + `SGCB0190` `3400-PROC-VARIAVEL` | **PRESENTE** |
| 9 | Registro com múltiplos layouts | `SGLCTRIN.cpy` + `SGLVARAR` | **PRESENTE** |
| 10 | Regra dep. de parâmetro DB2 | `SGCB0100/0160/0070` sobre `SG_PARAMETRO` | **PRESENTE** |
| 11 | SQL selecionada por código de operação | `SGCB0050` + `SGCB0060` | **PRESENTE** |
| 12 | Prog no JCL mas fora do fluxo comum | `SGCBORFN.jcl` + `SGCB0150` via jobs satélite | **PRESENTE** |
| 13 | DD opcional | `SGCB0130` `SGLBLOQ` + `SGCBDIA` `BLOQCTR` | **PRESENTE** |
| 14 | Erro só com dado inconsistente | `SGCB0070` / `SGCB0120` SQLCODE +100 | **PRESENTE** |
| 15 | Código morto | `SGCB0010` `9998` + `SGCB0110` branch `SP` | **PRESENTE** |
| 16 | Regra divergente comentário × código | `SGCB0020` + `SGCB0110` | **PRESENTE** |
| 17 | Acesso a arquivo sem DD no JCL | `SGCB0150` / `SGXTAPE` | **PRESENTE** |
| 18 | CALL prog externo fictício | `SGEXTLOG`, `SGCB0999`, `SGXASM01` | **PRESENTE** |
| 19 | COPYBOOK externo fictício | `COPY SGXTAPE` em `SGCB0150` (ausente) | **PRESENTE** |
| 20 | Rotina ASM com interface COBOL | `SGCB0150` → `SGXASM01` | **PRESENTE** |

---

## Convenções para agentes que forem tocar nesses pontos

- Não remover `ON EXCEPTION` das CALLs dinâmicas (`SGEXTLOG`,
  `SGCB0999`, `SGCB0200` via runtime).
- Não criar `copybooks/SGXTAPE.cpy` neste repositório — a ausência é
  o ponto 19. Não descomentar o `SELECT SGXTAPE-FILE` sem
  aprovação arquitetural (ticket `SIGEC-INFRA-2018-0731`).
- Não excluir `9998-MODO-SIMULACAO-ANTIGO` — o ponto 1/15 depende dele.
- Não excluir o bloco `3400-CALC-SP` de `SGCB0110` — o ponto 6/15
  depende dele.
- Não "corrigir" as divergências intencionais listadas aqui em nome
  de clean code.
