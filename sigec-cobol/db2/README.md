# Camada DB2 - Laboratório SIGEC

Este diretório contém toda a camada de banco DB2 do laboratório COBOL do **SIGEC — Sistema de Gestão de Cobrança**.

Escopo: apenas DDL, seeds e utilitários SQL. **Não contém COBOL nem JCL.**

---

## Estrutura

```
db2/
├── ddl/            DDL de schema, tabelas e índices
├── carga/          Scripts de carga inicial (seed)
├── validacao/      Consultas de sanity check e integridade
└── limpeza/        DELETE FK-safe, reset de IDENTITY e DROP total
```

DCLGENs em COBOL (para uso via `COPY DCLxxxxx.` nos programas) ficam em `../dclgen/`.

---

## Schema

Todos os objetos vivem em **`SIGEC`**. Todas as tabelas têm o prefixo **`SG_`** e os campos de auditoria comuns:

| Campo | Tipo | Regra |
| --- | --- | --- |
| `DH_INCLUSAO` | `TIMESTAMP` | `NOT NULL WITH DEFAULT CURRENT TIMESTAMP` |
| `DH_ALTERACAO` | `TIMESTAMP` | nulo até primeira alteração |
| `USUARIO_INCLUSAO` | `VARCHAR(30)` | `NOT NULL` |
| `USUARIO_ALTERACAO` | `VARCHAR(30)` | opcional |
| `SITUACAO_REG` | `CHAR(1)` | `'A'` ativo / `'I'` inativo (soft delete) |

---

## Ordem de execução

### 1. Criar schema e tabelas (uma vez)

Executar `ddl/` em ordem numérica:

```bash
db2 -tvf ddl/00_CREATE_SCHEMA.sql
db2 -tvf ddl/01_SG_CLIENTE.sql
db2 -tvf ddl/02_SG_HIST_CLIENTE.sql
db2 -tvf ddl/03_SG_CONTRATO.sql
db2 -tvf ddl/04_SG_HIST_CONTRATO.sql
db2 -tvf ddl/05_SG_PARCELA.sql
db2 -tvf ddl/06_SG_PAGAMENTO.sql
db2 -tvf ddl/07_SG_HIST_FINANCEIRO.sql
db2 -tvf ddl/08_SG_RENEGOCIACAO.sql
db2 -tvf ddl/09_SG_OPCAO_RENEGOCIACAO.sql
db2 -tvf ddl/10_SG_PARAMETRO.sql
db2 -tvf ddl/11_SG_HIST_PROCESSAMENTO.sql
db2 -tvf ddl/12_SG_EVENTO_COBRANCA.sql
db2 -tvf ddl/99_INDEXES_FK.sql
```

### 2. Carga inicial

```bash
db2 -tvf carga/01_PARAMETROS.sql
db2 -tvf carga/02_CLIENTES.sql
db2 -tvf carga/03_CONTRATOS.sql
db2 -tvf carga/04_PARCELAS.sql
db2 -tvf carga/05_PAGAMENTOS.sql
db2 -tvf carga/99_COMMIT.sql
```

Volumes esperados após a carga (referência para `validacao/01_CONTAGEM.sql`):

| Tabela | Linhas |
| --- | --- |
| `SG_PARAMETRO` | 10 |
| `SG_CLIENTE` | 15 |
| `SG_CONTRATO` | 12 |
| `SG_PARCELA` | ~100 |
| `SG_PAGAMENTO` | ~34 |
| demais | 0 (populadas em runtime pelo COBOL) |

### 3. Validação

```bash
db2 -tvf validacao/01_CONTAGEM.sql
db2 -tvf validacao/02_INCONSISTENCIAS_SALDO.sql
db2 -tvf validacao/03_PARCELAS_ORFAS.sql
db2 -tvf validacao/04_INCONSISTENCIAS_STATUS.sql
db2 -tvf validacao/05_AGING_INADIMPLENCIA.sql
db2 -tvf validacao/06_INTEGRIDADE_PAGAMENTOS.sql
db2 -tvf validacao/07_DOMINIOS.sql
db2 -tvf validacao/08_PARAMETROS.sql
```

