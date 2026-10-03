# Manual do Usuário — SGP+

**Produto:** SGP+ · Multivacia / ARGOS
**Versão da aplicação nesta revisão:** 1.9.8
**Revisão deste manual:** 2026-10-03
**Situação:** base editorial criada; capítulos 1 a 3, 5, 7, 20 e 21 com conteúdo final. Os capítulos 4, 6 e 8 a 19 seguem marcados como pendentes e **não devem ser publicados** como versão final.

> **Este é o documento canônico do manual do usuário.** Versões em HTML ou PDF devem ser geradas a partir daqui.
>
> A matriz técnica `MANUAL_FUNCIONAL_SGP.md`, na mesma pasta, é a fonte funcional auditável contra o código. Ela existe para rastreabilidade e **não** é material de leitura para o usuário final.

---

# 1. Sobre o SGP+

O SGP+ é o sistema de gestão de produção usado na operação de tapeçaria automotiva. Ele acompanha um trabalho do momento em que a estrutura é montada até o encerramento, registrando quem executou, quanto tempo levou e quanto foi produzido.

O trabalho é organizado assim:

- uma **esteira** representa um trabalho completo a ser entregue;
- cada esteira se divide em **tarefas**;
- cada tarefa se divide em **setores**;
- cada setor contém as **atividades** — a unidade que o colaborador de fato executa e aponta.

Em cima dessa estrutura, o sistema oferece três coisas:

1. **planejamento** — distribuir as atividades da fábrica por colaborador e por dia;
2. **execução** — o colaborador vê o que fazer no dia e registra o tempo gasto;
3. **acompanhamento** — o gestor compara o previsto com o realizado e identifica atraso, sobrecarga e desvio.

O princípio de uso é **operação primeiro, visão depois**: as telas de execução são feitas para exigir o mínimo de digitação de quem está na fábrica.

---

# 2. Como usar este manual

## 2.1 Para quem é este manual

Para quem **usa** o SGP+: colaboradores que apontam produção, gestores que planejam e acompanham, e administradores que mantêm cadastros e acessos.

Não é documentação técnica. Você não precisa conhecer nada sobre a implementação do sistema para seguir as instruções daqui.

## 2.2 O que você vê depende da sua permissão

O SGP+ controla o acesso por **permissão**, não apenas por cargo. Duas pessoas com o mesmo cargo podem ver menus diferentes.

Por isso, ao longo do manual, cada recurso indica **para quem costuma estar disponível** — e não uma garantia de que estará visível na sua tela. Se um item descrito aqui não aparece para você, é quase sempre uma questão de permissão: fale com quem administra os acessos.

## 2.3 Como cada capítulo é organizado

Todo capítulo de recurso segue a mesma sequência. Esse é o padrão que os capítulos pendentes deverão adotar quando forem escritos:

| Bloco | O que traz |
|---|---|
| **Para que serve** | o problema que a tela resolve, em uma ou duas frases |
| **Onde fica** | o caminho exato no menu, com o rótulo que aparece na tela |
| **Quem costuma ter acesso** | o perfil típico, com a ressalva de que a permissão efetiva manda |
| **Como fazer** | passo a passo numerado, começando pelo clique de entrada |
| **O que esperar** | o que acontece depois de confirmar, incluindo efeito em outras telas |
| **Quando algo é bloqueado** | a mensagem que aparece, o motivo e o que fazer para destravar |

## 2.4 Convenções de texto

- **Negrito** indica algo que você vê e clica na tela: um item de menu, um botão, o nome de um campo.
- Texto entre aspas reproduz **literalmente** uma mensagem exibida pelo sistema, para você reconhecê-la na tela.
- Os termos do negócio estão definidos no **capítulo 20 — Glossário do usuário**. Em caso de dúvida sobre uma palavra, comece por lá.

## 2.5 O que este manual não faz

- Não ensina a corrigir problemas por URL, por parâmetro de endereço ou por qualquer caminho que a interface não ofereça.
- Não descreve telas que existem no sistema mas **não têm entrada no menu**. Recursos nessa condição estão listados no **capítulo 21**, para apoio e gestão, sem instrução de uso.
- Não substitui a decisão do gestor. Quando uma regra depende de autorização, o manual diz com quem falar, não como contornar.

## 2.6 Capítulos ainda pendentes

Capítulos marcados com

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

contêm apenas a lista de tópicos a cobrir. Eles **não** devem ser publicados nem usados como orientação operacional.

---

# 3. Acesso e navegação

## 3.1 Entrar no sistema

O acesso à área de gestão e à área do colaborador é feito com **e-mail e senha**.

1. Informe o e-mail e a senha.
2. Confirme.

O que pode acontecer:

- **"E-mail ou senha inválidos."** — revise os dados. O sistema não informa qual dos dois está errado.
- **"Não foi possível entrar agora. Tente novamente mais tarde."** — houve bloqueio temporário por tentativas repetidas. Aguarde e tente de novo.
- **"Sua conta está inativa. Contacte o administrador."** — o acesso foi desativado; só a administração reativa.
- **Troca de senha obrigatória** — em alguns casos o sistema pede uma nova senha antes de liberar o uso. A nova senha precisa ter **pelo menos 8 caracteres** e ser diferente da atual.

O **Modo Fábrica**, usado pelo colaborador para apontar produção no totem ou no navegador da fábrica, tem acesso próprio por colaborador e **PIN** — não por e-mail e senha. Veja o capítulo 13.

## 3.2 Como a tela é organizada

Três áreas fixas:

- o **menu lateral**, à esquerda, com os recursos agrupados por assunto;
- a **barra superior**, com ações que funcionam em qualquer tela;
- a **área de conteúdo**, no centro, onde a tela selecionada é exibida.

No celular e em telas estreitas, o menu lateral fica recolhido e é aberto pelo botão **Abrir menu**.

## 3.3 A barra superior

| Elemento | O que faz |
|---|---|
| **Apontar horas** | abre o registro rápido de apontamento sem sair da tela atual. Disponível em todas as telas. Veja o capítulo 7. |
| **Abrir chamado** | registra um chamado de suporte. Aparece **somente** quando o módulo de chamados está ativo no seu ambiente. Veja o capítulo 19. |
| **Menu do seu nome** | escolher o **Tema** da aplicação, ir para **Alterar senha** e **Sair**. |

Dois elementos da barra superior **ainda não estão em funcionamento**, embora apareçam na tela: o campo **Busca rápida…** e o item **Alertas**. Eles estão reservados para uma entrega futura. Clicar neles não produz efeito — não é falha do seu acesso e não precisa de chamado.

## 3.4 O menu lateral

O menu tem **cinco agrupamentos**, nesta ordem. Você verá apenas os itens que sua permissão libera; um agrupamento sem nenhum item liberado não aparece.

### Gestão

Acompanhamento e condução da produção.

| Item do menu | Para que serve | Quem costuma ver |
|---|---|---|
| **Painel operacional** | visão geral das esteiras por situação; é a tela inicial da área de gestão | todos os usuários autenticados |
| **Nova esteira** | criar uma esteira montando a estrutura ou partindo de uma matriz | quem pode criar esteiras |
| **Por documento** | criar uma esteira a partir de um documento PDF, com revisão antes de confirmar | quem pode criar esteiras |
| **Dashboard** | indicadores de produção | quem tem acesso a algum dos painéis de indicadores |
| **Planejamento** | distribuir as atividades da semana entre colaboradores e dias | quem pode criar esteiras |
| **Agenda da semana** | organizar a semana arrastando atividades para colaborador e dia. Aparece com o selo **Novo** | quem pode criar esteiras |
| **Evolução das Esteiras** | comparar previsto e realizado por atividade, com classificação de desvio | quem pode criar esteiras |
| **Equipes** | agrupar colaboradores para alocação conjunta | quem pode consultar equipes |

