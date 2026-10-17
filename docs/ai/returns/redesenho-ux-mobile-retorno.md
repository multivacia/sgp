# Retorno — redesenho-ux-mobile

- **TASK_ID:** `redesenho-ux-mobile`
- **Data/hora:** 2026-10-17 (UTC)
- **Objetivo:** analisar a UX atual e propor um redesenho completo, mobile-first (celular/tablet), para gestor de esteira e colaboradores de fábrica. **Sem codificação nesta etapa.**
- **Status final:** ANÁLISE CONCLUÍDA — aguardando decisões humanas (seção 7).
- **Branch:** `ccr-683413c7-571rnk`
- **SHA inicial:** `c611d10` (release 1.9.8)
- **SHA final:** ver commit deste retorno (docs only).
- **Migrations envolvidas:** nenhuma.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

---

## 1. Diagnóstico (evidência no código)

| Achado | Evidência | Efeito no usuário |
|---|---|---|
| Telas desktop-first e gigantes | `OperationalPlanningPage.tsx` 2.407 linhas, `EsteiraDetalhePage.tsx` 2.182, `ConveyorCreateEditPage.tsx` 1.398, `DashboardPage.tsx` 1.035 | Uma tela faz tudo; no celular vira rolagem infinita |
| Arrastar-e-soltar como interação principal | `@dnd-kit` em nova esteira, matriz, agenda semanal e planejamento | Arrastar com o dedo em celular é impreciso e cansativo |
| Texto minúsculo e baixo contraste | **1.002** usos de `text-[9px/10px/11px]` e **1.115** de `text-slate-500/600` sobre fundo escuro | Ilegível para quem tem 45+ anos, no chão de fábrica |
| Tabelas | `<table>` em 18 telas (dashboard, colaboradores, evolução, planejamento) | Tabela não cabe em celular |
| Criação de esteira = muitas decisões | 3 modos (`novaEsteiraCreationMode.ts`), 6 campos digitados (`NovaEsteiraDadosIniciais.tsx`), mesa de montagem, revisão | Gestor precisa entender "matriz × complemento × manual" antes de começar |
| Planejamento em duas telas | `planejamento-semanal` + `agenda-semanal`, backlog + grade + kanban | Duplicidade mental: "onde eu planejo?" |
| Não instalável | Sem `manifest`/ícone em `public/` e `index.html` | Não vira "app" na tela inicial do celular |
| Apontamento declarativo | Kiosk: grade → PIN → card → data + tempo (presets) + slider % + justificativa | Colaborador precisa **lembrar** quanto tempo trabalhou |
| Jargão | "Matriz", "backlog", "Step", hierarquia Esteira › Tarefa › Setor › Atividade | Linguagem de sistema, não de fábrica |

O que **já é bom** e deve ser reaproveitado: kiosk com grade de avatares + PIN, presets de tempo, justificativas padronizadas (UX Bravo), impressão térmica de tickets, importação de OS por documento (ARGOS), módulo de capacidade operacional.

---

## 2. Princípios do redesenho

1. **Uma tela = uma pergunta.** Nunca formulário longo.
2. **Tocar, não digitar.** Cartões grandes, chips, botões ±. Digitação só para placa/cliente, com autocompletar.
3. **Polegar primeiro.** Ação principal fixa no rodapé; menu em barra inferior (não sidebar).
4. **Legível para todas as idades.** Mínimo 16px corpo, 20px+ títulos, alvos ≥ 48px, contraste AA, modo claro disponível (sol de fábrica).
5. **O sistema sugere, a pessoa confirma.** Padrões inteligentes + "desfazer" no lugar de "tem certeza?".
6. **Exceção primeiro.** Gestor vê o que está fora do normal, não tudo.
7. **Desktop continua existindo** para manutenção de cardápio (matrizes), análises e administração. Celular é para o dia a dia.

---

## 3. Gestor — novo app "de bolso"

Tela inicial com **3 botões gigantes** + barra inferior:

```
┌───────────────────────────┐
│ Bom dia, Ana     🔔 3     │
│                           │
│  [ ➕  NOVA ESTEIRA     ]  │
│  [ 📅  PLANEJAR SEMANA  ]  │
│  [ 👀  HOJE NA FÁBRICA  ]  │
│                           │
│ ⚠ 2 atrasadas · 1 parada  │
├───────────────────────────┤
│ Início  Esteiras  Hoje  Eu│
└───────────────────────────┘
```

### 3.1 Nova esteira = cardápio de fast-food

| Passo | Pergunta | Interação |
|---|---|---|
| 1 | **"O que vai ser feito?"** | Cartões grandes com ícone/foto dos **combos** (= matrizes), mais usados primeiro, filtro por categoria (ex.: bancos, teto, porta). Um toque escolhe. Opção "Montar do zero" discreta no fim. |
| 2 | **"Quer adicionar ou tirar algo?"** | Lista do combo com toggles ✓/✗ por tarefa e chips "+ Adicionais" (blocos de outras matrizes). Quantidade com botões − / +. Sem arrastar. |
| 3 | **"Pra qual carro?"** | Placa primeiro (teclado já em maiúsculas); se a placa já existe, preenche cliente/veículo/modelo sozinho. Alternativa: **📷 foto da OS** usando o fluxo ARGOS de importação já existente. |
| 4 | **"Pra quando?"** | Chips: Hoje · Amanhã · Esta semana · Escolher data. Responsável = quem está criando (alterável). |

**Carrinho fixo no rodapé** durante todo o fluxo: `3 tarefas · ~14 h · R$ —` → botão **CRIAR ESTEIRA**.
Atalhos: **"Repetir última"** e **"Duplicar esteira"**.
Meta: criar esteira padrão em **< 1 minuto, ~8 toques**.

> Os três modos atuais (matriz inteira / matriz + complementos / manual) deixam de ser uma escolha inicial: viram consequência natural do passo 2 (não mexeu = matriz inteira; adicionou = complementos; "do zero" = manual). Payload enviado ao backend continua o mesmo.

### 3.2 Planejar semana = "o sistema monta, você ajusta"

- Lista única **"Esperando planejamento"** (substitui backlog + agenda).
- Botão **"Sugerir semana"**: usa capacidade operacional já cadastrada para propor dia/equipe de cada esteira.
- Visão da semana como **5 barras de lotação** (Seg–Sex) com semáforo verde/amarelo/vermelho.
- Ajuste por toque: tocar na esteira → chips de dia → pronto. Sem drag-and-drop.
- Um botão **PUBLICAR SEMANA**.

### 3.3 Hoje na fábrica = feed de exceções

- Só aparece o que precisa de ação: **atrasada**, **parada há X h**, **sem apontamento hoje**, **colaborador sem atividade**, **apontamento fora de sequência**.
- Cada cartão tem 1–2 botões de ação (Ver · Realocar · Ligar/Avisar).
- Rodapé com resumo do dia em 3 números (concluídas / em andamento / atrasadas).
- Notificação no celular para exceções críticas (PWA).
- Dashboard analítico completo permanece no desktop.

---

## 4. Colaboradores de fábrica (kiosk / tablet)

| Hoje | Proposta |
|---|---|
| Lista de cards de atividades | **Um cartão gigante: "Sua próxima tarefa"** + "ver outras" |
| Declara tempo depois (presets/minutos) | **▶ COMEÇAR / ⏸ PAUSAR / ✅ TERMINEI** — o sistema cronometra; só pergunta se o tempo ficar fora do esperado |
| Slider de % | 4 botões: **¼ · ½ · ¾ · Pronto** |
| Procurar atividade na lista | **QR code no ticket térmico** (já impresso hoje) → tablet lê → abre direto a atividade |
| Justificativa em select | Botões grandes com ícone (falta material, retrabalho, aguardando outro setor…) |
| Grade + PIN | Mantém (funciona), com fotos maiores |

Opcional depois: modo "sem internet" (fila local de apontamentos que sincroniza quando o Wi-Fi volta).

---

## 5. Transversal

- **PWA instalável** (ícone na tela inicial, abre em tela cheia).
- **Barra inferior** de navegação no celular; sidebar só no desktop.
- **Glossário de fábrica** (decisão de negócio): ex. Matriz → *Modelo* / *Combo*; Backlog → *Esperando*; Step → *Atividade*.
- **Design system novo de tokens** (tamanho mínimo de fonte, contraste, modo claro/escuro) para eliminar os ~1.000 textos minúsculos.
- Toda regra continua no backend: o novo front **reutiliza os endpoints atuais**; nenhuma regra de ciclo de vida, planejamento publicado ou sequência muda.

---

## 6. Roteiro sugerido (incremental, sem big-bang)

| Fase | Entrega | Risco | Precisa backend? |
|---|---|---|---|
| 0 — Descoberta (1 semana) | Acompanhar gestora e 2–3 colaboradores; cronometrar hoje: criar esteira, planejar, apontar. Protótipo clicável no celular para validar | Baixo | Não |
| 1 — Ganhos rápidos | PWA + barra inferior + tipografia/contraste mínimos + botões ¼ ½ ¾ | Baixo | Não |
| 2 — Nova esteira cardápio | Fluxo de 4 passos em rota mobile nova (`/m/...`), mesma API de criação | Médio | Possivelmente busca por placa / "mais usadas" |
| 3 — Hoje na fábrica | Feed de exceções + push | Médio | Endpoint agregado de exceções |
| 4 — Apontamento por cronômetro + QR | COMEÇAR/PAUSAR/TERMINEI, QR no ticket | **Alto** (toca regra de apontamento) | Sim — sessão de trabalho aberta/fechada |
| 5 — Planejamento por sugestão | "Sugerir semana" + barras de lotação | **Alto** (planejamento semanal publicado) | Sim — motor de sugestão |

