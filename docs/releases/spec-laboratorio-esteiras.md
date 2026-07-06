# Especificação de Implementação — Laboratório de Esteiras

> **Para:** agente de código (Cursor / Claude Code).
> **Repositório:** SGP (monorepo — `server/` Node/TS + Postgres, `src/` React/TS).
> **O que é:** nova tela onde a **Bravo (admin)** monta a **esteira** de um pedido escolhendo **matrizes** (estilo cardápio), configurando o que entra, e salvando. Depois a esteira segue para validação/planejamento (fora deste escopo).
> **Referência visual:** 2 mockups anexos — "Escolha as matrizes" (grade + modal Configurar matriz) e "Revise sua esteira" (blocos montados + salvar).

---

## 1. Conceito

A esteira é montada como uma **soma de blocos-matriz**. Cada matriz é um *template* (cardápio) que traz uma subárvore de Tarefa/Setor/Atividade. A admin escolhe matrizes, **apara** as atividades que não se aplicam àquele pedido, ajusta ordem/tempo, e salva.

Fluxo: **Escolher matriz → Configurar (incluir/editar atividades) → Aplicar à esteira → (repetir) → Revisar → Salvar esteira.**

---

## 2. Modelo de dados real (já existe)

### 2.1. Matriz = `matrix_nodes` (migração `0003_matrix_nodes.sql`)
Árvore de template com `node_type ∈ (ITEM, TASK, SECTOR, ACTIVITY)`:
- **ITEM** = a matriz/produto (ex.: "Sofá 3 lugares") — raiz, `parent_id NULL`.
- **TASK** = Tarefa · **SECTOR** = Setor · **ACTIVITY** = Atividade (folha).
- Campos úteis: `order_index`, `is_active`, `planned_minutes`, `required`, `default_responsible_id`, `name`, `code`, `root_id`.
- **⚠️ Níveis podem ser pulados (decisão "mix, sem padrão"):** a constraint só exige `ITEM` sem pai e não-`ITEM` com pai — **não** força ITEM→TASK→SECTOR→ACTIVITY. Uma matriz pode ir `ITEM → SECTOR → ACTIVITY` (sem TASK), ou ter várias TASKs. **Nunca assuma profundidade fixa.**

Módulo de leitura: `server/src/modules/operation-matrix/` (`operation-matrix.repository.ts`, `.service.ts`).

### 2.2. Esteira = `conveyors` / `conveyor_nodes` (`OPTION → AREA → STEP`)
A esteira executável usa 3 tipos: **OPTION** (Tarefa) → **AREA** (Setor) → **STEP** (Atividade). Existe também `conveyor_bases`/`conveyor_base_nodes` (base/template de esteira, `source_type = 'MATRIX'`, `source_ref_id` = ITEM raiz da matriz). Ver `0004_conveyor_bases_and_nodes.sql` e módulo `server/src/modules/conveyors/` (`conveyors.service.ts`, `conveyor-lifecycle.service.ts`).

### 2.3. Mapeamento de tipos ao aplicar (matriz → esteira)
`ITEM/TASK → OPTION`, `SECTOR → AREA`, `ACTIVITY → STEP` (doc no cabeçalho de `0004`). Como TASK pode faltar:
- Se a matriz tem TASK(s): cada TASK → um `OPTION` (a Tarefa).
- Se a matriz **não** tem TASK (vai ITEM→SECTOR direto): o **ITEM vira o `OPTION`** (a matriz é a própria Tarefa raiz). `// TODO`: confirmar essa regra com o time.
- `SECTOR → AREA`, `ACTIVITY → STEP`, preservando `order_index`.

### 2.4. Quantidade (por unidade)
Decisão: tempos da matriz são **por unidade**. A quantidade do pedido (ex.: 20 un) vive no planejamento — ver `0043_operational_planned_quantity.sql`. No lab, exibir tempo **por peça** e o total do lote = `soma(incluídas) × quantidade`. A quantidade **não** multiplica a estrutura (nós), só o tempo previsto agregado.

---

## 3. Telas e comportamento

### 3.1. "Escolha as matrizes" (grade)
- Busca `Buscar matriz…` + grade de cards de matriz (ITEMs ativos de `matrix_nodes`).
- Card: thumbnail (com **fallback de ícone** quando não houver imagem — ver Impermeabilização/Reforço nos mockups), nome, nº de atividades, tempo total (soma dos `planned_minutes` das ACTIVITY ativas).
- Toque no card → abre o modal **Configurar matriz** (bottom sheet).