### 4. Limpeza (reset do lab)

```bash
db2 -tvf limpeza/01_DELETE_DADOS.sql
db2 -tvf limpeza/02_RESET_IDENTITY.sql   # opcional
db2 -tvf limpeza/99_DROP_ALL.sql         # destrutivo
```

---

## Domínios dos códigos

### `SG_CONTRATO.ST_CONTRATO`

| Código | Descrição |
| --- | --- |
| `AT` | Ativo |
| `BL` | Bloqueado |
| `IN` | Inadimplente |
| `RN` | Em renegociação |
| `EN` | Encerrado |
| `CA` | Cancelado |

### `SG_CONTRATO.CLASSIFICACAO_INAD`

| Código | Descrição | Faixa (dias) |
| --- | --- | --- |
| `N` | Em dia | 0 |
| `L` | Leve | 1-30 |
| `M` | Média | 31-60 |
| `G` | Grave | 61-90 |
| `R` | Renegociado / crítico | >90 |

### `SG_PARCELA.ST_PARCELA`

| Código | Descrição |
| --- | --- |
| `AB` | Aberta |
| `PG` | Paga |
| `PP` | Parcial |
| `VC` | Vencida |
| `CN` | Cancelada |

### `SG_PAGAMENTO.CD_CANAL`

`BOL` boleto · `PIX` · `TED` · `DOC` · `CAX` caixa · `CRT` cartão · `LEG` legado

### `SG_PAGAMENTO.ST_PAGAMENTO`

`CF` confirmado · `PN` pendente · `RJ` rejeitado · `ES` estornado · `CN` cancelado

### `SG_RENEGOCIACAO.ST_RENEGOCIACAO`

`PR` proposta · `AP` aprovada · `RC` recusada · `AT` ativa · `EN` encerrada

---

## Parâmetros de negócio (seed em `carga/01_PARAMETROS.sql`)

| Código | Valor | Tipo |
| --- | --- | --- |
| `TAXA_JUROS_PADRAO` | `1.00` | P (%) |
| `PCT_MULTA_PADRAO` | `2.00` | P (%) |
| `LIMITE_JUROS_MAX` | `50.00` | P (% do principal) |
| `DIAS_INAD_LEVE` | `30` | N |
| `DIAS_INAD_MEDIO` | `60` | N |
| `DIAS_INAD_GRAVE` | `90` | N |
| `ENTRADA_MIN_RENEG` | `20.00` | P (%) |
| `MAX_PARCELAS_RENEG` | `24` | N |
| `FATOR_ESPECIAL_LEGADO` | `0.873` | N (regra histórica obscura de contratos SP) |
| `COMMIT_INTERVAL` | `100` | N |

---

## Notas para o programador COBOL

- Ler os DCLGENs de `../dclgen/` com `EXEC SQL INCLUDE DCLxxxxx END-EXEC.` (ou `COPY DCLxxxxx.`, dependendo do site).
- Todos os programas devem populam `USUARIO_INCLUSAO`/`USUARIO_ALTERACAO` com o `USER` do plano BIND ou variável equivalente.
- Batches devem usar `COMMIT INTERVAL` conforme parâmetro `COMMIT_INTERVAL`.
- Historicos (`SG_HIST_*`) devem ser gravados **antes** do UPDATE/DELETE da tabela mestre (snapshot do estado anterior).
- Preservar rastreabilidade — nunca fazer `UPDATE SITUACAO_REG = 'I'` sem gravar histórico correspondente.

---

## Convenções de dados fictícios

Todos os CPF/CNPJ da carga são **fictícios** e usam padrões repetitivos (ex.: `11144477735`, `11222333000181`) para evitar coincidência com dados reais. Os nomes têm o sufixo `(FAKE)` para reforçar a natureza de laboratório.