### Cadastros operacionais

O que alimenta a operação do dia a dia.

| Item do menu | Para que serve | Quem costuma ver |
|---|---|---|
| **Colaboradores** | cadastro operacional, setor, função e acesso ao Modo Fábrica | quem administra colaboradores |
| **Saúde operacional** | diagnóstico de carga e risco por colaborador | quem administra colaboradores |
| **Usuários** | contas de acesso ao sistema e vínculo com o colaborador | quem administra usuários |
| **Configurações operacionais** | setores, funções, capacidade e os catálogos usados nos apontamentos | quem administra configurações operacionais |

### Estrutura e administração

Parâmetros, modelos e rastreabilidade.

| Item do menu | Para que serve | Quem costuma ver |
|---|---|---|
| **Configurações do sistema** | parâmetros globais, como o tempo de inatividade da sessão | administração do sistema |
| **Matrizes de operação** | estruturas reutilizáveis que servem de base para novas esteiras | quem pode consultar matrizes |
| **Permissões por papel** | o que cada papel pode fazer | quem administra permissões |
| **Trilha administrativa** | histórico das alterações administrativas de usuários e permissões | quem pode consultar auditoria |
| **Jornada por colaborador** | análise da jornada de um ou mais colaboradores, com exportação | quem administra colaboradores |

### Colaborador

O dia a dia de quem executa.

| Item do menu | Para que serve | Quem costuma ver |
|---|---|---|
| **Minha fila** | o que você tem para fazer no dia, a partir do planejamento publicado | todos os usuários autenticados |
| **Chamados** | seus chamados de suporte. Aparece **somente** quando o módulo está ativo | todos, quando o módulo está ativo |
| **Minha jornada** | seu histórico de apontamentos e o resumo do período | todos os usuários autenticados |

### Conta

| Item do menu | Para que serve |
|---|---|
| **Alterar senha** | trocar a sua senha de acesso |

## 3.5 Encontrar uma tela a partir do que você quer fazer

| Você quer… | Vá em |
|---|---|
| ver como está a produção | **Painel operacional** |
| saber o que fazer hoje | **Minha fila** |
| registrar tempo trabalhado | **Apontar horas**, na barra superior |
| criar um trabalho novo | **Nova esteira** ou **Por documento** |
| organizar a semana da fábrica | **Planejamento** ou **Agenda da semana** |
| conferir seu histórico | **Minha jornada** |
| ver o histórico de outra pessoa | **Jornada por colaborador** |
| entender atraso ou estouro de tempo | **Evolução das Esteiras** |
| saber se alguém está sobrecarregado | **Saúde operacional** |
| liberar o acesso de um colaborador à fábrica | **Colaboradores** |
| criar ou bloquear uma conta de acesso | **Usuários** |

## 3.6 Sessão e inatividade

A sessão expira após um período sem uso. Antes de expirar, o sistema exibe um aviso com antecedência, para você continuar sem perder o que estava fazendo. Os dois tempos são definidos pela administração em **Configurações do sistema**.

Há também um tempo máximo total de sessão: ao atingi-lo, é necessário entrar novamente, mesmo em uso contínuo.

---

# 4. Perfis e permissões — visão para o usuário

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- diferença entre **conta de acesso** e **colaborador operacional**, e por que algumas ações exigem o vínculo entre os dois
- como ler "quem costuma ter acesso" neste manual: permissão efetiva, não cargo
- o que acontece quando falta permissão: item ausente do menu ou mensagem de bloqueio
- diferença entre **função operacional** do colaborador e **permissão** de acesso
- com quem falar para pedir liberação

---

# 5. Painel operacional

## Para que serve

O Painel operacional é a visão única de todas as esteiras da operação. Em uma tela você vê quantas estão em cada situação, quais passaram do prazo, quais já foram encerradas — e desce para a lista completa para encontrar uma esteira específica e abri-la.

É a tela de abertura de quem acompanha produção: serve para responder "como estamos agora" antes de entrar em qualquer detalhe.

## Onde fica

Menu lateral, agrupamento **Gestão** → **Painel operacional**.

É também a tela inicial da área de gestão: ao entrar no sistema você cai nela.

O título exibido na tela é **Painel Operacional de Esteiras**.

## Quem costuma ter acesso

Qualquer pessoa com acesso ao sistema. O painel em si não exige permissão especial.

O que depende de permissão são as ações que partem dele:

| Ação | Depende de |
|---|---|
| ver o painel e a lista | nada além do acesso ao sistema |
| **Nova Esteira Manual** e **Nova esteira por documento** (botões no topo) | permissão de criar esteiras |
| **Consultar** uma esteira | nada além do acesso ao sistema |
| **Editar** uma esteira | permissão de criar esteiras |
| **Excluir** uma esteira | permissão de criar esteiras, e a esteira precisa estar elegível |

Os dois botões do topo aparecem para todos. Se você não tiver a permissão, o botão abre uma tela com o aviso **"Sem permissão para esta área"** — veja o final do capítulo.

## Como fazer

### Ler os cartões

No alto da tela há **seis cartões**, cada um com uma contagem de esteiras:

| Cartão | O que conta |
|---|---|
| **Rascunho** | esteira ainda em montagem, não visível para a produção |
| **Aguard. planejamento** | cadastro concluído, esperando o gestor da fábrica aceitar |
| **Em planejamento** | gestor definindo equipe, responsáveis e sequência |
| **Em execução** | já liberada para produção e dentro do prazo |
| **Em atraso** | passou do prazo estimado e ainda não foi encerrada |
| **Finalizadas** | encerradas com conclusão |

Cada esteira entra em **um único cartão** — as contagens não se repetem entre cartões.

Não existe cartão para esteiras **canceladas**. Elas continuam no sistema e você as encontra pelo filtro de situação, mas não são contadas em nenhum cartão. Por isso, somar os seis cartões não dá necessariamente o total de esteiras.

### Filtrar pelos cartões

Clique em um cartão. Três coisas acontecem de uma vez:

1. o filtro **Situação** passa a valer para aquele recorte;
2. a tela desce até a lista;
3. o cartão clicado fica destacado, para você saber qual recorte está ativo.

Para voltar a ver tudo, mude o filtro **Situação** para **Todas**.

### Filtrar pela lista

Abaixo dos cartões há a faixa de filtros:

| Filtro | Como funciona |
|---|---|
| **Buscar** | procura por OS, nome da esteira, cliente e responsável. Não precisa apertar nada: a lista responde enquanto você digita. O texto do campo menciona apenas OS, nome e cliente, mas a busca também encontra pelo responsável. |
| **Situação** | os recortes do painel. Veja a tabela adiante. |
| **Prioridade** | Todas, Alta, Média ou Baixa |
| **Responsável** | lista apenas os responsáveis que de fato aparecem nas esteiras existentes. Esteira sem responsável não gera opção. |
| **Por página** | 25, 50 ou 100 linhas por página |

O botão **Mais filtros (em breve)** está desligado — é espaço reservado para uma entrega futura.

### Combinar filtros

Os filtros se somam: a lista mostra apenas as esteiras que atendem a **todos** ao mesmo tempo. Buscar "Silva" com situação **Em execução** e prioridade **Alta** devolve só o que satisfaz as três condições.

