# SIGEC — Sistema Integrado de Gestão de Crédito

Laboratório didático de código mainframe (COBOL + DB2 + JCL + VSAM)
projetado para **treinar agentes autônomos** de análise, manutenção e
refatoração em ambientes legados.

O foco não é rodar em mainframe real — é oferecer massa realista, com
tamanho, dependências e “pegadinhas” típicas de sistemas legados, para
que agentes exerçam análise estática, mapeamento de impacto,
especificação de mudança e revisão de testes **sem** o auxílio de
compilador z/OS.

## Sumário

- [Objetivo](#objetivo)
- [Escopo funcional](#escopo-funcional)
- [Estrutura de diretórios](#estrutura-de-diretórios)
- [Fluxo de execução esperado](#fluxo-de-execução-esperado)
- [Documentação](#documentação)
- [Como usar este laboratório](#como-usar-este-laboratório)
- [Massas de teste](#massas-de-teste)
- [Validação estática](#validação-estática)
- [O que este laboratório NÃO é](#o-que-este-laboratório-não-é)
- [Convenções](#convenções)

## Objetivo

Reproduzir, em escala reduzida (~20 programas), os padrões e armadilhas
mais frequentes de um sistema bancário/financeiro em COBOL:

1. Programas orquestrados por driver (`SGCB0010`).
2. CALLs estáticas e dinâmicas (nomes construídos em runtime).
3. Arquivos com múltiplos layouts no mesmo LRECL (H/D/T).
4. Regras de negócio embutidas em código sem documentação equivalente.
5. Uso legado de `ALTER`, `GO TO DEPENDING ON`, `OCCURS DEPENDING ON`,
   `REDEFINES` aninhado.
6. Dependência de parâmetros em `SG_PARAMETRO` (DB2) que mudam o fluxo
   em runtime.
7. Chamadas a rotinas externas fictícias (`SGXASM01`, `SGEXTLOG`) que
   compilam mas não linkam.

Cada uma dessas armadilhas é catalogada em
[`docs/PONTOS_FORA_COBERTURA.md`](docs/PONTOS_FORA_COBERTURA.md).

## Escopo funcional

SIGEC modela o ciclo diário de crédito:

- Recepção e validação de novos contratos (`SGCB0020`).
- Recepção e validação de pagamentos (`SGCB0030`).
- Carga em DB2 com criação/atualização de clientes (`SGCB0040/0050/0060`).
- Aplicação de pagamentos, encargos e recálculo de saldo
  (`SGCB0070/0110/0120`).
- Detecção de inadimplência e classificação de risco
  (`SGCB0100/0140`).
- Geração de propostas de renegociação (`SGCB0130/0160`).
- VSAM da fila mensal de cobrança (`SGCB0150`).
- Relatórios e interfaces com sistemas externos (`SGCB0190/0200`).

Regras oficiais em [`docs/REGRAS_NEGOCIO.md`](docs/REGRAS_NEGOCIO.md).
Códigos de retorno em [`docs/CODIGOS_RETORNO.md`](docs/CODIGOS_RETORNO.md).

## Estrutura de diretórios

```
sigec-cobol/
├── cobol/                # 20 programas .cbl (SGCB0010..SGCB0200)
├── copybooks/            # Copybooks funcionais e de layout (SGL*.cpy)
├── dclgen/               # DCLGENs DB2 (DCLSG*.cpy)
├── db2/
│   ├── ddl/              # DDL das 12 tabelas SIGEC
│   ├── carga/            # Carga inicial de parâmetros, clientes, etc.
│   ├── limpeza/          # DELETE/DROP para reset
│   └── validacao/        # Consultas de sanidade pós-execução
├── jcl/                  # 12 JCLs de orquestração
├── docs/
│   ├── ARQUITETURA.md
│   ├── FLUXO_PROCESSAMENTO.md
│   ├── REGRAS_NEGOCIO.md
│   ├── CODIGOS_RETORNO.md
│   ├── MAPA_DEPENDENCIAS.md
│   ├── MATRIZ_PROGRAMA_ARQUIVO.md
│   ├── MATRIZ_PROGRAMA_TABELA.md
│   ├── CENARIOS_TESTE.md
│   └── PONTOS_FORA_COBERTURA.md
├── data/
│   ├── input/            # Massas posicionais alinhadas aos LRECLs
│   └── expected/         # Resultados esperados por cenário
├── tests/
│   ├── README_TESTES.md
│   ├── checklist_validacao_estatica.md
│   └── validate_static.sh
└── README.md             # Este arquivo
```

## Fluxo de execução esperado

O driver **`SGCB0010`** orquestra a janela diária. A cadeia estática
padrão é:

```
SGCB0010
  ├─ S020 → SGCB0020  (valida contratos)
  ├─ S030 → SGCB0030  (valida pagamentos)
  ├─ S040 → SGCB0040  (carrega contratos em DB2)
  │            ├─ SGCB0050 (consulta cliente)
  │            └─ SGCB0060 (cria/atualiza cliente)
  ├─ S070 → SGCB0070  (aplica pagamentos)
  │            ├─ SGCB0080/0090 (consulta contrato/parcela)
  │            ├─ SGCB0110 (calcula encargos)
  │            └─ SGCB0120 (recalcula saldo — condicional)
  ├─ S100 → SGCB0100  (detecta inadimplência)
  │            ├─ SGCB0180 (dias-atraso)
  │            └─ SGCB0110 (encargos)
  ├─ S130 → SGCB0130  (gera propostas renegociação)
  │            ├─ SGCB0050/0080 (consulta)
  │            └─ SGCB0140 (classifica risco)
  ├─ S160 → SGCB0160  (gera interfaces renegociação)
  │            ├─ SGCB0140/0110/0180
  └─ S190 → SGCB0190  (relatórios)
              └─ SGCB0200 (formatação — CALL dinâmica)
```

Ramos independentes/mensais:

- `SGCB0150` (mensal, VSAM `SGVCOBRA`) — chamado por JCL avulso
  `SGCBVSAM.jcl`, **não** pelo driver diário.
- `SGCB0120` — só chamado por `SGCB0070` quando `FL-RECALC-SALDO='S'`
  em `SG_PARAMETRO`.

Detalhes em [`docs/MAPA_DEPENDENCIAS.md`](docs/MAPA_DEPENDENCIAS.md).

## Documentação

| Documento | Descrição |
|---|---|
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | Visão geral do sistema |
| [`docs/FLUXO_PROCESSAMENTO.md`](docs/FLUXO_PROCESSAMENTO.md) | Janela diária, JCLs, ordem |
| [`docs/REGRAS_NEGOCIO.md`](docs/REGRAS_NEGOCIO.md) | Regras normativas — validação, cálculo, risco |
| [`docs/CODIGOS_RETORNO.md`](docs/CODIGOS_RETORNO.md) | RCs e ação do scheduler |
| [`docs/MAPA_DEPENDENCIAS.md`](docs/MAPA_DEPENDENCIAS.md) | Chamador × Chamado (grep real) |
| [`docs/MATRIZ_PROGRAMA_ARQUIVO.md`](docs/MATRIZ_PROGRAMA_ARQUIVO.md) | Programa × Arquivo |
| [`docs/MATRIZ_PROGRAMA_TABELA.md`](docs/MATRIZ_PROGRAMA_TABELA.md) | Programa × Tabela DB2 |
| [`docs/CENARIOS_TESTE.md`](docs/CENARIOS_TESTE.md) | 28 cenários com input e resultado esperado |
| [`docs/PONTOS_FORA_COBERTURA.md`](docs/PONTOS_FORA_COBERTURA.md) | 20 armadilhas deliberadas |

## Como usar este laboratório

### Como agente de análise de impacto

1. Comece por [`docs/MAPA_DEPENDENCIAS.md`](docs/MAPA_DEPENDENCIAS.md).
2. Cruze com o programa a ser alterado — descubra chamadores e chamados.
3. Consulte [`docs/MATRIZ_PROGRAMA_ARQUIVO.md`](docs/MATRIZ_PROGRAMA_ARQUIVO.md)
   e [`docs/MATRIZ_PROGRAMA_TABELA.md`](docs/MATRIZ_PROGRAMA_TABELA.md)
   para saber quais dados o programa toca.
4. Sempre verifique os 20 pontos em
   [`docs/PONTOS_FORA_COBERTURA.md`](docs/PONTOS_FORA_COBERTURA.md) —
   qualquer alteração ali exige aprovação humana.

### Como agente de manutenção

1. Rode `bash tests/validate_static.sh` antes e depois da mudança.
2. Preserve a interface COBOL/ASM (`SGXASM01`) e as CALLs `ON EXCEPTION`.
3. Não descomente `SELECT SGXTAPE-FILE` em `SGCB0150` sem
   aprovação arquitetural (comentário do próprio programa).
4. Nunca remova `9998-MODO-SIMULACAO-ANTIGO` (parágrafo intencional
   para pontos 1 e 15).

### Como agente de teste

1. Gere massa em `data/input/` seguindo os LRECLs dos copybooks.
2. Use os cenários em `docs/CENARIOS_TESTE.md`.
3. Compare resultados com `data/expected/expected_results.md`.

## Massas de teste

Todas as massas ficam em `data/input/`. Cada arquivo respeita LRECL do
copybook correspondente (padding com brancos para colunas texto, zeros
para colunas numéricas):

| Arquivo | Copybook | LRECL | Conteúdo |
|---|---|---|---|
| `contratos_recebidos.txt` | `SGLCTRIN.cpy` | 200 | HDR + N DETAIL (válidos + inválidos) + TRAILER |
| `pagamentos_recebidos.txt` | `SGLPAGIN.cpy` | 120 | HDR + N DETAIL + TRAILER |
| `parametros.txt` | `SGLPARM.cpy` | 100 | Chave/valor por linha |
| `feriados.txt` | `SGLFERIA.cpy` | 80 | Calendário anual |
| `bloqueios.txt` | `SGLBLOQ.cpy` | 200 | Bloqueios manuais (opcional) |

Resultados esperados por cenário em `data/expected/expected_results.md`
(mais arquivos-referência quando aplicável).

## Validação estática

O script `tests/validate_static.sh` é o gate mínimo antes de qualquer
mudança:

```bash
bash tests/validate_static.sh
echo "Exit: $?"
```

Códigos de saída:

| Exit | Significado |
|---|---|
| 0 | Tudo ok |
| 1 | Contagem de `.cbl` diferente de 20 |
| 2 | CALL apontando para programa/módulo ausente **e** fora da lista de exceções |
| 3 | COPY apontando para copybook ausente **e** fora da lista de exceções |
| 4 | Programa sem tratamento de FILE STATUS quando abre arquivo |
| 5 | Programa sem tratamento de SQLCODE quando abre `EXEC SQL` |

Detalhes e checklist em [`tests/README_TESTES.md`](tests/README_TESTES.md)
e [`tests/checklist_validacao_estatica.md`](tests/checklist_validacao_estatica.md).

## O que este laboratório NÃO é

- **Não é** um sistema executável em mainframe. Não há garantia de que
  compila em Enterprise COBOL sem ajustes.
- **Não é** um manual de boas práticas. Vários trechos são
  deliberadamente ruins (ALTER, GO TO DEPENDING ON, dead code) para
  treinar detecção.
- **Não é** fonte da verdade para regra de negócio real. Regras
  contradizem-se de propósito entre `docs/REGRAS_NEGOCIO.md` e código
  (ver [`docs/PONTOS_FORA_COBERTURA.md`](docs/PONTOS_FORA_COBERTURA.md)
  ponto 16).

## Convenções

- Português para labels, comentários de produto e documentação.
- Inglês para nomes técnicos de tabela/coluna (herdado de DB2).
- Nenhum marcador visível (`ERRO PROPOSITAL`, `TODO PONTO`) nos fontes.
  Todo desafio deve ser descoberto por análise estática.
- Regras soberanas do lab:
  1. `docs/CODIGOS_RETORNO.md` §1 define a semântica de RC — inegociável.
  2. Código real vence documentação em caso de conflito (mas o conflito
     deve ser catalogado como ponto fora de cobertura).
  3. Nenhum programa deve retornar RC menor que o pior RC observado
     durante sua execução.

---

Repositório de laboratório mantido no branch de trabalho
`cursor/sigec-cobol-laboratorio-3cb2`. Consulte o histórico do git para
rastrear a evolução das armadilhas.
