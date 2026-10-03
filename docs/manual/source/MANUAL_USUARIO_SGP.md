# Manual do Usuário — SGP+

**Produto:** SGP+ · Multivacia / ARGOS
**Versão da aplicação nesta revisão:** 1.9.8
**Revisão deste manual:** 2026-10-03
**Situação:** base editorial criada; capítulos 1 a 3, 5, 7 a 9, 13, 20 e 21 com conteúdo final. Os capítulos 4, 6, 10 a 12 e 14 a 19 seguem marcados como pendentes e **não devem ser publicados** como versão final.

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

## Para que serve

O Planejamento semanal é onde a demanda vira uma semana executável. Você escolhe a semana, pega as atividades que estão prontas para serem feitas e distribui cada uma para **um colaborador em um dia**, com um tempo planejado.

Enquanto você monta, nada chega à fábrica. O trabalho só passa a valer quando você **publica** — é a publicação que alimenta a fila do colaborador e o Modo Fábrica.

A tela também mostra como a semana está se comportando: capacidade de cada pessoa por dia, o que foi executado dentro e fora do plano, divergências em relação ao plano da esteira e o histórico do que aconteceu.

## Onde fica

Menu lateral, agrupamento **Gestão** → **Planejamento**.

O título na tela é **Planejamento da Semana**, com a frase *"Distribua atividades por colaborador e acompanhe a execução diária."*

## Quem costuma ter acesso

Quem pode criar e alterar esteiras. É a mesma capacidade que libera **Nova esteira**, **Agenda da semana** e **Evolução das Esteiras**.

Sem ela, o item não aparece no menu. Dentro da tela não há recortes por perfil: quem entra pode montar, salvar e publicar.

As ações rápidas do cartão seguem as regras dos capítulos 6 e 7: **Apontar** abre o registro de horas, **Concluir** encerra a atividade e **Reabrir** exige a mesma permissão de gestão de esteiras.

## Como fazer

### Escolher a semana

A semana vai sempre de **segunda a sexta** — cinco dias, nunca sábado ou domingo.

No alto da tela, as setas **‹** e **›** andam uma semana para trás e para frente. Entre elas aparece o intervalo da semana carregada, no formato `dd/mm/aaaa → dd/mm/aaaa`. Ao abrir, a tela carrega a semana que contém o dia de hoje.

Ao lado do intervalo há o selo do estado do plano daquela semana:

| Selo | O que significa |
|---|---|
| **Rascunho** | a semana nunca foi publicada; nada disso chegou à fábrica |
| **Publicado vigente** | existe uma versão publicada, e é ela que a fábrica está usando |
| **Revisão em planejamento** | existe uma versão publicada **e** você está mexendo em uma nova versão, ainda não publicada |

Quando há uma revisão em andamento, aparece também o selo **Alterações não publicadas**.

### Entender rascunho, publicado e revisão

É a distinção mais importante da tela.

- **Rascunho:** sua área de montagem. Salvar um rascunho não muda nada para ninguém.
- **Publicado vigente:** a versão que vale. É dela que sai a fila do colaborador e do Modo Fábrica.
- **Revisão:** quando a semana já tem versão publicada e você altera algo, o sistema **não** mexe na versão publicada. Ele cria uma nova versão a partir dela e guarda suas mudanças ali. A fábrica continua com a versão antiga até você publicar de novo.

A própria tela avisa: *"Este plano possui uma versão publicada ativa. Alterações salvas ficam em revisão e só entram na fila dos colaboradores após nova publicação."*

Publicar a revisão **substitui** a versão anterior. Não existem duas versões valendo ao mesmo tempo, e não há como voltar de publicado para rascunho: para desfazer, você altera e publica de novo.

### Encontrar as atividades disponíveis

A coluna **Backlog operacional** lista o que está pronto para ser planejado. Use **Buscar esteira / atividade** para filtrar.

Entram nessa lista as atividades de esteiras em **Em planejamento**, **A iniciar** e **Em andamento**.

Ficam de fora:

| Situação | Por que não aparece |
|---|---|
| esteira em rascunho ou aguardando planejamento | ainda não entrou no fluxo de planejamento |
| esteira finalizada ou cancelada | não há mais o que planejar |
| atividade já concluída | o trabalho acabou |
| atividade inativa ou removida da estrutura | não existe mais como trabalho |
| atividade **já planejada** em qualquer semana, em rascunho ou publicada | para não planejar duas vezes |
| atividade de esteira **Em andamento que tem plano próprio da esteira** | essa segue pelo painel **Esteiras aguardando encaixe**, não por aqui |

A exceção da última linha são as atividades **incluídas tardiamente** e marcadas para entrar no planejamento da semana (capítulo 6): essas aparecem no Backlog operacional mesmo com plano próprio da esteira.

Quando tudo já foi distribuído, a lista mostra **"Todas as atividades carregadas no backlog já foram planejadas nesta semana."**. Se a busca não encontrar nada: **"Nenhuma atividade encontrada para a busca."**

> **Atenção.** Uma atividade **dispensada** pode reaparecer nessa lista. O sistema não a bloqueia aqui. Não a planeje: ela consome capacidade e aparece na exportação, mas nunca chega à fila do colaborador. Pendência registrada no capítulo 21.

### Distribuir uma atividade

Clique na atividade no Backlog operacional. Abre a janela **Adicionar ao plano** com três campos:

1. **Colaborador** — a lista traz os colaboradores operacionais. Quando a atividade já tem gente alocada na esteira, aparecem atalhos sob **"Cadastrados na atividade:"** — clicar em um deles já preenche o campo. São atalhos de conveniência, não uma recomendação do sistema: você pode escolher qualquer colaborador.
2. **Dia** — um dos cinco dias da semana. Começa no dia de hoje, se hoje estiver na semana carregada; senão, na segunda.
3. **Minutos planejados** — vem preenchido com o tempo que **ainda falta** naquela atividade (o previsto total menos o que já foi apontado). **Você pode mudar esse valor**, e ele é importante: veja "De onde vem o tempo previsto da produção".

Confirmada, a atividade vira um cartão no quadro, na célula daquele colaborador naquele dia.

Itens que vêm do painel **Esteiras aguardando encaixe** usam a mesma janela, com o selo **Plano da Esteira**.

### Mover, reordenar e remover

- **Mover:** arraste o cartão para outra célula — outro colaborador, outro dia, ou os dois.
- **Reordenar:** dentro de uma célula, as setas **↑** e **↓** mudam a ordem de execução.
- **Remover:** o **✕** tira o cartão do plano (*"Remover do plano"*). A atividade volta na hora para o Backlog operacional, pronta para ser redistribuída. Não há confirmação.

**Nada disso é gravado até você salvar.** Mover, reordenar e remover são alterações locais. Se sair da tela sem salvar, o plano volta ao que estava.

### Uma atividade, um colaborador, um dia

Cada atividade entra **no máximo uma vez** no plano da semana. Não é possível dividi-la entre dois colaboradores, nem repeti-la em dois dias, nem planejá-la em duas semanas ao mesmo tempo.

Se tentar, o sistema recusa com **"Cada Atividade só pode aparecer uma vez no plano."** ou **"Atividade já está planejada em outro plano semanal."**

Para dividir trabalho entre pessoas, a divisão é feita na **estrutura da esteira** — em atividades separadas (capítulo 6), não aqui.

### Ler capacidade e sobrecarga

Cada célula do quadro soma os minutos planejados dos cartões que estão nela, e compara com a **capacidade diária** daquele colaborador naquele dia.

A capacidade vem de **Configurações operacionais**: existe um valor padrão para todos e é possível definir ajuste individual com período de vigência (capítulo 16). O sistema usa o ajuste que estiver válido na data; sem ajuste, usa o padrão.

**Sobrecarga é só quando o planejado passa da capacidade.** Não há faixa de alerta antes disso — 100% exatos ainda é normal.

Quando uma ação sua faz uma célula passar da capacidade, abre o aviso **Capacidade diária ultrapassada**, com Colaborador, Data, **Capacidade diária**, **Tempo planejado** e **Excedente**. Se mais de uma célula estourou na mesma ação, o aviso diz quantas.

O aviso é explícito: **"Você pode continuar o planejamento normalmente."** Sobrecarga **não bloqueia** nada — nem salvar, nem publicar. É informação para você decidir.

O aviso só aparece quando a carga da célula **aumentou** e cruzou o limite. Remover trabalho, reduzir minutos ou reordenar não dispara nada.

### Filtrar o quadro

Em **Filtros do quadro**:

| Filtro | Opções |
|---|---|
| **Colaborador** | Todos · Sem responsável · cada colaborador com itens no plano |
| (esteira) | Todas as esteiras · cada esteira com itens no plano |
| **Situação** | Todos · Sem responsável · **Com capacidade excedida** |
| **Busca no plano** | texto livre — esteira, atividade, setor |

Abaixo aparece **"Exibindo N de M itens planejados"**, com **"(visão filtrada)"** quando há filtro ativo.

Em **Visualização** você alterna entre **Semana** (as cinco colunas de dias) e **Daily** (um dia por vez, em colunas por colaborador).

Os filtros são só de leitura: **não alteram o que é salvo, publicado ou exportado.**

### Salvar

O botão de salvar muda de nome conforme o estado:

- **Salvar rascunho** — quando a semana ainda não tem versão publicada. Confirmação: **"Rascunho salvo."**
- **Salvar alterações** — quando já existe versão publicada. Confirmação: **"Revisão salva. A fila dos colaboradores continua usando a última versão publicada."**

O botão só fica ativo quando há alterações pendentes.

### Publicar

**Publicar plano** é o que leva a semana para a fábrica. Confirmação: **"Plano publicado. A fila dos colaboradores foi atualizada."**

O botão fica desativado quando:

| Situação | O que o botão informa | O que fazer |
|---|---|---|
| há alterações não salvas | — | salve primeiro; só se publica o que está gravado |
| o plano está vazio | **"Adicione ao menos uma atividade antes de publicar o plano."** | distribua ao menos uma atividade |
| a versão já está publicada e não há revisão | **"Este plano já está publicado."** | nada a publicar; para mudar, altere, salve e publique a revisão |

## O que esperar

### O que a publicação muda

| Antes de publicar | Depois de publicar |
|---|---|
| o colaborador não vê nada em **Minha fila** daquela semana | a fila passa a mostrar as atividades planejadas para ele |
| o **Modo Fábrica** não oferece as atividades | a fila do totem e do navegador da fábrica passa a listá-las |
| os tickets da semana não têm o que imprimir | os tickets ficam disponíveis |

A fila do colaborador — em **Minha fila** (capítulo 10) e no **Modo Fábrica** (capítulo 13) — **depende exclusivamente da versão publicada**. Rascunho e revisão não aparecem para ninguém.

Sem versão publicada para a semana, a fila do colaborador fica vazia, e o Modo Fábrica mostra **"Nenhuma atividade planejada para você no momento."** com a orientação de confirmar com o gestor se o planejamento foi publicado.

Publicar uma revisão **substitui** a versão anterior: o que você tirou do plano sai da fila, o que você acrescentou entra.

### De onde vem o tempo previsto da produção

Este ponto tem consequência direta no piso de fábrica.

O campo **Minutos planejados** que você define ao distribuir a atividade é **o tempo previsto que o Modo Fábrica usa** para aquele colaborador naquela atividade.

No Modo Fábrica (capítulo 13), quando o tempo já apontado mais o apontamento novo passam desse valor, o sistema **exige justificativa** do colaborador. Então:

- um tempo planejado apertado faz o colaborador cair na justificativa por excesso mais cedo;
- um tempo planejado folgado atrasa esse aviso;
- publicar uma revisão com outro valor muda o limite a partir daquele momento.

O valor sugerido pelo sistema é o tempo que ainda falta na atividade, calculado como **tempo por unidade × quantidade prevista, menos o que já foi apontado**. Se a quantidade prevista da atividade mudar na estrutura da esteira, o tempo sugerido muda junto — mas o valor que você já gravou no plano **não** é recalculado sozinho.

Na área autenticada o comportamento é outro: lá o apontamento **não** exige justificativa por passar do previsto (capítulo 7). A exigência é só do Modo Fábrica.

### Esteiras aguardando encaixe

Painel de diagnóstico e ponto de entrada para o outro caminho de planejamento.

Quando uma esteira tem **plano próprio** (capítulo 6) e esse plano foi enviado para a fábrica, as atividades dele não vão para o Backlog operacional: ficam aqui, agrupadas por esteira, esperando que você as encaixe na semana.

Cada esteira mostra o estado do plano dela, o estado na fábrica, o responsável atual e o período sugerido. Cada atividade mostra tarefa, setor, nome, a **data sugerida** (ou *"Sem data sugerida"*), o tempo planejado, o responsável sugerido, quanto já foi realizado e, quando aplicável, **"Revisão necessária"**.

Clicar na atividade abre a janela **Adicionar ao plano**, com o selo **Plano da Esteira** — as datas e tempos vêm sugeridos, e você pode mudar. **Encaixar é a ação; o painel em si é leitura.**