Fases 4 e 5 exigem o fluxo completo de `AGENTS.md` (contexto → impacto → spec → implementação → revisão).

---

## 7. Decisões humanas pendentes

1. **Vocabulário:** aceitar renomear termos (Matriz → Modelo/Combo etc.)?
2. **Dispositivo dos colaboradores:** tablet fixo compartilhado por setor, ou celular próprio? (define QR, PIN, offline).
3. **Quantas matrizes ativas existem?** (até ~20 = cartões; mais que isso = categorias + busca).
4. **Esteira "rascunho rápido"** sem cliente/placa pode existir e ser completada depois?
5. **Apontamento por cronômetro** substitui ou convive com a declaração de tempo atual?
6. **Métrica de sucesso:** qual o tempo atual para criar uma esteira e planejar a semana? (base para provar ganho).
7. Começar pela **Fase 0 + 1** e pelo **cardápio da nova esteira** (Fase 2)?

---

## 8. Execução desta atividade

- **Arquivos criados:** `docs/ai/returns/redesenho-ux-mobile-retorno.md`
- **Arquivos alterados/removidos:** nenhum.
- **Código-fonte:** não alterado (análise somente leitura).
- **Comandos executados:** `git status`, `git log`, listagens de `src/features` e `src/routes`, `grep` pontuais (dnd-kit, `<table>`, tamanhos de fonte, manifest, campos da nova esteira e do kiosk), `wc -l` das telas.
- **Build/lint/testes:** não executados — nenhuma alteração de código.
- **Riscos/ressalvas:** contagens de classes CSS são aproximadas (grep); diagnóstico baseado em leitura de código, não em observação de uso real — validar na Fase 0.
- **Próximo passo recomendado:** responder às decisões da seção 7; em seguida produzir protótipo clicável mobile da Nova Esteira (cardápio) e da tela Hoje para testar com a gestora antes de codificar.
- **Commit/push:** branch `ccr-683413c7-571rnk`; sem PR.

---

## 9. Continuação — protótipo clicável (2026-10-17)

- **Entregue:** protótipo clicável para celular (390×844), publicado como Artifact privado:
  https://claude.ai/artifact/QBY3svGbjp7ALeewX1w9n2 (só o dono abre até compartilhar pelo menu Share).
- **Telas:**
  1. **Início + Nova esteira (cardápio):** início com 3 botões grandes + atalho "Repetir última"; fluxo de 4 passos (modelo → tirar/adicionar com ± → placa ou foto da OS com reconhecimento do carro → prazo/responsável), carrinho fixo com tarefas e horas, tela de sucesso com "Criar outra igual".
  2. **Hoje na fábrica:** placar do dia, cartões de exceção (atrasada, parada, sem apontamento, colaborador sem tarefa) com "Ver" (andamento por atividade) e ação direta (realocar/resolver/avisar/dar tarefa) com confirmação e "Desfazer".
- **Dados:** fictícios e ilustrativos (modelos, horas, placas); nomes de pessoas como placeholders `[COLABORADOR n]`, `[GESTOR n]`, `[CLIENTE]`. Nenhum dado real ou do banco.
- **Repositório:** nenhum código-fonte alterado; o protótipo não faz parte do build do SGP+. Só este retorno foi atualizado.
- **Validação:** não houve build/testes (sem código no repositório). Protótipo não foi renderizado/inspecionado automaticamente nesta sessão — validar abrindo o link no celular.
- **Próximo passo recomendado:** testar o protótipo com a gestora (cronometrar criação de uma esteira) e responder às decisões da seção 7; depois prototipar "Planejar semana" e o apontamento do colaborador (COMEÇAR/PAUSAR/TERMINEI + QR).

---

## 10. Continuação — protótipo do apontamento do colaborador (2026-10-17)

- **Entregue:** nova tela "Apontamento do colaborador (tablet do setor)", 768×1024, no mesmo Artifact:
  https://claude.ai/artifact/QBY3svGbjp7ALeewX1w9n2
- **Fluxos cobertos:**
  1. **Pelo QR do ticket:** ler QR → tocar no nome → PIN → já começa a contar (sem procurar tarefa).
  2. **Pelo nome:** grade de pessoas → PIN → cartão "Sua próxima tarefa" com **COMEÇAR**; "ou escolha outra".
  3. **Trabalhando:** cronômetro gigante, barra previsto × realizado (fica laranja ao passar do previsto), **PAUSAR** / **TERMINEI**.
  4. **Pausa:** motivo em 6 botões grandes → estado pausado → **CONTINUAR**.
  5. **Terminei:** "Quanto ficou pronto?" em 4 botões (¼ · ½ · ¾ · Tudo pronto) → "Registrado!" com tempo calculado, "Tempo errado? Corrigir" (±15 min), **COMEÇAR PRÓXIMA** e saída automática em 20 s.
  6. **Fora de sequência:** tarefa cuja etapa anterior não terminou pede justificativa padronizada em botões antes de começar (preserva a regra atual).
- **Simplificações do protótipo:** 1 s = 1 min no cronômetro; qualquer PIN de 4 dígitos entra; câmera simulada; nomes/placas/tempos fictícios.
- **Impacto se for implementado:** o modelo "cronômetro" exige no backend o conceito de sessão de trabalho aberta/pausada/fechada, convertida no apontamento atual — fluxo completo de `AGENTS.md` (alto risco: regra de apontamento e kiosk/produção).
- **Repositório:** nenhum código-fonte alterado; só este retorno.
- **Validação:** sem build/testes (sem código); protótipo não renderizado automaticamente nesta sessão.

---

## 11. Continuação — menu "Semana" + protótipo Planejar semana (2026-10-17)

- **Menu:** barra inferior do gestor passou a ter 5 opções (Início · Esteiras · **Semana** · Hoje · Eu) nas telas Início e Hoje; o botão "Planejar semana" do Início agora abre a nova tela.
- **Nova tela "Planejar semana"** (390×844), mesmo Artifact: https://claude.ai/artifact/QBY3svGbjp7ALeewX1w9n2
  - Lista "Esperando" com botão **Sugerir semana** (distribui respeitando prazo e capacidade, mais cedo possível).
  - "Escolher dia" por esteira: folha com os 5 dias, horas que sobram/passam, aviso de "depois do prazo" e selo **SUGERIDO**; "Mudar dia" e "Tirar da semana".
  - **Lotação da semana:** 5 barras com cor + texto (Tem folga / Quase cheio / Passou X h); tocar no dia mostra as esteiras (novas destacadas).
  - Rodapé com avisos (dia acima da capacidade, esteira depois do prazo) e **Publicar semana**; selo Rascunho / Publicada / Não publicada.
- **Simplificações:** esteira inteira alocada num dia de início (o sistema real planeja por atividade); capacidade fixa de 40 h/dia; dados fictícios.
- **Impacto se implementado:** a sugestão automática exige motor no backend sobre o módulo de capacidade e respeito ao planejamento semanal publicado — fluxo completo de `AGENTS.md` (alto risco).
- **Repositório:** nenhum código-fonte alterado; só este retorno. Sem build/testes; protótipo não renderizado automaticamente nesta sessão.

---

## 12. Continuação — lançamento manual de horas do colaborador (2026-10-17)

