# SGP — Decisões Práticas de UX e Produto

**Régua prática diária** · Complemento ao princípio operacional mandatório · Multivacia / ARGOS

---

## Objetivo deste guia

Este documento existe para **traduzir o mandato do SGP em decisões concretas** de interface, fluxo, hierarquia visual e priorização. Enquanto o documento fundador fixa o *porquê* e o *o que não negociar*, este guia responde ao *como decidir* na prática — na hora de desenhar tela, cortar etapa, escolher label ou validar mock.

Consulte-o sempre que houver dúvida sobre:

- **Tela** — o que entra, o que sai, o que pode esperar.  
- **Fluxo** — quantos passos, em que ordem, com que continuidade.  
- **Campo** — se merece existir agora ou nunca.  
- **Etapa** — se protege, esclarece ou só burocratiza.  
- **Clique** — se é necessário ou vício de desenho.  
- **Confirmação** — se evita erro real ou só atrasa todo mundo.  
- **Estado** — vazio, erro, sucesso: como falar sem drama.  
- **Prioridade visual** — o que grita, o que apoia, o que some.  
- **Complexidade** — o que é essencial versus ansiedade de controle.

**Público:** designer, frontend, PO, quem revisa fluxo ou aprova escopo. **Uso:** régua na revisão de tela e na fila de prioridades — não decoração de wiki.

---

## Regra-mãe do SGP

> **Se o colaborador não aponta com facilidade e o gestor não cria ou encaminha esteira com rapidez, o sistema está errado — independentemente de acabamento visual.**

Use como **teste de sanidade** em qualquer tela nova: *esta decisão torna apontar ou abrir esteira mais fácil ou mais difícil?* Se piora um dos dois sem ganho operacional claro, volte atrás.

---

## Regras práticas para telas do colaborador

### Minhas Atividades

**Função:** ser o lugar onde o colaborador responde, em segundos, à pergunta *o que eu faço agora?*

- **Importância visível:** o que é mais urgente ou mais bloqueante deve aparecer primeiro na hierarquia — não escondido atrás de filtro ou aba.  
- **Pouca interpretação:** título da tarefa, prazo quando existir, vínculo com esteira/cliente em linguagem operacional — evitar códigos internos como protagonista.  
- **Legibilidade acima de densidade:** lista escaneável, espaço de respiro, tipografia que suporta uso repetido ao longo do dia.  
- **Contexto suficiente, sem relatório:** o mínimo para executar e apontar com segurança — não mini dashboard analítico dentro da lista.

**Na prática:** se alguém precisa abrir vários lugares para entender a tarefa, a tela falhou no recorte de informação.

---

### Apontamento de Tarefa

**Função:** registrar progresso ou conclusão com o **menor custo cognitivo** possível.

- **Exigir o mínimo:** só campos que mudam a operação de verdade (tempo, status, observação quando for o caso).  
- **Rapidez como regra:** fluxo curto, sem “wizard” para o trivial.  
- **Não parecer punição:** copy neutra ou positiva; evitar tom de defesa de tese ou fiscalização.  
- **Evitar múltiplas camadas de confirmação:** um passo de confirmação só quando o erro seria grave ou irreversível — não para “sim, tenho certeza” em todo clique.  
- **Fluxo contínuo:** onde fizer sentido, apontar inline ou em painel lateral que não quebra o contexto da lista.

**Na prática:** apontamento que parece “processo” em vez de “toque final” está errado de tom e de estrutura.

---

### Jornada do Colaborador

**Função:** dar **resumo útil** do dia ou do período — clareza pessoal, não painel de BI.

- **Resumo, não laboratório:** o que fiz, o que falta, o que está atrasado — em linguagem humana.  
- **Não virar painel analítico pesado:** evitar competir com dashboard do gestor; aqui é espelho do indivíduo, não da fábrica inteira.  
- **Clara e pessoal:** sensação de controle do próprio trabalho, não de ranking exposto sem critério.