Esses cartões ainda exibem a situação da atividade em código interno. É pendência conhecida — veja o capítulo 21.

### Pendências de sincronização

Mostra as atividades em que **o plano da esteira e o planejamento da semana discordam**. As diferenças são sempre em um destes quatro pontos:

**Data** · **Minutos** · **Colaborador** · **Equipe**

Cada linha mostra os dois lados — **Plano da esteira** e **Fábrica** — para você comparar. No cartão do quadro, a atividade recebe o selo **Pendência de sincronização**.

Para resolver, você tem duas saídas:

1. **Aplicar plano da esteira** — o botão traz os valores do plano da esteira para o planejamento da semana. Confirmação: **"Valores do plano da esteira aplicados ao planejamento da fábrica."**
2. **Ajustar à mão** no quadro, se a decisão da fábrica é que vale.

Não há sincronização automática: a divergência fica visível até você agir. E, como qualquer alteração, só chega à fábrica depois de salvar e publicar.

Sem divergências: **"Nenhuma pendência nesta semana."**

### Fora do planejado

Lista os apontamentos da semana em atividades que **não estão no plano daquela semana**.

A regra é por **atividade**: se a atividade está no plano, nenhum apontamento dela aparece aqui — mesmo que tenha sido feito por outro colaborador ou em outro dia. Se não está, todo apontamento dela na semana aparece.

É **informativo**. O painel não tem ação: não há como incorporar o apontamento ao plano a partir dele. O que você faz com a informação é decidir se aquele trabalho deveria estar planejado — e, se sim, distribuí-lo no quadro.

O painel considera a semana carregada e **ignora os filtros de situação** do quadro; respeita os filtros de esteira, colaborador e busca. A própria tela explica isso quando o painel está visível.

Sem nada fora do plano: **"Nenhum apontamento fora do plano nesta semana."**

### Resumo operacional e desvios

Acima do quadro, a faixa **Resumo operacional** traz: **Planejado**, **Realizado**, **Concluídas**, **Em andamento**, **Sem apontamento**, **Atenção** e **Fora do planejado**.

**Desvios da semana** mostra os indicadores da visão filtrada. **Principais desvios** lista os casos concretos, em quatro tipos:

| Tipo | O que indica |
|---|---|
| **Fora do planejado** | houve apontamento em atividade que não está no plano |
| **Planejado sem execução** | a atividade está no plano e ninguém apontou nada |
| **Acima do planejado** | o realizado passou do tempo planejado |
| **Atingiu planejado sem concluir** | o tempo acabou e a atividade continua aberta |

Não existe gaveta **Atenção** nesta tela — "Atenção" aqui é uma coluna do resumo. A gaveta de atenção pertence à **Agenda da semana** (capítulo 9).

### Histórico da semana

Registra o que de fato aconteceu na semana, com filtro por **Todos os tipos**, **Apontamentos**, **Conclusões** e **Reaberturas**.

Serve para explicar divergências: por que uma atividade está fora do plano, quem concluiu o quê, quando algo foi reaberto.

Mensagens: **"Carregando histórico…"**, **"Histórico indisponível nesta semana."**, **"Nenhum fato operacional registrado nesta semana."**

### As duas exportações

Os dois botões ficam no alto da tela e entregam coisas diferentes:

| | **Exportar Excel** | **Exportar visão semanal** |
|---|---|---|
| formato | duas planilhas: **Planejamento** e **Capacidade** | uma planilha, em matriz |
| organização | uma linha por atividade planejada; a segunda planilha traz capacidade por colaborador e dia | colaborador nas linhas, dias (segunda a sexta) nas colunas |
| para que serve | conferência detalhada e análise de capacidade | visão de quadro para imprimir ou compartilhar |

As duas exportam **a semana salva inteira** — os filtros do quadro **não** entram na conta. O recorte é sempre a semana, não a visão filtrada.

A planilha **Planejamento** identifica a situação da semana como **PUBLICADO**, **RASCUNHO** ou **REVISAO_NAO_PUBLICADA**. A planilha **Capacidade** classifica cada colaborador/dia em:

**Capacidade não cadastrada** · **Sobrecarregado** · **No limite** · **Disponível**

Aqui também não há faixa intermediária: só é **Sobrecarregado** quando o planejado passa da capacidade.

**Com alterações não salvas, o botão muda de nome** para **Salvar e exportar** (ou **Salvar e exportar visão semanal**). Ele salva primeiro e exporta depois. **Se o salvamento falhar, nada é baixado** — você vê o erro e o arquivo não sai.

Ambos ficam desativados com o plano vazio, e um bloqueia o outro enquanto está gerando. Durante o processo o rótulo vira **Exportando...**.

### Imprimir tickets

Dois caminhos, com recortes diferentes:

| Botão | O que imprime |
|---|---|
| **Imprimir tickets da semana (N)** | todas as atividades planejadas na semana |
| **Imprimir tickets visíveis (N)** | só as atividades que estão aparecendo no quadro com os filtros atuais |

Este é o único lugar da tela em que os filtros **mudam** o resultado.

A janela **Imprimir tickets da semana** oferece **Agrupar por** — **Responsável** ou **Tarefa / esteira** — e a opção **Incluir atividades concluídas**, desligada por padrão.

Sobre a impressora, a janela mostra o estado do agente local: **"Verificando agente local..."**, **"Impressão direta disponível"** ou **"Agente local indisponível"**, com **Testar impressora térmica** quando disponível. Sem o agente, o sistema usa a impressão do navegador e avisa: **"Agente de impressão local não encontrado. Usando impressão pelo navegador."**

A janela lembra o que o ticket é: *"Use os tickets como apoio físico na operação. O status oficial da atividade continua sendo controlado no SGP+."* O papel não é a fonte da verdade.

Sem nada planejado: **"Nenhuma atividade planejada nesta semana."**

## Quando algo é bloqueado

### A semana não carrega

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Não foi possível carregar o plano da semana."** | falha ao buscar a semana | troque de semana e volte, ou recarregue; se persistir, abra chamado |
| **"Não foi possível carregar o histórico desta semana."** | só o histórico falhou | o restante da tela continua utilizável |
| aviso de que a data de fim do plano está inconsistente | dado antigo com fim de semana fora da sexta | nada a fazer: a tela já mostra segunda a sexta e a data é corrigida ao salvar |

### Não consigo distribuir a atividade

| O que você vê | Por que | O que fazer |
|---|---|---|
| a atividade não está no Backlog operacional | ver a tabela de exclusões acima | confira a situação da esteira e se ela já não está planejada |
| **"Todas as atividades carregadas no backlog já foram planejadas nesta semana."** | não há mais nada a distribuir | nada a fazer |
| **"Cada Atividade só pode aparecer uma vez no plano."** | a mesma atividade foi colocada duas vezes | remova a duplicata |
| **"Atividade já está planejada em outro plano semanal."** | ela está em outra semana | retire-a da outra semana primeiro |
| **"Atividade já concluída não pode ser planejada."** | o trabalho já terminou | nada a planejar |
| **"Atividade inativa não pode ser planejada."** | saiu da estrutura da esteira | confira a estrutura com quem alterou a esteira |
| **"Cada item do plano da esteira só pode ser encaixado uma vez na semana."** | o mesmo item de encaixe foi usado duas vezes | remova a duplicata |
| **"Item do plano da esteira já está encaixado em outro plano semanal."** | ele está em outra semana | retire-o da outra semana |
| **"Plano da esteira não está aguardando encaixe na fábrica."** | o plano da esteira mudou de estado desde que a tela carregou | recarregue a semana |

### Não consigo salvar

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Não foi possível salvar o rascunho."** | falha ao gravar | tente de novo; se persistir, abra chamado |
| **"Não foi possível salvar as alterações no plano ativo."** | falha ao gravar a revisão | o mesmo |
| **"As datas deste plano estão inconsistentes. Recarregue a semana e tente novamente. Se o problema continuar, acione o suporte."** | as datas da tela e do plano gravado não coincidem | recarregue a semana e repita |
| **"Plano não encontrado."** | o plano foi alterado ou removido por outra pessoa | recarregue a semana |

### Não consigo publicar

| O que você vê | Por que | O que fazer |
|---|---|---|
| botão desativado sem aviso | há alterações não salvas | salve primeiro |
| **"Adicione ao menos uma atividade antes de publicar o plano."** | o plano está vazio | distribua ao menos uma atividade |
| **"Este plano já está publicado."** | não há revisão a publicar | para mudar, altere, salve e publique |
| **"Não foi possível publicar o plano."** | falha ao publicar | tente de novo; se persistir, abra chamado |

### Exportação e impressão

| O que você vê | Por que | O que fazer |
|---|---|---|
| botão de exportar desativado | o plano está vazio, ou a outra exportação está em andamento | distribua atividades, ou aguarde |
| **"Não foi possível exportar o Excel do planejamento."** | falha ao gerar | tente de novo |
| **"Não foi possível exportar a visão semanal do planejamento."** | falha ao gerar a outra planilha | o mesmo |
| nenhum arquivo baixou depois de **Salvar e exportar** | o salvamento falhou e a exportação foi cancelada | corrija o erro de salvamento e repita |
| **"Nenhuma atividade planejada nesta semana"** no botão de tickets | não há o que imprimir | distribua atividades |
| **"Agente local indisponível"** | o agente de impressão não respondeu | a impressão sai pelo navegador; para impressão direta, acione quem cuida da estação |

[IMAGEM SUGERIDA: Planejamento da Semana — cabeçalho com a navegação de semana, o selo "Revisão em planejamento" e o selo "Alterações não publicadas", seguido do quadro colaborador × dia com cartões distribuídos]

[IMAGEM SUGERIDA: Aviso "Capacidade diária ultrapassada" com Colaborador, Data, Capacidade diária, Tempo planejado e Excedente, e a frase de que o planejamento pode continuar]

[IMAGEM SUGERIDA: Janela "Adicionar ao plano" com os atalhos "Cadastrados na atividade", o campo Dia e o campo Minutos planejados preenchido com o tempo restante]

[IMAGEM SUGERIDA: Os três painéis de diagnóstico lado a lado — Esteiras aguardando encaixe, Pendências de sincronização com o botão Aplicar plano da esteira, e Fora do planejado]

[IMAGEM SUGERIDA: As duas exportações comparadas — a planilha Planejamento com uma linha por atividade e a visão semanal em matriz colaborador × dia]

---

# 9. Agenda da semana

## Para que serve

A Agenda da semana é uma **segunda forma de mexer no mesmo plano semanal** do capítulo 8.

Não é outro planejamento. É a mesma semana, o mesmo plano, as mesmas versões de rascunho e publicado. O que muda é o jeito de trabalhar: aqui você **arrasta atividades** para a grade de colaborador e dia, atribui em lote quando há muita coisa parada, e resolve pendências por uma gaveta de atenção. Foi feita para distribuir rápido e para funcionar em tela sensível ao toque.

A consequência prática é direta: **o que você faz aqui aparece no Planejamento, e o que você faz lá aparece aqui.** São duas janelas para o mesmo trabalho.

Use a Agenda quando o objetivo é distribuir e ajustar com agilidade. Use o Planejamento (capítulo 8) quando precisar de ajuste fino de tempo, filtros, exportações em Excel ou dos painéis de diagnóstico completos.

## Onde fica

Menu lateral, agrupamento **Gestão** → **Agenda da semana**. O item aparece com o selo **Novo**.

O título na tela é **Agenda da Semana**, com a frase *"Distribua e acompanhe atividades por colaborador — visualização da semana operacional."*

## Quem costuma ter acesso

Exatamente a mesma capacidade do Planejamento: quem pode criar e alterar esteiras.

Sem ela, o item não aparece no menu. Dentro da tela não há recortes por perfil — quem entra pode distribuir, salvar e publicar.

A ação **Concluir** no cartão depende dessa mesma permissão de gestão. **Apontar tempo** e **Imprimir ticket** não dependem dela.

## Como fazer

### Entender o que a Agenda compartilha com o Planejamento

Vale conhecer a divisão antes de começar, para não procurar na tela errada.

**É o mesmo em ambas as telas:**

| | |
|---|---|
| a semana | segunda a sexta, mesma navegação |
| o plano e suas versões | rascunho, publicado vigente e revisão em planejamento |
| a lista de atividades disponíveis | mesma origem e mesmas regras de quem entra |
| o tempo planejado de cada item | o mesmo valor, usado pelo Modo Fábrica |
| a capacidade do colaborador | mesmos valores e mesma regra de sobrecarga |
| salvar e publicar | mesmos botões, mesmas mensagens, mesmo efeito |
| as divergências de sincronização | mesma lista e mesma ação de aplicar |
| os apontamentos fora do plano | mesma lista |

**Só a Agenda tem:**

- arrastar e soltar na grade, e atribuição por toque;
- **Alocação em lote**, com sugestão de quem tem mais folga;
- a gaveta **Atenção** com contador;
- abas de dia para trabalhar um dia por vez em tela pequena;
- todos os colaboradores ativos sempre visíveis como linhas, mesmo sem nada planejado.