- **Ajuste no protótipo "Apontamento":** botão **"Já fiz · lançar horas"** abaixo do COMEÇAR (para quem esqueceu o cronômetro ou trabalhou ontem).
- **Fluxo em uma tela:** 1) tarefa (botões grandes; próxima já marcada) → justificativa padronizada se a etapa anterior não terminou; 2) Hoje / Ontem; 3) tempo por botões (30 min · 1 h · 2 h · 3 h · 4 h · Turno todo) + ajuste ±15 min → **Continuar** → "Quanto ficou pronto?" (¼ ½ ¾ Tudo) → "Registrado!" com "hoje/ontem" e "Corrigir".
- Convive com o cronômetro (ponto de decisão #5 da seção 7 continua em aberto).
- **Repositório:** só este retorno; sem código-fonte, sem build/testes; protótipo não renderizado automaticamente.

---

## 13. Continuação — acesso à tela do tablet (2026-10-17)

- Início do gestor ganhou o cartão **"Tablet do setor"** que abre o protótipo de apontamento; a tela do tablet ganhou o link "Voltar ao app do gestor (protótipo)".
- **Ressalva aberta:** na captura enviada pelo usuário, a miniatura do artboard "Início + Nova esteira" aparece em branco no canvas. Lógica (`renderVals`) testada isoladamente em Node sem erro e tags balanceadas; causa não confirmada — pendente o usuário confirmar se a tela abre no Play.
- Repositório: só este retorno; sem código-fonte.

---

## 14. Continuação — protótipo com imagens do fluxo real de revestimento (2026-10-17)

- **Insumo recebido:** `Fluxo_do_Processo_de_Operação.docx` (cartaz "Fluxo do processo de revestimento automotivo", 20 etapas ilustradas com setores: Desmontagem, Preparação, Corte, Aplicação de cola, Colagem, Modelagem, Pré-montagem, Montagem, Costura, Espuma, Serralheria, Pintura, Finalização, Limpeza, Qualidade).
- **Feito:** recortadas as 20 ilustrações do cartaz e enviadas como imagens do Artifact (não foram ao repositório).
- **Nova esteira:** "cardápio" agora usa as 20 etapas reais com figura, número, setores e horas de exemplo; serviços prontos (Revestimento completo, Bancos, Teto, Forros de portas, Porta-malas + tampão, Volante) pré-marcam as etapas; toque na figura inclui/tira; quantidade em Forros de portas (4) e Bancos dianteiros (2); resumo e tela final mostram as miniaturas.
- **Hoje / Planejar / Apontamento:** cartões com a figura da etapa/peça; tarefas do tablet renomeadas para setores do cartaz (Costura, Corte, Pré-montagem).
- **Ressalvas:** horas por etapa e composição dos serviços são exemplos, não vieram do cartaz nem do banco; a imagem original foi gerada por IA (nome do arquivo indica ChatGPT) — para produção, usar fotos reais ou ilustrações com direito de uso.
- **Repositório:** só este retorno; nenhum código-fonte; sem build/testes. Lógica dos 4 artboards executada em Node sem erro; não renderizado visualmente.

---

## 15. Pesquisa — personalização em níveis (combo → item → subitem) em fast food (2026-10-17)

**Pergunta:** como cardápios de fast food tratam "escolho um combo, depois tiro/incluo itens e subitens", aplicado a Serviço › Etapa (Tarefa) › Setor › Atividade.

**Achados (fontes na resposta do chat):**
- Sistemas de PDV modelam isso como **grupos de modificadores** com regra mínimo/máximo (0 = opcional, ≥1 = obrigatório) — Club Essential, Spice On, Paloma.
- **Aninhamento é limitado**: NCR Aloha permite no máximo **2 níveis**; Deliverect só aceita combo no topo; StoreKit: trocar o item-pai **limpa os filhos**, e grupo filho obrigatório precisa ser preenchido antes de "adicionar".
- **Taco Bell**: cada item mostra a lista de ingredientes **já incluídos**; o cliente tira ou adiciona; "My Mods" salva preferências e aplica com 1 toque; >50% dos pedidos têm customização.
- **McDonald's**: customização é a etapa mais difícil no kiosk; redesenho de bebidas reduziu para **1 página** (menos transições).
- **NN/g / Nielsen**: divulgação progressiva com **até 2 níveis**; mais que isso confunde. Alternativa: várias telas secundárias, cada uma aberta por um controle.

**Proposta para o SGP (não implementada):**
1. Nível 1: escolher o serviço (combo) — já existe no protótipo.
2. Nível 2: grade de etapas com padrão "tudo incluído" — já existe.
3. Nível 3 **numa página só por etapa** ("Personalizar"): setores como seções e atividades como linhas marcadas por padrão; desligar o setor desliga todas as atividades dele. Evita o 4º nível de navegação.
4. Regras mínimo/obrigatório: atividades/setores obrigatórios com cadeado (ex.: Inspeção de qualidade) — **decisão de negócio**.
5. Mostrar **só as diferenças** no resumo ("Bancos dianteiros — sem Pintura") e selo "2 alterações" no cartão da etapa.
6. Tirar a etapa remove setores/atividades; incluir de novo volta ao padrão.
7. "Salvar como serviço" (equivalente a My Mods / nova matriz) para reaproveitar personalizações frequentes.

**Repositório:** só este retorno; sem código-fonte.

---

## 16. Localização da carga inicial da matriz (2026-10-17)

- **Fonte principal:** `docs/Nova Esteira v1.0 - MESTRA - Gol GTI - OS7945.xlsx`, aba `ATIVIDADES E APONTAMENTOS` (TAREFA · SETOR · ATIVIDADE · ATRIBUÍDO PARA · Tempo previsto (min) · Tempo real · % conclusão).
- **Importador:** `docs/import_matrix_nodes_from_excel*.py` (+ `docs/README_import_matrix_nodes_from_excel.md`) grava em `matrix_nodes` a árvore `ITEM → TASK → SECTOR → ACTIVITY`.
- **Outros:** `src/mocks/matrix-bravo-build-tree.ts` (árvore "Tapeçaria automotiva · Bravo" para mocks), `server/src/tests/fixtures/bravo-matrix-matching-seed.fixture.ts` (fixture de testes); `server/seeds/0001_seed_base.sql` não contém matriz.
- **Conteúdo da planilha:** 20 tarefas (idênticas às 20 etapas do cartaz), 15 setores distintos, 138 atividades, ~76,6 h previstas no total.
- Busca feita em todas as 65 branches remotas; nenhuma outra seed de matriz encontrada.

---

## 17. Protótipo — "Personalizar etapa" com dados reais da matriz mestra (2026-10-17)

- **Dados:** as 20 tarefas, 15 setores e 138 atividades com minutos previstos da planilha `docs/Nova Esteira v1.0 - MESTRA - Gol GTI - OS7945.xlsx` (aba `ATIVIDADES E APONTAMENTOS`) embutidos no artboard "Início + Nova esteira". Responsáveis da planilha **não** foram usados (nomes reais).
- **Fluxo:** Serviço → grade de etapas (tudo incluído) → **Personalizar** em cada etapa: setores como seções ("Tirar setor"/"Incluir setor") e atividades como itens marcados com minutos; "Voltar ao padrão da matriz"; "Pronto" volta à grade. Máx. 2 níveis de navegação (setor+atividade na mesma tela), conforme pesquisa da seção 15.
- **Regras do protótipo:** tirar todas as atividades tira a etapa (aviso); tirar a etapa na grade limpa a personalização; cartão da etapa mostra "N atividades tiradas"; resumo e tela final listam só as diferenças (ex.: "Bancos dianteiros: sem 1 atividade de Preparação; sem setor Pintura").
- **Horas agora reais:** Revestimento completo 138 atividades ~76,6 h; Bancos ~30,9 h; Teto ~19,3 h; Forros de portas ~15,6 h; Porta-malas + tampão ~17,4 h; Volante ~4,4 h. A composição dos serviços (quais etapas cada um inclui) continua sendo exemplo.
- **Removido:** quantidade (±) de Forros de portas e Bancos dianteiros — os minutos da planilha já são do veículo inteiro.
- **Pendente (decisão de negócio):** quais etapas/setores/atividades são obrigatórios (cadeado). Telas Hoje/Planejar/Apontamento ainda usam horas de exemplo.
- **Validação:** lógica executada em Node (fluxo serviço → personalizar → tirar setor/atividade → resumo → etapa zerada) sem erro; tags balanceadas; não renderizado visualmente.

---

## 18. Nível Matriz + horas reais em todas as telas (2026-10-17)

- **Nova esteira:** passo 1 virou **"Qual matriz?"** — a matriz é o combo principal (Matriz › Etapa › Setor › Atividade). Filtro por veículo (Todos · Gol GTI · Gol GT); cartões "MATRIZ · Gol GTI" com etapas, atividades e horas reais. Só **Gol GTI completo** vem da planilha; Gol GT completo, Gol GT somente bancos, Gol GTI somente teto, forros de portas, porta-malas + tampão e volante são **recortes de exemplo** dela (sinalizado no cartão). "Sem matriz: montar do zero" mantido.
- **Hoje:** esteiras ligadas a matrizes; progresso, % e horas restantes calculados pela matriz real; "Ver esteira" mostra **todas as etapas → setores → atividades** com estado (feito / em andamento / parado / não começou) e minutos; "Andando bem" também abre a árvore.
- **Planejar:** planejamento passou a ser **por etapa** (uma esteira completa tem 76,6 h e não cabe num dia): cada esteira tem dia de início; as etapas seguem a ordem da matriz e ocupam a folga dos dias seguintes, dividindo etapas quando preciso; mostra "Seg → Sex", dentro/fora do prazo e o que não cabe na semana; o dia mostra as etapas encaixadas. Capacidade de 80 h/dia e carga de outras esteiras são **exemplo**.
- **Apontamento (tablet Costura):** tarefas = todas as atividades de Costura das esteiras em andamento, com tempos da matriz (240, 90 e 60 min).
- **Validação:** lógica dos artboards executada em Node sem erro (inclui simulação do planejamento e árvore de andamento); tags balanceadas; não renderizado visualmente.
- **Repositório:** só este retorno; nenhum código-fonte.

---

## 19. Tela Esteiras ("Ver esteira") + responsável por atividade (2026-10-17)

- **Problema relatado:** usuário não encontrou "Ver esteira". Causa: o botão existia só dentro dos cartões de exceção da tela Hoje; o menu "Esteiras" mostrava "fora deste protótipo".
- **Nova tela "Esteiras"** (artboard próprio, ligado no menu inferior de todas as telas do gestor): lista das 6 esteiras em produção com foto, matriz, % e situação (Atrasada / Parada / Em dia); "Ver esteira" abre todas as etapas → setores → atividades com estado, minutos e responsável.
- **Responsável por atividade:** vem da matriz (coluna "Atribuído para" da planilha) e pode ser trocado por colaborador cadastrado; seletor agrupa "Da matriz", "Indicados para <setor>" (aba Colaboradores da planilha) e "Outros colaboradores"; atalho "Trocar todos"/"Trocar responsável de todo o setor"; troca destacada "(trocado · matriz: X)"; voltar ao da matriz remove a troca.
  - Na **criação** (Personalizar etapa): troca por atividade ou setor; grade e resumo mostram "N responsáveis trocados"; "Voltar ao padrão da matriz" desfaz.
  - Na **esteira em produção**: atividade já feita fica travada ("Feito por X · já apontado, não muda"), preservando o histórico.
- **Hoje:** árvore do "Ver esteira" também mostra o responsável.
- **Dados pessoais:** nomes reais da planilha substituídos por fictícios com mapeamento fixo (mesma pessoa → mesmo nome), mantendo a distribuição de quem faz o quê.
- **Validação:** lógica de todos os artboards executada em Node (troca individual, por setor, travamento de feitas, resumo) sem erro; tags balanceadas; não renderizado visualmente.

---

## 20. Alterar esteira em andamento com justificativa obrigatória (2026-10-17)

- **Decisões do usuário:** só a **gestora** troca responsável; esteira **em andamento pode ser alterada**, com **justificativa obrigatória**.
- **Código atual (referência, não alterado):** `src/features/esteiras/conveyorEditSavePolicy.ts` já exige motivo fora do Backlog (`requiresEditReason`, texto livre 3–500 caracteres, `ConveyorEditReasonDialog`) e permite editar estrutura em qualquer status (sync incremental) + inclusão tardia (`LateStructureAppendDrawer`).
- **Protótipo (tela Esteiras → Ver esteira → "Alterar esteira"):**
  - Fora do modo alteração tudo é só leitura (responsável aparece como texto).
  - No modo alteração: tirar/incluir de volta atividades que **não começaram**; tirar etapa sem nada feito; **incluir etapa** (as que não estão na esteira, com responsáveis da matriz); trocar responsável por atividade ou setor. Atividade feita ou em andamento fica travada.
  - Barra inferior "N mudanças · Descartar · Salvar alteração"; não deixa sair com mudança pendente.
  - **"Por que está alterando?"**: mostra "O que muda" + motivos padronizados em botões (Cliente pediu mudança, Falta de peça ou material, Erro na montagem da esteira, Retrabalho, Mudança de prioridade, Outro motivo) + detalhe opcional (obrigatório em "Outro motivo", até 500 caracteres, compatível com a regra atual).
  - Ao confirmar: grava **Histórico de alterações** na esteira (quando, quem, motivo, detalhe, itens alterados); lista mostra "alterada Nx"; progresso/horas recalculados.
- **Proposta para o sistema real:** trocar o texto livre por catálogo de motivos (padrão já usado em justificativas de apontamento e motivos de aborto — migrations 0048/0051), mantendo complemento livre; permissão de alterar esteira/responsável restrita ao papel gestora via RBAC existente.
- **Validação:** fluxos executados em Node (sem mudança não salva; tirar etapa; tirar atividade; troca por setor; "Outro motivo" exige texto; histórico; incluir etapa) sem erro; não renderizado visualmente.

---

## 21. Alterar esteira = mesmas telas da criação, com cadeados + correção de renderização (2026-10-17)

- **Bug corrigido:** cartões de etapa apareciam como linhas vazias. Causa: filhos com `overflow: hidden` dentro de coluna flex com rolagem eram comprimidos (`flex-shrink`). Correção: classe `scroll` (`.scroll>*{flex-shrink:0}`) em todas as áreas com rolagem dos 5 artboards. **Reproduzido e confirmado em navegador headless** (Chromium + runtime do Artifact servido localmente), com capturas antes/depois.
- **Decisões do usuário:** só a gestora troca responsável; **troca de responsável também exige justificativa** (entra no mesmo fluxo de alteração).
- **Novo fluxo (Esteiras → Ver esteira → Alterar esteira):**
  - **Grade de etapas com figuras** igual à da criação: "Nesta esteira" (Em andamento X/Y · Não começou · Feita com cadeado) e "+ Incluir outra etapa" (figuras cinza; um toque inclui). Tocar numa etapa que não começou tira; numa que já começou abre Personalizar.
  - **Personalizar etapa**: setores e atividades já visíveis; feito/em andamento/parado com **cadeado** e "Feito por X · não muda"; pendentes com marcar/desmarcar e **Trocar responsável** (atividade ou setor inteiro).
  - **"Só o que falta"** ligado por padrão: esconde etapas/atividades feitas (ex.: Gol GTI completo esconde 14 etapas).
  - Barra "N mudanças · Descartar tudo · Salvar alteração" (Pronto na etapa); não sai com mudança pendente; motivo obrigatório (6 motivos padronizados + detalhe; "Outro motivo" exige texto) → histórico.
- **Validação:** lógica em Node (troca de responsável → salvar exige motivo → histórico; bloqueio de saída; incluir/tirar etapa) e **capturas reais** das telas Esteiras (detalhe, grade, personalizar, motivo), Início, Nova esteira e Hoje — sem erro de execução (só avisos de parse do template e imagens `/_blob` indisponíveis localmente).
- **Repositório:** só este retorno; nenhum código-fonte.

---

## 22. Tela de alteração idêntica à de criação (2026-10-17)

- **Pedido:** "na tela de alteração da esteira deixe igual a tela de criação".
- **Feito (artboard Esteiras):** o modo alteração agora usa o mesmo layout da Nova esteira:
  - Cabeçalho com voltar, "Alterar <placa> · passo X de 2" e barras de passos (1 = Confira as etapas / Personalizar etapa; 2 = Por que está alterando?).
  - **Grade única das 20 etapas** com figura, número, selo "Incluída"/"Fora" (+ "Feita" para concluídas), linha "N ativ. · ~tempo · situação" e botão "Personalizar" — mesmo visual da criação; toque inclui/tira (etapas iniciadas abrem Personalizar).
  - **Personalizar etapa** igual à criação (cartão da etapa, setores com "Tirar setor/Incluir setor", "Trocar responsável de todo o setor", atividades com marcação e responsável); feitas/em andamento aparecem no mesmo lugar com **cadeado**; "Desfazer mudanças nesta etapa".
  - **Motivo virou o passo 2** (tela cheia, não mais folha): "O que muda", motivos em botões, detalhe.
  - **Barra inferior igual à da criação**: "N etapas · ~h · N mudanças" + Continuar / Pronto / Confirmar alteração.
  - Removido o filtro "Só o que falta" e as duas grades separadas (para ficar idêntico).
- **Hoje:** o "Ver esteira" (só consulta) ganhou botão "Alterar esteira (abre Esteiras)".
- **Validação:** lógica em Node (fluxo completo até o histórico) e capturas em navegador headless lado a lado com a criação — layout equivalente; sem erro de execução.

---

## 23. Proposta de implementação — SGP+ 2.0 sem tocar na versão atual (2026-10-17)

**Premissa do usuário:** 2.0 é um "Plus"; a versão atual (1.9.8) não deve ser tocada.

**Fatos verificados no código:** nginx (`deploy/nginx/sgp.conf.example`) serve `frontend-dist` em `/` e faz proxy de `/api/` → backend; sessão em cookie httpOnly `path: '/'`, `sameSite: lax` (`server/src/modules/auth/auth.cookies.ts`); rotas montadas em `/api/v1` (`server/src/app.ts`); migrations até `0053`.

**Recomendação:** app novo ao lado do atual, mesmo backend e banco, mudanças só aditivas.
- Frontend 2.0 em pasta própria (ex.: `apps/sgp-2/`), mesma stack (Vite/React 19/TS/Tailwind 4), PWA; servido em `/v2/` (gestor) e `/v2/tablet` (setor); não importa nada de `src/`.
- Mesmo domínio → mesmo cookie de sessão (login único), sem mudança de CORS.
- Backend: reutiliza `/api/v1`; endpoints novos em módulo próprio montado em `/api/v2` (acréscimo de 1 linha em `app.ts`); migrations só aditivas.
- RBAC existente com permissões novas (acesso 2.0; alterar esteira em andamento — só gestora); rollout por usuário/papel.
- 1.x congelada (só hotfix); guarda de CI para PRs da 2.0 não alterarem `src/`.

**Fases:** 0 Fundação (app vazio, PWA, login, tokens de UI, deploy separado) · 1 Hoje + Esteiras só leitura · 2 Nova esteira cardápio (+ imagens de etapa) · 3 Alterar esteira com cadeados + catálogo de motivos/histórico · 4 Planejar semana (sugestão automática depois) · 5 Tablet (lançar horas/QR; cronômetro depois). Começar por 0+1. Fases 4 e 5 exigem fluxo completo do `AGENTS.md`.

**Decisões pendentes:** `/v2/` vs subdomínio; nome do app; piloto (gestora + setor); aprovação para iniciar contexto/impacto/spec das fases 0+1.

---

## 24. Regras da V2 + documento vivo (2026-10-17)

- Decisões: pasta separada, produto "SGP+ V2"; piloto para todos; reutilizar backend V1 (equivalente V2 só quando necessário); testes só do que importa; retornos curtos.
- Criado `docs/v2/SGP_V2.md` (documento vivo: objetivo, regras, arquitetura, fases/status, política de testes, decisões, formato curto de retorno, pendências, como retomar).

---

## 25. Link /V2, política de retorno e especificação da Fase 0 (2026-10-17)

- Decisões: link final `/V2` (`/v2` redireciona); retorno no chat em 6 linhas; arquivo de retorno continua detalhado.
- Contexto/impacto da Fase 0 verificados no código: deploy da V1 usa `rsync --delete` na pasta web (V2 precisa de pasta própria — crítico); rotas de auth reaproveitáveis (`/api/v1/auth/login|me|logout`); CI da V1 restrito a `src/` (build `tsc -b` com `include: ["src"]`, vitest `src/**`); `eslint .` da raiz alcança `apps/`.
- Especificação da Fase 0 registrada em `docs/v2/SGP_V2.md` §10 (escopo, 3 testes críticos, CI com guarda de `src/`, nginx/deploy separados; aprovações humanas listadas). Nenhum código alterado.

---

## 26. Fase 0 do SGP+ V2 — implementação (2026-10-17)

- **Status:** concluída no código; pendente aplicação manual do nginx e 1º deploy (exigem acesso ao servidor).
- **Aprovação:** usuário aprovou condicionado a "o nginx não estragar a V1 nem os deploys dela".
- **Arquivos criados (nenhum da V1 alterado):**
  - `apps/sgp-v2/` — `package.json`, `package-lock.json`, `.gitignore`, `index.html`, `tsconfig.json`, `vite.config.ts`, `public/{manifest.webmanifest,icon.svg,sw.js}`, `src/{main.tsx,App.tsx,App.test.tsx,styles.css}`, `src/api/client.ts`, `src/auth/{context.ts,session.tsx}`, `src/screens/{Login,Eu,Placeholder}.tsx`, `src/shell/Shell.tsx`.
  - `.github/workflows/verify-v2.yml` (CI da V2 + guarda "PR não altera `src/`").
  - `.github/workflows/deploy-v2.yml` (deploy manual, pasta própria, trava contra pasta da V1).
  - `deploy/nginx/sgp-v2.location.example` (blocos aditivos + passo a passo + rollback).
  - `docs/v2/SGP_V2.md` atualizado (status Fase 0, §11).
- **Decisões técnicas:** base `/V2/`; `BrowserRouter basename="/V2"`; cliente `fetch` com `credentials: 'include'` e handler global de 401; service worker mínimo só para instalação (sem cache); tokens de UI (html 18px, campos/botões ≥ 56px); `react-refresh` exigiu separar contexto (`context.ts`) do provider (`session.tsx`); lock semeado do lock da V1 por bug do npm 10.9.4 ("Cannot read properties of null (reading 'edgesOut')") ao resolver `vitest` do zero.
- **Migrations:** nenhuma. **Backend:** nenhuma alteração.
- **Validações executadas:**
  - V2: `npm ci` ok; `npm test` → 1 arquivo, **3/3 testes passaram**; `npm run build` ok (JS 236,6 kB / 76 kB gzip).
  - Lint: `npx eslint .` na raiz → **0 problemas em `apps/sgp-v2`** (há 94 erros/23 avisos **pré-existentes** na V1; lint não faz parte do CI `verify-deploy`).
  - V1: `npm run verify:frontend` → build ok; testes **1382 ok / 5 falharam** em `src/features/colaborador/ApontamentoPage.test.tsx` (3) e `src/features/gestor/ApontamentoGestorPage.test.tsx` (2) — botões "Registar apontamento"/"Rever e registar" não encontrados nos testes de "data de realização". **Pré-existente e não relacionado:** `git diff HEAD -- src server` vazio (nenhum arquivo da V1 tocado); provável dependência de data (hoje é sábado, 2026-10-17). Não investigado (fora do escopo; não alterar V1).
  - Nginx: `nginx -t` ok com config da V1 + blocos da V2 (nginx 1.24 local); requisições: `/`→V1 200, `/app/esteiras/123`→V1 200, `/api/v1/health`→200, `/V2/` e `/V2/hoje`→V2 200, `/V2/assets/<hash>.js`→200, asset inexistente→404, `/v2`, `/V2`, `/v2/x`→301 para `/V2/...`, `/V2abc`→V1 (não capturado), `index.html`/`sw.js` com `Cache-Control: no-cache`.
  - Navegador (Chromium headless, `vite preview`): tela de login e casca com menu inferior renderizam.
- **Riscos/ressalvas:** a config nginx real do VPS pode diferir do exemplo (`/opt/sgp/current/frontend-dist` vs `/var/www/sgp-web` usado no workflow) — por isso o bloco é só aditivo e a aplicação exige `nginx -t`; o deploy da V2 reaproveita os secrets de SSH existentes (aprovado); as 5 falhas da V1 devem ser vistas em outra atividade.
- **Próximo passo:** aplicar nginx em HML + rodar deploy manual; em seguida Fase 1 (Hoje + Esteiras só leitura).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

---

## 27. Fase 1 do SGP+ V2 — Hoje + Esteiras (só leitura) (2026-10-17)

- **Status:** concluída no código (publicação depende do nginx/deploy manual da Fase 0).
- **Contexto verificado:** `GET /api/v1/conveyors` (lista `ConveyorListItemApi`: status, prazo, totalSteps; só `requireAuth`) e `GET /api/v1/conveyors/:id` (`ConveyorDetailApi`: options/areas/steps com `operationalStatus`, `plannedMinutes`, `plannedQuantity`, `assignees`, `completedByName`, `baseNameSnapshot`) — `server/src/modules/conveyors/conveyors.dto.ts`. Regra de atraso em `server/src/shared/operationalBucket.ts`. `dashboard` e `conveyor-progress` exigem permissões específicas → não usados.
- **Arquivos criados:** `apps/sgp-v2/src/domain/conveyors.ts`, `src/domain/conveyors.test.ts`, `src/api/conveyors.ts`, `src/screens/{Esteiras,EsteiraDetalhe,Hoje}.tsx`, `src/screens/useConveyors.ts`, `src/ui/bits.tsx`.
- **Arquivos alterados (só V2):** `apps/sgp-v2/src/App.tsx` (rotas), `src/styles.css` (cores), `vite.config.ts` (testes `.ts`), `docs/v2/SGP_V2.md` (§4, §12).
- **Backend/migrations:** nenhum.
- **Decisões:** "Em produção" = `A_INICIAR` + `EM_ANDAMENTO`; % = minutos previstos das atividades concluídas ÷ previstos (exclui `ABORTED`); situação da atividade: COMPLETED→Feito, IN_PROGRESS→Em andamento, BLOCKED→Parado, ABORTED→Interrompido, PENDING/REOPENED→Não começou; exceções da tela Hoje limitadas ao que a V1 já fornece (parada e atrasada); detalhe com cache de 60 s e até 4 pedidos simultâneos.
- **Validação:** `npm test` (V2) → 2 arquivos, **6/6** (3 novos: progresso, atraso igual à V1, ordem/filtro de exceções); `npm run build` ok; `npx eslint apps/sgp-v2` sem problemas; navegador headless com API simulada no formato real (dados da planilha mestra): Hoje, Esteiras, Ver esteira (atrasada e parada) renderizam corretamente. V1: `git diff` sem mudanças em `src/` e `server/`.
- **Riscos:** N pedidos de detalhe (um por esteira) — ver §12 do documento vivo; exceções "sem apontamento" e "sem tarefa" do protótipo ainda não implementadas.
- **Próximo passo:** publicar Fases 0+1 em HML (nginx + deploy manual) e validar com a gestora; depois Fase 2 (Nova esteira cardápio).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

---

## 28. Fase 2 do SGP+ V2 — Nova esteira (cardápio) (2026-10-17)

- **Status:** concluída no código (publicação depende do nginx/deploy manual da Fase 0).
- **Contexto verificado:** matriz `GET /operation-matrix/items` (`operation_matrix.view`) e `/items/:id/tree` (`MatrixNodeTreeApi`: TASK→SECTOR→ACTIVITY, `planned_minutes`, `default_responsible_id`, `team_ids`, `required`, `source_key`); `GET /collaborators` (`CollaboratorApi` com `sector_name`); `POST /conveyors` (`conveyors.create`, `postConveyorBodySchema`: options/areas/steps `orderIndex ≥ 1`, `plannedMinutes` inteiro, assignees com exatamente 1 COLLABORATOR principal, TEAM nunca principal). Tradução de referência da V1: `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts` e `novaEsteiraDraftFromMatrix.ts` (lidas, não alteradas).
- **Arquivos criados:** `apps/sgp-v2/src/domain/novaEsteira.ts`, `src/domain/novaEsteira.test.ts`, `src/api/matrix.ts`, `src/screens/nova/NovaEsteira.tsx`, `src/screens/Inicio.tsx`, `src/ui/ResponsavelPicker.tsx`, `public/etapas/01..20.webp` (≈104 KB).
- **Arquivos alterados (só V2):** `src/App.tsx` (rotas `/nova` e Início), `src/api/conveyors.ts` (`createConveyor`), `vite.config.ts` (alias `zod` para o teste de contrato), `tsconfig.json` (testes fora do `tsc` do build), `package.json`/`package-lock.json` (`zod@3.25.76` dev, mesma versão do backend), `docs/v2/SGP_V2.md` (§4, §13).
- **Backend/migrations:** nenhum.
- **Decisões:** `originType: 'BASE'` mesmo com atividades tiradas (igual à V1 sem complementos); ordem renumerada contígua (1..n) por nível; minutos `floor`; `sourceKey` = `source_key` ou id do nó; responsável principal = escolhido ou `default_responsible_id`, equipe padrão (`team_ids[0]`) como apoio; nome da esteira = "veículo · PLACA" (ou nome da matriz); responsável da esteira = colaborador do usuário logado (trocável); prazo `YYYY-MM-DD` pelos atalhos; prioridade `media`; etapa desativada na matriz não entra.
- **Validação:**
  - `npm test` (V2) → 3 arquivos, **9/9** (3 novos: contrato com o validador real da V1; tirar atividade/etapa + renumeração + descarte de vazios + etapa desativada; responsável herdado/trocado + equipe de apoio).
  - Teste e build também rodados **sem** `server/node_modules` (condição do CI da V2) → ok.
  - `npm run build` ok; `npx eslint apps/sgp-v2` sem problemas.
  - Navegador headless com API simulada usando a **matriz real da planilha** (20 etapas, 138 atividades, responsáveis): fluxo completo até "Esteira criada!"; POST capturado com 19 etapas/131 atividades (Volante tirado), Pré-montagem dos bancos dianteiros com João em todas as atividades, `colaboradorId` do usuário, prazo da sexta.
  - V1: `git diff HEAD -- src server` vazio.
- **Riscos/pendências:** figuras provisórias por nome (Fase 2b para fotos reais); criação sem matriz, complementos (HYBRID) e busca por placa continuam só na V1; grupo "Do setor" depende de `sector_name` do colaborador bater com o nome do setor.
- **Próximo passo:** publicar Fases 0–2 em HML e validar com a gestora (medir tempo de criação vs. V1); depois Fase 3 (Alterar esteira).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 29. Fase 3 do SGP+ V2 — Alterar esteira (2026-10-17)

- **Status:** concluída no código (publicação depende do nginx/deploy manual da Fase 0).
- **Contexto verificado:** `PATCH /api/v1/conveyors/:id/structure` (`conveyors.create`, `patchConveyorStructureBodySchema`; `reason` obrigatório fora de EM_ELABORACAO, 3–500); semântica de árvore desejada (id = mantém/atualiza, sem id = insere, ausente = remove/inativa); responsáveis substituídos por atividade; fluxo de edição da V1 envia `sourceOrigin: manual` (lido, não alterado).
- **Arquivos criados:** `apps/sgp-v2/src/domain/alterarEsteira.ts`, `src/domain/alterarEsteira.test.ts`, `src/domain/format.ts`, `src/ui/wizard.tsx`, `src/screens/alterar/AlterarEsteira.tsx`.
- **Arquivos alterados (só V2):** `src/App.tsx` (rota `esteiras/:id/alterar`), `src/api/conveyors.ts` (`patchConveyorStructure` + invalida cache), `src/domain/conveyors.ts` (+`originRegister`, `matrixRootItemId`, campos completos dos responsáveis), `src/domain/conveyors.test.ts` (fixture), `src/screens/EsteiraDetalhe.tsx` (botão Alterar), `src/screens/nova/NovaEsteira.tsx` (passa a usar `ui/wizard.tsx` — telas iguais), `docs/v2/SGP_V2.md` (§4, §14).
- **Backend/migrations:** nenhum.
- **Decisões:** motivo como texto livre "Motivo: detalhe" (sem catálogo no backend por ora); reenvio dos responsáveis atuais trocando só o principal; etapas da matriz casadas por nome normalizado; etapa nova entra no fim sem id e com `sourceKey`; setores/etapas vazios saem e a ordem é renumerada.
- **Validação:**
  - `npm test` (V2) → 4 arquivos, **13/13** (4 novos: contrato PATCH com validador real e preservação de ids/responsáveis; cadeados; troca de responsável/etapa tirada/etapa incluída; motivo).
  - `npm run build` ok; `npx eslint apps/sgp-v2` sem problemas.
  - Headless com API simulada (matriz real): alteração de esteira em andamento → PATCH com motivo "Retrabalho: costura do encosto saiu torta", 8 etapas (Volante nova sem id), Bancos dianteiros com 13 atividades com id, Pré-montagem para João, atividade em andamento manteve Marta; volta ao detalhe. Fluxo da Fase 2 reexecutado após refatoração → ok.
  - V1: `git diff HEAD -- src server` vazio.
- **Riscos/pendências:** lista real de motivos; `sourceKey` das atividades existentes se perde ao alterar (comportamento da V1).
- **Próximo passo:** Fase 4 (Planejar semana).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 30. Fase 4 do SGP+ V2 — Planejar semana (2026-10-17)

- **Status:** concluída no código (publicação depende do nginx/deploy manual da Fase 0).
- **Contexto verificado (V1, não alterada):** `server/src/modules/operational-planning/*` — rotas com `conveyors.create`; `saveOperationalWeekPlanBodySchema` (itens com `assignedCollaboratorId` obrigatório, `plannedDate` dentro da semana seg–sex, `plannedOrder ≥ 0`); POST substitui os itens do rascunho (concluídas preservadas); publish exige ≥ 1 item; backlog exclui esteiras FINALIZADA/CANCELADA/EM_ELABORACAO/AGUARDANDO_PLANEJAMENTO, atividades concluídas, já em plano semanal ou em plano da esteira ativo, `limit ≤ 100`. Tela da V1 `src/features/operational-planning/OperationalPlanningPage.tsx` usa o mesmo fluxo (POST semana inteira + publish).
- **Arquivos criados:** `apps/sgp-v2/src/domain/planejarSemana.ts`, `src/domain/planejarSemana.test.ts`, `src/api/planning.ts`, `src/screens/semana/PlanejarSemana.tsx`.
- **Arquivos alterados (só V2):** `src/App.tsx` (rota `semana`), `docs/v2/SGP_V2.md` (§4, §15).
- **Backend/migrations:** nenhum.
- **Decisões:** planejamento por esteira (dia de início) em vez de atividade a atividade; encaixe pela capacidade por colaborador/dia da V1 (padrão 480 min se ausente), sem dividir atividade entre dias (a V1 não divide); "Sugerir semana" é cálculo puro no front; responsável = 1º colaborador da atividade no backlog (a V1 grava 1 colaborador principal por atividade); itens tirados que já começaram ficam; dias passados da semana atual não recebem atividade; semana passada só leitura; sábado/domingo abrem a próxima semana.
- **Validação:**
  - `npm test` (V2) → 5 arquivos, **17/17** (4 novos).
  - `npm run build` ok; `npx eslint apps/sgp-v2` sem problemas.
  - Headless com API simulada (relógio fixo em 17/10/2026): 3 esteiras (uma publicada na semana, uma de 25 e outra de 138 atividades da planilha real) → escolher início, tirar da semana, sugerir, abrir dia, publicar. POST com 167 itens (138 da esteira grande, prova do contorno do limite de 100; 26 chamadas de backlog), atividade em andamento mantida, publish chamado com o id do plano.
  - V1: `git diff HEAD -- src server` vazio.
- **Riscos/pendências:** muitas esteiras = muitas chamadas de backlog (4 em paralelo); esteiras EM_ANDAMENTO com plano da esteira ativo seguem o fluxo de "aguardando encaixe" da V1 (entram via factory-intake); conflito 409 da V1 (atividade em outro plano) aparece como mensagem de erro.
- **Próximo passo:** Fase 5 (Tablet do colaborador).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 31. Fase 5 do SGP+ V2 — Tablet do colaborador (2026-10-17)

- **Status:** concluída no código, exceto QR do ticket (pendente de decisão: o ticket da V1 não tem QR).
- **Contexto verificado (V1, não alterada):** `server/src/modules/production/*` — `requireKioskToken` só em `/production/collaborators` (`X-SGP-Kiosk-Token`, aberto se `PRODUCTION_KIOSK_TOKEN` não configurado); login por PIN 4–8 dígitos com `PIN_CHANGE_REQUIRED` (PIN 1234 proibido como definitivo); cookie próprio do Modo Produção com `path: /`; work-queue com `isNextRecommended`, `canTrackTime`, `canCompleteStep`, `requiresOutOfSequenceJustification`; `productionTimeEntryBodySchema`; serviço exige justificativa fora de sequência e quando realizado + novo > previsto; `markAsDone` conclui. V1 front usa `VITE_PRODUCTION_KIOSK_TOKEN` (build no VPS) — a V2 não tem acesso, por isso pede o token no aparelho.
- **Arquivos criados:** `apps/sgp-v2/src/domain/tablet.ts`, `src/domain/tablet.test.ts`, `src/api/production.ts`, `src/screens/tablet/Tablet.tsx`.
- **Arquivos alterados (só V2):** `src/App.tsx` (rota `/tablet/*`), `src/api/client.ts` (parâmetro `avisar401` — 401 de PIN errado não derruba a sessão da gestora), `src/screens/Eu.tsx` (atalho do modo tablet), `docs/v2/SGP_V2.md` (§4, §8, §16).
- **Backend/migrations:** nenhum. **Secrets:** nenhum alterado.
- **Decisões:** cronômetro local (localStorage por colaborador) que vira um único apontamento; pausas registradas na observação; justificativa fora de sequência pedida antes de começar e a de excesso ao registrar; "Ontem" envia `entryAt` = data (V1 usa meio-dia de SP); sair automático 15 s após registrar; token do tablet digitado uma vez por aparelho.
- **Validação:**
  - `npm test` (V2) → 6 arquivos, **20/20** (3 novos); também **sem** `server/node_modules` (condição do CI) → 20/20.
  - `npm run build` ok; `npx eslint apps/sgp-v2` sem problemas.
  - Headless (tablet 820×1180, relógio simulado): liberar tablet com token → grade (bloqueado apagado) → PIN errado ("PIN errado. Tente de novo.") → PIN 1234 → criar PIN → próxima tarefa → começar 30 min → pausar (almoço) 60 min → sair e voltar (cronômetro pausado mantido) → continuar 45 min → Terminei → POST `minutes: 75, markAsDone: true, note: "Pausas: Almoço / intervalo"` → Registrado → sair → lançar horas de ontem 2 h 15 em tarefa fora de sequência → Metade → justificativa "Outro motivo" + complemento → POST `minutes: 135, entryAt: 2026-10-18, justificationId, justificationComplement` → saiu sozinho para a grade.
  - V1: `git diff HEAD -- src server` vazio.
- **Riscos/pendências:** cronômetro some se o navegador do tablet limpar dados; QR do ticket; corrigir apontamento; "Outra atividade" (não planejada) continua na V1.
- **Próximo passo:** aplicar nginx + 1º deploy em HML (manual, aprovação humana) e demonstrar à gestora: Nova esteira → Alterar → Planejar semana → Tablet.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 32. Fase 6 do SGP+ V2 — acabamento para a demonstração (2026-10-17)

- **Pedido:** "Pode seguir com as próximas fases, assim eu valido de uma vez antes de apresentar para a gestora." As fases 0–5 já estavam prontas; a Fase 6 fecha lacunas que não dependem de mudar a V1 nem de decisão.
- **Status:** concluída no código; versão de demonstração publicada: https://claude.ai/artifact/RFAWgUFLAB541XT4839dhW (privada).
- **Contexto verificado (V1, não alterada):** `week-activity` (limite 200), `time-entry-candidates` + `unassigned-exception` (quiosque `KioskOutraAtividadeFlow.tsx`), `PATCH /conveyors/:id/status` (`conveyors.edit_status`; transições `EM_ELABORACAO→AGUARDANDO_PLANEJAMENTO→EM_PLANEJAMENTO→A_INICIAR`; esteira nova nasce `EM_ELABORACAO`; apontamento só em `A_INICIAR/EM_ANDAMENTO`).
- **Achado relevante:** sem "Liberar", uma esteira criada na V2 nunca chegaria ao Planejar semana nem ao tablet (a tela antiga dizia "já está esperando planejamento" — corrigido).
- **Arquivos criados:** `src/domain/pessoasHoje.ts` (+teste), `src/screens/PessoasHoje.tsx`, `src/ui/Liberar.tsx`, `src/demo/api.ts`, `src/demo/DemoBar.tsx`, `src/demo/matriz.json`.
- **Arquivos alterados (só V2):** `src/screens/Hoje.tsx`, `src/api/planning.ts`, `src/api/production.ts`, `src/api/conveyors.ts`, `src/domain/tablet.ts` (+teste), `src/domain/planejarSemana.ts` (+teste), `src/domain/conveyors.ts` (+teste), `src/domain/novaEsteira.ts` (figura usa `BASE_URL`), `src/screens/tablet/Tablet.tsx`, `src/screens/semana/PlanejarSemana.tsx`, `src/screens/EsteiraDetalhe.tsx`, `src/screens/nova/NovaEsteira.tsx`, `src/main.tsx` (modo demo), `index.html` (`%BASE_URL%`), `vite.config.ts`, `tsconfig.json` (`resolveJsonModule`), `package.json` (`build:demo`), `.gitignore`, `docs/v2/SGP_V2.md` (§4, §8, §17).
- **Backend/migrations/secrets:** nenhum.
- **Validação:**
  - `npm test` → 7 arquivos, **24/24** (4 novos: pessoas hoje; outra atividade com `productionUnassignedTimeEntryBodySchema`; ajuste manual + lotação; liberação com `canTransitionConveyorStatus`).
  - `npm run build` ok (sem nada da demo no `dist/`); `npm run build:demo` ok; `npx eslint apps/sgp-v2` sem problemas.
  - Headless: Planejar (ajustar Seg→Qui e passar para Vítor → POST com o item na quinta para Vítor); tablet (outra atividade → POST unassigned com `exceptionJustificationId`); Hoje (1 sem apontar com 2 tarefas/6 h, 3 sem tarefa, 1 já apontou); demonstração estática (Início, Hoje, Liberar, Planejar + sugerir + publicar, Nova esteira, tablet) sem erros de console.
  - V1: `git diff HEAD -- src server` vazio.
- **Pendências:** decidir liberação automática ao publicar; QR; corrigir apontamento; deploy HML (nginx + `deploy-v2.yml`, que precisa estar na branch padrão para rodar por `workflow_dispatch`).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 33. Levantamento "o que falta implementar" (2026-10-17)

- **Tipo:** análise, sem alteração de código.
- **Decisões do dono do produto:** QR do ticket; liberar esteira automaticamente ao publicar; lista real de motivos; fotos reais das etapas (Fase 2b: backend + migration); corrigir apontamento (V1 não tem); outras matrizes; token do tablet (digitado no aparelho ou secret no build).
- **Ações humanas:** nginx em HML; merge para a branch padrão (requisito do `workflow_dispatch` do `deploy-v2.yml`); deploy; validação em celular/tablet real.
- **Ainda só na V1:** finalizar/cancelar/devolver esteira; editar dados da esteira (prazo, cliente, placa); esteira sem matriz e complementos (HYBRID); busca por placa; prioridade; dispensar atividade; ações sobre atividade parada; exportar Excel; sincronizar com o plano da esteira; cadastros/administração; trocar PIN fora do 1º acesso.
- **Técnico:** 5 testes da V1 que já falhavam (datas) — atividade separada; cronômetro do tablet só no aparelho.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 34. Decisões do dono do produto + Fases 7, 8 e 2b (2026-10-17)

- **Decisões recebidas:** QR do ticket descontinuado; fluxo de status da esteira em aberto (dono vai pensar — mantido só o "Liberar" manual); motivo de alteração segue a base do SGP+; migration para imagens aprovada; corrigir apontamento só gestor (reflexão sobre o colaborador ajustar enquanto não concluída); faltavam os dados básicos da esteira iguais à V1 (incluir, alterar, consultar).
- **Interpretação registrada (confirmar):** "motivo tem uma base do SGP+" = regra da V1 (texto 3–500, obrigatório fora de `EM_ELABORACAO`, MSG-EST-001; mesmo motivo para dados e estrutura, manual §41.2). Não existe catálogo de motivos de alteração no banco (só justificativas de apontamento e motivos de dispensa). A V2 passou a não exigir motivo em elaboração e usa o texto da MSG-EST-001.
- **Fase 7 — dados básicos:** `src/domain/dadosEsteira.ts` (+teste com `postConveyorDadosSchema`/`patchConveyorDadosBodySchema`), `src/ui/FormDados.tsx`, Nova esteira (modelo/versão, nome, prioridade, observações), consulta no detalhe, alteração na Alterar esteira com `PATCH /conveyors/:id` só do que mudou. "Início/Fim previsto" ficaram fora: a V1 não grava.
- **Fase 8 — correção de apontamento:** endpoints da V1 já existentes e auditados (`time_entries.edit_any`/`delete_any`; PATCH com `expectedUpdatedAt` + motivo; DELETE com motivo). `src/domain/apontamentos.ts` (+teste com schemas reais), `src/api/timeEntries.ts`, `src/ui/Apontamentos.tsx`, botão "Horas" no detalhe.
- **Reflexão — colaborador corrigir o próprio apontamento:** a V1 já deixa o dono do lançamento remover pelo app logado (não pelo tablet). Proposta: no tablet, permitir ao colaborador corrigir/remover **só o próprio lançamento**, **do mesmo dia**, **enquanto a atividade não estiver concluída**, com motivo e auditoria igual à da gestora; depois disso, só a gestora. Exige endpoint novo no Modo Produção (equivalente V2 no servidor). **Aguardando decisão.**
- **Fase 2b — fotos das etapas (backend aprovado):** `server/migrations/0054_v2_etapa_imagens.sql` (tabela nova, aditiva), `server/src/modules/v2-etapa-imagens/*` (rotas GET lista/imagem, PUT/DELETE com `operation_matrix.manage`, tipo pelo conteúdo, 1 MB, 413), 1 linha em `server/src/app.ts`, teste `server/src/tests/v2-etapa-imagens.test.ts`. V2: `src/api/etapaImagens.ts`, `src/domain/fotosEtapas.ts` (+teste), `src/ui/useFiguras.ts`, `src/ui/redimensionar.ts`, tela `src/screens/FotosEtapas.tsx` (rota `/fotos`, card no Início).
- **Migrations:** `0054_v2_etapa_imagens.sql` criada. **Não aplicada** em ambiente compartilhado (o deploy da V1 não roda migrations; aplicar manualmente com aprovação humana). Aplicada só no Postgres 16 local do container de teste (duas vezes: idempotente).
- **Validação:**
  - V2: `npm test` → 10 arquivos, **28/28**; `npm run build` e `npm run build:demo` ok; `npx eslint apps/sgp-v2 server/src/modules/v2-etapa-imagens server/src/tests/v2-etapa-imagens.test.ts` sem problemas.
  - Servidor: `tsc --noEmit` ok; `src/tests/v2-etapa-imagens.test.ts` 2/2 contra Postgres local (migrations 0001–0054). Suíte completa sem banco: 3 falhas / 831 ok — **idênticas com e sem a mudança** (falhas preexistentes, não relacionadas).
  - Headless (demonstração): criar esteira com todos os dados → consulta → liberar → alterar prazo/prioridade com motivo → "O que muda" correto → consulta atualizada; Horas → corrigir +15 → remover com motivo; Fotos das etapas → foto de 95 KB reduzida a 6 KB → salva → aparece no cardápio. Sem erros de console.
  - V1 front: `git diff HEAD -- src` vazio. `server/`: só arquivos novos + 1 registro de rota em `app.ts`.
- **Demonstração atualizada:** https://claude.ai/artifact/RFAWgUFLAB541XT4839dhW (versão 2).
- **Pendências:** aplicar 0054 em HML/produção; decisão sobre correção pelo colaborador; fluxo de status; confirmar interpretação do motivo.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 35. Visual refinado com o design system do SGP+ (2026-10-17)

- **Pedido:** "Faça uma melhoria no visual do app, deixe ele mais refinado. Use o designer system do SGP+."
- **Fonte:** design system da V1 (`src/styles/semantic-tokens.css`, `theme.css`, `index.css` — tema light-executive e identidade ARGOS; fontes Montserrat/Open Sans; logo `src/assets/bravo-logo.png`). Nada da V1 foi alterado.
- **Feito (só V2):** tokens novos em `apps/sgp-v2/src/styles.css`; fontes em `index.html`; `public/brand/bravo-logo.png`; `src/ui/Marca.tsx`; Shell (cabeçalho da marca, menu com indicador), Login (faixa da marca + cartão), Início (saudação, destaque, atalhos com ícone), WizardHeader/BottomBar, Tablet (cabeçalho da marca); troca global de bordas pretas por bordas do SGP+, seleção em azul, cantos `rounded-2xl`, cartões com sombra do SGP+. Detalhes em `docs/v2/SGP_V2.md` §21.
- **Validação:** `npm test` 28/28; `npm run build` e `build:demo` ok; eslint sem problemas; capturas headless de Login, Início, Hoje, Esteiras, Detalhe, Nova (etapas e personalizar), Semana e Tablet (grade e próxima tarefa) revisadas. Demonstração republicada (versão 3).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 36. Correção pelo colaborador + "Sugerir semana" (2026-10-17)

- **Pedido:** "Implementa a correção pelo colaborador como você propôs, e sumiu a sugestão de planejamento."
- **Sugerir semana:** o botão só aparecia com 2+ esteiras esperando; na demonstração só uma estava liberada (a Polo nasce em elaboração). Agora aparece com 1 ou mais (`PlanejarSemana.tsx`).
- **Correção pelo colaborador (regra proposta e aprovada):** só o próprio lançamento, lançado hoje (dia de São Paulo), atividade não concluída/dispensada, com motivo; senão só a gestora.
- **Servidor (aditivo):** `server/migrations/0055_v2_correcoes_apontamento.sql` (tabela nova de registro), `server/src/modules/v2-producao-correcao/{logic,routes}.ts`, registro em `server/src/app.ts`, teste `server/src/tests/v2-producao-correcao.test.ts`. Reaproveita funções do repositório da V1 sem alterá-las. Auditoria própria porque `admin_audit_events` exige usuário do sistema e lista fixa de eventos no código da V1.
- **V2:** `src/api/production.ts` (meusLancamentos/corrigirMeu/removerMeu), `src/domain/tablet.ts` (tipo), `src/domain/apontamentos.ts` (corpo reaproveitado), `src/screens/tablet/Tablet.tsx` (tela "Meus lançamentos de hoje", link "Tempo errado? Corrigir"), `src/demo/api.ts`.
- **Migrations:** `0055` criada, **não aplicada** em ambiente compartilhado; aplicada no Postgres local de teste (2x, idempotente).
- **Validação:** servidor `v2-producao-correcao.test.ts` 2/2 e `v2-etapa-imagens.test.ts` 2/2 contra Postgres local; `tsc` ok; V2 `npm test` 28/28; build e build:demo ok; eslint ok; headless no tablet (lançar 1 h → Tempo errado? → corrigir para 45 min com motivo → remover → "Nada lançado hoje") e Semana com "Sugerir semana" visível; sem erros. Demonstração republicada (versão 4). Front da V1 (`src/`) sem alteração.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 37. Correção: cronômetro "parado" após COMEÇAR (2026-10-17)

- **Relato:** "O cronômetro não está rodando após o start." Instrução: não alterar outras funções.
- **Causa:** o tempo era contado (atualização a cada 1 s), mas o relógio mostrava só horas:minutos; no primeiro minuto ficava em "0:00" e parecia travado.
- **Correção (mínima):** só a exibição na tela do cronômetro (`apps/sgp-v2/src/screens/tablet/Tablet.tsx`, componente `Rodando`) passou a mostrar os segundos ("0:00:02"). Nenhuma regra, função ou outra tela alterada (`git diff`: 1 arquivo, 2 linhas + 1).
- **Validação:** build e build:demo ok; eslint ok; headless com relógio real: COMEÇAR → "0:00:00" → 3 s depois "0:00:02". Demonstração republicada (versão 5).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 38. Conferência do documento vivo no GitHub (2026-10-17)

- **Pedido:** confirmar se o documento vivo está atualizado no GitHub antes da apresentação à gestora.
- **Conferência:** `origin/ccr-683413c7-571rnk` = HEAD local (`409a3dc3`), sem diferença em `docs/v2/SGP_V2.md`. Revisão de conteúdo achou trechos antigos: cabeçalho ("Fases 0, 1 e 2"), Fase 5 com "QR pendente", §16 listando como fora itens já feitos, falta da correção do cronômetro e do roteiro de publicação.
- **Ajuste (só documentação):** cabeçalho com estado atual e link da demonstração; QR como descontinuado; §16 atualizado; §9 com as ações humanas pendentes em ordem (migrations 0054/0055 → nginx HML → `deploy-v2.yml` na branch padrão → validação → produção).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 39. Preparação para subir a demonstração na VPS (2026-10-17)

- **Pedido:** "Eu vou subir para a VPS essa demo."
- **Feito:** `deploy/nginx/sgp-v2-demo.location.example` (bloco aditivo `/V2-demo/` com `alias /var/www/sgp-v2-demo/`, noindex, cache dos assets) com o passo a passo; documento vivo §23 e cabeçalho atualizados.
- **Validação:** `npm run build:demo` ok; nginx local com o bloco: `nginx -t` ok; `/` (V1 simulada) 200, `/V2-demo` 301, `/V2-demo/` 200 html, asset JS 200, logo 200, inexistente 404.
- **Não feito por mim:** subir para a VPS (ação do dono do produto; sem acesso daqui).
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 40. README_DEMO (2026-10-17)

- **Pedido:** "Gere um readme_demo na branch."
- **Feito:** `README_DEMO.md` na raiz: o que a demo tem (dados da planilha, esteiras prontas, PIN), roteiro de apresentação em 8 passos, rodar local (`npx vite --mode demo` e `build:demo` + servidor estático), publicar na VPS (`/V2-demo/`), cuidados, diferenças para a V2 real e onde está o código. Link no documento vivo §23.
- **Validação:** `npx vite --mode demo` e o pacote `dist-demo` abertos no navegador com a faixa "DEMONSTRAÇÃO" e a esteira DEF-4G56.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## 41. Análise: "tirar foto não está habilitado" + guardar local e subir depois (2026-10-17)

- **Tipo:** análise, sem alteração de código.
- **Por que a câmera não abre:** a tela usa um único `<input type="file" accept="image/*">` sem `capture`. Em navegador de celular (VPS) isso normalmente oferece câmera ou galeria; dentro da página do Claude (visualizador da demonstração) o acesso à câmera é bloqueado pelo próprio visualizador e só sobra escolher arquivo.
- **Proposta "Laboratório":** dois botões ("Tirar foto" com `capture="environment"` e "Escolher da galeria"); foto reduzida no aparelho e **guardada localmente (IndexedDB)** como pendente por etapa; o cardápio deste aparelho já mostra a pendente com selo "Só neste aparelho"; botão **Enviar para o banco** quando confirmada (usa o `PUT` existente, migration 0054) e a pendente é apagada; "Descartar" remove local.
- **Dificuldade:** baixa (≈ 1 tela + 1 módulo de armazenamento local; backend já existe). Ressalvas: fica só naquele navegador/aparelho; some se limparem os dados do navegador; Safari/iPhone pode apagar dados de site sem uso por ~7 dias; não sincroniza entre aparelhos.
- **Aguardando decisão** para implementar.
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.
