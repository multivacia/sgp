# SIGEC — Checklist de Validação Estática

Este checklist deve ser executado **antes e depois** de qualquer
alteração no repositório `sigec-cobol/`.

Regra soberana: nenhuma alteração é aceita se transformar um `OK` em
`FAIL` sem justificativa formal no PR/issue.

## 0. Pré-requisitos

- Bash 4+ com `grep`, `awk`, `sed`, `find`.
- Estar na raiz do repositório (`sigec-cobol/`).
- `git status` limpo antes de rodar (para diff pós-mudança ser
  interpretável).

## 1. Contagem de artefatos

- [ ] `find cobol -type f -name '*.cbl' | wc -l` retorna **20**.
- [ ] `find copybooks -type f -name '*.cpy' | wc -l` retorna o mesmo
      valor da baseline (37 no snapshot atual).
- [ ] `find dclgen -type f -name '*.cpy' | wc -l` retorna **12**.
- [ ] `find db2/ddl -type f -name '*.sql' | wc -l` retorna **14**.
- [ ] `find jcl -type f -name '*.jcl' | wc -l` retorna **12**.

## 2. CALLs estáticas

- [ ] Rodar `bash tests/validate_static.sh`; check 2 volta `OK`.
- [ ] Nova CALL adicionada?
  - [ ] Alvo existe em `cobol/`? OU
  - [ ] Alvo é uma exceção intencional (`SGEXTLOG`, `SGXASM01`,
        `SGCB0999`)? Documentar em `docs/PONTOS_FORA_COBERTURA.md`.
- [ ] CALL dinâmica adicionada?
  - [ ] Nome construído em runtime? Documentar em Ponto 2.
  - [ ] Existe `ON EXCEPTION` para tolerar módulo ausente?

## 3. COPYs

- [ ] Rodar `validate_static.sh`; check 3 volta `OK`.
- [ ] Novo `COPY` adicionado?
  - [ ] Arquivo `copybooks/XXXX.cpy` existe? OU
  - [ ] Exceção documentada (`SGXTAPE` apenas em comentário — Ponto 19)?

## 4. FILE STATUS

- [ ] Todo `FILE-CONTROL` novo tem cláusula `FILE STATUS IS
      WS-FS-XXXX`?
- [ ] Existe `EVALUATE WS-FS-XXXX` ou `IF WS-FS-XXXX ...` no
      PROCEDURE DIVISION?
- [ ] Programa novo com arquivo I/O tratou os 5 códigos padrão
      (00, 04, 10, 23, 35, 39)?
- [ ] Rodar check 4 do `validate_static.sh`.

## 5. SQLCODE

- [ ] Todo bloco `EXEC SQL` (fora de `INCLUDE SQLCA`, `DCLGEN`,
      `WHENEVER`) tem tratamento explícito de `SQLCODE`?
- [ ] Padrões esperados: `WHEN SQLCODE = 0`, `WHEN SQLCODE = +100`,
      `WHEN OTHER`. Ver `docs/MATRIZ_PROGRAMA_TABELA.md` §5.
- [ ] Cursores novos declaram `WITH HOLD` se houver `COMMIT`
      intermediário?
- [ ] Rodar check 5 do `validate_static.sh`.

## 6. Pontos fora de cobertura (`docs/PONTOS_FORA_COBERTURA.md`)

Nenhum destes pontos deve desaparecer sem substituição documentada:

- [ ] Ponto 1: `SGCB0010` par. `9998-MODO-SIMULACAO-ANTIGO` continua
      presente e **sem** `PERFORM 9998` no código vivo.
- [ ] Ponto 2: CALL dinâmica construída em `SGCB0010` par. `2080` e/ou
      `SGCB0190` par. `7900` continua presente.
- [ ] Ponto 3: `SGCB0110` `WS-FATOR-ES VALUE 0.873` intacto.
- [ ] Ponto 4: `SGCB0040` `WS-DATA-LEGADO` REDEFINES aninhado intacto.
- [ ] Ponto 5: `SGCB0010` `ALTER 9500-FINALIZAR-LEGADO ...` continua o
      **único** ALTER do repositório.
- [ ] Ponto 6: `SGCB0110` `GO TO ... DEPENDING ON WS-SUBTIPO-SP`
      intacto.
- [ ] Ponto 7: `SGCB0140` `OCCURS 1 TO 12 DEPENDING ON WS-HIST-QTD`
      intacto.
- [ ] Ponto 8: `PENDENTE DE INSERÇÃO`. Marcar como
      resolvido apenas quando um `.cbl` do lab passar a usar `RECFM VB`.
- [ ] Ponto 9: `SGLCTRIN.cpy` e `SGLPAGIN.cpy` continuam com 4 níveis
      `01` cada (genérico + HDR + DET + TRL).
- [ ] Ponto 10: `SGCB0100`, `SGCB0160`, `SGCB0070` continuam lendo
      `SG_PARAMETRO`.
- [ ] Ponto 11: `SGCB0050` dispatch por `LK-FUNCAO` e `SGCB0060`
      dispatch por `LK-OPERACAO` continuam presentes.
- [ ] Ponto 12: `SGCB0150` continua **não** chamado por outro `.cbl`.
- [ ] Ponto 13: `SGCB0130` par. `1500-CARREGAR-BLOQUEIOS` continua
      tolerando FS 35/37/39/93.
- [ ] Ponto 14: `SGCB0070` par. `4500-UPDATE-PARCELA` e `SGCB0120`
      continuam com ramo `WHEN SQLCODE = +100`.
- [ ] Ponto 15: `9998-MODO-SIMULACAO-ANTIGO` e `3400-CALC-SP` (SGCB0110)
      continuam sem chamador vivo.
- [ ] Ponto 16: `SGCB0020` continua com `qtd-parcelas <= 360`
      divergindo de `REGRAS_NEGOCIO.md` §2 item 4.
- [ ] Ponto 17: `SGCB0150` continua com `SELECT SGXTAPE-FILE`
      comentado.
- [ ] Ponto 18: `SGEXTLOG`, `SGCB0999`, `SGXASM01` continuam sem
      contraparte em `cobol/`.
- [ ] Ponto 19: `SGXTAPE` continua sem `COPY` ativo.
- [ ] Ponto 20: `CALL 'SGXASM01' USING REG-SGVCOBRA` intacto em
      `SGCB0150`.

## 7. Executar validação completa

```bash
bash tests/validate_static.sh
```

Exit esperado: **0**.

## 8. Após validação

- [ ] Anexar saída ao PR/issue.
- [ ] Se algum item foi alterado intencionalmente, atualizar
      `docs/PONTOS_FORA_COBERTURA.md` **na mesma alteração**.
- [ ] Nunca remover exceções do `validate_static.sh` sem antes
      remover o alvo do código.