**Só o Planejamento tem (capítulo 8):**

- o campo **Minutos planejados** editável ao incluir a atividade;
- as duas exportações em Excel;
- filtros do quadro e busca no plano;
- o painel **Esteiras aguardando encaixe**;
- **Histórico da semana**, **Desvios da semana** e **Principais desvios**;
- a ação **Reabrir** no cartão;
- **Imprimir tickets visíveis**, com o recorte dos filtros.

### Escolher a semana

A semana vai de **segunda a sexta**, como no Planejamento.

As setas **‹** e **›** andam uma semana para trás e para frente, com o intervalo `dd/mm/aaaa → dd/mm/aaaa` entre elas. Ao abrir, carrega a semana de hoje. Semanas passadas e futuras são abertas e editadas sem restrição.

Ao lado aparece o selo do estado do plano — **Rascunho**, **Publicado vigente** ou **Revisão em planejamento** — e, quando houver, **Alterações não publicadas**. Se a semana nunca foi salva: **"Nenhum plano salvo nesta semana ainda."**

> **Atenção.** Trocar de semana **descarta alterações não salvas, sem aviso nem confirmação.** O mesmo vale para sair da tela. O único sinal é o aviso **"Alterações não salvas — use 'Salvar rascunho' antes de publicar."** Salve antes de navegar.

### Ler a grade

A grade tem **Colaborador** nas linhas e os cinco dias nas colunas. A coluna do dia de hoje recebe o selo **Hoje**.

| Onde | O que mostra |
|---|---|
| cabeçalho do dia | o dia, a data e o total já planejado naquele dia |
| linha do colaborador | o total da semana e quantas atividades, ou **"Sem atividades nesta semana"** |
| célula | o planejado e a capacidade do dia, e os cartões em ordem |
| célula vazia | **"Nenhuma atividade planejada."** |

**Todos os colaboradores ativos aparecem**, inclusive os sem nada planejado — é isso que permite arrastar para quem está livre. Se não houver nenhum: **"Nenhum colaborador ativo encontrado."**

Em tela pequena, a grade mostra **um dia por vez**, escolhido pelas abas de dia (cada aba traz o dia, a data e uma barra com a carga daquele dia). Em tela grande, a semana inteira aparece de uma vez e as abas não são exibidas.

A legenda das cores dos cartões, visível em tela grande, é: **Planejada**, **Em execução**, **Concluída** e **Divergente**.

### Abrir as atividades disponíveis

A lista não fica na tela: ela abre em uma gaveta.

No canto inferior direito há um botão redondo **+ Backlog**, com o número de atividades disponíveis. Ele pulsa quando há três ou mais. Clicar abre a gaveta **Backlog operacional**.

Dentro dela: a busca **"Buscar esteira / atividade…"** com o botão **Buscar**, e um cartão por atividade com a esteira, a tarefa, o setor e **"Pendente: {tempo}"** — o tempo que ainda falta.

Cada cartão pode trazer os selos **Fora de sequência**, **Sem responsável** e **Atrasada**.

> **Atenção.** O selo **Atrasada** não é confiável, porque depende de como o prazo foi preenchido no cadastro da esteira. Confira o prazo na própria esteira antes de priorizar por ele. Pendência registrada no capítulo 21.

As regras de quem entra nessa lista são **as mesmas do capítulo 8** — mesma origem, mesmas exclusões, mesma exceção para atividades incluídas tardiamente. Consulte a tabela de exclusões daquele capítulo.

Quando tudo já foi distribuído: **"Todas as atividades carregadas no backlog já foram planejadas nesta semana."** Quando a busca não encontra nada: **"Nenhuma atividade encontrada para a busca."** Quando não há nada disponível: **"Nenhuma atividade disponível no backlog operacional. Esteiras com Plano Operacional enviado à fábrica aparecem em Aguardando encaixe."** — esse painel de encaixe fica no Planejamento, não aqui.

> **Atenção.** Assim como no Planejamento, uma atividade **dispensada** pode aparecer nessa lista e ser distribuída. Na Agenda o sintoma é visível: o cartão na grade mostra o selo **Dispensada** e o menu dele não oferece **Apontar tempo** nem **Concluir**. Se vir isso, remova do plano. Pendência registrada no capítulo 21.

### Distribuir uma atividade

Dois caminhos, e os dois produzem o mesmo resultado.

**Arrastando.** Pegue o cartão na gaveta e arraste para a célula do colaborador no dia desejado. A gaveta se fecha sozinha para liberar a visão da grade, e aparece uma faixa no alto: *"Arrastando: {atividade} — solte sobre um espaço livre da agenda"*, com **Cancelar**. A célula de destino se destaca quando você passa por cima.

**Por toque.** Toque em **Atribuir** no cartão da gaveta. A gaveta fecha e a faixa muda para *"Atribuindo: {atividade} — toque num espaço livre da grade"*. Todas as células passam a mostrar **"Toque para atribuir aqui"**. Toque na célula desejada e pronto. **Cancelar** desfaz.

Em tela sensível ao toque, arrastar exige **pressionar e segurar por um instante** antes de mover — é o que evita que a rolagem da página seja confundida com um arraste. Se preferir não arrastar, o caminho por toque faz o mesmo.

Em qualquer dos dois, se você soltar fora de uma célula válida, nada acontece: a faixa desaparece e a atividade continua disponível. Não há mensagem de erro.

> O tempo planejado é definido **automaticamente** com o tempo que ainda falta na atividade. **A Agenda não oferece campo para alterar esse valor.** Isso tem consequência no Modo Fábrica — veja "O tempo planejado e o Modo Fábrica", em "O que esperar".

### Distribuir várias de uma vez

Quando há **três ou mais** atividades disponíveis, a gaveta exibe um convite no topo: *"{N} itens parados no backlog"*, com o botão **Alocar tudo em lote**.

Abre a tela **Alocação em lote**, que passa as atividades **uma por uma**:

| Elemento | O que faz |
|---|---|
| **"Item N de M"** e o percentual | onde você está na fila |
| **"Próximo item do backlog"** | a atividade atual, com esteira, setor e tempo previsto |
| **Sugestão** | o colaborador com **a maior folga da semana**, e quanto tempo livre ele tem |
| **"Atribuir a {nome} · {dia}"** | aceita a sugestão e passa para a próxima |
| **"Escolher outra pessoa ou dia"** | abre **Pessoa** (cada um com sua folga) e **Dia**; depois, **Confirmar alocação** |
| **"Deixar para depois"** | manda a atividade para o fim da fila, sem descartá-la |
| **"Voltar à agenda"** | sai do lote a qualquer momento, mantendo o que já foi atribuído |

A sugestão é calculada pela folga da semana — capacidade menos o que já está planejado, somando os cinco dias. Para quem não tem capacidade cadastrada, o cálculo assume uma jornada padrão de 8 horas por dia.

Ao terminar a fila: **"Fila concluída."** e, de volta à grade, **"Todos os itens do lote foram atribuídos ao rascunho."**

A palavra *rascunho* na mensagem é literal e importante: **o lote não salva nada.** Tudo continua sendo alteração local até você salvar.

### Mover entre dias e colaboradores

| O que fazer | Como |
|---|---|
| mudar o **dia**, mesmo colaborador | arraste o cartão para outra célula da mesma linha — ou, em tela pequena, **solte o cartão sobre a aba do dia** |
| mudar o **colaborador** | arraste para a célula de outra linha |
| mudar **os dois** | arraste para a célula cruzando a linha e a coluna desejadas |
| mudar a **ordem** dentro da célula | arraste o cartão sobre outro cartão da mesma célula |

Soltar um cartão sobre outro **de célula diferente** move a atividade para aquela célula, posicionando-a antes do cartão de destino.

Não há restrição por situação: uma atividade **já publicada**, **com apontamentos** ou **concluída** pode ser movida do mesmo jeito. O que foi apontado não se perde — apontamento é registro de execução e não acompanha o planejamento. Mas lembre-se de que, enquanto a nova posição não for publicada, o colaborador continua vendo a anterior.

### Remover do plano

Cada cartão tem um botão **⋯** (*"Ações da atividade"*) com a opção **Remover do plano**. Não há confirmação.

O comportamento **depende do estado da semana**, e esta é a principal diferença de funcionamento em relação ao capítulo 8:

| Estado da semana | O que acontece ao remover |
|---|---|
| **Rascunho** (nunca publicada) | sai apenas da tela; só é gravado quando você salvar |
| **Publicado vigente** ou **Revisão em planejamento** | a Agenda **grava a remoção na hora**, como revisão, e confirma com *"Revisão salva. A fila dos colaboradores continua usando a última versão publicada."* |

Ou seja: em uma semana já publicada, **remover é imediato e não precisa de salvar** — mas **continua não chegando ao colaborador** até você publicar. A versão publicada ainda tem a atividade; a revisão já não tem.

Em qualquer dos casos a atividade volta a ficar disponível na gaveta do backlog, pronta para ser redistribuída.

Se a gravação automática falhar, aparece **"Não foi possível salvar a revisão do plano."** e a tela recarrega a semana para mostrar o estado real.

### Salvar

O botão de salvar muda de nome conforme o estado, como no Planejamento:

- **Salvar rascunho** — semana sem versão publicada. Confirmação: **"Rascunho salvo."**
- **Salvar alterações** — semana com versão publicada. Confirmação: **"Revisão salva. A fila dos colaboradores continua usando a última versão publicada."**

Só fica ativo quando há algo não salvo.

### Publicar

**Publicar plano** leva a semana para a fábrica. Confirmação: **"Plano publicado. A fila dos colaboradores foi atualizada."**

As condições são **idênticas** às do capítulo 8. O botão fica desativado quando:

| Situação | O que o botão informa |
|---|---|
| há alterações não salvas | — (salve primeiro) |
| o plano está vazio | **"Adicione ao menos uma atividade antes de publicar o plano."** |
| já está publicado e não há revisão | **"Este plano já está publicado."** |

### Concluir uma atividade pela Agenda

O menu **⋯** do cartão oferece, conforme a situação da atividade:

| Opção | Quando aparece |
|---|---|
| **Apontar tempo** | atividade não concluída e não dispensada |
| **Concluir** | atividade não concluída e não dispensada, e você tem a permissão de gestão |
| **Imprimir ticket** | sempre |
| **Remover do plano** | sempre |

**Apontar tempo** abre o mesmo registro de horas do capítulo 7, com os mesmos campos e as mesmas regras. Não há exigência de justificativa por tempo acima do previsto aqui — essa exigência é só do Modo Fábrica (capítulo 13).

**Concluir** segue dois passos:

1. Se a atividade estiver **fora da sequência recomendada** — porque há atividade anterior ainda aberta —, o sistema pede a justificativa: *"Esta atividade está fora da sequência recomendada. Informe a justificativa para concluí-la:"*. Deixar em branco recusa a conclusão com **"Informe uma justificativa para concluir fora da sequência."**
2. Em seguida, a confirmação **"Confirmar conclusão desta atividade?"**

Concluída, aparece **"Atividade concluída."**, o cartão muda de cor e o menu dele deixa de oferecer **Apontar tempo** e **Concluir**.

É possível concluir **sem nenhum apontamento** — o sistema não exige tempo registrado para concluir pela Agenda.

A conclusão **não** depende de salvar nem de publicar: ela é registrada na atividade, não no planejamento. E **não há como reabrir pela Agenda** — para isso, use o cartão no Planejamento (capítulo 8) ou a estrutura da esteira (capítulo 6).

## O que esperar

### O que a publicação muda

Igual ao capítulo 8, porque é o mesmo plano: a fila do colaborador em **Minha Fila** (capítulo 10) e no **Modo Fábrica** (capítulo 13) **só reflete a versão publicada**.

Enquanto a semana estiver em rascunho ou revisão, nada do que você montou aqui chega a ninguém — nem o que foi atribuído em lote, nem o que foi movido, nem o que foi removido com gravação automática.

Publicar uma revisão substitui a versão anterior inteira.

### O tempo planejado e o Modo Fábrica

Ponto de atenção real, por causa de uma diferença entre as duas telas.

O tempo planejado de cada item é o valor que o **Modo Fábrica** usa como previsto: quando o apontado passa dele, o colaborador precisa justificar o excesso (capítulo 13).

Na Agenda, esse valor é definido **automaticamente** com o tempo que ainda falta na atividade, e **não há campo para alterá-lo**. Então:

- distribuir pela Agenda aceita o tempo sugerido pelo sistema, qualquer que seja;
- se você precisa de um tempo diferente do sugerido, faça essa atividade pelo **Planejamento** (capítulo 8), onde o campo **Minutos planejados** é editável;
- mover a atividade entre dias ou pessoas **não** altera o tempo planejado.

### Capacidade e sobrecarga

Mesmas regras e mesmos valores do capítulo 8, exibidos de outra forma.

