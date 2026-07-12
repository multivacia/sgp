# SIGEC — Regras de Negócio

Documento normativo. Toda mudança em qualquer regra abaixo exige:
1. Aprovação do time de Produto e do time Financeiro;
2. Atualização deste documento antes da implementação;
3. Casos de teste em `sigec-cobol/tests/`.

O backend COBOL é fonte da verdade para todas as regras aqui listadas.

---

## 1. Domínios canônicos

### 1.1 Tipo de cliente

| Código | Significado | Documento obrigatório |
|---|---|---|
| `PF` | Pessoa Física | CPF |
| `PJ` | Pessoa Jurídica | CNPJ |
| `ES` | Especial (convênio, corporativo, grupo econômico) | LE (Inscrição Estadual) ou CNPJ da matriz |

### 1.2 Tipo de contrato

| Código | Significado |
|---|---|
| `CR` | Crédito rotativo |
| `CD` | Crédito direto ao consumidor |
| `FI` | Financiamento |
| `CO` | Consórcio |
| `EM` | Empréstimo |

### 1.3 Situação de parcela

| Código | Significado |
|---|---|
| `ABERTA` | Sem pagamento |
| `PARCIAL` | Recebimento parcial |
| `LIQUIDADA` | Quitada integralmente |
| `CANCELADA` | Cancelada por renegociação, estorno ou decisão manual |
| `PROTESTO` | Enviada para cartório (após 90 dias inadimplente) |

### 1.4 Canal de pagamento

| Código | Nome |
|---|---|
| `BOL` | Boleto |
| `DEB` | Débito automático |
| `PIX` | PIX |
| `TED` | Transferência TED |
| `DOC` | DOC |
| `CAR` | Cartão |

### 1.5 Classe de risco

`A` (excelente) · `B` (bom) · `C` (regular) · `D` (ruim) · `E` (crítico)

---

## 2. Validação de contrato (SGCB0020)

Regras aplicadas na leitura de `SGLCTRIN`:

1. **Documento obrigatório**: precisa passar por `SGCB0170` conforme `tipo-cliente`.
2. **Nome**: mínimo 3 caracteres, máximo 60, sem caracteres de controle.
3. **Valor total**: `valor-total > 0` e `≤ 99.999.999.999,99`.
4. **Quantidade de parcelas**: `1 ≤ qtd-parcelas ≤ 240`.
5. **Consistência valor/parcelas**: `valor-total ÷ qtd-parcelas ≥ 1,00`.
6. **Data de início**: precisa ser dia útil futuro (D+1 a D+90) segundo `SGCB0180`.
7. **Taxa de juros**: `0 ≤ taxa ≤ 15,00%` ao mês.
8. **Percentual de multa**: `0 ≤ pct-multa ≤ 10,00%`.
9. **Duplicidade**: `nr-contrato` não pode existir em `SGT_CTR_CONTRATO`.
10. **Tipo permitido**: `tipo-cliente ∈ {PF,PJ,ES}` e `tipo-contrato ∈ {CR,CD,FI,CO,EM}`.

Rejeições geram registro em `SGLCTRRE` com motivo textual (X(40)) mapeado a partir da chave de erro.

---

## 3. Validação de pagamento (SGCB0040)

1. **Referência existente**: `id-contrato` precisa existir; `nr-parcela` deve ser válida para o contrato.
2. **Situação da parcela**: aceita se `ABERTA` ou `PARCIAL`; rejeita se `LIQUIDADA`, `CANCELADA` ou `PROTESTO`.
3. **Valor**: `valor > 0`.
4. **Data de pagamento**: `dt-pagto ≤ dt-processamento`. Data futura rejeitada.
5. **Canal**: precisa pertencer ao domínio (BOL/DEB/PIX/TED/DOC/CAR).
6. **Duplicidade de documento de pagamento**: mesma `nr-documento-pagto` no mesmo canal e mesmo dia é rejeitada.
7. **Pagamento parcial**: `IND-PARCIAL = 'S'` quando `valor < saldo-devedor-atualizado`.
8. **Pagamento em excesso**:
   - Aceito apenas em `canal = PIX`;
   - Excedente vira crédito na próxima parcela em aberto do mesmo contrato;
   - Se não houver próxima parcela, gera lançamento de restituição (out of scope no laboratório).

---

## 4. Cálculo de juros e multa (SGCB0110)

Aplicado uma vez por dia sobre cada parcela vencida.

### 4.1 Fórmula base

```
juros  = principal × (taxa_mensal / 30) × dias_atraso
multa  = principal × pct_multa            (aplicada 1x quando dias_atraso > 0)
atualizado = principal + juros + multa
```

### 4.2 Ajustes por tipo de contrato

| Tipo | Juros | Multa |
|---|---|---|
| Padrão (PF/PJ) | fórmula base | fórmula base |
| ES (Especial) | fórmula base × 0,90 (desconto 10%) | fórmula base × 0,80 (desconto 20%) |

### 4.3 Ajustes por tipo de cliente

| Cliente | Regra adicional |
|---|---|
| `PF` | limite de juros efetivos: máximo 20,00% ao mês |
| `PJ` | sem limite adicional |
| `ES` | limite de juros efetivos: máximo 8,00% ao mês |

### 4.4 Pagamento parcial

Quando o pagamento anterior foi parcial (`IND-PARCIAL = 'S'`), a base de cálculo é o **saldo remanescente atualizado**, não o principal original.

### 4.5 Casos-limite

- `dias_atraso = 0` → RC `04-FIN-DIAS-ZERO`, juros=0, multa=0, atualizado=principal.
- `principal ≤ 0` → RC `08-FIN-PRINC-ZERO`.
- Cálculo com overflow em `PIC S9(13)V99 COMP-3` → RC `12-FIN-OVERFLOW`.