Sempre que você muda um filtro, a lista volta para a primeira página.

Quando há qualquer filtro ativo, aparecem etiquetas acima da lista mostrando o que está aplicado — **Situação: …**, **Busca: …**, **Prioridade: …**, **Responsável: …**. É a forma mais rápida de perceber que a lista está recortada.

### Abrir uma esteira

A lista traz as colunas **Esteira / OS**, **Responsável**, **Prioridade**, **Situação**, **Entrada** e **Ações**. A ordem é da esteira mais recente para a mais antiga.

Para abrir uma esteira, use o menu da coluna **Ações**, na linha dela:

| Opção | O que faz |
|---|---|
| **Consultar** | abre o detalhe da esteira |
| **Editar** | abre a esteira para alteração de estrutura e dados |
| **Excluir** | remove a esteira e sua estrutura, após confirmação |

Clicar na linha não abre nada — a entrada é sempre pelo menu de **Ações**.

**Editar** e **Excluir** só aparecem se você tiver permissão. **Excluir** aparece apenas quando a esteira ainda não entrou em produção: rascunho, aguardando planejamento, em planejamento ou a iniciar.

### Navegar pela lista

Acima da lista aparece o total do recorte atual: **"N registro(s) · página X de Y"**. Abaixo, **"A mostrar a–b de N"** e os botões **Anterior** e **Seguinte**.

## O que esperar

### Os cartões e a lista não respondem aos filtros do mesmo jeito

Esta é a diferença mais importante da tela, e a que mais gera dúvida:

- os **cartões** contam **todas** as esteiras, sempre. Nenhum filtro muda esses números;
- a **lista** respeita os filtros e a paginação.

Então é normal e esperado ver o cartão **Em execução** com 40 e a lista mostrando 3 linhas: você tem um filtro de busca, prioridade ou responsável ativo. A própria tela avisa: *"Os totais dos cards continuam a refletir todas as esteiras carregadas; só a tabela abaixo respeita os filtros."*

Para fazer cartão e lista falarem do mesmo conjunto, limpe busca, prioridade e responsável e deixe apenas a situação.

### Os recortes do painel não são iguais à situação da esteira

O filtro **Situação** oferece sete recortes, mais dois atalhos gerais:

| Opção do filtro | O que traz |
|---|---|
| **Todas** | nenhum recorte |
| **Ativas** | tudo que não foi encerrado — exclui finalizadas e canceladas |
| **Rascunho / Em elaboração** | esteiras ainda em montagem |
| **Aguardando planejamento** | prontas para entrar no planejamento |
| **Em planejamento** | planejamento em elaboração |
| **Em execução** | liberadas para produção e dentro do prazo |
| **Em atraso** | passaram do prazo e não foram encerradas |
| **Finalizadas** | encerradas com conclusão |
| **Canceladas** | encerradas por cancelamento |

**Atenção ao comparar com a coluna Situação da lista.** Os recortes do painel são agrupamentos; a coluna mostra a situação formal da esteira, que tem rótulos próprios:

| Recorte do painel | O que você lê na coluna Situação |
|---|---|
| Rascunho / Em elaboração | Rascunho / Em elaboração |
| Aguardando planejamento | Aguardando planejamento |
| Em planejamento | Em planejamento |
| **Em execução** | **A iniciar** ou **Em andamento** |
| **Em atraso** | qualquer situação ainda não encerrada |
| Finalizadas | Finalizada |
| Canceladas | Cancelada |

Duas consequências práticas:

1. filtrando por **Em execução**, nenhuma linha dirá "Em execução" — elas dirão **A iniciar** ou **Em andamento**. O painel junta as duas porque, para acompanhamento, ambas já estão liberadas para a fábrica;
2. filtrando por **Em atraso**, as linhas mostram a situação real de cada uma. "Em atraso" é uma leitura de prazo, não uma situação da esteira.

### Como o atraso é calculado

Uma esteira entra em **Em atraso** quando as três condições valem juntas:

1. não está finalizada nem cancelada;
2. tem **prazo estimado** registrado;
3. o prazo já passou.

A comparação é por **dia inteiro**, não por hora: no próprio dia do prazo a esteira ainda não é considerada atrasada. Ela passa a contar como atrasada a partir do dia seguinte.

**O atraso tem prioridade sobre a situação.** Se uma esteira ainda em rascunho já passou do prazo, ela sai do cartão **Rascunho** e vai para **Em atraso** — some de um e aparece no outro. O mesmo vale para aguardando planejamento, em planejamento e em execução.

As duas exceções são **Finalizada** e **Cancelada**: uma vez encerrada, a esteira nunca é contada como atrasada, mesmo que tenha estourado o prazo antes de encerrar.

Esteira **sem prazo estimado** nunca é contada como atrasada. Não é um erro de cálculo: sem prazo registrado, não há com o que comparar.

> **Limitação atual — leia antes de confiar no cartão Em atraso.**
> O painel só consegue calcular atraso quando o prazo estimado da esteira foi registrado como uma **data**. No cadastro de **Nova esteira**, porém, o campo **Prazo estimado** pede um **número de dias**. Prazos informados dessa forma não são reconhecidos como data, e a esteira não é contada como atrasada — o cartão pode ficar em zero mesmo havendo esteiras atrasadas na prática. Em alguns casos o efeito é o oposto: a esteira passa a aparecer como atrasada desde a criação.
> Enquanto isso não for corrigido, **não use o cartão Em atraso como fonte única** para decidir prioridade. Confira o prazo na esteira. O registro desta pendência está no capítulo 21.

### O atalho Ativas

**Ativas** não é uma situação: é o recorte "tudo que ainda está aberto". Serve para a pergunta mais comum do dia — "o que ainda está em aberto, independente da etapa?".

Ele exclui finalizadas e canceladas, e inclui tudo o mais, atrasadas inclusive. Quando está ativo, a tela mostra uma etiqueta **Ativas** e uma linha explicando o recorte.

### Atualização da lista

A lista é recarregada quando você volta para a janela do sistema depois de usar outro programa ou outra aba. Não é preciso recarregar a página para ver uma esteira criada por outra pessoa.

Enquanto carrega, aparece **"Carregando esteiras…"**.

## Quando algo é bloqueado

### "Nenhum resultado com estes filtros"

A lista está vazia porque o recorte atual não encontrou nada:

> Limpe a busca ou troque situação e prioridade. Se a lista estiver vazia de propósito, crie uma esteira manual ou por documento.

Verifique, nesta ordem:

1. as **etiquetas de filtro** acima da lista — há mais filtros ativos do que você imagina?
2. a **busca** — um texto antigo pode ter ficado no campo;
3. a **situação** — volte para **Todas**;
4. a **página** — se você estava na página 3 e o filtro mudou, a lista volta para a primeira automaticamente, mas vale conferir o contador.

### Não encontro uma esteira que eu esperava ver

Confira na ordem:

1. **Filtros ativos.** É a causa mais comum. Ponha **Situação: Todas**, limpe busca, prioridade e responsável.
2. **O recorte não é o que você pensa.** Procurando em **Em execução** uma esteira que passou do prazo? Ela está em **Em atraso**. Procurando em **Rascunho** uma que estourou o prazo? Também está em **Em atraso**.
3. **Ela foi encerrada.** Finalizadas e canceladas saem de **Ativas** e de todos os recortes de etapa. Filtre por **Finalizadas** ou **Canceladas**.
4. **Canceladas não têm cartão.** Se a esteira foi cancelada, nenhum cartão a mostra — só o filtro.
5. **Busca pelo campo certo.** A busca cobre OS, nome, cliente e responsável; não cobre o conteúdo das atividades.
6. **Ela foi excluída.** Esteira excluída não aparece em nenhum recorte. Exclusão só é possível antes da produção começar; depois disso a esteira é cancelada ou finalizada, e nesses casos ela continua na lista.