Cada célula mostra o planejado e a capacidade do dia daquele colaborador. Quando passa do limite, a célula ganha o aviso **"Capacidade excedida em {tempo}"**.

Quando uma ação sua faz uma célula cruzar o limite, abre o mesmo aviso **Capacidade diária ultrapassada**, com Colaborador, Data, Capacidade diária, Tempo planejado e Excedente — e a mesma frase: **"Você pode continuar o planejamento normalmente."**

**Sobrecarga não bloqueia nada**, nem na Agenda nem no Planejamento. Não há faixa de alerta antes do limite: 100% exatos ainda é normal.

O aviso só aparece quando a carga da célula **aumentou** e cruzou o limite. Remover trabalho ou reordenar não dispara nada. Os totais da célula, do dia e da semana são recalculados a cada alteração, antes de salvar.

### A gaveta Atenção

No alto da tela, a faixa de resumo traz **Planejado**, **Realizado** e **Equipe no plano**. Ao lado, quando há algo a tratar, aparece o botão **Atenção** com um número.

Esse número reúne **exatamente duas coisas**, e nada além disso:

| Categoria | O que é |
|---|---|
| **divergências de sincronização** | o plano da esteira e o planejamento da semana discordam |
| **apontamentos fora do plano** | houve apontamento em atividade que não está no plano da semana |

O resumo ao lado do número detalha a composição — *"{n} divergência(s)"* e *"{n} fora do plano"*.

**Sobrecarga de capacidade e atividade sem responsável não entram nessa contagem.** Sobrecarga aparece na própria célula; a falta de responsável aparece como selo no cartão do backlog.

Clicar abre a gaveta **Itens de atenção**, com a frase *"Divergências de sincronização e apontamentos fora do plano semanal."* e os dois painéis. Fecha por **Fechar** ou pela tecla Esc.

Quando não há nada: **"Nenhum item de atenção nesta semana."**

### Pendências de sincronização

Primeiro painel da gaveta, o mesmo do capítulo 8.

Lista as atividades em que o **plano da esteira** e o **planejamento da semana** discordam, sempre em um destes quatro pontos: **Data**, **Minutos**, **Colaborador** e **Equipe**. Cada linha mostra os dois lados para comparação, e o cartão na grade recebe o selo de pendência e a cor **Divergente**.

Tem ação: **Aplicar plano da esteira** traz os valores do plano da esteira para o planejamento da semana, confirmando com **"Valores do plano da esteira aplicados ao planejamento da fábrica."**

Alternativa: ajustar à mão na grade, se a decisão da fábrica é que vale.

Não há sincronização automática — a divergência fica visível até você agir. Depois de aplicar ou ajustar, **a mudança ainda precisa ser publicada** para chegar ao colaborador.

Sem divergências: **"Nenhuma pendência nesta semana."**

### Fora do planejado

Segundo painel da gaveta, também o mesmo do capítulo 8.

Lista os apontamentos da semana em atividades **que não estão no plano daquela semana**. O critério é por **atividade**: se ela está no plano, nenhum apontamento dela aparece aqui, mesmo feito por outra pessoa ou em outro dia.

É **informativo** — o painel não tem nenhuma ação. Não há como incorporar o apontamento ao plano a partir dele. O que você faz com a informação é decidir se aquele trabalho deveria estar planejado e, se sim, distribuí-lo na grade.

O painel não altera capacidade nem interfere na publicação.

Sem nada fora do plano: **"Nenhum apontamento fora do plano nesta semana."**

### Imprimir tickets

No alto da tela, **Imprimir tickets da semana (N)** abre a mesma janela do capítulo 8, com **Agrupar por** (Responsável ou Tarefa / esteira), **Incluir atividades concluídas** e os estados do agente de impressão local.

Cada cartão também oferece **Imprimir ticket** no menu **⋯**, para uma atividade só.

A Agenda **não** tem o botão "Imprimir tickets visíveis" — ele depende dos filtros do quadro, que só existem no Planejamento.

## Quando algo é bloqueado

### A semana não carrega

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Carregando semana…"** que não termina | a semana está sendo buscada | aguarde; se persistir, recarregue |
| **"Não foi possível carregar o plano desta semana."** | falha ao buscar a semana | troque de semana e volte, ou recarregue; se persistir, abra chamado |
| **"Nenhum colaborador ativo encontrado."** | não há colaborador ativo cadastrado | não há onde distribuir; verifique o cadastro de colaboradores (capítulo 16) |

### Não consigo distribuir a atividade

| O que você vê | Por que | O que fazer |
|---|---|---|
| a atividade não está na gaveta | as regras de elegibilidade do capítulo 8 a excluíram | confira a situação da esteira e se ela já não está planejada |
| arrastei e nada aconteceu | a atividade **já está no plano desta semana**, ou foi solta fora de uma célula válida | procure-a na grade; se já estiver lá, não é possível repeti-la |
| o cartão mostra o selo **Dispensada** | atividade dispensada que entrou no plano | remova do plano; ela nunca chegaria ao colaborador |
| **"Todas as atividades carregadas no backlog já foram planejadas nesta semana."** | não há mais nada a distribuir | nada a fazer |
| **"Nenhuma atividade encontrada para a busca."** | a busca não encontrou nada | revise o termo buscado |

Quando uma tentativa é recusada pelo sistema no momento de salvar, as mensagens são as mesmas do capítulo 8 — entre elas **"Cada Atividade só pode aparecer uma vez no plano."** e **"Atividade já está planejada em outro plano semanal."**

### Perdi alterações

| O que aconteceu | Por que | O que fazer |
|---|---|---|
| troquei de semana e o que eu tinha montado sumiu | a troca de semana descarta alterações não salvas, sem aviso | salve antes de navegar; o aviso **"Alterações não salvas"** é o sinal |
| saí da tela e perdi o que havia distribuído | não existe proteção ao sair com alterações pendentes | o mesmo |
| atribuí tudo em lote e a fila do colaborador não mudou | o lote só monta o rascunho | salve e publique |

### Não consigo salvar ou publicar

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Não foi possível salvar o rascunho."** | falha ao gravar | tente de novo; se persistir, abra chamado |
| **"Não foi possível salvar as alterações no plano ativo."** | falha ao gravar a revisão | o mesmo |
| **"Não foi possível salvar a revisão do plano."** | falha na gravação automática de uma remoção em semana publicada | a tela recarrega a semana; confira se a remoção valeu e repita |
| **"As datas deste plano estão inconsistentes. Recarregue a semana e tente novamente. Se o problema continuar, acione o suporte."** | as datas da tela e do plano gravado não coincidem | recarregue a semana e repita |
| botão de publicar desativado sem aviso | há alterações não salvas | salve primeiro |
| **"Adicione ao menos uma atividade antes de publicar o plano."** | o plano está vazio | distribua ao menos uma atividade |
| **"Este plano já está publicado."** | não há revisão a publicar | para mudar, altere, salve e publique |
| **"Não foi possível publicar o plano."** | falha ao publicar | tente de novo; se persistir, abra chamado |

### Não consigo concluir

| O que você vê | Por que | O que fazer |
|---|---|---|
| o menu do cartão não mostra **Concluir** | a atividade já está concluída ou dispensada, ou você não tem a permissão de gestão | confira a situação no selo do cartão |
| **"Informe uma justificativa para concluir fora da sequência."** | a justificativa foi deixada em branco | informe o motivo e repita |
| **"Não foi possível concluir a atividade."** | falha ao concluir | tente de novo; se persistir, abra chamado |
| quero reabrir uma atividade concluída | a Agenda não oferece essa ação | use o cartão no Planejamento (capítulo 8) ou a estrutura da esteira (capítulo 6) |

### Impressão

| O que você vê | Por que | O que fazer |
|---|---|---|
| botão de tickets desativado | não há atividade planejada na semana | distribua atividades |
| **"Agente local indisponível"** | o agente de impressão não respondeu | a impressão sai pelo navegador; para impressão direta, acione quem cuida da estação |

[IMAGEM SUGERIDA: Agenda da Semana — cabeçalho com navegação de semana e selo de estado, faixa de resumo com o botão Atenção e a grade colaborador × dia preenchida]

[IMAGEM SUGERIDA: arraste em andamento — a faixa "Arrastando: {atividade} — solte sobre um espaço livre da agenda" no alto, com a célula de destino destacada]

[IMAGEM SUGERIDA: gaveta "Backlog operacional" aberta a partir do botão + Backlog, com o convite "Alocar tudo em lote" e os cartões de atividade]

[IMAGEM SUGERIDA: tela "Alocação em lote" com o progresso, o bloco Sugestão e os botões de atribuir, escolher outra pessoa e deixar para depois]

[IMAGEM SUGERIDA: gaveta "Itens de atenção" com os dois painéis — Pendências de sincronização, com o botão Aplicar plano da esteira, e Fora do planejado]

---

# 10. Minha Fila

## Para que serve

A **Minha fila** é a sua lista de trabalho do dia. É o ponto em que o planejamento da semana deixa de ser intenção da gestão e vira tarefa sua: cada cartão é uma atividade que alguém reservou para o seu nome, em uma data, com um tempo previsto.

Ela responde a quatro perguntas:

- o que eu tenho para fazer hoje;
- o que ficou para trás e continua pendente;
- o que eu já encerrei;
- por onde começar.

Minha fila **não é planejamento**. Você não acrescenta, não remove e não muda a data de uma atividade por aqui — quem faz isso é a gestão, no Planejamento semanal (capítulo 8) ou na Agenda da semana (capítulo 9). O que você faz aqui é **apontar o tempo trabalhado** e **concluir** a atividade.

Na área autenticada ela é a tela equivalente à fila do **Modo Fábrica** (capítulo 13). As duas nascem do mesmo planejamento publicado, mas **não mostram as mesmas informações nem oferecem as mesmas ações**. A comparação está no final do capítulo.

## Onde fica

Menu lateral, agrupamento **Colaborador** → **Minha fila**.

O título na tela é **Minha fila**, com a frase *"Atividades planejadas para hoje, em ordem de execução."*. Logo abaixo aparece a origem do que está sendo exibido:

| Aviso de origem | O que significa |
|---|---|
| *"Exibindo plano publicado."* | existe planejamento publicado para a semana da data escolhida |
| *"A fila mostra apenas planos publicados."* | não existe planejamento publicado para aquela semana — ou sua conta não está vinculada a um colaborador |

Para quem entra no sistema como colaborador, é a primeira tela da área **Colaborador**.

[IMAGEM SUGERIDA: tela Minha fila com o painel de números, o seletor de data e os grupos Atrasadas, Hoje e Concluídas]

## Quem costuma ter acesso

**Todos os usuários autenticados.** Não há permissão específica: o item aparece no menu para qualquer conta ativa, e a tela abre para todas elas.

O que decide se a tela tem conteúdo é outra coisa — **sua conta precisa estar ligada ao seu cadastro de colaborador**. Sem esse vínculo a fila abre vazia e mostra o aviso *"Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso."*. É um caso de administração de usuários (capítulo 16), não de permissão.

A fila é sempre **a sua**: mostra apenas as atividades reservadas ao seu nome. Não existe aqui a opção de consultar a fila de outra pessoa; para isso a gestão usa a Agenda da semana e a Jornada gerencial (capítulos 9 e 12).

## Como fazer

### Entender de onde vem a fila

A fila é montada em três passos, nesta ordem:

1. o sistema identifica **a semana** da data escolhida — a semana operacional vai de **segunda a sexta**;
2. procura o **planejamento publicado** daquela semana;
3. recolhe desse planejamento as atividades **reservadas ao seu nome** naquela data.

Disso nascem as regras que explicam quase tudo o que você vai ver:

- **Sem planejamento publicado não há fila.** Rascunho não conta. Revisão salva e não publicada não conta.
- **Vale sempre a última versão publicada.** Quando a gestão publica de novo, a fila passa a mostrar a nova versão inteira: o que saiu desaparece, o que entrou aparece.
- **A fila só olha uma semana por vez.** A semana é a da data que você está vendo. Pendência de outra semana não aparece aqui.
- **A fila é nominal.** Uma atividade entra porque o planejamento escreveu o seu nome nela — não porque você está alocado na esteira. Os dois não são a mesma coisa, e a diferença aparece no cartão (veja *Fora da sua alocação*, mais adiante).

### Saber por que uma atividade ainda não apareceu

Esta é a dúvida mais comum, e quase sempre a resposta é uma destas:

| Situação | Por que a atividade não está na fila | O que fazer |
|---|---|---|
| a gestão distribuiu, mas só **salvou** | enquanto o planejamento não é publicado, nada chega à fila | pedir a publicação da semana |
| a gestão está **revisando** uma semana já publicada | a revisão só vale depois de publicada de novo; até lá a fila continua mostrando a versão anterior | aguardar a republicação |
| a atividade foi planejada para **outra data** | a fila mostra a data escolhida, não a semana inteira | navegar até a data certa |
| a atividade foi planejada para **outra pessoa** | a fila é nominal | falar com a gestão |
| a atividade foi **concluída** ou **dispensada** | deixa de ser trabalho executável | nada a fazer |