**Na prática:** se a jornada cansa antes de informar, reduza camada — não adicione gráfico.

---

## Regras práticas para telas do gestor

### Backlog Operacional

**Função:** organizar o que ainda não está na rua da forma certa — **fila de decisão e encaminhamento**, não depósito de almas.

- **Organizar:** agrupamentos ou filtros que espelham como o gestor pensa (prioridade, tipo, responsável) — sem exigir que ele aprenda o modelo mental do sistema.  
- **Priorizar:** destaque do que está parado demais ou sem dono claro.  
- **Ação rápida:** atribuir, priorizar, mandar para esteira ou para execução com poucos passos a partir do item.  
- **Não parecer purgatório:** linguagem e densidade que lembrem *mesa de trabalho*, não *fila de reprovação fiscal*.

**Na prática:** backlog onde “só dá para olhar” sem agir rapidamente está incompleto como ferramenta.

---

### Nova Esteira Manual

**Função:** colocar trabalho novo no sistema **sem ritual de cadastro**.

- **Curta:** poucos blocos; uma tela pode bastar para o caso simples.  
- **Só o essencial:** nome, contexto mínimo, próximo passo ou destino — o resto é opcional ou posterior.  
- **Enriquecimento depois:** permitir voltar e acrescentar sem bloquear o “já está criado”.  
- **Evitar sensação de cadastro burocrático:** labels operacionais (“O que é este trabalho?”, “Quem precisa ver isso primeiro?”) em vez de formulário de ERP.

**Na prática:** se criar esteira parece “abrir chamado”, o tom está errado.

---

### Entrada por Documento

**Função:** usar documento como **atalho de contexto**, não como buraco de upload.

- **Comunicar assistência:** deixar claro que o sistema **ajuda a sugerir** campos ou destino — não que “adivinha tudo”. Expectativa honesta reduz frustração.  
- **Sugestões visíveis:** o que foi inferido deve ser legível e editável antes de confirmar.  
- **Revisão simples:** uma passagem clara de “conferir e ajustar” — não labirinto de etapas.  
- **Evitar upload genérico:** ícone de arquivo sem próximo passo óbvio é anti-padrão; sempre mostrar *para onde* o conteúdo vai na operação.

**Na prática:** documento é meio, não fim — o fim é esteira ou backlog acionável.

---

### Dashboard do Gestor

**Função:** **leitura rápida** da situação — consolidar sem substituir as telas onde se trabalha.

- **Consolidar sem poluir:** poucos blocos com função clara; evitar parede de números sem hierarquia.  
- **Poucos KPIs com peso real:** 3–5 indicadores que mudam decisão — não 20 competindo por atenção.  
- **Leitura em segundos:** gestor entra para situar e sair — ou ir direto para ação.  
- **Não competir com a operação:** dashboard não deve ser o lugar onde se passa a maior parte do dia; operação vive em backlog, esteiras e tarefas.

**Na prática:** se o gestor só “vê” bonito mas precisa ir a outro sistema para fazer, o dashboard está mal dimensionado.

---

## Regra dos cliques e da fricção

### Princípios

- **Quanto menos cliques melhor** — desde que cada clique tenha propósito claro. Economia burra (tudo na mesma página confusa) não conta como vitória.  
- **Uma tela só deve existir** se reduz confusão, reduz erro ou reduz esforço em relação à alternativa. Tela por hábito de wireframe é dívida.  
- **Confirmação** só quando o erro custa de verdade — exclusão, envio irreversível, impacto em outras pessoas.  
- **Campo** só se ajuda a executar, priorizar ou auditar de forma usada — não “por se ter o dado”.  
- **Não pedir agora o que pode ser preenchido depois** — ver também a seção “Mínimo obrigatório”.

### Profundidade de fluxo