### "Sem permissão para esta área"

Você clicou em algo que exige permissão que sua conta não tem:

> Não tem permissão para acessar este conteúdo. Contate um administrador se precisar de acesso.

Acontece tipicamente ao usar **Nova Esteira Manual** ou **Nova esteira por documento** sem permissão de criar esteiras. Volte ao painel e peça liberação a quem administra os acessos.

### Faixa vermelha no alto da tela

A lista não pôde ser carregada. A faixa traz o motivo. Tente de novo saindo e voltando para a tela; se persistir, registre um chamado informando o texto exibido.

### Ao excluir uma esteira

A confirmação é explícita:

> **Excluir esteira?** Esta ação removerá definitivamente a esteira … e sua estrutura. Só é permitido excluir esteiras que ainda estão no backlog.

Depois de **Excluir esteira**, o resultado pode ser:

| Mensagem | O que significa | O que fazer |
|---|---|---|
| “Esteira excluída com sucesso.” | removida, junto com a estrutura | nada |
| “Esta esteira já possui apontamentos e não pode ser excluída. Cancele ou finalize para preservar o histórico.” | já houve trabalho registrado | cancele ou finalize, em vez de excluir |
| “Esta esteira já possui movimentações e não pode ser excluída.” | há vínculos operacionais | cancele ou finalize |
| “Você não tem permissão para excluir esteiras.” | falta permissão | peça a quem administra os acessos |
| “Não foi possível excluir a esteira. Tente novamente.” | falha momentânea | tente de novo; se persistir, abra chamado |

A exclusão apaga a esteira. Quando há histórico, o caminho correto é **cancelar** ou **finalizar**: a esteira sai dos recortes em aberto e o histórico fica preservado.

[IMAGEM SUGERIDA: Painel operacional com os seis cartões no alto, um deles destacado como filtro ativo, e a lista abaixo mostrando na coluna Situação rótulos diferentes do nome do cartão selecionado]

[IMAGEM SUGERIDA: Mesma esteira em dois momentos — antes do prazo, contada em Em execução; depois do prazo, contada em Em atraso e ausente do cartão anterior]

---

# 6. Esteiras

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- **localizar e consultar**: busca, filtros e leitura do detalhe da esteira
- **criar uma esteira**: estrutura montada manualmente, a partir de matriz ou a partir de documento
- **estrutura da esteira**: tarefa, setor e atividade; tempo por unidade e quantidade prevista
- **ciclo de vida**: as situações da esteira, quem avança cada etapa e quando é exigido motivo
- **atividades**: concluir, reabrir, dispensar e restaurar, com as pré-condições de cada ação
- **inclusão tardia**: os quatro modos de incluir trabalho em uma esteira já iniciada e o efeito no planejamento

---

# 7. Apontamentos

## Para que serve

Apontar é registrar o trabalho que você fez: em qual atividade, em que dia, quantos minutos e quantas unidades concluiu. É o registro que alimenta sua jornada, o acompanhamento da esteira e todos os indicadores de produção.

O apontamento também é o que **inicia** uma esteira na prática: ao receber o primeiro registro de horas, uma esteira liberada para produção passa a constar como em andamento.

Além do tempo gasto em atividades de esteira, é possível registrar **Extra Esteira** — o tempo de apoio, deslocamento, limpeza e outras tarefas que não pertencem a nenhuma atividade.

Quem tem permissão de gestão pode ainda **corrigir** apontamentos já registrados e **lançar horas em nome de outro colaborador**.

## Onde fica

Há três caminhos, com propósitos diferentes.

| Caminho | Como chegar | Para que |
|---|---|---|
| **Apontar horas** | botão na barra superior, presente em **todas as telas** da área autenticada | caminho principal e mais completo: registra em atividade ou Extra Esteira, sem sair da tela onde você está |
| Página **Apontamento** | em **Minha jornada**, botão **Apontar** na linha da atividade | registra horas em uma atividade específica que você já localizou |
| **Apontamento gerencial** | em **Jornada por colaborador**, botão **Apontamento gerencial**; ou no detalhe da esteira, link **Apontamento gerencial neste passo** | lançar por outra pessoa, corrigir e remover apontamentos |

No **Modo Fábrica** o apontamento tem telas próprias, feitas para o totem e para o navegador da fábrica. Este capítulo trata da área autenticada; o Modo Fábrica está no capítulo 13.

Nas telas de **Apontamento gerencial** a palavra **passo** aparece no lugar de **atividade** — são a mesma coisa. Veja o capítulo 21.

## Quem costuma ter acesso

| Ação | Quem consegue |
|---|---|
| Registrar horas nas suas atividades | qualquer pessoa com acesso ao sistema cuja conta esteja associada a um colaborador |
| Registrar horas em atividade **fora da sua alocação** | o mesmo, informando uma justificativa |
| Registrar **Extra Esteira** | o mesmo |
| **Concluir** uma atividade | quem está alocado nela; e quem pode criar e alterar esteiras |
| **Reabrir** uma atividade concluída | somente quem pode criar e alterar esteiras |
| **Lançar horas em nome de outro colaborador** | quem recebeu essa capacidade de gestão |
| **Corrigir** um apontamento | quem recebeu a capacidade de corrigir apontamentos — e **somente** essa pessoa: você não corrige o seu próprio apontamento sem ela |
| **Remover** um apontamento | o autor do próprio apontamento; ou quem recebeu a capacidade de remover apontamentos de qualquer pessoa |

**Sua conta precisa estar associada a um colaborador.** Sem esse vínculo, o sistema avisa **"Contexto operacional ausente"** e explica: *"Sua conta não está associada a um colaborador operacional. Peça ao administrador para vincular seu usuário a um colaborador antes de registrar horas ou ver sua jornada."* Nesse estado não é possível apontar nada.

## Como fazer

### Registrar horas em uma atividade

1. Clique em **Apontar horas**, na barra superior. A gaveta abre na aba **Esteira**, com o título **Apontar horas**.
2. Localize a atividade. A lista vem separada em **Minhas atividades** — aquelas em que você está alocado ou que estão no planejamento publicado para hoje — e, quando aplicável, **Fora da sua alocação**.
3. Para procurar, use o campo **Pesquisar**. Ele encontra por esteira, código, cliente, veículo, placa, setor e nome da atividade.
4. Clique em **Apontar** no cartão da atividade. O título muda para **Registrar tempo**.
5. Confirme ou troque a **data em que o trabalho foi realizado**.
6. Informe o **tempo (minutos)**.
7. Informe a **quantidade executada**.
8. Preencha a **justificativa operacional**, se a tela pedir.
9. Use **Descrição (opcional)** para uma nota sobre o trabalho.
10. Clique em **Salvar apontamento**.

Confirmação: **"Apontamento registrado com sucesso."** Quando a data não é hoje, a mensagem acrescenta a data usada.

Para voltar à lista sem salvar, use **← Voltar à lista** ou **Cancelar**.

### Os campos do apontamento