O caminho inverso também é verdadeiro: **enquanto a gestão não publicar a revisão, uma atividade que ela já removeu do plano continua na sua fila** — e continua apontável. Se você estranhar um item que lhe disseram ter sido retirado, confirme com a gestão antes de trabalhar nele.

### Escolher a data de trabalho

A faixa acima dos grupos controla a data. Ela traz, nesta ordem, **Dia anterior**, um campo de calendário, **Próximo dia**, **Hoje** e, à direita, a data escolhida escrita por extenso — por exemplo *"segunda-feira, 06 de out."*.

| O que você quer | Como fazer |
|---|---|
| ver o dia de hoje | a fila **já abre em hoje**; o botão **Hoje** volta para ele a qualquer momento |
| andar um dia para trás ou para frente | **Dia anterior** / **Próximo dia** |
| ir direto a uma data | o campo de calendário |

Pontos de atenção reais:

- **Você pode olhar para frente.** Datas futuras são aceitas na navegação. Serve para se preparar; não serve para apontar, porque o apontamento não aceita data futura (capítulo 7).
- **Você pode olhar para trás sem limite.** E pode apontar retroativamente a partir do cartão — a data do apontamento é escolhida na gaveta, não herdada da fila. Isso está explicado em *Apontar pela fila*.
- **Sábado e domingo não têm planejamento.** A semana planejada é de segunda a sexta. Em um fim de semana a fila não traz atividades daquele dia; traz apenas o que ficou pendente na semana correspondente, no grupo **Atrasadas**.
- **Trocar para uma data de outra semana troca o planejamento consultado.** Se aquela semana não tiver planejamento publicado, a fila aparece vazia mesmo que a semana atual esteja cheia.

### Ler o painel de números do dia

Acima dos grupos ficam quatro números, referentes **à data que está sendo exibida**:

| Número | O que conta |
|---|---|
| **Atividades de hoje** | quantas atividades foram planejadas para você naquela data — incluindo as já concluídas e as dispensadas |
| **Minutos planejados** | a soma do tempo previsto dessas atividades, pelo mesmo critério |
| **Atenção à sequência** | quantas atividades têm alguma atividade anterior da esteira ainda aberta |
| **Atrasadas** | quantas atividades vencidas continuam pendentes |

Dois cuidados de leitura:

- os rótulos dizem **hoje**, mas os números são sempre **da data escolhida**. Ao navegar para outro dia, leia-os como "deste dia";
- **Atividades de hoje** e **Minutos planejados** contam o que foi planejado, não o que falta. Uma atividade já concluída continua somando nos dois.

### Entender os três grupos

A fila é dividida em até três blocos, que aparecem nesta ordem e **só aparecem quando têm conteúdo**:

| Grupo | Entra aqui | Observações |
|---|---|---|
| **Atrasadas** | atividade planejada para um **dia anterior** à data exibida, ainda não encerrada | limitado à mesma semana; o cartão ganha o selo vermelho **Atrasada** |
| **Hoje** | atividade planejada para **a data exibida** e ainda aberta | é o grupo de trabalho normal |
| **Concluídas** | atividade **já concluída** — e também a atividade **dispensada** | fica visível; não desaparece da tela |

Como um cartão muda de grupo:

- ao ser concluída, a atividade passa para **Concluídas** — na próxima atualização da tela;
- no dia seguinte, o que ficou aberto passa para **Atrasadas**;
- se a gestão **reabrir** uma atividade concluída, ela volta a ser trabalho pendente e reaparece em **Hoje** ou em **Atrasadas**, conforme a data planejada. **Não é preciso republicar o planejamento** para isso: a fila lê a situação atual da atividade, não uma fotografia do dia da publicação.

### Reconhecer a próxima atividade recomendada

O selo **Próxima atividade recomendada** marca as atividades que estão **livres para começar agora**. Uma atividade recebe o selo quando:

- não está concluída nem dispensada;
- **não tem nenhuma atividade anterior da esteira em aberto**;
- a esteira dela está liberada para apontamento.

Três coisas importantes:

1. **O selo é orientação, não trava.** Ele não bloqueia as outras atividades: você continua podendo apontar em qualquer cartão da fila.
2. **Mais de um cartão pode trazer o selo.** Se três atividades estiverem livres, as três são recomendadas. Não é um "próximo item" único.
3. **Quando o selo não aparece, aparece o motivo** — a mensagem de sequência descrita a seguir.

[IMAGEM SUGERIDA: cartão da fila com o selo Próxima atividade recomendada, o tempo previsto e os botões Apontar horas e Abrir Esteira]

### Ler o cartão da atividade

Cada cartão traz, na faixa de cima, um número e os selos; no corpo, a identificação do trabalho; e, à direita, as ações.

| Elemento | O que é |
|---|---|
| número no quadrado azul | a posição que **o planejamento** deu à atividade dentro daquele dia |
| selo cinza com o tempo | o **tempo previsto** da atividade, vindo do planejamento publicado (por exemplo *"1 h 30 min"*, ou *"—"* quando não há tempo gravado) |
| **Atrasada** | a data planejada já passou e a atividade continua aberta |
| **Concluída** | a atividade foi concluída |
| **Próxima atividade recomendada** | nada impede começar agora |
| *"Etapa anterior pendente: …"* / **Atenção à sequência** | há atividade anterior da esteira ainda aberta — "etapa" aqui é **atividade** |
| *"Aguardando etapa …"* / *"Aguardando N etapas anteriores"* | a atividade anterior aberta é de **outra pessoa** |
| **Fora da sua alocação** | você foi planejado para esta atividade, mas não consta como alocado nela na estrutura da esteira |
| **Atividade** / **Tarefa ·** / **Setor ·** / **Esteira** / **Data planejada** | identificação do trabalho e onde ele fica |
| linha discreta no pé | cliente, veículo e placa, quando a esteira tem esses dados |

Quando o selo **Fora da sua alocação** aparece, o cartão também explica o efeito: *"Você foi planejado para esta Atividade, mas não está alocado nela. O apontamento exigirá justificativa."*

**O número do cartão não é a ordem da tela.** A tela ordena por grupo, depois pelas atividades livres antes das que têm pendência anterior, depois por data e pela sequência da própria esteira. O número continua sendo o do planejamento. É normal os números não ficarem em ordem crescente — use a posição dos cartões e o selo de recomendação para decidir, não o número.

### O que o cartão não mostra

Vale saber desde já, para não procurar o que não existe nesta tela:

- **não há tempo realizado, tempo pendente nem percentual de avanço** — o cartão mostra apenas o previsto. O quanto já foi apontado você vê em **Minha jornada** (capítulo 11), na esteira (capítulo 6) ou no Modo Fábrica;
- **não há quantidade** no cartão. A quantidade é informada no momento do apontamento;
- **não há impressão de ticket** e **não há reabrir** por aqui.

### Interpretar o aviso de capacidade

Quando o tempo planejado para você naquele dia passa da sua capacidade diária, aparece uma faixa amarela:

> *"Planejamento acima da capacidade do dia: 9 h 30 min planejados para 8 h de capacidade."*

Como ler:

- **planejados** é a soma do tempo previsto das atividades daquele dia — incluindo as já concluídas e as dispensadas;
- **capacidade** é a sua capacidade diária registrada pela gestão. Se houver um ajuste individual válido para aquele dia, vale o ajuste; se não houver nada registrado, o sistema considera **8 h**;
- tempo **Extra Esteira** e tempo já apontado **não entram nessa conta** — ela compara planejamento com capacidade, não execução com capacidade.

**O aviso não bloqueia nada.** Você continua podendo apontar e concluir normalmente. Ele é um sinal de que o dia foi planejado acima do que cabe.

O que fazer ao vê-lo: **avisar a gestão**. Redistribuir o dia e alterar capacidade são decisões do planejamento (capítulos 8 e 9) e da administração de colaboradores (capítulo 16) — não há nada a ajustar nesta tela.

[IMAGEM SUGERIDA: faixa amarela de planejamento acima da capacidade do dia, acima do grupo Atrasadas]

### Apontar pela fila

1. No cartão, clique em **Apontar horas**. Abre a gaveta de **Execução rápida**, já no formulário da atividade — com o título **Registrar tempo** e, no alto, **Esteira**, **Atividade** e setor.
2. Confirme **Data em que o trabalho foi realizado**. Ela **começa sempre em hoje**, mesmo que você esteja vendo um dia anterior na fila. Use os atalhos **Hoje** e **Ontem** ou o calendário. Data futura não é aceita.
3. Informe **Tempo (minutos)**. O campo começa em **0** e exige no mínimo **1**.
4. Informe **Quantidade executada**. Começa em **1**; use **0** quando trabalhou sem concluir nenhuma unidade. O campo não pode ficar vazio.
5. Preencha a **justificativa operacional**, se a tela pedir (veja abaixo).
6. **Descrição** é opcional.
7. Clique em **Salvar apontamento**. A confirmação é *"Apontamento registrado com sucesso."*; em data retroativa, a mensagem acrescenta a data de realização.

São os mesmos campos e as mesmas regras do capítulo 7 — a fila apenas abre o formulário já apontando para a atividade certa. Se quiser trocar de atividade sem fechar a gaveta, use **← Voltar à lista**.

### Quando a fila pede justificativa

Dois casos, e somente estes dois:

**1. Atividade fora da sua alocação.** O cartão já avisa com o selo **Fora da sua alocação**, e no formulário aparece *"Você não está alocado nesta atividade. Para apontar horas, informe uma justificativa (apontamento por exceção)."*

**2. Atividade anterior ainda aberta.** Aparece a faixa **Fora de sequência — confirme o apontamento**, com a contagem — *"Existem atividades anteriores ainda pendentes nesta esteira — antes dela ainda existem 2 atividades pendentes."* — e a lista das atividades em aberto.

Nos dois casos **nada é bloqueado**: você continua, escolhendo um motivo na lista de **justificativa operacional**. Algumas opções pedem um **Complemento**.

Quando existe atividade anterior aberta **de outra pessoa** e o sistema não exige justificativa, aparece apenas um aviso discreto — *"Aguardando etapa …"* ou *"Aguardando N etapas anteriores"*. Nesse caso é só informação.

**Na Minha fila não existe justificativa por passar do tempo previsto.** Você pode apontar mais minutos do que o previsto da atividade sem nenhuma exigência adicional. Essa exigência é só do Modo Fábrica (capítulo 13).

### Concluir pela fila

Não existe botão **Concluir** no cartão. A conclusão é feita dentro da gaveta de apontamento, pelo botão **Salvar apontamento e concluir atividade**.

Isso significa que **concluir pela fila sempre registra tempo**: é preciso informar no mínimo 1 minuto. Se o trabalho já estava todo apontado e você só quer encerrar a atividade sem acrescentar tempo, o caminho é a esteira (capítulo 6) ou a lista de atividades da própria gaveta, por **← Voltar à lista**, onde as atividades alocadas a você trazem o botão **Concluir atividade** com a confirmação *"Concluir esta atividade?"*.

Pré-condições e efeitos:

- a atividade não pode estar concluída nem dispensada, e a esteira precisa estar liberada para apontamento;
- se houver atividade anterior aberta, a justificativa é exigida também para concluir;
- a confirmação é *"Apontamento salvo e atividade concluída."* (ou *"Atividade concluída."*, pela lista);
- concluir **pode liberar a próxima atividade da sequência** — é o que a tela informa: *"Esta ação marca a atividade como concluída e pode liberar a próxima atividade da sequência."*

### Abrir a esteira a partir do cartão

**Abrir Esteira** leva à tela da esteira (capítulo 6), já posicionada na atividade do cartão. É o caminho para ver a estrutura completa, o histórico de apontamentos e as ações de gestão da atividade.

## O que esperar

### Quando a tela se atualiza

| Ação | A fila se atualiza? |
|---|---|
| trocar a data | **sim**, imediatamente |
| botão **Atualizar** (passa a **Atualizando...** enquanto carrega) | **sim** |
| **fechar a gaveta** depois de apontar ou concluir | **sim** |
| **salvar um apontamento** com a gaveta aberta | **não** — a gaveta confirma com o aviso de sucesso e volta para a lista, mas os cartões atrás continuam como estavam |
| voltar à aba do navegador depois de um tempo | **não** — a fila não recarrega sozinha |

A consequência prática é simples: **feche a gaveta ao terminar**, ou use **Atualizar**. Enquanto a gaveta estiver aberta, o número de **Atividades de hoje** e os grupos não refletem o que você acabou de registrar.

### O que a fila mostra e o que ela ignora

| Evento | Efeito na Minha fila |
|---|---|
| planejamento **publicado** | as atividades aparecem |
| planejamento **salvo** como rascunho ou revisão | nada muda |
| **republicação** da semana | a fila passa a mostrar a nova versão por inteiro |
| atividade **concluída** | vai para **Concluídas** e deixa de ser apontável |
| atividade **reaberta** | volta a ser pendente, sem precisar republicar |
| atividade **dispensada** | passa a constar em **Concluídas** e deixa de ser apontável |
| dispensa **desfeita** na esteira | volta a ser pendente, sem precisar republicar |
| **apontamento em atividade fora do seu planejamento** | **nenhum**: não cria cartão, não muda ordem, não muda os números. O registro existe e aparece em **Minha jornada** e para a gestão |
| **Extra Esteira** | **nenhum**: nunca aparece na fila nem entra na conta de capacidade |