- Preferir **fluxo raso**: menos níveis de navegação para a tarefa principal.  
- **Profundidade** só se cada nível elimina dúvida ou reduz erro — não se cada nível é “mais um passo do processo interno”.

### Fricção evitável

- Reaproveitar contexto (esteira já escolhida, tarefa já aberta).  
- Evitar pedir o mesmo dado duas vezes na mesma jornada.  
- Evitar “voltar três telas” para corrigir um detalhe que podia ser inline.

---

## Regra do mínimo obrigatório

O SGP deve **sempre preferir**:

| Preferência | Significado na prática |
|---------------|-------------------------|
| **Mínimo essencial agora** | Só o que desbloqueia execução ou encaminhamento real. |
| **Enriquecimento depois** | Detalhes opcionais em segundo momento, sem bloquear o fluxo feliz. |
| **Defaults inteligentes** | Pré-selecionar o óbvio a partir do contexto (equipe, tipo de trabalho, última ação). |
| **Pré-preenchimento** | Quando o sistema “sabe”, não force o usuário a redigitar. |
| **Continuidade de fluxo** | Manter o fio entre criar → enfileirar → executar → apontar sem resetar contexto. |

**Capturar primeiro o suficiente para a operação acontecer**; só depois **refinar** se o negócio exigir — e mesmo assim sem transformar refinamento em obrigação para o trivial.

---

## Como decidir se um campo deve existir

Use como filtro — resposta honesta:

1. **Este campo ajuda a executar melhor?** (não “ajuda o relatório futuro” como desculpa única.)  
2. **Ajuda a priorizar** na fila real do gestor ou do colaborador?  
3. **Ajuda a apontar** com precisão sem virar interrogatório?  
4. **É usado de verdade** — alguém toma decisão com isso semanalmente, ou só “poderia ser legal”?  
5. **Pode ser inferido ou preenchido depois?** Se sim, não bloqueie o fluxo inicial.  
6. **Existe por necessidade real ou por ansiedade de controle?** Ansiedade vira campo morto e tela cheia.

**Regra de ouro:** campo que ninguém sente falta na operação cotidiana não merece lugar na primeira linha — e muitas vezes não merece existir.

---

## Como decidir se uma etapa deve existir

1. **Esta etapa reduz erro real ou só adiciona atrito?** Atrito sem redução de erro é candidato a corte.  
2. **Ajuda a clarear ou só burocratiza?** Se repetir o que já está explícito na ação, é ruído.  
3. **Protege algo importante ou só repete informação?** Repetição não é segurança.  
4. **Poderia ser uma ação inline?** (botão na linha, edição no próprio card, drawer leve.)  
5. **Poderia ser um estado simples em vez de tela separada?** (pendente / enviado / erro) sem novo “passo” de navegação.

**Etapas boas** esclarecem decisão ou evitam dano. **Etapas ruins** existem porque o fluxo foi desenhado para o sistema, não para a pessoa.

---

## Estados obrigatórios de interface

Toda tela relevante deve **considerar** estados — com bom senso: nem toda superfície precisa de seis variações completas se o contexto for secundário.

| Estado | Espírito no SGP |
|--------|------------------|
| **Vazio** | Explicar *por que* está vazio e **o que fazer** (ex.: criar esteira, ajustar filtro) — sem culpar o usuário. |
| **Carregando / mockado** | Feedback breve; em mock, deixar explícito que é protótipo se isso evitar confusão em validação. |
| **Sucesso** | Confirmação clara e calma; sem fanfarra em todo micro-sucesso. |
| **Erro** | Dizer o que falhou em linguagem humana; próximo passo ou retry quando couber — sem stack trace na cara. |
| **Sem resultados** | Diferente de vazio: filtros não bateram — sugerir relaxar critério ou limpar busca. |
| **Ação concluída** | Estado estável que mostra “feito” sem obrigar nova navegação desnecessária. |
| **Ação pendente** | Deixar visível o que ainda depende de alguém ou de algo externo — sem drama, com linguagem operacional. |