| Campo | Obrigatório | Regras |
|---|---|---|
| **Data em que o trabalho foi realizado** | sim | começa em hoje. Atalhos **Hoje** e **Ontem**, mais o calendário. Datas passadas são aceitas sem limite; **data futura não é aceita** |
| **Tempo (minutos)** | sim | número inteiro, **no mínimo 1**. Zero não é aceito. O campo começa em 0, então o botão de salvar só libera depois de você informar o tempo |
| **Quantidade executada** | sim | número inteiro, **a partir de 0**. Começa em 1. Significa as unidades concluídas **neste** apontamento — use **0** quando trabalhou sem concluir nenhuma unidade. Deixar o campo vazio impede salvar |
| **Justificativa operacional** | depende | obrigatória nos casos descritos adiante. Escolhida de uma lista mantida pela gestão; algumas opções pedem um **Complemento** |
| **Descrição** | não | nota livre sobre o trabalho |

### Quando a atividade não aparece na lista

A lista só oferece atividades que podem receber apontamento: a esteira precisa estar **A iniciar** ou **Em andamento**, e a atividade não pode estar concluída nem dispensada.

Se a atividade que você procura não aparece, marque **Buscar outras atividades**. A tela explica o efeito: *"Inclui atividades em aberto fora da sua alocação. Use pelo menos 2 caracteres na pesquisa. Será necessária uma justificativa ao apontar."*

Essas atividades aparecem no bloco **Fora da sua alocação**, e ao abrir o formulário o sistema avisa: *"Você não está alocado nesta atividade. Para apontar horas, informe uma justificativa (apontamento por exceção)."*

### Quando a justificativa é exigida

Dois casos, e eles podem ocorrer juntos:

**1. Você não está alocado na atividade.** O aviso acima aparece e a justificativa passa a ser obrigatória.

**2. Há atividades anteriores pendentes na esteira.** A tela mostra a faixa **Fora de sequência — confirme o apontamento**, informa quantas atividades anteriores ainda estão pendentes e lista cada uma no formato tarefa › setor › atividade.

Em ambos os casos **nada é bloqueado**: você continua, informando a justificativa. O apontamento fora de sequência fica registrado no histórico da esteira como exceção.

Quando existe atividade anterior pendente mas o sistema **não** exige justificativa, aparece apenas um aviso discreto — por exemplo **"Aguardando etapa …"** ou **"Aguardando N etapas anteriores"**. Nesse caso é só informação.

### Registrar e concluir no mesmo passo

No formulário, abaixo de **Salvar apontamento**, existe **Salvar apontamento e concluir atividade**. Ele grava o tempo e encerra a atividade na mesma operação.

Confirmação: **"Apontamento salvo e atividade concluída."**

Use quando aquele foi o último trabalho da atividade. Se ainda houver trabalho, salve apenas o apontamento: a atividade continua aberta e aceita novos registros.

**Consumir o tempo previsto não conclui a atividade.** A conclusão é sempre uma decisão sua.

### Concluir sem registrar horas

No cartão de uma atividade em que você está alocado, ao lado de **Apontar**, pode aparecer **Concluir atividade**. Use quando não há tempo novo a registrar.

Se a atividade estiver fora de sequência, o sistema pede a justificativa antes de confirmar. Concluída, a mensagem é **"Atividade concluída."**

Esse botão não aparece para atividades fora da sua alocação. Nesse caso o caminho é **Salvar apontamento e concluir atividade**, com justificativa.

Reabrir uma atividade concluída é ação de gestão e está no capítulo 6.

### Registrar Extra Esteira

Para o tempo que não pertence a nenhuma atividade de esteira:

1. Clique em **Apontar horas** e troque para a aba **Extra esteira**. O título passa a **Apontamento extra esteira**.
2. Em **Descrição do apontamento**, escolha um motivo da lista. A lista é mantida pela gestão em Configurações operacionais.
3. Confirme a **data em que o trabalho foi realizado**.
4. Informe o **tempo (minutos)** — mínimo 1.
5. Use **Observação (opcional)** se precisar detalhar.
6. Clique em **Salvar apontamento**.

Confirmação: **"Apontamento extra esteira registrado com sucesso."**

Abaixo do formulário, o bloco **Últimos apontamentos extra esteira** mostra seus registros recentes com data e tempo. É aí que você confere o que já lançou.

Se a lista de motivos estiver vazia, aparece **"Não há descrições ativas configuradas."** — peça à gestão para cadastrar os motivos.

### Corrigir, remover e lançar por outra pessoa

Estas três ações ficam na tela **Apontamento gerencial**, alcançável por **Jornada por colaborador** ou pelo detalhe da esteira. A tela avisa o que ela é: *"Registo em nome de um colaborador alocado neste passo. O motivo é obrigatório e fica na trilha administrativa."*

A tela tem duas partes: **Novo lançamento**, para lançar por outra pessoa, e **Lançamentos no passo**, com os apontamentos já registrados naquela atividade.

**Lançar horas em nome de outro colaborador**

1. Em **Novo lançamento**, escolha o **Colaborador (alvo do tempo)**. A lista traz apenas quem está **alocado** naquela atividade.
2. Confirme a **data em que o trabalho foi realizado**.
3. Informe os **Minutos**.
4. Use **Observação (opcional)** se precisar.
5. Preencha o **Motivo do registro em nome do colaborador** — é **obrigatório**.
6. Se a atividade estiver fora de sequência, informe também a **justificativa operacional** pedida na tela.
7. Clique em **Revisar e registrar**, confira o resumo e confirme.

Confirmação: **"Apontamento registrado em nome do colaborador selecionado."**

O lançamento aparece na lista marcado como **Registrado pelo gestor**, com quem lançou e o motivo. Não há campo de quantidade executada neste lançamento: ele registra apenas tempo.

Se ninguém estiver alocado, a tela avisa: **"Não há colaboradores alocados neste passo. Aloque antes de apontar."**

**Corrigir um apontamento**

1. Na lista, clique em **Editar…** na linha do apontamento.
2. Escolha o que vai mudar: **Minutos** ou **Quantidade**. A tela é explícita — *"Altere o tempo ou a quantidade executada, um de cada vez, e informe o motivo."*
3. Informe o novo valor. Em quantidade, há ainda **Limpar a quantidade executada**, para deixá-la em branco.
4. Preencha o **Motivo da correção (obrigatório)**.
5. Clique em **Salvar**.

Confirmação: **"Apontamento corrigido."**

**Uma correção muda um campo por vez.** Para ajustar tempo e quantidade, faça duas correções.

**A data e a justificativa de um apontamento não são editáveis.** Se a data estiver errada, o caminho é remover o apontamento e registrar de novo com a data correta.

**Remover um apontamento**

1. Clique em **Remover…** na linha do apontamento.
2. Se a remoção for de um apontamento de outra pessoa — ou se você tem a capacidade de remover apontamentos de qualquer pessoa — a tela exige o **motivo da remoção**. Ao remover o seu próprio lançamento sem essa capacidade, aparece apenas a confirmação *"Confirma a remoção do seu próprio lançamento?"*.
3. Clique em **Remover**.

Confirmação: **"Apontamento removido."**

Correções e remoções feitas por gestão ficam registradas na **Trilha administrativa**, com o valor anterior, o novo e o motivo.

## O que esperar

### A data de realização manda no dia contabilizado

O apontamento é contabilizado no **dia que você escolheu**, não no dia em que digitou. Lançar hoje um trabalho de ontem faz o tempo contar em ontem — na sua jornada, na esteira e nos indicadores.