Um detalhe que costuma confundir: se você apontar **e concluir** uma atividade que *está* no seu planejamento do dia, o cartão muda de grupo. Se a atividade **não** estiver no seu planejamento, o apontamento é válido, mas a fila continua idêntica.

### Atividade dispensada: o que você vai ver

A dispensa é feita na estrutura da esteira (capítulo 6) e encerra a atividade. Na Minha fila o efeito é parcialmente visível:

- a atividade **aparece** no grupo **Concluídas**, no dia para o qual foi planejada;
- **não** recebe o selo **Concluída** — fica no grupo sem nenhum selo que explique por quê;
- **continua contando** em **Atividades de hoje**, em **Minutos planejados** e no aviso de capacidade do dia;
- o botão **Apontar horas** continua **clicável**, mas o registro é recusado ao salvar, com a mensagem *"Esta atividade foi dispensada; não é possível novo apontamento."*;
- em dias anteriores ela não aparece: o grupo **Atrasadas** só traz o que continua pendente.

**Na prática:** um cartão em **Concluídas** sem o selo **Concluída** é, quase sempre, uma atividade dispensada. Não tente apontar nela; confirme com a gestão se o trabalho realmente não é mais necessário. Essa divergência está registrada no capítulo 21.

### Estados vazios

| O que aparece | Quando | O que fazer |
|---|---|---|
| *"Carregando Minha fila..."* | enquanto a tela busca os dados | aguardar |
| *"Você ainda não possui atividades planejadas para este dia."* + *"Quando um plano semanal for publicado, suas atividades aparecerão aqui."* | não existe planejamento publicado para aquela semana — ou sua conta não está vinculada a um colaborador | pedir a publicação da semana; se houver o aviso de vínculo, falar com o administrador |
| *"Não há atividades planejadas para você neste dia."* + a mesma segunda linha | existe planejamento publicado, mas nada foi reservado para você naquela data | conferir a data; depois, falar com a gestão |
| nenhum grupo na tela, sem mensagem de vazio | não acontece: sem itens, a fila sempre mostra o bloco de estado vazio | — |

Quando **todas** as atividades do dia já foram concluídas, a fila **não** fica vazia: o grupo **Concluídas** continua na tela com os cartões. É o sinal de dia encerrado.

## Quando algo é bloqueado

### Antes de abrir a fila

| O que aparece | Por que | O que fazer |
|---|---|---|
| *"Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso."* | sua conta de acesso não está ligada ao seu cadastro de colaborador | pedir o vínculo a quem administra usuários e colaboradores (capítulo 16). Até lá a fila fica vazia e o apontamento por atividade não funciona |

### Falha ao carregar a fila

| O que aparece | Por que | O que fazer |
|---|---|---|
| janela **Não foi possível continuar**, com *"Não foi possível comunicar com o sistema agora. Tente novamente em instantes. Se o problema continuar, abra um chamado."* | a tela não conseguiu falar com o sistema | tentar de novo em instantes; persistindo, abrir chamado |
| janela **Sessão inválida**, com *"Sessão expirada ou não autenticado. Faça login novamente para continuar."* | a sessão caiu por inatividade ou foi encerrada | entrar de novo |
| janela **Operação não concluída**, com *"O serviço está temporariamente indisponível ou em manutenção. Tente novamente dentro de instantes."* | indisponibilidade momentânea | aguardar e usar **Atualizar** |
| faixa vermelha na própria tela | falhas menos graves | usar **Atualizar**; não há botão de nova tentativa na faixa |

### Bloqueios ao apontar ou concluir

Todos aparecem **ao salvar**, não antes: o botão do cartão não antecipa o bloqueio.

| Mensagem | Por que | O que fazer |
|---|---|---|
| *"Esta atividade foi dispensada; não é possível novo apontamento."* | a atividade foi dispensada na esteira | não é mais trabalho seu; confirmar com a gestão |
| *"Esta atividade já está concluída operacionalmente; não é possível novo apontamento."* | alguém concluiu a atividade enquanto a sua tela estava aberta | usar **Atualizar**; se faltou tempo a registrar, a gestão pode reabrir a atividade |
| *"Esta esteira está finalizada e não permite novos apontamentos."* | a esteira foi encerrada | falar com a gestão antes de qualquer registro |
| *"Esta esteira está cancelada e não permite novos apontamentos."* | a esteira foi cancelada | idem |
| *"Esta esteira ainda não foi liberada para produção."* / *"Esta esteira está em planejamento e ainda não permite apontamento."* | a esteira ainda não chegou à fase de execução | aguardar a liberação |
| *"Colaborador inexistente, inativo ou indisponível."* | seu cadastro de colaborador está inativo | falar com quem administra colaboradores |
| *"Selecione uma justificativa operacional para este apontamento."* | a justificativa é obrigatória neste caso | escolher um motivo da lista |
| *"Esta justificativa exige complemento."* | a opção escolhida pede detalhe | escrever o **Complemento** |
| *"A data de realização não pode ser futura."* | a data escolhida é posterior a hoje | usar **Hoje**, **Ontem** ou uma data passada |
| botão **Salvar apontamento** apagado | falta o tempo (mínimo 1 minuto), a quantidade está vazia, a data é inválida, ou falta a justificativa exigida | completar os campos |

Um bloqueio que **não** existe aqui: atividade com atividade anterior pendente **não** é recusada. Ela pede justificativa e segue.

### Diferenças em relação ao Modo Fábrica

As duas filas leem o **mesmo planejamento publicado** e aplicam a **mesma regra de sequência**. O que muda é o resto:

| | Minha fila | Modo Fábrica (capítulo 13) |
|---|---|---|
| como você entra | e-mail e senha | colaborador e PIN |
| data | navegação livre, inclusive datas futuras | sempre o dia corrente |
| organização | grupos **Atrasadas**, **Hoje** e **Concluídas** | filtros **Todas**, **Pendentes** e **Concluídas** no navegador da fábrica |
| tempo no cartão | só o **previsto** | **previsto**, **realizado** e **pendente** |
| capacidade do dia | mostra o aviso de planejamento acima da capacidade | não mostra |
| quantidade executada | sim, no apontamento | não existe no totem; existe no navegador da fábrica |
| conclusão | junto com o apontamento, ou pela lista da gaveta | ação própria no totem |
| justificativa por passar do previsto | **não exige** | **exige** |
| atividade dispensada | aparece em **Concluídas**, com o botão de apontar ainda clicável | aparece bloqueada, com *"Apontamento bloqueado para esta atividade"* |
| **Extra Esteira** | pela aba **Extra esteira** da mesma gaveta | ação própria no totem |
| apontar em atividade fora do seu planejamento | marcando **Buscar outras atividades** na gaveta | ação **Outra atividade**, no totem |
| atualização | manual, por **Atualizar** ou ao fechar a gaveta | fluxo próprio do totem |

**Não tente usar uma como espelho da outra.** Para conferir tempo realizado e avanço, o Modo Fábrica e a **Minha jornada** (capítulo 11) são mais completos. Para enxergar atraso da semana, capacidade do dia e datas passadas, a Minha fila é a tela certa.

[IMAGEM SUGERIDA: gaveta Execução rápida aberta a partir do cartão, com data, tempo, quantidade e o botão Salvar apontamento e concluir atividade]

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

## Para que serve

O Modo Fábrica é por onde o colaborador registra produção no piso de fábrica. Ele mostra a fila do dia, deixa apontar o tempo trabalhado, concluir a atividade e registrar tempo que não pertence a nenhuma esteira — tudo em telas grandes, feitas para uso rápido e sem teclado.

É um canal separado do resto do sistema: não tem menu lateral, não tem relatórios e não exige e-mail e senha. A entrada é **colaborador + PIN**.

## Onde fica

O Modo Fábrica funciona em **duas formas de acesso**, abertas em equipamentos preparados pela própria operação. Você não chega a elas pelo menu do sistema: o equipamento já abre na tela certa.

| Forma de acesso | Como se reconhece | Para que serve |
|---|---|---|
| **Totem** | tela cheia, sem barra do navegador; cabeçalho **SGP · Modo Fábrica** e a pergunta **Quem é você?** | uso principal no piso: fila, apontamento, conclusão, Outra atividade e Extra Esteira |
| **Navegador da fábrica** | cabeçalho **SGP+ Produção** com o seu nome e o botão **Sair** | consulta e apontamento com quantidade; recursos reduzidos |

As duas usam a mesma credencial e a mesma fila. O que muda está na comparação ao final do capítulo.

O equipamento precisa estar autorizado. Em um aparelho não liberado, a lista de colaboradores não carrega e aparece **"Este dispositivo não está autorizado para o modo produção."** com a orientação *"Entre em contato com o responsável pelo dispositivo."*

## Quem costuma ter acesso

Qualquer colaborador operacional ativo **que tenha credencial de produção liberada**. Não depende de ter conta de acesso ao sistema: o Modo Fábrica é do colaborador, não do usuário.

Sua credencial pode estar em um de quatro estados:

| Estado | O que significa | O que fazer |
|---|---|---|
| liberada | tudo certo, basta o PIN | entrar normalmente |
| sem PIN configurado | nunca foi criada uma credencial para você | pedir ao gestor que libere o acesso |
| bloqueada | muitas tentativas erradas de PIN | esperar o bloqueio passar, ou pedir ao gestor para redefinir o PIN |
| desabilitada | o acesso foi desligado | falar com o gestor |

Quem libera, redefine PIN e desliga acesso é quem administra colaboradores, em **Colaboradores** (capítulo 16).

## Como fazer

### Entrar: escolher o colaborador

1. Na tela inicial do totem, sob o título **Quem é você?**, encontre seu cartão. Os cartões vêm em ordem alfabética, com foto, nome e equipe.
2. Se a lista for longa, use **Buscar colaborador…** e digite parte do seu nome.
3. Toque no seu cartão.

Cartões de quem não pode entrar aparecem **apagados**. Tocando neles, o próprio sistema diz o motivo:

- **"PIN não configurado. Solicite ao gestor."**
- **"Acesso bloqueado. Solicite ao gestor."**
- **"Acesso desabilitado."**

No navegador da fábrica o fluxo é o mesmo, com o campo **Digite o nome…** e um botão **Atualizar** para recarregar a lista. As mensagens ali são um pouco mais longas: *"PIN ainda não configurado. Solicite ao gestor."*, *"Acesso bloqueado por tentativas incorretas. Solicite ao gestor."* e *"Acesso de produção desabilitado. Solicite ao gestor."*

### Digitar o PIN

Depois de escolher o colaborador aparece sua foto, seu nome e a instrução **"Digite seu PIN de 4 dígitos"**.

1. Toque os números no teclado da tela. Cada dígito acende um ponto.
2. Ao completar o quarto dígito, o sistema **entra automaticamente** — não há botão de confirmar.
3. Errou um número? Use o botão de apagar o último dígito.
4. Escolheu a pessoa errada? Use **← Voltar à seleção**.

PIN errado mostra **"PIN inválido. Tente novamente."** e limpa os pontos.

> **Use sempre um PIN de 4 dígitos.** O totem aceita exatamente 4; o navegador da fábrica e o cadastro aceitam de 4 a 8. Um PIN com mais de 4 dígitos é aceito no navegador, mas **não é digitável no totem**. Com 4 dígitos você entra nas duas formas de acesso. A padronização é pendência conhecida — veja o capítulo 21.

### Criar o PIN

Acontece em duas situações: no primeiro acesso depois de o gestor liberar sua credencial, e sempre que o gestor redefinir seu PIN.

Nesses casos, logo após entrar com o PIN provisório, o totem abre a criação de PIN:

1. **"Crie seu PIN de 4 dígitos"** — *"Este será seu acesso pessoal ao Modo Fábrica"*. Digite os 4 números.
2. **"Confirme seu novo PIN"** — *"Digite o mesmo PIN novamente para confirmar"*. Repita.
3. Pronto: o sistema já abre sua fila.

Se os dois não coincidirem: **"Os PINs não coincidem. Tente novamente."**

Não é permitido manter o PIN provisório. Escolher o mesmo número que o gestor entregou devolve **"Escolha um PIN diferente do PIN inicial padrão."**

Escolha um PIN que só você saiba: é ele que identifica o seu trabalho nos registros.

### Ler a sua fila

Entrou, aparece o cabeçalho com sua foto, seu nome e quantas atividades você tem. A fila vem do **planejamento da semana já publicado** pelo gestor, para a data de hoje, incluindo o que ficou em atraso de dias anteriores.

O totem mostra a fila de dois jeitos, alternados pelos dois botõezinhos do cabeçalho:

