# SGP — Checklist de Validação de Telas e Fluxos

**Gate de qualidade UX/produto** · Complemento aos documentos fundador e prático · Multivacia / ARGOS

---

## Objetivo da checklist

Esta checklist existe para evitar que o SGP:

- vire **burocracia bonita**;
- acumule **cliques** e **etapas** sem ganho real;
- gere **repulsa operacional** no colaborador ou no gestor;
- **perca clareza** em troca de densidade ou de “completude”;
- se **afaste** do princípio operacional mandatório (operação primeiro, visão como consequência).

**Regra:** nenhuma tela ou fluxo é considerado **aprovado** sem passar por esta lista (ou equivalente explícito documentado). Bonito não substitui útil.

---

## Como usar esta checklist

| Aspecto | Orientação |
|--------|------------|
| **Quando usar** | Nova tela, fluxo novo, melhoria relevante, antes de “fechar” sprint/revisão, antes de priorizar base física. |
| **Quem usa** | Produto, design, frontend, quem faz revisão funcional — pode ser o mesmo responsável com foco em UX ou rotação no time. |
| **Resposta negativa** | Item não atendido = **ajustar** (simplificar, cortar, redesenhar) — não “anotar para depois” se for item crítico da seção. |
| **“Bonita” ≠ aprovada** | Acabamento premium não fecha gate se clareza, fricção ou operação falharem. |
| **Critério principal** | A tela **serve à operação real** com **baixa fricção** para colaborador e/ou gestor? |

Se a tela **falhar em pontos críticos** (clareza da ação principal, fricção desnecessária, punitividade no colaborador, mini tarefa no gestor), **volta para ajuste** antes de avançar mock, handoff ou base física.

---

## Checklist — Clareza imediata

- [ ] Em **até ~5 segundos** fica claro **para que serve** esta tela?
- [ ] A **ação principal** está evidente (posição, contraste, label)?
- [ ] O **título** (ou cabeçalho) **ajuda** — não confunde com jargão ou nome interno?
- [ ] O usuário sabe **o que fazer primeiro** sem adivinhar?
- [ ] Há **excesso de informação** na primeira leitura (tudo com o mesmo peso)?
- [ ] A **hierarquia visual** está clara (o mais importante domina)?

---

## Checklist — Fricção operacional

- [ ] Esta tela pede **mais do que o necessário** para a tarefa?
- [ ] Existem **campos** que podem ser removidos, adiados, inferidos ou default?
- [ ] Existem **cliques** que podem ser eliminados ou unificados?
- [ ] Existem **confirmações** que não evitam erro real — só atrasam?
- [ ] O fluxo poderia ser **mais curto** sem perder segurança operacional?
- [ ] Alguma etapa parece existir por **ansiedade de controle**, não por necessidade de quem executa?

---

## Checklist — Colaborador

*Aplicar em: Minhas Atividades, apontamento, jornada do colaborador e fluxos equivalentes.*

- [ ] O colaborador entende **rapidamente** o que precisa fazer **agora**?
- [ ] **Prioridade** e **contexto** estão claros sem caça ao sentido?
- [ ] O **apontamento** está **rápido** o suficiente (poucos passos, sem labirinto)?
- [ ] O fluxo parece **prático** — não **punitivo** ou “prestar contas”?
- [ ] A tela **reduz** resistência ao uso — não aumenta?
- [ ] A **tarefa principal** pode ser concluída em **poucos cliques** nos cenários típicos?

---

## Checklist — Gestor

*Aplicar em: backlog operacional, nova esteira manual, entrada por documento, orquestração.*

- [ ] A tela **ajuda a orquestrar** — ou **burocratiza**?
- [ ] **Criar / encaminhar** esteira está **simples** (poucos campos, sensação de “já está na rua”)?
- [ ] O **backlog** **organiza** e permite ação — ou **confunde** / parece purgatório?
- [ ] O sistema pede **só o essencial** para a próxima ação operacional?
- [ ] A tela favorece **decisão rápida** (próximo passo óbvio)?
- [ ] Existe algo que vira **mini tarefa administrativa** sem necessidade clara?

---

## Checklist — Valor executivo real

*Aplicar em: dashboards de gestão e visão gerencial.*

- [ ] Esta visão depende de **dado vivo** da rotina — ou de **esforço artificial** (planilha, mutirão)?
- [ ] Os **KPIs** fazem sentido para decisão — não são enfeite?
- [ ] Há **excesso** de número/indicadores competindo por atenção?
- [ ] A tela mostra **o que importa primeiro**?
- [ ] A visão é **útil** — não só **bonita**?
- [ ] Ajuda a enxergar a **situação real da fábrica** — ou mascara vazio com layout?

---