A referência é sempre o dia no horário de Brasília. Em lançamentos retroativos o sistema **não** registra nem exibe hora: só a data importa.

Datas passadas não têm limite. **Data futura é recusada**, no campo e na gravação.

### O que muda quando você salva

| O que acontece | Onde você vê |
|---|---|
| o tempo entra no seu histórico | **Minha jornada** |
| o realizado da atividade aumenta | detalhe da esteira e **Evolução das Esteiras** |
| a esteira é iniciada, se ainda estava a iniciar | **Painel operacional**, que passa a contá-la como em execução |
| o apontamento fora de sequência fica registrado como exceção | histórico da esteira |
| a atividade é encerrada, se você usou salvar e concluir | detalhe da esteira e sua fila |

### Previsto, realizado e pendente

Cada cartão da lista mostra três números: **Previsto**, **Realizado** e **Pendente**. O previsto considera o tempo por unidade multiplicado pela quantidade prevista da atividade.

**O sistema não avisa nem bloqueia quando o realizado passa do previsto** nesta área. Os três números estão ali para você julgar; passar do previsto não impede novos apontamentos nem conclui nada. No **Modo Fábrica** o comportamento é outro, e está no capítulo 13.

### Extra Esteira e apontamento em atividade não são a mesma coisa

| | Atividade de esteira | Extra Esteira |
|---|---|---|
| vincula a uma esteira | sim | não |
| descrição | texto livre, opcional | escolhida de uma lista, **obrigatória** |
| quantidade executada | sim | não existe |
| justificativa | quando exigida | nunca |
| conclui atividade | pode | não se aplica |
| tempo mínimo | 1 minuto | 1 minuto |

### Onde reencontrar o que foi lançado

- **Apontamentos em atividades:** em **Minha jornada**.
- **Extra Esteira:** no bloco **Últimos apontamentos extra esteira**, dentro da própria aba. Os totais de Extra Esteira de um colaborador aparecem para a gestão em **Jornada por colaborador**.
- **Todos os apontamentos de uma atividade:** na tela **Apontamento gerencial** daquela atividade, em **Lançamentos no passo**, para quem tem acesso de gestão.

## Quando algo é bloqueado

### Antes de salvar, na própria tela

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"A data de realização não pode ser futura."** | a data escolhida é posterior a hoje | use hoje ou uma data anterior |
| **"Data inválida."** | a data não foi reconhecida | use os atalhos **Hoje** / **Ontem** ou o calendário |
| **"Informe a data em que o trabalho foi realizado."** | o campo ficou vazio | informe a data |
| botão **Salvar apontamento** apagado | falta o tempo, a quantidade está vazia, ou falta a justificativa exigida | informe os minutos (mínimo 1), deixe a quantidade preenchida — 0 vale — e complete a justificativa |
| **"Selecione uma justificativa operacional para este apontamento."** | a justificativa é obrigatória neste caso | escolha uma opção da lista |
| **"Esta justificativa exige complemento."** | a opção escolhida pede detalhe | escreva o **Complemento** |
| **"Nenhuma justificativa operacional ativa encontrada."** | não há opções cadastradas | peça à gestão para cadastrar as justificativas |
| **"Não foi possível carregar as justificativas padronizadas. Informe a justificativa manualmente."** | a lista não carregou | escreva a justificativa no campo de texto |

### Ao tentar salvar

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Esta esteira ainda não foi liberada para produção."** | a esteira está em rascunho | peça ao gestor para avançar a esteira |
| **"Esta esteira está em planejamento e ainda não permite apontamento."** | a esteira está aguardando ou em planejamento | aguarde a liberação |
| **"Esta esteira está finalizada e não permite novos apontamentos."** | a esteira foi encerrada | fale com o gestor; reabrir é decisão dele |
| **"Esta esteira está cancelada e não permite novos apontamentos."** | a esteira foi cancelada | fale com o gestor |
| **"Esta atividade já está concluída operacionalmente; não é possível novo apontamento."** | a atividade foi concluída | peça a reabertura a quem pode alterar esteiras |
| **"Esta atividade foi dispensada; não é possível novo apontamento."** | a atividade foi dispensada | peça a restauração a quem pode alterar esteiras |
| **"Informe uma justificativa para executar esta atividade fora da sequência recomendada."** | há atividades anteriores pendentes e a justificativa não foi informada | preencha a justificativa e salve de novo |
| **"Conta sem colaborador operacional associado. Contate o administrador."** | sua conta não está associada a um colaborador | peça o vínculo a quem administra os acessos |

### Ao concluir uma atividade

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Esta esteira não está liberada para conclusão operacional de atividades."** | a esteira não está em situação que aceite conclusão | aguarde a liberação |
| **"Para concluir esta atividade, informe uma justificativa ao registrar o apontamento."** | você não está alocado na atividade | use **Salvar apontamento e concluir atividade**, com justificativa |
| **"Esta atividade já está concluída."** | outra pessoa concluiu antes | atualize a tela |
| **"Sem permissão para reabrir esta atividade."** | reabrir exige permissão de gestão de esteiras | peça a quem tem essa permissão |
| **"Não foi possível concluir esta atividade."** | falha ao concluir | tente de novo; se persistir, abra chamado |

### Na correção gerencial

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Informe o motivo da correção."** | o motivo é obrigatório | escreva o motivo |
| **"Informe o tempo em minutos, com um número inteiro de pelo menos 1."** | valor de tempo inválido | corrija o número |
| **"Informe a quantidade executada como um número inteiro igual ou maior que zero, ou limpe a quantidade."** | valor de quantidade inválido | corrija, ou use **Limpar a quantidade executada** |
| **"Altere apenas o tempo ou apenas a quantidade executada em cada correção."** | você tentou mudar os dois de uma vez | faça duas correções |
| **"O apontamento foi alterado por outro usuário. Atualize a tela e tente novamente."** | outra pessoa alterou o mesmo apontamento antes de você salvar | recarregue, confira o valor atual e refaça a correção |
| **"Informe o motivo da remoção."** | o motivo é obrigatório nesse caso | escreva o motivo |
| **"O colaborador indicado não está alocado nesta atividade."** | o lançamento por terceiro exige alocação ativa | aloque o colaborador na atividade, ou escolha outro |
| **"Indique o motivo."** | faltou o motivo do lançamento por terceiro | preencha o motivo |
| **"Colaborador inexistente, inativo ou indisponível."** | o colaborador escolhido não está ativo | verifique o cadastro do colaborador |
| **"Esta atividade não está incluída na sequência operacional recomendada."** | a atividade não entra na sequência daquela esteira | confira a estrutura da esteira com o gestor |
| **"Não foi possível remover este apontamento."** | falta permissão para remover apontamento de outra pessoa | peça a quem tem essa capacidade |
| **"Apontamento não encontrado."** | o apontamento já havia sido removido | atualize a tela |

### Se a justificativa é exigida e não há onde informá-la

A página **Apontamento** aberta a partir de **Minha jornada** tem data, minutos, quantidade e observação, mas **não tem campo de justificativa**. Se aquela atividade exigir justificativa — por estar fora de sequência, ou fora da sua alocação —, o registro será recusado e não haverá como atender ao pedido naquela tela.

**Nesse caso, use o botão Apontar horas da barra superior**, que tem o campo de justificativa. A pendência está registrada no capítulo 21.

[IMAGEM SUGERIDA: Gaveta Apontar horas na aba Esteira — lista com os blocos Minhas atividades e Fora da sua alocação, mostrando num cartão os números Previsto, Realizado e Pendente e os botões Apontar e Concluir atividade]