- **Modo carrossel** — uma atividade por vez, grande. Avance e volte pelas flechas **Próxima atividade** / **Atividade anterior**, ou **arraste o dedo** na tela. Os pontinhos indicam sua posição.
- **Modo lista** — todas de uma vez, agrupadas em **Próxima atividade recomendada**, **Atenção à sequência** e **Demais atividades**.

Ao abrir, o carrossel já se posiciona na **atividade recomendada**. Depois de cada apontamento, ele volta a se posicionar nela.

Para achar algo específico, use **Buscar atividade…** — procura por atividade, setor e tarefa.

Cada cartão traz:

| O que aparece | O que significa |
|---|---|
| Esteira, Tarefa, Setor e o nome da atividade | onde o trabalho se encaixa |
| **Realizado: N min · Planejado: N min** | o tempo já apontado e o tempo previsto para você naquela atividade |
| **Tempo previsto: N%** | quanto do tempo previsto já foi consumido (para em 100%) |
| etiqueta **Próxima atividade recomendada** | é por ela que a sequência sugere começar |
| etiqueta de atenção à sequência | há atividade anterior ainda pendente |
| **"Tempo previsto atingido. Marque como concluída para liberar a próxima atividade."** | o realizado alcançou o previsto, e a atividade continua aberta |

### Registrar um apontamento

No cartão da atividade:

1. Confirme a **data em que o trabalho foi realizado**. Começa em hoje, com os atalhos **Hoje** e **Ontem**.
2. Em **Tempo trabalhado**, toque um dos botões — **15**, **30**, **45** ou **60 min** — ou digite outro valor no campo **outro**.
3. Ajuste **Evolução da atividade (nesta sessão)**, a barra de 0 a 100%. Ela anda de 5 em 5 e mostra uma frase conforme avança: *Não iniciado*, *Só começando…*, *Metade do caminho*, *Quase lá!*, *Concluído!* e outras.
4. Preencha a **justificativa**, se a tela pedir.
5. Se este foi o último trabalho da atividade, ligue **Concluir atividade ao registrar**.
6. Toque **Registrar apontamento**.

Aparece uma tela de confirmação com um visto verde e **"Apontamento registrado!"**, mais a data usada. Em cerca de três segundos o totem volta à fila, já recarregada.

**A barra de evolução é uma leitura sua do avanço, independente do tempo.** Ela não conclui a atividade e não substitui o tempo trabalhado: quem conclui é o botão de concluir.

No totem **não existe campo de quantidade executada**. Se a atividade precisa de quantidade registrada, isso é feito pelo navegador da fábrica ou pela área autenticada (capítulo 7).

### Quando o sistema pede justificativa

Duas situações, que podem acontecer juntas. Em nenhuma delas o apontamento é bloqueado: você continua, explicando o motivo.

**1. Atividade anterior pendente.** Aparece a faixa **Fora de sequência — confirme o apontamento**, com a lista das atividades anteriores em aberto e o aviso *"Existem etapas anteriores pendentes. Informe uma justificativa para apontar."*

**2. Tempo acima do previsto.** Aparece a faixa **Tempo acima do previsto — confirme o apontamento**, com o aviso *"Este apontamento ultrapassa o tempo planejado da atividade. Informe uma justificativa para registrar."*

Em qualquer dos casos o botão muda para **Registrar apontamento (exceção)** e o campo **Justificativa operacional** passa a ser obrigatório. Escolha um motivo da lista; algumas opções pedem um **Complemento**. A justificativa precisa ter **no mínimo 3 caracteres**.

A conta do tempo acima do previsto considera **o que já foi apontado mais o que você está apontando agora**. Se a soma passar do previsto, a justificativa é pedida — mesmo que este apontamento sozinho seja pequeno.

### Concluir uma atividade

A conclusão é sempre uma decisão sua. **Consumir o tempo previsto não conclui nada** — quando o previsto é alcançado, o cartão apenas avisa e sugere concluir para liberar a próxima.

Para concluir, ligue **Concluir atividade ao registrar** antes de registrar. A confirmação vira **"Atividade concluída. Avançando…"**.

Se você marcar para concluir com a barra de evolução abaixo de 80%, o totem pede confirmação:

> **Confirmar conclusão?** Você marcou como concluída, mas indicou apenas N% de progresso nesta sessão. Confirma mesmo assim?

Escolha **Confirmar** ou **Cancelar**. É só uma conferência — não impede nada.

Reabrir uma atividade concluída não é possível pelo Modo Fábrica: é ação de gestão (capítulo 6).

### Concluir sem registrar tempo novo

Já apontou o tempo antes e só falta encerrar a atividade? Deixe o **Tempo trabalhado** em zero, ligue **Concluir atividade ao registrar** e registre. A atividade é concluída **sem criar um novo apontamento de tempo**.

Fora desse caso, o tempo é obrigatório: registrar sem informar minutos e sem ligar a conclusão devolve o aviso de que o tempo precisa ser maior que zero.

### Outra atividade

Serve para apontar uma atividade que **não está na sua fila** — porque não foi planejada para você, ou porque não é sua alocação.

1. No cabeçalho da fila, toque **+ Outra atividade**.
2. Digite ao menos **2 caracteres** na busca (*"Digite ao menos 2 caracteres…"*) e escolha a atividade na lista.
3. Confirme a **data de realização**.
4. Informe os **Minutos** — pelos botões de atalho ou no campo **outro**. Aqui o mínimo é 1: não existe conclusão sem tempo.
5. Use **Observação** se precisar.
6. Preencha a **Justificativa** — ela é exigida justamente porque a atividade está fora da sua fila ou da sua alocação, e também se houver atividade anterior pendente.
7. Confira o resumo — Colaborador, Atividade, Contexto, Data, Minutos, Observação, Justificativa — e toque **Confirmar apontamento**.

Registrado, aparece **"Apontamento registrado!"** e o totem volta à fila.

Por **Outra atividade** você **não conclui** a atividade e **não informa quantidade**: ela serve para lançar tempo.

### Extra Esteira

Serve para o tempo que **não pertence a nenhuma atividade de esteira** — apoio, organização, deslocamento, parada e situações do tipo.

1. No cabeçalho da fila, toque **+ Extra esteira**.
2. Em **Descrição**, escolha um motivo da lista mantida pela gestão (*"Selecione uma descrição..."*).
3. Confirme a **data de realização**.
4. Informe os **Minutos** — atalhos ou campo **outro**, mínimo 1.
5. Use **Observação** se precisar, até 500 caracteres.
6. Confira o resumo e toque **Confirmar apontamento**.

Extra Esteira não tem quantidade, não tem justificativa e não conclui atividade nenhuma. Se a lista de motivos não carregar, aparece **"Não foi possível carregar as descrições."**; se estiver vazia, não há o que escolher e o registro não avança — peça à gestão para cadastrar os motivos.

### Atualizar a fila

O botão **Atualizar**, no cabeçalho da fila do totem, recarrega suas atividades. Enquanto carrega, mostra **Atualizando…**.

Use quando o gestor publicar ou ajustar o planejamento com você já logado. **Atualizar não encerra sua sessão e não pede o PIN de novo**: só busca a fila outra vez. Se falhar, aparece um aviso com o motivo e a fila anterior continua na tela.

Depois de cada apontamento a fila já é recarregada sozinha — o **Atualizar** é para as mudanças feitas por outras pessoas.

No navegador da fábrica não existe esse botão na tela da fila; há um **Atualizar** apenas na escolha do colaborador.

### Sair

Toque **Sair**, no cabeçalho. A sessão é encerrada e o totem volta à tela **Quem é você?**.

**Saia sempre ao terminar.** Enquanto a sessão estiver aberta, qualquer pessoa no equipamento registra trabalho **no seu nome**. Sair é o que protege o seu registro.

A sessão também expira sozinha: por inatividade e por tempo total de uso. Os prazos são definidos pela administração — tipicamente 30 minutos sem uso e 12 horas de duração máxima. Expirada, o Modo Fábrica volta à seleção de colaborador e é preciso entrar com o PIN de novo.

## O que esperar

### A fila depende do planejamento publicado

Sem planejamento publicado para a semana, **sua fila fica vazia** — não é falha do equipamento nem do seu acesso. É o caso mais comum de "não aparece nada para mim".

Aparecem na fila as atividades planejadas para você, de hoje e as atrasadas de dias anteriores. Saem da fila as que você concluiu, as dispensadas e as de esteira que não está liberada para produção.

### O que muda depois de registrar

| O que acontece | Onde aparece |
|---|---|
| o tempo entra no seu histórico | **Minha jornada**, na área autenticada |
| o realizado da atividade aumenta | detalhe da esteira e Evolução das Esteiras |
| a esteira é iniciada, se ainda estava a iniciar | Painel operacional |
| a atividade sai da sua fila, se você concluiu | sua fila, na recarga automática |
| o apontamento fora de sequência fica marcado como exceção | histórico da esteira |

O apontamento é contabilizado **no dia que você escolheu**, não no dia em que digitou.

### Não há aviso sonoro

O Modo Fábrica confirma o registro **apenas na tela**: o visto verde e a mensagem **"Apontamento registrado!"**. Não existe bip nem qualquer som. Em ambiente ruidoso, confie na tela.

### Fila, Outra atividade e Extra Esteira

| | Atividade da fila | Outra atividade | Extra Esteira |
|---|---|---|---|
| de onde vem | planejamento publicado para você | busca em atividades em aberto | catálogo de motivos |
| ligada a uma esteira | sim | sim | não |
| minutos | podem ser zero, só para concluir | mínimo 1 | mínimo 1 |
| evolução da sessão | sim | não | não |
| justificativa | quando exigida | sempre | nunca |
| conclui atividade | pode | não | não se aplica |
| quantidade | não existe no totem | não | não |

### Totem e navegador da fábrica

| | Totem | Navegador da fábrica |
|---|---|---|
| título na tela | **SGP · Modo Fábrica** | **SGP+ Produção** |
| escolha do colaborador | cartões com foto, busca por nome | lista com busca e botão **Atualizar** |
| PIN | exatamente 4 dígitos, entra ao completar | 4 a 8 dígitos, com confirmação |
| criar/trocar PIN | sim, 4 dígitos | sim, 4 a 8 dígitos |
| fila | carrossel ou lista, com busca | lista com filtros **Todas**, **Pendentes**, **Concluídas** |
| apontar tempo | sim | sim |
| **quantidade executada** | **não existe** | **existe** |
| evolução da sessão | sim | não |
| **concluir atividade** | **sim** | **não** — o botão **Concluir etapa** está desativado, com o aviso *"Disponível na próxima etapa"* |
| **Outra atividade** | **sim** | **não** |
| **Extra Esteira** | **sim** | **não** |
| atualizar a fila | botão **Atualizar** | não há na tela da fila |
| sair | botão **Sair** | botão **Sair** |

Em resumo: o **totem é o canal completo** da operação. O navegador da fábrica serve para consultar a fila e apontar tempo com quantidade, mas não conclui atividade, não tem Outra atividade e não tem Extra Esteira.

### Telas feitas para o piso

O totem ocupa a tela inteira, sem barra de navegador, e só a área das atividades rola. Os botões são grandes e não há seleção de texto. Isso é de propósito: evita toques acidentais e perda de contexto durante o trabalho. Não é preciso ajustar zoom nem rolar a página para encontrar os botões.

## Quando algo é bloqueado

### Não consigo entrar

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"PIN não configurado. Solicite ao gestor."** | nunca foi criada credencial para você | pedir a liberação a quem administra colaboradores |
| **"Acesso bloqueado. Solicite ao gestor."** | tentativas erradas de PIN em excesso | esperar o bloqueio passar — tipicamente 15 minutos — ou pedir ao gestor para redefinir seu PIN, o que libera na hora |
| **"Acesso desabilitado."** | o acesso de produção foi desligado | falar com o gestor |
| **"PIN inválido. Tente novamente."** | o PIN digitado está errado | digitar de novo com atenção; o bloqueio chega depois de algumas tentativas (tipicamente 5) |
| **"PIN inválido ou acesso não habilitado."** | PIN errado **ou** credencial indisponível — a mensagem é a mesma de propósito | conferir o PIN; se persistir, falar com o gestor |
| **"Não foi possível entrar agora. Tente novamente mais tarde."** | o acesso está bloqueado neste momento | esperar e tentar de novo, ou pedir a redefinição |
| **"Este dispositivo não está autorizado para o modo produção."** | o equipamento não foi liberado para o Modo Fábrica | falar com o responsável pelo dispositivo |
| **"Não foi possível carregar os colaboradores."** | falha ao buscar a lista | tocar **Tentar novamente** |

### Não consigo criar o PIN

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Os PINs não coincidem. Tente novamente."** | a confirmação ficou diferente | repetir os dois passos com calma |
| **"Escolha um PIN diferente do PIN inicial padrão."** | você tentou manter o PIN provisório | escolher um número só seu |
| **"Não foi possível alterar o PIN. Tente novamente."** | falha ao salvar | tentar de novo; se persistir, chamar o gestor |

