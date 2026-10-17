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