**Princípios:** clareza, leveza, **sem teatro** de alerta; **sem jargão técnico** para usuário de operação. Mensagens curtas e úteis vencem parágrafos de “ocorreu uma exceção”.

---

## Linguagem do produto

**O SGP deve soar:**

- **Clara** — frases curtas; sujeito e verbo visíveis.  
- **Objetiva** — verbo de ação nos botões (“Encaminhar”, “Registrar”, “Criar esteira”).  
- **Operacional** — vocabulário do chão de fábrica, não só de sala de reunião.  
- **Humana** — respeito pelo tempo do usuário; sem ironia ou infantilização.

**Evitar:**

- Frases longas e condicionais em labels.  
- Mensagens vagas (“Algo deu errado” sem próximo passo).  
- Labels que exigem glossário (“Entidade”, “Workflow” se “Esteira” resolve).  
- Nomes rebuscados para ações simples.

**Exemplos de boa direção:**

- Botão: **“Apontar conclusão”** em vez de **“Submeter registro de encerramento”**.  
- Vazio: **“Nenhuma tarefa neste filtro. Tente outro período ou limpe os filtros.”**  
- Erro: **“Não foi possível salvar. Verifique a conexão e tente de novo.”**

---

## Relação entre premium visual e clareza operacional

**Premium** no SGP é **acabamento**: hierarquia tipográfica consistente, espaçamento confiável, cor com função, componentes coerentes com o ecossistema Multivacia.

**Premium não é:**

- **Escuro demais** a ponto de cansar leitura operacional repetida ou esconder contraste importante.  
- **Sofisticado demais** a ponto de esconder função — ícone obscuro, affordance fraca.  
- **Bonito demais** a ponto de atrapalhar — decoração que compete com conteúdo, animação que atrasa feedback.

**Regra:** *premium serve à clareza* — leitura rápida, ação óbvia, sensação de cuidado sem peso. Se o visual exige esforço para “entender a interface”, está errado para o mandato do SGP.

---

## Regras para cards, tabelas, listas e KPIs

### Cards

- **Função primeiro:** título e status escaneáveis antes de qualquer adorno.  
- **Clicável deve parecer clicável** — área de hit generosa; hover/discreto que reforça (ver microinterações).  
- Evitar card que é só moldura bonita em volta de informação confusa.

### Listas operacionais

- **Muito legíveis:** linha alta o suficiente, alinhamento consistente, uma informação primária por linha (o resto é secundário visual).  
- **Escaneabilidade** > densidade máxima — operação não é planilha compacta o dia inteiro.

### Tabelas premium

- Colunas com propósito; **não** uma coluna por “campo do sistema”.  
- Cabeçalho estável; ações na linha sem poluir.  
- Em desktop, pensar leitura em **Z** ou **F** natural — não labirinto de bordas.

### KPIs e destaques

- **Nem todo KPI merece o mesmo peso visual** — um ou dois podem ser heróis; o resto apoia.  
- **Status escaneável** — cor e texto; evitar semáforo agressivo em cada célula.  
- **Hierarquia de informação:** o que muda decisão primeiro ganha topo e contraste; o resto recua.

---

## Microinterações do SGP

Alinhadas à lógica da home Multivacia:

- **Hover discreto** — reforço sutil de affordance, não festival.  
- **Evidência sutil** — foco, seleção, estados ativos claros sem gritar.  
- **Resposta visual sem espetáculo** — o sistema responde rápido; animação acompanha, não rouba o protagonismo.  
- **Transições suaves** — continuidade entre estados, sem atrasar ação crítica.  
- **Reforço de interatividade sem poluição** — ripple ou highlight leve; não partícula em todo clique.

**Onde não exagerar:** fluxos longos repetidos centenas de vezes no dia — microinteração que soma tempo ou distrai é falha. **Onde valorizar:** confirmação de estado, hover em listas densas, feedback de sucesso/erro imediato.