### 3.2. Modal "Configurar matriz"
- Cabeçalho: nome da matriz + contadores (nº atividades, tempo) que **recalculam** conforme seleção.
- Corpo: renderiza a **árvore da matriz genericamente** (Tarefa quando existir → Setor → Atividade). Colunas: `INCLUIR` (checkbox), `TEMPO`, `AÇÕES` (editar).
  - Grupos (Setor/Tarefa) colapsáveis, com subtotal de tempo.
  - Atividade: ícone, nome, checkbox incluir (default = `required`/`is_active`), tempo, editar (pencil), **arrastar para reordenar** (handle ⋮⋮).
  - Item **excluído** (checkbox off) → linha esmaecida, tempo esmaecido, **não** soma no total.
- Rodapé: "N atividades selecionadas de M totais" + "tempo previsto total" (**só das incluídas**).
  - 🔧 **Bug do mockup a evitar:** no anexo o rodapé mostra 8h30 mesmo com itens desmarcados; o correto é recalcular (ver tela 2, que soma certo).
- Botões: **Cancelar** / **Aplicar à esteira**.

### 3.3. "Revise sua esteira"
- Banner de sucesso ("N matrizes aplicadas").
- **Dados básicos** (editável): Cliente, Descrição, Quantidade, Prazo.
- **Estrutura montada:** um bloco por matriz aplicada:
  - Cabeçalho: nome + (nº atividades, tempo por peça) + menu (⋮) + arrastar (⋮⋮ para ordenar blocos).
  - Setores colapsáveis com chips das atividades incluídas.
  - Ações do bloco: **Editar matriz** (reabre o modal 3.2 com o estado salvo) · **Remover**.
- **+ Adicionar outra matriz** → volta à grade (3.1).
- Resumo: nº matrizes · nº atividades · tempo previsto (por peça; se exibir total do lote, deixar rotulado).
- **Salvar esteira** (persiste a esteira montada) · **Voltar**.

---

## 4. Regras de negócio

1. **Incluir/excluir atividade:** ao aplicar, atividades excluídas **não são clonadas** para a esteira (alternativa: clonar com `is_active = false`). *Decidir* — recomendação: **não clonar** (mais simples; a esteira só tem o que roda). Reincluir depois via "Editar matriz".
2. **Recálculo de tempo:** sempre a partir das atividades **incluídas** (`Σ planned_minutes`). Total do lote = `× quantidade`.
3. **Ordenação = sequência:** a ordem dos blocos (Tarefas/OPTION) e das atividades (STEP) definida por arrastar grava `order_index`. **Essa ordem alimenta a regra de "fora de sequência"** (ver spec `spec-fora-de-sequencia.md`). Manter `order_index` coerente na clonagem.
4. **Múltiplas matrizes:** uma esteira soma várias matrizes (cada uma vira um ou mais OPTIONs). Suportar N blocos.
5. **Mesma matriz 2×:** *decisão em aberto* — permitir aplicar a mesma matriz duas vezes (gera 2 blocos)? Recomendação provisória: **permitir**, cada aplicação é um bloco independente (nomes podem repetir; diferenciar por `code`/sufixo).
6. **Responsável fica FORA do lab:** o `default_responsible_id` da matriz pode ser copiado como sugestão, mas a alocação real é no **planejamento** do líder. Não pedir responsável na montagem.
7. **Estado do rascunho:** a esteira nasce em rascunho (ex.: `conveyors.status = 'DRAFT'`) e só após "Salvar" segue para validação.

---

## 5. Backend

Reutilizar/estender a instância matriz→esteira existente (procurar em `conveyors.service.ts` / `conveyor-lifecycle.service.ts`; `conveyor_bases.source_type = 'MATRIX'`).