[IMAGEM SUGERIDA: Formulário Registrar tempo com a faixa de fora de sequência aberta, listando as atividades anteriores pendentes, e os dois botões de salvar]

[IMAGEM SUGERIDA: Tela Apontamento gerencial — Novo lançamento com o motivo obrigatório e, abaixo, a lista de lançamentos com as ações Editar e Remover]

---

# 8. Planejamento semanal

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- semana de trabalho, rascunho, revisão e publicação
- por que a fila do colaborador só muda depois de publicar
- capacidade do colaborador por dia e aviso de sobrecarga
- atividades disponíveis para planejar e por que algumas não aparecem
- divergências de sincronização e execução fora do plano
- as duas exportações em Excel e o que cada uma entrega
- impressão dos tickets da semana

---

# 9. Agenda da semana

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- arrastar do backlog para colaborador e dia
- mover, atribuir em lote e remover do plano
- concluir atividade pela agenda e quando é pedida justificativa
- o painel **Atenção** e o que ele reúne
- salvar revisão e publicar
- uso em tela sensível ao toque

---

# 10. Minha Fila

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- de onde vem a fila e por que ela pode estar vazia
- agrupamento em atrasados, hoje e concluídos
- próxima atividade recomendada e ordem de apresentação
- aviso de planejamento acima da capacidade do dia
- navegar por data de trabalho
- mensagens de indisponibilidade e o que fazer

---

# 11. Minha Jornada

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- períodos disponíveis e intervalo personalizado
- previsto, realizado e cobertura de tempo
- Extra Esteira no resumo do período
- sinais de pendência
- por que a lista na tela pode mostrar menos itens do que os totais

---

# 12. Jornada Gerencial

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- consultar um colaborador e consultar vários ao mesmo tempo
- limite de colaboradores por consulta e limite diferente na exportação
- como ler os totais no escopo consolidado
- exportação em Excel e o que ela traz
- diferença em relação à **Minha jornada**

---

# 13. Modo Fábrica

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- o que é o Modo Fábrica e as duas formas de acesso: totem e navegador da fábrica
- entrar com colaborador e **PIN**; criar o PIN no primeiro acesso
- situações da credencial: sem credencial, aguardando criação de PIN, bloqueada, desabilitada
- bloqueio por tentativas e como destravar
- apontar pelo cartão de atividade, concluir e justificar
- **Outra atividade**: localizar atividade fora da fila
- **Extra Esteira** no Modo Fábrica
- diferenças entre o totem e o navegador

---

# 14. Evolução das Esteiras

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- previsto, realizado e tempo excedido por atividade
- as classificações de desvio e as faixas de cada uma
- filtros disponíveis
- selecionar esteiras e imprimir o resultado
- como atividade dispensada afeta o total

---

# 15. Dashboard e indicadores

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- os dois recortes de indicadores e quem vê cada um
- o que cada indicador significa
- o período usado por cada indicador, que não é necessariamente o mesmo
- como chegar da visão geral ao detalhe

---

# 16. Cadastros e administração

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- **colaboradores**: cadastro, setor, função, acesso ao Modo Fábrica, redefinir PIN, inativar e restaurar
- **usuários**: criar conta, vincular ao colaborador, exigir troca de senha, redefinir senha, inativar e restaurar
- **equipes**: criar, incluir membros, definir referência e alocar em atividade
- **capacidade**: capacidade diária padrão, ajuste individual com vigência e onde isso se reflete
- **configurações operacionais**: setores, funções, capacidade, descrições de apontamentos, justificativas e motivos de dispensa

---

# 17. Importação por documento

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- enviar o documento e o que o sistema devolve
- revisar o rascunho antes de criar a esteira
- decidir item por item: reaproveitar, revisar semelhante, criar novo ou ignorar
- o que impede a criação e como resolver
- o que acontece depois de confirmar

---

# 18. Saúde operacional

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- o que o diagnóstico considera
- as situações possíveis e o que cada uma indica
- sobrecarga e sobrecarga crítica
- falta de apontamento recente e baixa ocupação
- o que fazer diante de cada sinal

---

# 19. Mensagens, bloqueios e como agir

> [PENDENTE DE ENRIQUECIMENTO — não publicar como capítulo final]

- índice de mensagens por situação, com causa e ação recomendada
- bloqueios de apontamento por situação da esteira
- bloqueios por sequência e por tempo acima do previsto
- bloqueios de acesso e credencial
- abrir chamado: quando, como e o que informar

---

# 20. Glossário do usuário

Termos do dia a dia do SGP+. Em caso de dúvida sobre uma palavra do manual, comece por aqui.

| Termo | O que significa |
|---|---|
| **Esteira** | Um trabalho completo a ser entregue. É a unidade que se planeja, executa e encerra. Reúne tarefas, setores e atividades, e tem situação própria, do rascunho até a finalização. |
| **Tarefa** | Uma divisão da esteira. Agrupa setores. |
| **Setor** | Uma divisão da tarefa. Agrupa as atividades de uma mesma especialidade. |
| **Atividade** | A unidade de trabalho que o colaborador executa e aponta. É o nível em que se registra tempo e quantidade, em que se conclui ou dispensa, e que entra no planejamento. **É o termo que você usa no dia a dia.** |
| **Situação da atividade** | Em que ponto a atividade está: pendente, concluída, reaberta ou dispensada. Algumas telas mostram ainda indicações derivadas, como "pronta" ou "apontável", que dependem da sequência e da sua alocação. |
| **Alocação** | O vínculo entre uma pessoa (ou uma equipe) e uma atividade. É o que define de quem é o trabalho e o que aparece na sua fila e na sua jornada. Pode ser como responsável principal ou como apoio. |
| **Apontamento** | O registro do trabalho feito: data, minutos e, quando aplicável, quantidade executada. É a base de todo o acompanhamento de tempo do sistema. |
| **Extra Esteira** | Apontamento de tempo que não pertence a nenhuma atividade de esteira — apoio, limpeza, deslocamento e situações semelhantes. Usa um catálogo de descrições mantido pela gestão. |
| **Justificativa** | Motivo exigido pelo sistema em situações de exceção, como apontar fora da sequência recomendada ou passar do tempo previsto. Escolhida de um catálogo mantido pela gestão. |
| **Planejamento** | A distribuição das atividades da fábrica por colaborador e por dia, dentro de uma semana. Só passa a valer para o colaborador depois de **publicado**. |
| **Agenda** | A visão semanal do planejamento em que se arrasta a atividade para o colaborador e o dia. É a forma mais direta de montar e ajustar a semana. |
| **Capacidade** | Quantos minutos de trabalho um colaborador tem disponível por dia. Existe um valor padrão e é possível definir ajuste individual com período de vigência. É o que o sistema usa para apontar sobrecarga. |
| **Sobrecarga** | Situação em que o planejado para um colaborador passa da capacidade dele. O sistema avisa, mas não impede. |
| **Modo Fábrica** | O canal que o colaborador usa para apontar produção na fábrica, com acesso por **PIN**. Funciona no totem e no navegador. É o nome que aparece na tela. |
| **PIN** | Código numérico de acesso ao Modo Fábrica. É diferente da senha usada para entrar no sistema por e-mail. |
| **Ticket** | Impressão em papel com os dados de uma atividade, usada como apoio físico na operação. O estado oficial da atividade continua sendo o do sistema, não o do papel. |
| **Matriz de operação** | Uma estrutura de trabalho pronta e reutilizável, usada como base para criar novas esteiras sem montar tudo de novo. |
| **Inclusão tardia** | Acrescentar trabalho a uma esteira que já está em andamento, podendo marcá-lo para entrar no planejamento da semana. |
| **Colaborador** | A pessoa que executa o trabalho na fábrica. Tem cadastro operacional próprio, com setor e função, e pode ter acesso ao Modo Fábrica. |
| **Usuário** | A conta de acesso ao sistema, com e-mail e senha. Pode estar vinculada a um colaborador; sem esse vínculo, algumas ações operacionais ficam bloqueadas. |
| **Gestor** | Quem planeja a semana, conduz as esteiras e acompanha a execução. Neste manual, "gestor" indica o perfil típico; o que você consegue fazer depende da sua permissão. |
| **Equipe** | Um agrupamento de colaboradores que pode ser alocado em uma atividade de uma vez, em lugar de alocar pessoa por pessoa. |
| **Permissão** | O que a sua conta está autorizada a fazer. Define os itens que aparecem no menu e as ações que o sistema aceita. Duas pessoas com o mesmo cargo podem ter permissões diferentes. |
| **Jornada** | O histórico de apontamentos de um colaborador em um período, com previsto, realizado e cobertura de tempo. |
| **Previsto** | O tempo que se espera para o trabalho, calculado a partir do tempo por unidade e da quantidade prevista. |
| **Realizado** | O tempo efetivamente apontado. |
| **Cobertura de tempo** | A relação entre o realizado e o previsto no mesmo conjunto de alocações. Indica quanto do tempo esperado já foi consumido — não o quanto da peça está pronta. |

