# SIGEC — Estratégia de Testes

O laboratório SIGEC não compila em mainframe real neste ambiente. A
estratégia de testes é dividida em **duas camadas**:

1. **Validação estática** (executável aqui) — via `validate_static.sh`
   e o checklist em `checklist_validacao_estatica.md`.
2. **Validação funcional** (simulada) — via cenários em
   `docs/CENARIOS_TESTE.md` e resultados esperados em
   `data/expected/expected_results.md`.

## 1. Objetivos

- Garantir integridade estrutural do repositório: contagem de fontes,
  correspondência entre CALLs e programas, entre COPYs e copybooks.
- Garantir que armadilhas deliberadas (`docs/PONTOS_FORA_COBERTURA.md`)
  continuem presentes — sem removê-las por “refatoração oportunista”.
- Fornecer uma base para agentes exercitarem regras de negócio via
  cenários com input e output esperados.

## 2. O que o `validate_static.sh` faz

O script cobre 5 checagens obrigatórias:

| Check | Descrição | Exit code em caso de falha |
|---|---|---|
| 1 | Conta arquivos `.cbl` — deve ser **exatamente 20** | `1` |
| 2 | Extrai `CALL 'XXXX'` (estáticas) e valida que existe `PROGRAM-ID XXXX` em algum `.cbl`, respeitando lista de exceções intencionais | `2` |
| 3 | Extrai `COPY XXXX` e valida que existe `copybooks/XXXX.cpy`, respeitando lista de exceções intencionais | `3` |
| 4 | Lista programas com `FILE-CONTROL` mas **sem** cláusula `FILE STATUS IS` — heurística de higiene | `4` |
| 5 | Lista programas com `EXEC SQL` mas **sem** referência a `SQLCODE` no PROCEDURE DIVISION — heurística de tratamento | `5` |

### Exceções intencionais

Os alvos abaixo são catalogados como “fora de cobertura esperada”
(ver `docs/PONTOS_FORA_COBERTURA.md` pontos 18, 19, 20):

- **CALLs**: `SGEXTLOG`, `SGCB0999`, `SGXASM01`.
- **COPYs**: `SGXTAPE` (só existe em comentário, nunca em `COPY` ativo).

O script relata esses alvos como **INFO** e não os considera falha.

## 3. Como rodar

```bash
cd sigec-cobol
bash tests/validate_static.sh
echo "Exit: $?"
```

Saída típica de sucesso:

```
[OK]  Check 1: 20 arquivos .cbl encontrados
[OK]  Check 2: todas as CALLs estáticas resolvem para PROGRAM-ID conhecido
[INFO] CALL fora de cobertura esperada: SGEXTLOG (SGCB0010) — ponto 18
[INFO] CALL fora de cobertura esperada: SGXASM01 (SGCB0150) — ponto 18/20
[OK]  Check 3: todos os COPYs resolvem para copybook existente
[OK]  Check 4: todos os programas com FILE-CONTROL tem FILE STATUS
[OK]  Check 5: todos os programas com EXEC SQL tratam SQLCODE
[EXIT 0]
```

## 4. Cenários funcionais

- 28 cenários em `docs/CENARIOS_TESTE.md` (C01..C28).
- Massa em `data/input/` alinhada aos LRECLs dos copybooks.
- Resultados esperados em `data/expected/expected_results.md`.

Execução simulada — passos recomendados para um agente:

1. Ler `docs/CENARIOS_TESTE.md`.
2. Cruzar cada cenário com o programa envolvido via
   `docs/MAPA_DEPENDENCIAS.md`.
3. Validar que o input real (`data/input/*.txt`) contém a linha esperada.
4. Comparar RC e chave-mensagem esperados em
   `data/expected/expected_results.md` com a análise estática do
   programa.

Um harness dinâmico (executar realmente em Enterprise COBOL) está
**fora de escopo** deste laboratório.

## 5. Checklist antes de qualquer alteração

Ver `checklist_validacao_estatica.md`. Regra de ouro:

- Se `validate_static.sh` retorna `0` na baseline, ele **precisa** voltar
  a retornar `0` após a mudança.
- Se algum ponto de `PONTOS_FORA_COBERTURA.md` estiver marcado como
  “PENDENTE DE INSERÇÃO”, sua remoção do documento exige que o ponto
  esteja de fato inserido no código.

## 6. O que este documento NÃO cobre

- Regressão em tempo real (sem compilador z/OS disponível).
- Testes de performance / stress em VSAM ou DB2.
- Reprodução dos códigos SQLCODE em `-803`, `-911`, `-904` — depende de
  infraestrutura DB2 real.

Para agentes que precisem simular comportamento dinâmico, o caminho
recomendado é:

- Extrair os cenários de `docs/CENARIOS_TESTE.md`.
- Escrever asserções manuais confrontando input × código × output.
- Registrar divergências no fluxo `sgp-context-reader` /
  `sgp-impact-analyst`.