---

## O que revisar antes de aprovar qualquer nova tela

Checklist utilizável em revisão de design ou PR de UI:

- [ ] **Esta tela reduz ou aumenta atrito** para colaborador ou gestor na tarefa principal?  
- [ ] **Fica clara em ~5 segundos** o que é e qual é a ação principal?  
- [ ] **Existe campo desnecessário** que pode ser default, depois ou inferido?  
- [ ] **Existe etapa desnecessária** que poderia ser inline ou estado?  
- [ ] **A ação principal está óbvia** (posição, contraste, label)?  
- [ ] **A prioridade visual está correta** — o mais importante domina sem disputa com decoração?  
- [ ] **A tela serve a operação** ou o desejo de controle/cadastro?  
- [ ] **O colaborador ou gestor vai usar de boa** ou vai tolerar / contornar?

Se vários itens falham, **não aprove** — simplifique antes de polir.

---

## Anti-padrões do SGP

Estes padrões aparecem com frequência quando o time resolve ansiedade de controle antes de resolver operação — ou quando o visual lidera o raciocínio. Não são “preferências”: são sinais de que a tela ou o fluxo provavelmente **aumenta tolerância** em vez de **adesão**. Em revisão, não discuta só estética: se o anti-padrão está presente, exija ajuste de estrutura ou de copy, não só de cor.

| Anti-padrão | Por que fere o mandato |
|-------------|-------------------------|
| **Formulário grande logo de cara** | Assusta e adia a operação; quebra a regra do mínimo obrigatório. |
| **Clique em excesso** | Cada um é voto de desconfiança no sistema. |
| **Confirmação para tudo** | Trata usuário como incompetente e rouba tempo real. |
| **Dashboard lotado** | Gestor não consegue situar; vira ruído. |
| **Tabela difícil de escanear** | Operação vive em lista/tabela — legibilidade é P0. |
| **Card bonito mas pouco útil** | Premium sem substância é cosmético inútil. |
| **Upload genérico sem contexto** | Documento vira arquivo morto, não entrada operacional. |
| **Tela “premiumizada” que piora leitura** | Contraste baixo, tipo pequeno demais, ícones ambíguos. |
| **Sistema que exige disciplina artificial** | Lembrete humano não é substituto para fluxo bem desenhado. |
| **Wizard para o trivial** | Transforma 30 segundos de trabalho em 3 minutos de “passos”. |
| **Mesmo dado pedido duas vezes** | Sinal de fluxo quebrado ou silos de tela. |

Use esta lista em code review de UX: **nomear o anti-padrão** acelera o “não vai”.

---

## Como este documento deve ser usado

- **Design** — partir daqui para hierarquia, estados e copy; não só do moodboard.  
- **Frontend** — implementar affordance, estados e fluxo raso como requisito, não opcional.  
- **Validação de fluxo** — testar com as perguntas de campo, etapa e checklist de aprovação.  
- **Priorização** — o que aumenta fricção sem ganho operacional desce na fila ou sai.  
- **Revisão de escopo** — feature que empurra burocracia precisa redesign ou corte.  
- **Evolução mockada** — mock deve provar cliques e campos *antes* de base física; este guia apoia o que validar no protótipo.

**Em caso de dúvida**, o time deve preferir: **simplicidade**, **clareza**, **menos fricção**, **mais adesão natural** — não “mais opções” nem “mais campos por segurança imaginária”.

---

## Fechamento — mantra operacional

> **O melhor fluxo do SGP é o que a operação usa sem sentir o sistema pesar.**

Se pesar, cortar até voltar a leveza — depois sim refinar o premium em cima do essencial.

---

*Régua prática de UX e produto do SGP — uso contínuo em revisões de tela e decisões de fluxo. Complementa o documento fundador do princípio operacional mandatório.*