### Termo técnico que você não precisa conhecer

**`STEP`** — identificador interno usado na implementação do sistema para o que este manual chama de **atividade**. Ele ainda aparece em alguns rótulos e mensagens de tela ("Etapa (STEP)", "Atividades (STEPs)", "Alocações em STEPs"). **Leia sempre como "atividade".** É termo técnico legado, sem significado operacional próprio, e está registrado como ajuste pendente de interface.

---

# 21. Anexo — funcionalidades não expostas e pendências conhecidas

Conteúdo para **apoio e gestão**, não para o usuário final. Serve para reconhecer uma situação relatada sem abrir chamado indevido.

## 21.1 Telas que existem mas não têm entrada no menu

Alcançáveis apenas digitando o endereço, por isso **não documentadas como disponíveis** neste manual.

| Tela | Situação |
|---|---|
| **Minhas Atividades** | Lista as atividades em que você está alocado. Funciona, mas não há item de menu nem link a partir de outra tela. |
| **Meu Trabalho** | Área declaradamente em construção, com blocos reservados e sem dados próprios. Não há item de menu. |
| **Laboratório de Esteiras** | Permite compor uma esteira a partir de várias matrizes. Implementada, mas sem item de menu e sem nenhum link de entrada. |

Se um usuário relatar o uso de alguma dessas telas, o acesso foi por endereço direto. Decidir expor, remover ou manter oculta é decisão de produto pendente.

## 21.2 Elementos de tela sem funcionamento

| Elemento | Onde | Situação |
|---|---|---|
| **Busca rápida…** | barra superior | campo visível e não funcional; reservado para entrega futura |
| **Alertas** | menu do seu nome | item visível e sem efeito; reservado para entrega futura |

Não geram chamado.

## 21.3 Ajustes de texto pendentes na interface

Divergências já identificadas, que ainda aparecem na tela. Registradas aqui para que o suporte reconheça a situação; o manual adota sempre o termo correto.

Os termos técnicos abaixo são reproduzidos **apenas** para você reconhecê-los na tela, com a tradução ao lado — mesma função da nota ao final do capítulo 20. Nenhum deles é vocabulário deste manual.

| O que aparece na tela | Leia como | Observação |
|---|---|---|
| `STEP`, "Etapa (STEP)", "Alocações em STEPs" | **atividade** | termo técnico legado |
| Situação da atividade exibida em código, no painel de encaixe do planejamento | **situação da atividade** | a tela ainda mostra o código interno em alguns casos |
| **"Mês atual (UTC)"**, no seletor de período | mês atual pelo calendário local | o cálculo usa o fuso de São Paulo; o rótulo está incorreto |
| Após redefinir o PIN: "Próximo acesso exigirá nova senha." | próximo acesso exigirá **novo PIN** | o recurso é o PIN do Modo Fábrica, não a senha |
| Botão **"Remover (soft delete)"**, em Usuários e Colaboradores | **remover preservando o histórico** | o registro deixa de aparecer e pode ser restaurado |
| Textos de filtro que citam nomes internos de parâmetro, no Painel operacional | o filtro correspondente | sem efeito sobre o uso; basta usar os filtros da tela |
| **"passo"**, nas telas de Apontamento gerencial ("Lançamentos no passo", "Apontamento gerencial neste passo") | **atividade** | mesmo conceito, nome diferente |

### Página Apontamento sem campo de justificativa

Divergência confirmada em 2026-10-03.

A página **Apontamento**, aberta pelo botão **Apontar** em **Minha jornada**, oferece data, minutos, quantidade executada e observação — **mas não tem campo de justificativa operacional**.

Quando a atividade exige justificativa (atividade anterior pendente, ou atividade fora da alocação do colaborador), o registro é recusado e não há como atender ao pedido naquela tela.

**Orientação até a correção:** nesses casos, usar o botão **Apontar horas** da barra superior, que tem o campo de justificativa. Pendência de produto registrada.

### Cálculo de atraso no Painel operacional

Divergência confirmada em 2026-10-03, com impacto direto na leitura do painel.

O cartão e o filtro **Em atraso** só reconhecem o prazo da esteira quando ele está registrado como **data**. O campo **Prazo estimado** do cadastro de Nova esteira, porém, pede um **número de dias** — e é esse texto que o painel tenta ler como data.

Efeitos observados:

| Como o prazo foi registrado | O que o painel faz |
|---|---|
| número de dois dígitos ou mais (ex.: 30) | não reconhece prazo; a esteira **nunca** é contada como atrasada |
| número de um dígito (ex.: 7) | pode ser lido como uma data no passado; a esteira aparece como atrasada **desde a criação** |
| período no formato "Início previsto … · Fim previsto …" | não reconhece prazo; nunca é contada como atrasada |
| data no formato 2026-10-20 ou com dia a partir de 13 (ex.: 25/12/2026) | reconhece corretamente |
| data com dia até 12 (ex.: 01/02/2026) | dia e mês podem ser invertidos, deslocando o atraso |

**Orientação até a correção:** não usar o cartão **Em atraso** como fonte única de prioridade; conferir o prazo na própria esteira. Pendência de produto registrada.

## 21.4 Diferença de PIN entre as formas de acesso

O acesso pelo navegador e o cadastro aceitam PIN de **4 a 8 dígitos**. O totem aceita **exatamente 4**.

**Orientação prática:** use sempre PIN de **4 dígitos** — funciona nas duas formas de acesso. Um PIN com mais de 4 dígitos é aceito no cadastro, mas não é digitável no totem. Padronização pendente de decisão.

## 21.5 Recursos que não existem, apesar de parecerem existir

Não oferecer nem documentar:

- **bloquear ou pausar uma atividade** — não há ação disponível no sistema para isso, em nenhuma tela;
- **menu de gestão por atividade** com alteração de situação, reatribuição e prioridade — não está acessível aos usuários.
