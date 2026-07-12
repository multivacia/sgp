# SIGEC — Códigos de Retorno

Todos os programas do SIGEC devolvem, via `LK-RETURN-CODE` (`PIC 9(02)`),
um valor pertencente à tabela padrão abaixo. O valor específico é
complementado pela mensagem em `LK-MENSAGEM` (`PIC X(80)`) definida em `SGERRMSG.cpy`.

O JCL avalia RC via `COND=(NN,LE|LT|GT|EQ)` e decide sequência.

---

## 1. Faixa padrão

| RC | Severidade | Semântica | Ação do JCL/Scheduler |
|----|-----------|-----------|-----------------------|
| **00** | OK | Sucesso pleno, nenhum aviso | Continua fluxo |
| **04** | WARNING | Sucesso com ressalvas (registros ignorados, ausência de dados esperados, divergência tolerada) | Continua fluxo; loga em `SGLERROS` |
| **08** | ERRO FUNCIONAL | Regra de negócio impede a conclusão de parte do processamento (dados inválidos, referência inexistente, arquivo com integridade quebrada) | Interrompe fluxo dependente; permite steps independentes |
| **12** | ERRO TÉCNICO | Falha de infraestrutura ou de código (I/O, DB2 SQLCODE inesperado, VSAM indisponível) | Aborta janela batch; aciona plantão |
| **16** | CRÍTICO | Corrupção de dados, inconsistência entre bases, indisponibilidade generalizada | Aborta imediatamente; escalação máxima; exige análise antes de restart |

**Regra soberana:** um programa nunca retorna um RC menor do que o maior RC observado ao longo da sua execução (o RC propagado é sempre o pior encontrado).

---

## 2. Sub-códigos (mensagem complementar)

Cada programa registra, junto ao RC, uma mensagem-chave padronizada no formato:

`<CAT>-<SLUG>`

Onde `<CAT>` categoriza o problema. Exemplo: `08-DOC-INVALIDO`, `12-DB2-SQLCODE`, `04-TRAILER-DIVERGE`.

---

## 3. Códigos por programa

### SGCB0010 — Driver

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-EXEC-OK` | Janela concluída sem incidentes |
| 04 | `04-STEP-WARNING` | Um ou mais steps retornaram warning |
| 08 | `08-BLOQUEIO-ATIVO` | `SGLBLOQ` tem bloqueio para a data de processamento |
| 08 | `08-DIA-NAO-UTIL` | Data de execução é fim de semana/feriado sem override |
| 12 | `12-STEP-ERR-TEC` | Algum step retornou 12; janela abortada |
| 16 | `16-DRIVER-INCONS` | Inconsistência entre `SGT_LOG_EXEC` e status real dos steps |

### SGCB0020 — Validação de contratos

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-CTR-VAL-OK` | Todos os contratos aprovados |
| 04 | `04-TRAILER-DIVERGE` | Trailer do arquivo diverge da contagem real |
| 04 | `04-CTR-REJEIT-PARCIAL` | Alguns contratos rejeitados, arquivo aceito |
| 08 | `08-DOC-INVALIDO` | Documento (CPF/CNPJ/IE) inválido em campo obrigatório |
| 08 | `08-VLR-INCONSIST` | Soma de parcelas incompatível com valor total |
| 08 | `08-TIPO-INVALIDO` | `tipo-cliente` ou `tipo-contrato` fora do domínio |
| 08 | `08-HEADER-INVAL` | HEADER ausente ou com data inválida |
| 12 | `12-IO-CTRIN` | Falha de leitura em `SGLCTRIN` |

### SGCB0030 — Carga contratos DB2

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-CTR-CARGA-OK` | Todos os contratos válidos foram inseridos |
| 04 | `04-DB2-DUPL-IGNOR` | Duplicados ignorados (contratos já carregados em rerun) |
| 08 | `08-CLI-INTEGR` | Cliente com integridade referencial quebrada |
| 08 | `08-PAR-GERA-FAIL` | Falha ao gerar parcelas para 1+ contratos |
| 12 | `12-DB2-SQLCODE` | SQLCODE inesperado — grava em `SGLDB2RE` |
| 16 | `16-DB2-DOWN` | DB2 indisponível durante commit |

### SGCB0040 — Validação de pagamentos

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-PAG-VAL-OK` | Todos os pagamentos aprovados |
| 04 | `04-PAG-EXCESSO` | Pagamentos com excesso convertidos em crédito |
| 04 | `04-TRAILER-DIVERGE` | Divergência tolerada no trailer |
| 08 | `08-PAG-SEM-CTR` | Pagamento aponta para contrato inexistente |
| 08 | `08-PAG-SEM-PAR` | Parcela inexistente ou já liquidada |
| 08 | `08-DT-FUTURA` | Data de pagamento futura |
| 08 | `08-CANAL-INVAL` | Canal fora do domínio (BOL, DEB, PIX, TED, DOC, CAR) |
| 12 | `12-IO-PAGIN` | Falha de leitura em `SGLPAGIN` |

### SGCB0050 — Aplicação de pagamentos

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-PAG-APLIC-OK` | Todos os pagamentos aplicados |
| 04 | `04-PAG-PENDENTE` | Pagamentos em `SGLPAGPD` aguardando conciliação |
| 08 | `08-SALDO-NEG` | Saldo devedor negativo após aplicação |
| 12 | `12-DB2-COMMIT` | Falha no commit intermediário |

### SGCB0070 — Cálculo de encargos

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-ENC-CALC-OK` | Cálculo completo |
| 04 | `04-ENC-SEM-VENC` | Nenhuma parcela vencida no dia (arquivo vazio) |
| 08 | `08-FIN-PARAM` | Parâmetros financeiros inconsistentes |
| 12 | `12-SGCB0110-ERR` | Motor `SGCB0110` retornou RC ≥ 12 |