Endpoints sugeridos (ajustar aos padrões do projeto):
- `GET /matrices` — lista ITEMs ativos + agregados (nº atividades, tempo) para a grade. Fonte: `operation-matrix`.
- `GET /matrices/:itemId/tree` — subárvore da matriz para o modal (genérica, com `order_index`, `planned_minutes`, `required`).
- `POST /conveyors/:id/apply-matrix` — body: `{ matrixItemId, includedActivityNodeIds[], overrides?, order }`. Clona a subárvore selecionada em `conveyor_nodes` (mapeando tipos 4→3, preservando ordem), como um novo OPTION-bloco.
- `PATCH .../blocks/:blockId` — reconfigurar (incluir/excluir/reordenar) um bloco já aplicado.
- `DELETE .../blocks/:blockId` — remover bloco.
- `PUT /conveyors/:id` — dados básicos (cliente, descrição, quantidade, prazo).
- `POST /conveyors/:id/save` — muda de rascunho para "pronto para validação".

Regras server-side:
- Validar que a árvore final é **OPTION → AREA → STEP** válida (STEP sempre sob AREA sob OPTION), mesmo quando a matriz pulou níveis (aplicar 2.3).
- `order_index` estável e sequencial por nível.
- Idempotência do apply (evitar duplicar nós se reenviado).

---

## 6. Frontend

- **Renderização recursiva/genérica** da árvore da matriz (não presuma Setor no topo; mostre Tarefa quando houver). Um componente `MatrixTree` que percorre `TASK?/SECTOR/ACTIVITY`.
- Estado local do modal: set de `includedActivityIds` + overrides de tempo/ordem; só persiste em "Aplicar".
- Contadores derivados (nº incluídas, tempo) reativos ao set.
- Grade com fallback de ícone por tipo/matriz quando faltar thumbnail.
- Reordenação por drag (dnd) no modal (atividades) e na revisão (blocos).
- Estados de vazio: esteira sem matriz → CTA "Adicionar matriz"; matriz sem atividade incluída → aviso antes de aplicar.
- Acessibilidade: foco visível, checkboxes rotulados, contraste dos itens esmaecidos ≥ AA para texto essencial.
- Estética: manter o padrão dos mockups (fundo escuro + dourado-sinal; verde para sucesso; ícones por setor/atividade).

---

## 7. Pontos de atenção / decisões em aberto

- [ ] **Regra 2.3** (matriz sem TASK → ITEM vira OPTION) — confirmar com o time.
- [ ] **Excluídas ao aplicar:** não clonar (recomendado) vs clonar `is_active=false`.
- [ ] **Mesma matriz 2×** — permitir? (recomendado: sim).
- [ ] **Tempo total no resumo** — mostrar por peça, ×quantidade, ou ambos rotulados.
- [ ] **Edição de item** (pencil) — o que é editável no lab? (tempo? nome? só override local ou grava na matriz?) — recomendação: override **local à esteira**, nunca altera a matriz-template.

---

## 8. Fora de escopo

- Planejamento e alocação de responsável (líder) — vem depois.
- Validação administrativa e envio à fábrica.
- CRUD da matriz (gestor) — já existe em `operation-matrix`.
- Multiplicar estrutura por quantidade (quantidade só afeta tempo agregado).

---

## 9. Critérios de aceite

- [ ] Grade lista matrizes reais (`matrix_nodes` ITEMs) com nº atividades e tempo corretos.
- [ ] Modal renderiza matrizes com e sem nível de Tarefa (mix) sem quebrar.
- [ ] Desmarcar atividade recalcula nº e tempo (rodapé bate com a seleção).
- [ ] "Aplicar à esteira" cria um bloco na esteira com árvore OPTION→AREA→STEP válida e `order_index` correto.
- [ ] Revisão permite editar/remover bloco e adicionar outra matriz; totais somam certo (ex.: 6 + 3 = 9 atividades, 6h30 + 3h00 = 9h30).
- [ ] Reordenar altera `order_index` e, por consequência, a análise de sequência.
- [ ] "Salvar esteira" persiste em rascunho pronto para validação; responsável **não** é solicitado.
- [ ] Suites verdes: `cd server && npx vitest run` e, na raiz, `npx vitest run`.

---

## 10. Ordem sugerida de execução

1. `GET /matrices` + grade (3.1).
2. `GET /matrices/:id/tree` + modal genérico com include/tempo/reordenar (3.2).
3. `POST apply-matrix` (clonagem 4→3 + order_index) e estado da esteira-rascunho.
4. Revisão (3.3): blocos, dados básicos, totais, editar/remover/adicionar.
5. `save` + validações server-side.
6. Testes + rodar suites.
