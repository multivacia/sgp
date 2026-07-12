# SIGEC — Arquitetura Técnica

**Sistema Integrado de Gestão de Contratos**
Ambiente: Mainframe z/OS · COBOL Enterprise · DB2 for z/OS · JCL · VSAM
Escopo: laboratório de aprendizagem — todos os identificadores e dados são fictícios.

---

## 1. Visão geral

O SIGEC é um sistema batch de gestão de contratos financeiros, responsável por:

- Receber contratos de sistemas originadores e validá-los;
- Manter o cadastro de clientes, contratos e parcelas em DB2;
- Aplicar pagamentos recebidos por múltiplos canais (boleto, débito, PIX, etc.);
- Calcular encargos (juros e multas) por tipo de contrato;
- Identificar inadimplência e classificar risco de carteira;
- Gerar propostas de renegociação para carteira elegível;
- Produzir interfaces para cobrança, contabilidade e sistemas parceiros;
- Publicar relatórios gerenciais diários (detalhado + sintético).

Não há UI online — toda a operação ocorre em janela batch noturna disparada por scheduler
(Control-M / OPC), com dependências entre steps controladas por JCL.

---

## 2. Componentes principais

| Camada | Recurso | Descrição |
|---|---|---|
| Orquestração | Scheduler + JCL | Dispara SGCB0010 e dependências |
| Aplicação | 20 programas COBOL | SGCB0010–SGCB0200 |
| Persistência | DB2 z/OS | Esquema `SGCDB`, ~14 tabelas |
| Cache/lookup | VSAM KSDS | `SGVCOBRA` (fila cobrança), `SGVPARAM` (parâmetros) |
| Entrada | GDG de arquivos FB/VB | Contratos, pagamentos, feriados, bloqueios |
| Saída | GDG + spool | Relatórios, interfaces, log de erros |
| Comunicação | PARM + LINKAGE | Área comum `SGCOMMAR` + sub-áreas |
| Log | SYSPRINT + tabela `SGT_LOG_EXEC` | Rastreabilidade por execução |

---

## 3. Camadas lógicas

```
+---------------------------------------------------------------+
| Camada de Orquestração                                        |
|   JCL SGCJOB01  +  SGCB0010 (driver)                          |
+---------------------------------------------------------------+
| Camada de Processamento                                       |
|   SGCB0020..SGCB0100  (validação, carga, cálculos, análise)   |
+---------------------------------------------------------------+
| Camada de Interface                                           |
|   SGCB0130, SGCB0160, SGCB0190, SGCB0200                      |
|   (propostas, interfaces externas, relatórios, formatação)    |
+---------------------------------------------------------------+
| Camada de Serviços (subrotinas reutilizáveis)                 |
|   SGCB0110  cálculo financeiro                                |
|   SGCB0140  classificação de risco                            |
|   SGCB0170  validação de documento                            |
|   SGCB0180  utilitário de datas                               |
+---------------------------------------------------------------+
| Camada de Dados                                               |
|   DB2 (SGCDB)  +  VSAM (SGVCOBRA, SGVPARAM)  +  GDG           |
+---------------------------------------------------------------+
```

---

## 4. Inventário de programas

| Programa | Tipo | Responsabilidade |
|---|---|---|
| SGCB0010 | Driver | Orquestra a janela batch, invoca as etapas em ordem |
| SGCB0020 | Processo | Lê e valida `SGLCTRIN`, gera `SGLCTRVL` e `SGLCTRRE` |
| SGCB0030 | Processo | Carrega contratos válidos em DB2; grava `SGLCTRCG` e `SGLDB2RE` |
| SGCB0040 | Processo | Lê e valida `SGLPAGIN`, gera `SGLPAGVL` e `SGLPAGRE` |
| SGCB0050 | Processo | Aplica pagamentos em DB2, gera `SGLPAGAP` e `SGLPAGPD` |
| SGCB0060 | Utilidade | Reconcilia pendentes e reprocessa parcialmente pagos |
| SGCB0070 | Processo | Calcula encargos por parcela vencida (usa SGCB0110) |
| SGCB0080 | Utilidade | Consolida encargos por contrato/carteira |
| SGCB0090 | Utilidade | Atualiza situação de parcelas e agenda cobrança |
| SGCB0100 | Processo | Detecta inadimplência, classifica faixa e aciona SGCB0140 |
| SGCB0110 | Serviço | Motor de cálculo financeiro (juros + multa + atualização) |
| SGCB0120 | Utilidade | Auxiliar de simulação e projeção financeira |
| SGCB0130 | Processo | Gera propostas de renegociação para carteira elegível |
| SGCB0140 | Serviço | Classifica risco A–E do cliente/contrato |
| SGCB0150 | Utilidade | Recalcula rating de carteira agregado |
| SGCB0160 | Processo | Gera interfaces (cobrança, contábil, renegociação) |
| SGCB0170 | Serviço | Valida CPF, CNPJ e Inscrição Estadual |
| SGCB0180 | Serviço | Utilitário de datas (validar, diferença, add days, dia semana) |
| SGCB0190 | Processo | Produz relatórios detalhado e sintético do dia |
| SGCB0200 | Serviço | Formata registros de saída para arquivos de interface |

---

## 5. Padrões de codificação COBOL

