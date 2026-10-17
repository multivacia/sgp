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
