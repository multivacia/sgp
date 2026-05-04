# R6 — Sprint S9.3 — Guarda estrutural de TASK (macroestrutura)

## Problema

Com matching hierárquico por TASK, **preview/descendentes** e **palavras materiais** na descrição agregada (`activityDescription`) podiam elevar o score de uma TASK **processual** (fluxo de oficina), fazendo-a vencer uma TASK **estrutural** correta para o serviço da OS.

Exemplos reais:

1. **ACABAMENTO DA TAMPA TRASEIRA … COURVIN** → top virava **19 - LIMPEZA FINAL** em vez de **9 - TAMPA TRASEIRA**.
2. **CABO DE AÇO - TROCAR** → top virava **15 - BANCOS DIANTEIROS** por ruído/preview.

## Regras implementadas (sem LLM, sem novos endpoints)

### 1. TASK processual (`isProcessualTaskTitle`)

Identifica títulos como: limpeza final, montagem veículo, retirada de peças, desmontagem, conferência, entrega, finalização.

- Se o **serviço da OS** não contiver termo processual correspondente (`serviceHasProcessualServiceTerm`), aplica-se **penalização forte** no score da TASK (`×0.45`).
- Quando serviço e TASK são ambos processuais alinhados, aplica-se um **reforço determinístico** (`+0.10` no score da TASK, antes do clamp) para o resultado continuar acima do mínimo macro **sem alterar os limiares globais** (`MATCH_TASK_MACRO_MIN_SCORE`, etc.).

### 2. Alinhamento estrutural no título (`computeTaskTitleStructuralAlignment`)

Interseção de tokens entre **serviço** e **título da TASK** (após `expandOperationalSynonyms`), usando um conjunto de termos estruturais (derivado da macro S9.1 + materiais como couro, courvin, tecido, carpete, assoalho, aço).

Também conta **mesmas frases fortes** já usadas no score (`PHRASE_DEFS`), avaliadas no **título** e no **serviço** — não nos descendentes.

### 3. Penalização sem alinhamento

Para TASK não processual (ou processual já tratada): se não há `hasStructuralAlignment`, **`×0.55`**.

### 4. Cabo de aço

Se o serviço contém **cabo** e **aço/aco**: TASK cujo título **não** reflete cabo+aço recebe **`×0.25`** adicional; o **gate** macro (`taskMacroStructuralGate`) exige cabo no título ou alinhamento estrutural.

### 5. Camada macro (`applyMacroTaskScoreLayer`)

- Overlap estrutural na TASK usa apenas **título/step**, não preview de descendentes.
- Bónus de descendentes (`+0.055`) só se há alinhamento estrutural no título ou par processual válido.

### 6. Near-tie (`Δ ≤ 0.12`)

Se a primeira TASK ranqueada **não** tem alinhamento estrutural e existe outra TASK com alinhamento cuja pontuação está a até **0.12** abaixo, **promove-se** a TASK alinhada e acrescenta-se à `matchReason`:  
*Priorizada estrutura da Matriz com maior alinhamento operacional.*

### 7. Normalização de texto

Substituição de pontuação por classe Unicode `\p{L}\p{N}` para não partir palavras acentuadas (ex.: VEÍCULO) ao remover símbolos.

## Exemplos corrigidos (testes)

- Tampa traseira / courvin → **9 - TAMPA TRASEIRA**, não limpeza final.
- Cabo de aço → atividade **Troca cabo de aço**, não TASK bancos.
- Laterais traseiras, ombreira, lateral de porta, volante → sem regressão com TASK negativas na recall.

## Limitações

- Lista de títulos processuais e termos do serviço é **heurística**; novos fluxos podem precisar de extensão de listas.
- Near-tie e penalizações são **determinísticas**; casos ambíguos continuam a preferir `REVIEW_SIMILAR` quando o limiar de ambiguidade dispara.