- **Fonte fixo**: colunas 1–6 sequência (não usadas em lab), 7 indicador, 8–72 código.
- **Divisões obrigatórias**: `IDENTIFICATION`, `ENVIRONMENT`, `DATA`, `PROCEDURE`.
- **Nomes**: parágrafos em `9999-VERBO-OBJETO` (numeração hierárquica por seção).
- **Constantes**: em `WORKING-STORAGE`, prefixadas `WS-CT-`.
- **Áreas de trabalho**: prefixadas `WS-`.
- **Linkage**: prefixadas `LK-`.
- **Copybooks**: prefixo `SG` — comuns começam com `SGC*` / `SG*` e layouts de arquivo com `SGL*`.
- **Return-code**: obrigatório usar `SGRETCOD.cpy`; nunca hard-coded.
- **Tratamento de erro**: rotina padrão `9000-TRATA-ERRO` popula `SGERRMSG` e escreve em `SGLERROS`.
- **Commit DB2**: a cada `WS-CT-LIMITE-COMMIT` (padrão 1000) linhas processadas.
- **Cursores**: sempre `WITH HOLD` quando houver commit intermediário.
- **SQL**: nunca usar `SELECT *`; sempre listar colunas via `DCLGEN`.
- **Performance**: `FETCH FIRST n ROWS ONLY` em consultas de sondagem, `OPTIMIZE FOR n ROWS`.
- **Encoding**: EBCDIC 037; comentários e mensagens em português (sem acento em código-fonte legado).

---

## 6. Padrões DB2

- Esquema único: `SGCDB`.
- Nomenclatura de tabelas: `SGT_<DOMINIO>_<SUBDOMINIO>` (ex.: `SGT_CTR_CONTRATO`).
- Nomenclatura de índices: `IX_SGT_<TABELA>_<NN>`.
- Nomenclatura de views: `VW_<DOMINIO>_<FUNCAO>`.
- Chave primária sempre com `NOT NULL`, `GENERATED ALWAYS AS IDENTITY` onde couber.
- Datas em `DATE` puro; timestamps em `TIMESTAMP` com precisão 6.
- Valores monetários em `DECIMAL(15,2)`; percentuais em `DECIMAL(5,2)`.
- Toda tabela tem `DT_INCLUSAO`, `DT_ATUALIZACAO`, `NM_USUARIO_ALT`.
- `TABLESPACE` segregado por domínio; `BUFFERPOOL` BP2 para OLTP, BP8K1 para grandes.

---

## 7. Padrões JCL

- Prefixo de JOB: `SGCJOB<NN>` (SGCJOB01 = janela diária, SGCJOB02 = janela mensal).
- Prefixo de PROC: `SGCPRC<NN>`.
- STEPs nomeados por letra + número (`S010`, `S020`, ...) obedecendo à ordem do fluxo.
- CONDs padronizados:
  - `COND=(04,LT)` para steps opcionais toleram warning;
  - `COND=(08,LE)` cancela cadeia em erro funcional ou pior.
- GDG obrigatório para todos os arquivos de dia; retenção mínima 7 gerações.
- SYSOUT sempre `CLASS=X` para captura pelo scheduler.
- DDNAMEs seguem o `SGL*` do copybook (ex.: `//SGLCTRIN DD ...`).

---

## 8. Convenções de nomes

| Prefixo | Uso | Exemplo |
|---|---|---|
| `SGCB<NNNN>` | Programa COBOL | `SGCB0110` |
| `SGCJOB<NN>` | JCL de job | `SGCJOB01` |
| `SGCPRC<NN>` | JCL de procedure | `SGCPRC02` |
| `SGL*` | Copybook de layout de arquivo | `SGLCTRIN.cpy` |
| `SGC*` / `SG*` | Copybook de área comum | `SGCOMMAR.cpy` |
| `SGT_*` | Tabela DB2 | `SGT_CTR_CONTRATO` |
| `SGV*` | VSAM | `SGVCOBRA` |
| `WS-*` | Working-Storage | `WS-CT-LIMITE-COMMIT` |
| `LK-*` | Linkage-Section | `LK-RETURN-CODE` |
| `9999-*` | Parágrafo procedural | `1000-VALIDA-CONTRATO` |

---

## 9. Fluxo de arquivos entre programas

```
SGLCTRIN → SGCB0020 → SGLCTRVL → SGCB0030 → SGLCTRCG
                    → SGLCTRRE               → SGLDB2RE

SGLPAGIN → SGCB0040 → SGLPAGVL → SGCB0050 → SGLPAGAP
                    → SGLPAGRE               → SGLPAGPD

SGCB0070 → SGLENCAR
SGCB0100 → SGLINADI
SGCB0130 → SGLPROP
SGCB0160 → SGLINTCB, SGLINTCT, SGLINTRG
SGCB0190 → SGLRELDT, SGLRELST
todos    → SGLERROS  (consolidado de erros)
```

---

## 10. Dependências externas

- **Sistema originador de contratos** (SGRCON): envia `SGLCTRIN` até 22h.
- **Adquirente/PSP**: envia `SGLPAGIN` até 23h consolidando pagamentos do dia.
- **Cadastro corporativo**: alimenta `SGT_CLI_CLIENTE` via replicação DB2.
- **Sistema de cobrança externo (SGXCOB)**: consome `SGLINTCB`.
- **Contabilidade corporativa (CONTAB)**: consome `SGLINTCT`.
- **Sistema de renegociação (SGRNG)**: consome `SGLINTRG`.

---

## 11. Janela batch e SLA

- **Janela**: 23:30 (D) até 05:00 (D+1).
- **SLA**: interfaces disponíveis até 04:30, relatórios até 05:00.
- **RTO**: 2 horas em caso de restart parcial.
- **RPO**: zero — todos os inputs são reenviados em caso de perda.

---

## 12. Referências cruzadas

- Fluxo detalhado: `docs/FLUXO_PROCESSAMENTO.md`
- Códigos de retorno: `docs/CODIGOS_RETORNO.md`
- Regras de negócio: `docs/REGRAS_NEGOCIO.md`
- Copybooks: `copybooks/`
- DCLGENs: `dclgen/`
- DDL DB2: `db2/` (a ser criada em etapa futura)