### A fila está vazia ou a atividade não aparece

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Nenhuma atividade disponível no momento."** | não há planejamento publicado para você, ou tudo já foi concluído | tocar **Atualizar**; se continuar vazia, confirmar com o gestor se o planejamento da semana foi publicado |
| **"Nenhuma atividade encontrada para essa busca."** | o texto digitado não casa com nada | limpar a busca |
| **"Nenhuma atividade planejada para você no momento."** e *"Confirme com o gestor se o planejamento da fábrica já foi publicado."* | no navegador da fábrica, sem plano publicado | falar com o gestor |
| **"Nenhuma atividade para este filtro."** | no navegador, o filtro escolhido não tem itens | trocar para **Todas** |
| **"Não foi possível carregar suas atividades."** | o **Atualizar** falhou | tocar **Atualizar** de novo; a fila anterior continua na tela |
| a atividade existe mas não está na fila | não foi planejada para você | usar **+ Outra atividade**, com justificativa |

### Não consigo apontar nesta atividade

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Atividade concluída"** no cartão | já foi encerrada | nada a fazer; reabrir é ação de gestão |
| **"Apontamento bloqueado para esta atividade"** | a esteira não está liberada para produção, a atividade foi dispensada, ou o item saiu do plano | falar com o gestor |
| **"Esta atividade já foi concluída operacionalmente."** | mesma situação, na área do cartão | atualizar a fila |
| **"Apontamento não disponível para esta atividade no momento."** | a atividade não aceita apontamento agora | atualizar a fila e conferir com o gestor |
| **"Esta atividade já está concluída operacionalmente; não é possível novo apontamento."** | outra pessoa concluiu antes de você salvar | tocar **Atualizar** |
| **"Esta atividade foi dispensada; não é possível novo apontamento."** | a atividade foi dispensada pela gestão | falar com o gestor |
| **"Esta esteira está finalizada e não permite novos apontamentos."** | a esteira foi encerrada | falar com o gestor |
| **"Esta atividade não está incluída na sequência operacional da esteira."** | a atividade não entra na sequência daquela esteira | falar com o gestor |

### O sistema recusou meu registro

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Selecione uma justificativa operacional para este apontamento."** | a justificativa é obrigatória neste caso | escolher um motivo da lista |
| **"Esta justificativa exige complemento."** | o motivo escolhido pede detalhe | escrever o complemento |
| **"A justificativa deve ter pelo menos 3 caracteres."** | a justificativa ficou curta | escrever um motivo completo |
| **"Informe uma justificativa para executar esta atividade fora da sequência recomendada."** | há atividade anterior pendente | preencher a justificativa e registrar de novo |
| **"Informe uma justificativa para apontar acima do tempo previsto da atividade."** | a soma passou do tempo previsto | preencher a justificativa e registrar de novo |
| aviso de que o tempo precisa ser maior que zero | você registrou sem informar minutos e sem ligar a conclusão | informar o tempo, ou ligar **Concluir atividade ao registrar** |
| **"A data de realização não pode ser futura."** | a data escolhida é posterior a hoje | usar **Hoje**, **Ontem** ou uma data anterior |
| **"Colaborador inexistente, inativo ou indisponível."** | seu cadastro de colaborador não está ativo | falar com quem administra colaboradores |
| **"Não foi possível registrar o apontamento."** | falha ao salvar | tentar de novo; se persistir, chamar o gestor |

### A sessão caiu

| O que você vê | Por que | O que fazer |
|---|---|---|
| o totem voltou sozinho para **Quem é você?** | a sessão expirou por inatividade ou por tempo total | entrar de novo com seu PIN; nenhum apontamento já confirmado é perdido |
| **"Sessão de produção inválida ou expirada."** | a sessão não vale mais, ou a credencial foi desligada durante o uso | entrar de novo; se não conseguir, falar com o gestor |

[IMAGEM SUGERIDA: Tela inicial do totem — cabeçalho SGP · Modo Fábrica com "Quem é você?", a busca por nome e a grade de cartões, incluindo um cartão apagado de colaborador sem acesso]

[IMAGEM SUGERIDA: Teclado de PIN — foto e nome do colaborador, a instrução de 4 dígitos e os pontos indicando os dígitos já digitados]

[IMAGEM SUGERIDA: Cartão de atividade no modo carrossel — Realizado e Planejado, o percentual de tempo previsto, os botões de tempo, a barra de evolução da sessão e o botão de concluir ao registrar]

[IMAGEM SUGERIDA: Cartão com a faixa de tempo acima do previsto aberta e o campo de justificativa obrigatório, com o botão mudado para Registrar apontamento (exceção)]

[IMAGEM SUGERIDA: Fluxo Outra atividade na etapa de revisão, mostrando Colaborador, Atividade, Contexto, Data, Minutos e Justificativa antes de confirmar]

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
| **Concluir etapa** | cartão da fila, no navegador da fábrica do Modo Fábrica | botão permanentemente desativado, com o aviso *"Disponível na próxima etapa"*; concluir atividade só pelo totem |

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
| **"Voltando ao Kiosk…"**, após registrar por Outra atividade ou Extra Esteira no totem | voltando ao **Modo Fábrica** | "Kiosk" é o nome interno do totem |
| **"SGP+ Produção"**, no cabeçalho do navegador da fábrica | **Modo Fábrica** | o totem exibe "SGP · Modo Fábrica"; os dois cabeçalhos deveriam usar o mesmo nome |
| **"Daily"**, no seletor de Visualização do Planejamento semanal | **visão por dia** | rótulo em inglês em uma interface em português; a opção ao lado, "Semana", está traduzida |
| **"Atividades de hoje"**, **"Minutos planejados"** e a frase *"Atividades planejadas para hoje, em ordem de execução."*, na Minha fila | os mesmos dados **da data exibida** | os rótulos continuam dizendo "hoje" quando você navega para outro dia; os números sempre acompanham a data escolhida |

### Numeração dos cartões da Minha fila não segue a ordem da tela

Divergência confirmada em 2026-10-03, de impacto apenas na leitura.

O número no quadrado azul de cada cartão da **Minha fila** é a posição que o **planejamento** deu à atividade dentro do dia. A ordem em que os cartões são exibidos obedece a outro critério — grupo, atividades livres antes das que têm atividade anterior pendente, data e sequência da própria esteira. Resultado: é comum a coluna de números não ficar em ordem crescente.

**Orientação:** não usar o número do cartão como ordem de execução. A ordem a seguir é a dos cartões na tela, junto com o selo **Próxima atividade recomendada**. Pendência de produto registrada.

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

#### O selo "Atrasada" do backlog usa outra regra, também incorreta

Divergência confirmada em 2026-10-03, de alcance distinto da anterior.

O selo **Atrasada** nos cartões de atividade disponível — no **Backlog operacional** do Planejamento semanal e da Agenda da semana — **não** usa o cálculo descrito acima. É outra regra, com outras falhas, sobre o mesmo campo **Prazo estimado** mal tipado.

| Como o prazo foi registrado | O que o selo faz |
|---|---|
| qualquer número de dias (ex.: 7, 15, 30, 10,5) | nunca marca **Atrasada** |
| período no formato "Início previsto … · Fim previsto …" | nunca marca **Atrasada** |
| data no formato 2026-09-01 (já passada) | marca corretamente |
| data no formato 2026-10-20 (futura) | corretamente não marca |
| data no formato brasileiro, dia de 01 a 19 (ex.: 01/02/2026) | marca **Atrasada** sempre, mesmo com prazo futuro |
| data no formato brasileiro, dia de 20 a 31 (ex.: 25/12/2026) | não marca, mesmo com prazo já vencido |

Em resumo: o selo só é confiável quando o prazo foi registrado como data no formato ano-mês-dia. Com número de dias nunca acusa atraso; com data em formato brasileiro o resultado depende do dia digitado, não do prazo real.

**Orientação até a correção:** não priorizar pelo selo **Atrasada**; conferir o prazo na própria esteira. Mesma causa de fundo da divergência anterior — o campo **Prazo estimado** aceita texto livre. Pendência de produto registrada.

### Atividade dispensada volta a aparecer como planejável

Divergência confirmada em 2026-10-03 no Planejamento semanal; alcance ampliado em 2026-10-03 após verificação independente na Agenda da semana e, na mesma data, na **Minha fila** e no **Modo Fábrica**.

Uma atividade **dispensada** continua aparecendo na lista de atividades disponíveis para planejar e o sistema **permite distribuí-la e publicá-la**. Não há recusa nem aviso.

**Afeta as duas telas de planejamento**, porque ambas consultam a mesma lista de atividades disponíveis e gravam pelo mesmo caminho: o **Backlog operacional** do Planejamento semanal (capítulo 8) e a gaveta **Backlog operacional** da Agenda da semana (capítulo 9).

O efeito é um item que ocupa a semana sem nunca ser executável:

| Onde | O que acontece |
|---|---|
| Backlog operacional, nas duas telas | a atividade dispensada aparece como disponível |
| quadro do planejamento e grade da agenda | aceita ser distribuída; soma minutos na capacidade do colaborador |
| exportações em Excel | sai nas planilhas como item planejado |
| **Minha fila** (capítulo 10) | **aparece** no grupo **Concluídas**, no dia planejado, **sem o selo Concluída**; continua somando em **Atividades de hoje**, em **Minutos planejados** e no aviso de capacidade do dia; o botão **Apontar horas** continua clicável e o registro só é recusado ao salvar |
| **Modo Fábrica** (capítulo 13) | **aparece** como cartão bloqueado, com *"Apontamento bloqueado para esta atividade"* e, no lugar do botão, *"Apontamento não disponível para esta atividade no momento."* |
| em datas anteriores, nas duas filas | **não aparece** — o grupo de atrasadas só traz o que continua pendente |

Na prática, o planejamento mostra trabalho que o colaborador nunca executará, e a capacidade do dia fica comprometida por um item inexistente — tanto no planejamento quanto na própria fila do colaborador.

A correção de 2026-10-03 nesta tabela é relevante: até então este anexo afirmava que a atividade dispensada **não aparecia** na fila do colaborador nem no Modo Fábrica. A verificação no código mostrou o contrário — ela aparece nos dois, encerrada, e no caso da **Minha fila** sem nenhum selo que explique o motivo.

**Como reconhecer na Agenda da semana:** o cartão na grade exibe o selo **Dispensada** e o menu dele **não** oferece **Apontar tempo** nem **Concluir** — só **Imprimir ticket** e **Remover do plano**. É o sintoma visível mais confiável.

**Como reconhecer na Minha fila:** um cartão no grupo **Concluídas** **sem** o selo **Concluída** é, quase sempre, uma atividade dispensada. Não apontar nela: o registro é recusado ao salvar, com *"Esta atividade foi dispensada; não é possível novo apontamento."*

**Orientação até a correção:** ao planejar, não distribuir atividades dispensadas. Se a atividade precisar voltar ao trabalho, usar antes **Restaurar dispensada** na estrutura da esteira (capítulo 6) e só então planejá-la. Se uma atividade dispensada já estiver no plano, removê-la, salvar e publicar de novo. Para o colaborador, a orientação é não trabalhar em cartão de **Concluídas** sem selo e confirmar com a gestão. Pendência de produto registrada.

### Agenda da semana descarta alterações não salvas sem avisar

Divergência confirmada em 2026-10-03, com risco de perda de trabalho.

Na **Agenda da semana**, trocar de semana pelas setas ‹ › ou sair da tela **descarta silenciosamente** tudo o que foi distribuído, movido ou reordenado e ainda não foi salvo. Não há confirmação, não há bloqueio de navegação e não há recuperação.

O único sinal é o aviso **"Alterações não salvas — use 'Salvar rascunho' antes de publicar."**, que é informativo e fácil de não ver depois de uma sessão longa de arraste. O caso mais custoso é o fluxo **Alocação em lote**: ele pode atribuir dezenas de atividades de uma vez e termina dizendo que tudo foi atribuído **ao rascunho** — nada gravado.

Há uma exceção, que vale apenas para remoções: em semana já publicada, **Remover do plano** é gravado na hora como revisão e não se perde.

**Orientação até a correção:** salvar antes de trocar de semana ou sair da tela, sempre, e especialmente ao terminar uma alocação em lote. Pendência de produto registrada.

## 21.4 Diferença de PIN entre as formas de acesso

O acesso pelo navegador e o cadastro aceitam PIN de **4 a 8 dígitos**. O totem aceita **exatamente 4**.

**Orientação prática:** use sempre PIN de **4 dígitos** — funciona nas duas formas de acesso. Um PIN com mais de 4 dígitos é aceito no cadastro, mas não é digitável no totem. Padronização pendente de decisão.

## 21.5 Recursos que não existem, apesar de parecerem existir

Não oferecer nem documentar:

- **bloquear ou pausar uma atividade** — não há ação disponível no sistema para isso, em nenhuma tela;
- **menu de gestão por atividade** com alteração de situação, reatribuição e prioridade — não está acessível aos usuários.