### SGCB0100 — Detecção de inadimplência

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-INA-DET-OK` | Detecção concluída |
| 04 | `04-INA-VAZIO` | Nenhum inadimplente identificado |
| 08 | `08-RISCO-FAIL` | Falha ao classificar risco em 1+ contratos |
| 12 | `12-VSAM-AUDIT` | Falha ao escrever em `SGLAUDVS` VSAM |

### SGCB0110 — Motor financeiro

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-FIN-CALC-OK` | Cálculo ok |
| 04 | `04-FIN-DIAS-ZERO` | Dias em atraso = 0, retorno neutro |
| 08 | `08-FIN-PRINC-ZERO` | Principal ≤ 0 |
| 08 | `08-FIN-TAXA-INVAL` | Taxa fora da faixa permitida |
| 08 | `08-FIN-TIPO-INVAL` | Tipo de contrato desconhecido |
| 12 | `12-FIN-OVERFLOW` | Overflow em cálculo (COMP-3) |

### SGCB0130 — Renegociação

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-REN-GER-OK` | Propostas geradas |
| 04 | `04-REN-SEM-ELEG` | Nenhum contrato elegível no dia |
| 08 | `08-REN-DUP-ATIVA` | Contrato já tem proposta ativa (menos que 90 dias) — descartado |
| 12 | `12-REN-SIMUL-ERR` | Falha na simulação via `SGCB0110` |

### SGCB0140 — Classificação de risco

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-RISCO-CLASS-OK` | Risco atribuído |
| 04 | `04-RISCO-MANTEM` | Risco permanece o mesmo do dia anterior |
| 08 | `08-RISCO-DADOS` | Faltam dados de histórico para classificar |
| 12 | `12-RISCO-TAB-DOWN` | Tabela `SGT_RIS_MATRIZ` indisponível |

### SGCB0160 — Interfaces

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-INT-GER-OK` | Interfaces geradas |
| 04 | `04-INT-ARQ-VAZIO` | Alguma interface saiu vazia (header + trailer somente) |
| 08 | `08-INT-FORMAT` | Erro de formatação (`SGCB0200` RC ≥ 08) |
| 12 | `12-INT-IO` | Falha de I/O em arquivo de interface |

### SGCB0170 — Validação de documento

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-DOC-OK` | Documento válido |
| 04 | `04-DOC-VAZIO` | Documento em branco (tolerado se tipo permite) |
| 08 | `08-DOC-DV-ERR` | Dígito verificador inválido |
| 08 | `08-DOC-LEN-INVAL` | Comprimento incorreto para o tipo informado |
| 08 | `08-DOC-TIPO-INVAL` | Tipo fora de {CPF, CNPJ, LE} |

### SGCB0180 — Datas

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-DT-OK` | Operação ok |
| 04 | `04-DT-FIM-SEM` | Data cai em fim de semana (informativo) |
| 04 | `04-DT-FERIADO` | Data cai em feriado |
| 08 | `08-DT-INVAL` | Data inexistente (ex.: 30/02) |
| 08 | `08-DT-FORMATO` | Formato diferente de AAAAMMDD |

### SGCB0190 — Relatórios

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-REL-OK` | Relatórios gerados |
| 04 | `04-REL-VAZIO` | Um dos relatórios saiu sem detail |
| 12 | `12-REL-IO` | Falha ao escrever relatório |

### SGCB0200 — Formatação de interface

| RC | Chave | Descrição |
|----|-------|-----------|
| 00 | `00-FMT-OK` | Registro formatado |
| 04 | `04-FMT-TRUNC` | Campo truncado ao caber no layout |
| 08 | `08-FMT-CAMPO-INVAL` | Campo obrigatório vazio no input |
| 12 | `12-FMT-OVERFLOW` | Overflow em campo numérico |

---

## 4. Uso no COBOL

Todo programa deve:

1. Incluir `SGRETCOD.cpy` em `WORKING-STORAGE`.
2. Inicializar `WS-RC = SG-RC-OK`.
3. Ao detectar situação anômala:
   - Atualizar `WS-RC` com `MOVE MAX(WS-RC, <novo>) TO WS-RC` (via IF ou parágrafo utilitário `9900-ELEVA-RC`);
   - Preencher `SGERRMSG` com a chave e a mensagem descritiva;
   - Se aplicável, gravar em `SGLERROS`.
4. Antes de encerrar, mover `WS-RC` para `LK-RETURN-CODE` e `RETURN-CODE`.

Exemplo de convenção de níveis 88 em `SGRETCOD.cpy`:

```cobol
       01  WS-RC              PIC 9(02) VALUE 00.
           88 SG-RC-OK               VALUE 00.
           88 SG-RC-WARN             VALUE 04.
           88 SG-RC-ERR-FUNC         VALUE 08.
           88 SG-RC-ERR-TEC          VALUE 12.
           88 SG-RC-CRITICO          VALUE 16.
```

---

## 5. Ação do scheduler por RC

| RC recebido | JCL padrão | Ação |
|-------------|-----------|------|
| 00 | `COND=(0,LT)` seguinte executa | Segue |
| 04 | `COND=(4,LT)` seguinte executa | Segue com aviso; e-mail informativo |
| 08 | `COND=(8,LE)` seguinte não executa | Interrompe cadeia; abre incidente P3 |
| 12 | `COND=(12,LE)` cadeia inteira aborta | P2; aciona plantão |
| 16 | `COND=(16,LE)` cadeia inteira aborta | P1; escalação imediata; congelar janela |