---

## 5. Inadimplência (SGCB0100)

### 5.1 Faixas por dias em atraso

| Faixa | Dias em atraso | Ação padrão |
|---|---|---|
| `EM DIA` | 0 a 5 | Nenhuma |
| `LEVE` | 6 a 30 | Cobrança amigável (interface `SGLINTCB`) |
| `MODERADA` | 31 a 60 | Cobrança + elegibilidade a renegociação |
| `GRAVE` | 61 a 90 | Cobrança intensiva + prioridade em renegociação |
| `CRITICA` | > 90 | Envio para protesto; renegociação requer aprovação manual |

### 5.2 Base de cálculo

- Considera **maior atraso** entre todas as parcelas ABERTAS ou PARCIAIS do contrato.
- Reinicia contagem ao registrar `LIQUIDADA` na parcela mais antiga.

---

## 6. Classificação de risco (SGCB0140)

Matriz `SGT_RIS_MATRIZ` combina três eixos:

1. **Faixa de inadimplência atual** (do dia);
2. **Histórico dos últimos 180 dias** — quantidade de dias em faixa GRAVE ou pior;
3. **Relação encargos/saldo** — encargos acumulados / saldo devedor original.

Matriz simplificada aplicada no lab:

| Faixa atual | Hist ≤ 15 dias grave | Hist 16–45 | Hist > 45 |
|---|---|---|---|
| EM DIA | A | B | C |
| LEVE | B | C | D |
| MODERADA | C | D | D |
| GRAVE | D | D | E |
| CRITICA | E | E | E |

Ajuste adicional: se `encargos/saldo > 30%`, degrada uma posição (A→B, …, D→E).

Regras de estabilidade:
- Risco só pode melhorar duas faixas por vez em intervalo mínimo de 30 dias (evita oscilação).
- Cliente `ES` (especial) nunca desce abaixo de `C` sem aprovação manual (`SGLPARM` flag `WS-FL-ES-RISCO-LIVRE`).

---

## 7. Renegociação (SGCB0130)

### 7.1 Elegibilidade

Contrato elegível **precisa** atender todas as condições:

1. Faixa de inadimplência ∈ `{MODERADA, GRAVE}` (CRITICA só com flag ativa em `SGLPARM`);
2. Classe de risco ∈ `{C, D, E}`;
3. Sem proposta ativa nos últimos 90 dias;
4. Sem bloqueio manual em `SGLBLOQ`;
5. Saldo devedor > R$ 500,00 (contratos abaixo disso vão para write-off).

### 7.2 Opções geradas

Sempre 3 opções por contrato elegível:

| Opção | Entrada | Parcelas | Juros a.m. |
|---|---|---|---|
| 1 | 10% | 12 | 1,50% |
| 2 | 20% | 24 | 1,20% |
| 3 | 30% | 6 | 0,80% |

### 7.3 Descontos automáticos

- 20% no saldo de encargos para faixa MODERADA;
- 30% para faixa GRAVE;
- 50% para faixa CRITICA (quando incluída).

### 7.4 Validade

Cada proposta tem validade de 7 dias corridos a partir da geração.

---

## 8. Pagamento parcial — regras complementares

1. Não altera situação da parcela para `LIQUIDADA` até o saldo atingir zero.
2. Zera acumulado de multa somente quando parcela vai a `LIQUIDADA`.
3. Cada pagamento parcial gera nova posição em `SGT_ENC_ENCARGO` no dia seguinte, com o novo saldo como principal.
4. Não é possível "estornar" um pagamento parcial via arquivo — apenas manualmente pelo backoffice.

---

## 9. Parâmetros ajustáveis (`SGLPARM`)

Parâmetros com valores default e faixas permitidas:

| Parâmetro | Default | Faixa permitida | Uso |
|---|---|---|---|
| `WS-CT-LIMITE-COMMIT` | 1000 | 100..5000 | Commit intermediário em SGCB0030/0050 |
| `WS-FL-INCLUI-CRITICA` | `N` | S/N | Inclui CRITICA em renegociação |
| `WS-FL-ES-RISCO-LIVRE` | `N` | S/N | Permite ES abaixo de C |
| `WS-CT-DIAS-INAD-LEVE` | 5 | 1..15 | Início faixa LEVE |
| `WS-CT-DIAS-INAD-MOD` | 30 | 20..45 | Início faixa MODERADA |
| `WS-CT-DIAS-INAD-GRAVE` | 60 | 45..75 | Início faixa GRAVE |
| `WS-CT-DIAS-INAD-CRIT` | 90 | 75..120 | Início faixa CRITICA |
| `WS-CT-PCT-DESC-MOD` | 20 | 0..40 | Desconto renegociação MODERADA |
| `WS-CT-PCT-DESC-GRAVE` | 30 | 0..50 | Desconto renegociação GRAVE |

---

## 10. Sumário de responsabilidades

| Regra | Programa responsável | Copybook envolvido |
|---|---|---|
| Validar CPF/CNPJ/IE | SGCB0170 | SGDOCVAL |
| Validar datas | SGCB0180 | SGDATAS |
| Cálculo de juros/multa | SGCB0110 | SGFINANC |
| Faixa de inadimplência | SGCB0100 | SGRISCOM |
| Classe de risco | SGCB0140 | SGRISCOM |
| Elegibilidade renegociação | SGCB0130 | SGCTRDAT, SGPARDAT |
| Formatação interface | SGCB0200 | SGINTFMT |
| Parâmetros execução | SGCB0010 | SGPARMEX, SGLPARM |