## Checklist — Premium com legibilidade

- [ ] A tela está **premium** sem **sacrificar clareza**?
- [ ] O **contraste** está suficiente para leitura repetida?
- [ ] O **fundo** (cor, textura, escuro) **ajuda** a hierarquia — ou **cansa / esconde** ação?
- [ ] A **tipografia** está legível nos tamanhos reais de uso?
- [ ] Os **destaques** são elegantes — não exagerados (grids, sombras, cores gritando)?
- [ ] O visual parece **produto proprietário** do ecossistema — não **template genérico** sem alma?

---

## Checklist — Cards, tabelas, listas e KPIs

- [ ] A **lista/tabela** é fácil de **escanear** (ritmo de linha, alinhamento, foco)?
- [ ] Os **cards** **ajudam** a decidir/agir — não só embelezam?
- [ ] Os **KPIs** têm **hierarquia visual** coerente (nem todos heróis)?
- [ ] **Estados** e **badges** são **compreensíveis** sem legenda infinita?
- [ ] O **hover** reforça interatividade **sem poluir**?
- [ ] Fica rápido **onde clicar** e o que é clicável?

---

## Checklist — Linguagem e microcopy

- [ ] Os textos estão **claros** e **curtos** onde importa?
- [ ] Os **labels** são **objetivos** (verbo + objeto quando for ação)?
- [ ] Há **jargão** desnecessário ou nome interno exposto ao usuário?
- [ ] A **ação principal** usa **verbo claro** (“Encaminhar”, “Apontar”, “Criar esteira”)?
- [ ] Mensagens **ajudam** (próximo passo, o que aconteceu) — não só **enchem espaço**?
- [ ] O tom é de **ferramenta operacional** — não de **PowerPoint corporativo** vazio?

---

## Checklist — Estados da interface

- [ ] Existe **vazio** coerente, com orientação do que fazer em seguida?
- [ ] Existe **feedback de sucesso** quando faz sentido (sem fanfarra em todo micro-sucesso)?
- [ ] Existe **erro** compreensível, com caminho de correção ou retry quando aplicável?
- [ ] Existe tratamento para **ausência de resultado** (filtro, busca) diferente de “vazio real”?
- [ ] Existe indicação de **ação em andamento** quando a espera importa?
- [ ] Os estados foram pensados com **clareza** e **leveza** — sem drama técnico na cara do usuário?

---

## Checklist — Continuidade de fluxo

- [ ] Fica claro **de onde** o usuário veio (contexto, breadcrumb mental)?
- [ ] Fica claro **o que acontece depois** da ação principal?
- [ ] O fluxo **terminou bem** — confirmação estável, sem beco sem saída?
- [ ] A tela **não deixa o usuário perdido** após concluir (próximo passo óbvio)?
- [ ] Há **continuidade natural** com backlog, execução, apontamento ou acompanhamento?

---

## Checklist — Critério de corte

**Simplificar, redesenhar ou cortar** quando aparecer:

- [ ] **Campos demais** para o que a operação precisa agora  
- [ ] **Etapas demais** sem redução de erro real  
- [ ] **Leitura lenta** — precisa de muito esforço para achar a ação  
- [ ] **Ação principal pouco evidente**  
- [ ] **Excesso de elementos visuais** competindo com conteúdo  
- [ ] **Dependência de treinamento** para tarefa básica do dia a dia  
- [ ] **Fluxo bonito, mas pouco natural** — tolerado, não desejado  

Ao encontrar esses sinais: **simplificar antes de avançar** — não empilhar correção em cima de fluxo errado.

---

## Checklist final de aprovação (gate)

Use como **fechamento** antes de marcar “pronto” ou “apto a base física”.

- [ ] Esta tela respeita o **princípio operacional mandatório** do SGP?
- [ ] Ela **facilita** a vida de **colaborador** e/ou **gestor** (quem for o foco)?
- [ ] Ela **reduz fricção** — não aumenta?
- [ ] Ela está **clara em poucos segundos**?
- [ ] Ela parece parte do ecossistema **ARGOS / Multivacia** (coerência, não cópia vazia)?
- [ ] Está **pronta para seguir no mockado** (validação de fluxo)?
- [ ] Está **madura o suficiente** para, no tempo certo, **virar base física** sem congelar erro de UX?

**Se algum item crítico falhar:** não aprovar; ajustar e **re-passar** a checklist.

---

## Encerramento

No SGP, uma tela só está pronta quando a operação sente **ajuda**, não **peso**. Checklist verde com sensação de fardo ainda é **não aprovado**: volte à régua prática de UX e ao princípio mandatório.

---

*Checklist oficial de validação de telas e fluxos — uso em revisão de produto, design, frontend e antes de evoluir para persistência.*
