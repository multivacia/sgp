# Manual do Usuário — SGP+

**Produto:** SGP+ · Multivacia / ARGOS
**Versão da aplicação nesta revisão:** 1.9.8
**Revisão deste manual:** 2026-10-04
**Situação:** capítulos 1 a 21 com conteúdo final, revisados na auditoria final de 2026-10-04.

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

Os capítulos de recurso seguem a mesma sequência:

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

## Para que serve

Este capítulo explica **por que duas pessoas veem o SGP+ de formas diferentes**: o que aparece no seu menu e o que o sistema aceita que você faça dependem das **permissões** do **perfil de acesso** da sua conta.

Ele serve a dois públicos:

- a **qualquer usuário**, para entender o que é perfil e permissão, reconhecer quando algo foi bloqueado por falta de permissão — e quando o bloqueio tem outra causa — e saber o que pedir e a quem;
- a **quem administra os acessos**, para consultar e alterar as permissões de cada perfil na tela **Permissões por papel** e conferir essas alterações na **Trilha administrativa**.

A criação de contas, a escolha do perfil de cada conta e o vínculo com o colaborador estão no **capítulo 16**. Aqui só se faz referência a eles.

## Onde fica

| O que você procura | Caminho no menu | Título da tela |
|---|---|---|
| ver e alterar as permissões de um perfil | **Estrutura e administração → Permissões por papel** | **Permissões por papel** |
| conferir quem alterou as permissões e quando | **Estrutura e administração → Trilha administrativa**, ou o atalho **Ver trilha administrativa** no topo de **Usuários** | **Trilha administrativa** |
| ver ou trocar o perfil de uma conta | **Cadastros operacionais → Usuários**, coluna **Papel** (capítulo 16, seções 16.7 e 16.9) | **Usuários de acesso** |

As duas telas deste capítulo trazem a etiqueta **Governança** acima do título.

**Não há tela que mostre a você o seu próprio perfil.** O botão com o seu nome, na barra superior, mostra o nome de exibição e o e-mail da conta, mas não o perfil. Na prática, o retrato das suas permissões é o próprio menu lateral: ele mostra exatamente os itens que seu perfil libera (capítulo 3, seção 3.4). Para saber o nome do seu perfil, pergunte a quem administra os acessos.

## Quem costuma ter acesso

Os conceitos deste capítulo valem para todos. As duas telas são restritas:

| Tela | Permissão necessária | Na configuração padrão |
|---|---|---|
| **Permissões por papel** | a de **gerir as permissões por papel** | a instalação padrão **não atribui** esta permissão a nenhum perfil. Ela depende de liberação feita no seu ambiente; por isso, em algumas instalações ninguém vê este item no menu |
| **Trilha administrativa** | **Trilha administrativa: consultar** | **Administrador** |

Sem a permissão, o item não aparece no menu e o endereço direto mostra **"Sem permissão para esta área"**.

## Como fazer

### 4.1 Conta, perfil e permissão

| Conceito | O que é | Onde aparece |
|---|---|---|
| **Conta de acesso** (usuário) | o que você usa para entrar, com e-mail e senha | **Usuários** (capítulo 16) |
| **Perfil de acesso** | o conjunto de permissões atribuído à conta. Cada conta tem **um único** perfil | na tela **Usuários**, campo **Papel operacional** e coluna **Papel**; na tela **Permissões por papel**, campo **Papel** |
| **Permissão** | uma autorização específica: consultar uma tela ou executar uma ação | marcada ou desmarcada para cada perfil em **Permissões por papel** |

Três consequências práticas:

- **as permissões pertencem ao perfil, não à pessoa.** Todas as contas com o mesmo perfil têm exatamente as mesmas permissões. Não existe permissão concedida a uma conta isolada;
- **alterar as permissões de um perfil afeta todas as contas que o usam** — inclusive a de quem está fazendo a alteração;
- para mudar o que **uma** pessoa pode fazer, há dois caminhos: trocar o perfil da conta dela (capítulo 16, seção 16.9) ou alterar o perfil inteiro (seção 4.7), sabendo que isso vale para todos que o usam.

O SGP+ vem instalado com quatro perfis:

| Perfil | Para quem se destina, na configuração padrão |
|---|---|
| **Administrador** | administração de contas, cadastros e acessos; tem a maior parte das permissões |
| **Gestor** | condução da produção: esteiras, planejamento, matrizes, equipes, colaboradores e correção de apontamentos |
| **Colaborador** | quem executa e aponta. **Não tem permissão específica**: usa só o que está liberado para todo usuário (seção 4.2). Este perfil não pode ser alterado (seção 4.7) |
| **Super administrador** | parâmetros sensíveis do sistema, em **Configurações do sistema**. Na configuração padrão, consultar e alterar essa tela são as únicas permissões dele |

Além desses, **cada função operacional criada em Configurações operacionais aparece também como perfil**, sem nenhuma permissão até que alguém as marque (capítulo 16, seção 16.1).

Dois conceitos vizinhos **não são permissão**:

- **função operacional** — o que a pessoa faz na fábrica. É um dado do cadastro do colaborador e não libera nem bloqueia nada no sistema;
- **vínculo da conta com um colaborador** — é ele, e não uma permissão, que faz **Apontar horas**, **Minha fila** e **Minha jornada** funcionarem para você (capítulos 7, 10 e 11). Uma conta com todas as permissões, mas sem vínculo, não aponta horas próprias.

E o **Modo Fábrica** fica totalmente fora deste capítulo: ele não usa conta de acesso nem perfil, e sim o cadastro do colaborador e o PIN (capítulo 13).

### 4.2 O que toda conta ativa já tem

Sem nenhuma permissão específica — como no perfil **Colaborador** —, a conta tem acesso a:

| Item | Observação |
|---|---|
| **Painel operacional** e o **detalhe de qualquer esteira**, para consulta | os botões de alteração dependem de permissão (capítulos 5 e 6) |
| **Apontar horas**, na barra superior | funciona somente se a conta estiver vinculada a um colaborador (capítulo 7) |
| **Minha fila** e **Minha jornada** | idem (capítulos 10 e 11) |
| **Chamados** | somente quando o módulo de chamados está ativo no ambiente |
| **Alterar senha** | sempre |

Todo o restante do menu depende de permissão.

### 4.3 Como ler "Quem costuma ter acesso" neste manual

Cada capítulo traz um bloco **Quem costuma ter acesso**. Leia-o assim:

- o que manda é a **permissão**, não o nome do perfil nem o cargo da pessoa. Quando o manual diz "a gestão" ou "a administração", está se referindo ao que os perfis **Gestor** e **Administrador** recebem **na configuração padrão**;
- a sua operação pode ter mudado essa configuração em **Permissões por papel**. Se o manual diz que um recurso costuma estar disponível para o seu perfil e ele não aparece para você, a causa mais provável é uma diferença de configuração — não uma falha;
- o manual descreve as permissões pelo que elas liberam — "permissão de criar esteiras", "permissão de mudar situação". A tabela abaixo liga esses termos ao **nome que aparece na tela Permissões por papel** e mostra quem as recebe na configuração padrão.

**Esteiras, planejamento e acompanhamento**

| Nome na tela | O que libera | Configuração padrão |
|---|---|---|
| **Esteiras: criar** | é a "permissão de criar esteiras" deste manual: **Nova esteira**, **Por documento**, **Planejamento**, **Agenda da semana** e **Evolução das Esteiras**; alterar dados e estrutura; concluir, reabrir, dispensar e restaurar atividades pela esteira; incluir novo item; excluir esteira (capítulos 6, 8, 9, 14 e 17) | Administrador, Gestor |
| **Esteiras: alterar estado operacional** | é a "permissão de mudar situação": avançar, voltar e cancelar a situação da esteira (capítulo 6) | Administrador, Gestor |
| **Esteiras: gerir alocações por etapa** | **nenhum efeito visível nas telas atuais.** Alocar e retirar pessoas e equipes de uma atividade é feito na edição da esteira e depende de **Esteiras: criar** (capítulo 6) | Administrador, Gestor |
| **Matriz de operação: consultar** | o item **Matrizes de operação** e a pré-visualização das matrizes | Administrador, Gestor |
| **Matriz de operação: alterar** | criar e editar matrizes | Administrador, Gestor |
| **Dashboard operacional** | o item **Dashboard** e a visão operacional dos indicadores (capítulo 15) | Administrador, Gestor |
| **Dashboard gerencial** | o item **Dashboard** e a visão gerencial dos indicadores (capítulo 15) | Administrador |

**Apontamentos**

| Nome na tela | O que libera | Configuração padrão |
|---|---|---|
| **Apontamentos: editar qualquer lançamento (correção gerencial)** | corrigir apontamentos, inclusive o seu próprio (capítulo 7) | Administrador, Gestor |
| **Apontamentos: remover qualquer lançamento (correção gerencial)** | remover apontamento de outra pessoa (capítulo 7) | Administrador, Gestor |
| permissão de **lançar horas em nome de outro colaborador** | o lançamento em nome de outra pessoa (capítulo 7) | **não atribuída** pela instalação padrão; depende de liberação no seu ambiente |

Qualquer uma dessas três libera o botão **Apontamento gerencial** e a tela de correção; dentro dela, cada ação segue a sua própria permissão (capítulos 7 e 12).

**Cadastros**

| Nome na tela | O que libera | Configuração padrão |
|---|---|---|
| **Colaboradores admin: consultar** | os itens **Colaboradores**, **Saúde operacional** e **Jornada por colaborador** | Administrador, Gestor |
| **Colaboradores admin: criar**, **editar**, **ativar**, **inativar** | as ações correspondentes em **Colaboradores**; **editar** inclui **Redefinir PIN** (capítulo 16) | Administrador, Gestor |
| **Colaboradores admin: eliminação lógica** · **restaurar** | remover e restaurar colaboradores (capítulo 16) | Administrador |
| **Utilizadores: consultar** | o item **Usuários** | Administrador |
| **Utilizadores: criar**, **editar**, **ativar**, **inativar**, **eliminação lógica**, **restaurar**, **repor senha**, **forçar troca de senha** | as ações correspondentes em **Usuários**; **editar** inclui trocar o perfil da conta e vincular ou desvincular colaborador (capítulo 16) | Administrador |
| **Equipes: consultar**, **criar**, **editar**, **gerir membros** | o item **Equipes** e as ações correspondentes (capítulo 16) | Administrador, Gestor |
| **Configurações operacionais: gerir catálogo (setores e funções)** | o item **Configurações operacionais**, com as seis abas (capítulo 16) | Administrador, Gestor |

**Administração do sistema**

| Nome na tela | O que libera | Configuração padrão |
|---|---|---|
| **Configurações do sistema: consultar** · **alterar** | o item **Configurações do sistema** e a alteração dos parâmetros, como os tempos de sessão (capítulo 3, seção 3.6) | Super administrador |
| **Trilha administrativa: consultar** | o item **Trilha administrativa** (seção 4.8) | Administrador |
| permissão de **gerir as permissões por papel** | o item **Permissões por papel** (seção 4.7) | **não atribuída** pela instalação padrão |
| **Health DB (produção)** | verificação técnica de funcionamento, usada pela equipe de infraestrutura. Não abre nenhuma tela | Administrador, Gestor |

Na tela **Permissões por papel**, os nomes aparecem como na primeira coluna, inclusive com a grafia **Utilizadores** e os verbos **gerir** e **repor**. A exceção são sete nomes que a instalação grava com as letras acentuadas corrompidas: **Utilizadores: eliminação lógica**, **Utilizadores: forçar troca de senha**, **Colaboradores admin: eliminação lógica**, **Esteiras: gerir alocações por etapa**, **Matriz de operação: consultar**, **Matriz de operação: alterar** e **Health DB (produção)**. Neles, no lugar de cada letra acentuada aparece uma sequência de símbolos sem sentido. Reconheça-os pelo trecho legível do nome e pelo identificador técnico logo abaixo.

### 4.4 Como você percebe que falta uma permissão

A falta de permissão aparece de quatro formas. Nenhuma delas altera dados: quando o sistema recusa, nada foi gravado.

| O que você vê | O que significa | Exemplos |
|---|---|---|
| o **item não aparece no menu** | falta a permissão de consultar aquela tela. Um agrupamento do menu sem nenhum item liberado também some | **Usuários** para quem tem o perfil Gestor na configuração padrão |
| a tela abre com **"Sem permissão para esta área"** e *"Não tem permissão para acessar este conteúdo. Contate um administrador se precisar de acesso."* | você chegou à tela por um botão ou pelo endereço direto, sem a permissão de abri-la | **Nova Esteira Manual** no Painel operacional (capítulo 5) |
| um **botão ou item de menu da tela não aparece** | a tela esconde o que você não pode fazer | botões de situação da esteira (capítulo 6); **Apontamento gerencial** (capítulo 12); **Nova equipe** (capítulo 16) |
| a ação é **recusada ao confirmar** | a tela mostrou o botão, mas o sistema conferiu a permissão na hora de gravar. Em várias telas abre a janela **Sem permissão**, com *"Você não tem permissão para esta operação. Peça acesso ao administrador se necessário."*; algumas telas mostram uma mensagem própria | **Remover** colaborador sem a permissão (capítulo 16); *"Sem permissão para reabrir esta atividade."* (capítulo 6) |

O comportamento depende da tela: algumas escondem os botões, outras mostram todos e só recusam ao confirmar. Os capítulos de cada recurso dizem qual é o caso.

**Nem todo bloqueio é falta de permissão.** Antes de pedir liberação, confira se não é um destes casos:

| Situação | Causa real | Onde resolver |
|---|---|---|
| *"Sua conta não está associada a um colaborador operacional…"*, ou fila e jornada vazias com aviso de vínculo | a conta não está vinculada a um colaborador | **Usuários**, pela administração (capítulo 16, seção 16.9) |
| *"Sua conta está inativa. Contacte o administrador."* ao entrar | a conta foi inativada | **Usuários**, com **Ativar** (capítulo 16) |
| o sistema pede nova senha antes de liberar o uso | troca de senha obrigatória | criar a nova senha (capítulo 3) |
| ação recusada pela **situação** da esteira, pela **sequência** das atividades ou pelo tempo previsto | regra de operação, não de acesso | capítulos 6 e 7 |
| não consegue entrar no **Modo Fábrica** | credencial de produção (PIN) do colaborador | capítulo 13 |

### 4.5 Quando a permissão muda

Quando a administração troca o perfil da sua conta ou altera as permissões do seu perfil:

- **o sistema passa a conferir as novas permissões na hora.** A próxima ação que você fizer já é aceita ou recusada de acordo com elas;
- **o menu e os botões da sua tela não mudam sozinhos.** Eles são atualizados quando a página é recarregada ou quando você entra de novo no sistema.

Até essa atualização, duas coisas podem acontecer:

- uma permissão **recebida** ainda não aparece no menu — recarregue a página;
- uma permissão **retirada** ainda deixa o item ou o botão visível, mas o uso é recusado com a janela **Sem permissão**.

A troca de perfil ou de permissões **não encerra** a sessão de quem já está usando o sistema.

### 4.6 Pedir uma liberação

1. Confirme, pela seção 4.4, que o bloqueio é mesmo de permissão.
2. Anote **qual tela** você estava usando, **qual ação** tentou e o **texto da mensagem** que apareceu.
3. Procure **quem administra os acessos** na sua operação.

Quem administra pode atender de duas formas:

- **trocar o perfil da sua conta** por outro que já tenha a permissão (capítulo 16, seção 16.9);
- **acrescentar a permissão ao seu perfil** (seção 4.7) — lembrando que ela passa a valer para todas as contas com aquele perfil.

Depois da liberação, recarregue a página para o menu se atualizar (seção 4.5).

### 4.7 Consultar e alterar as permissões de um perfil

Esta seção é para quem administra os acessos e tem a permissão de gerir as permissões por papel.

1. Abra **Estrutura e administração → Permissões por papel**. Enquanto os dados são buscados, aparece **Carregando…**.
2. No campo **Papel**, escolha o perfil. A lista traz **todos** os perfis cadastrados — os quatro da instalação e as funções operacionais, inclusive as inativas —, cada um com o nome seguido do código entre parênteses. A tela abre com o primeiro da lista já selecionado.
3. Abaixo, aparecem **todas as permissões do sistema**, separadas em grupos por assunto. As permissões que o perfil já tem estão marcadas.
4. Marque o que o perfil deve passar a ter e desmarque o que deve perder.
5. Clique em **Salvar alterações**. Durante a gravação, o botão mostra **Salvando…**.
6. Aparece **"Permissões do papel atualizadas."** e a lista é recarregada com o que ficou gravado.

Como ler a lista:

- cada permissão mostra o **nome**, em destaque, e logo abaixo um **identificador técnico**. Oriente-se pelo nome; a tabela da seção 4.3 explica o que cada um libera;
- os **títulos dos grupos** também são identificadores técnicos, em inglês, e servem só para agrupar;
- o texto de apoio no topo da tela cita uma sigla técnica para o controle de acesso. Ela não tem significado para o uso.

Regras da tela:

| Situação | O que acontece |
|---|---|
| perfil **Colaborador** selecionado | as caixas e o botão **Salvar alterações** ficam desativados, e um aviso informa que este perfil não tem permissões explícitas nesta versão e que a edição está desativada |
| perfil **Administrador** sem alguma das permissões obrigatórias | a gravação é recusada (veja abaixo) e nada muda |
| o perfil selecionado é **o da sua própria conta** | aparece no rodapé *"Você está editando o papel da sua sessão atual. Após salvar, suas permissões serão atualizadas automaticamente."*. Depois de salvar, o seu menu se atualiza sem recarregar a página |
| você retirou do **seu próprio perfil** a permissão de gerir as permissões por papel | depois de salvar, você é levado ao **Painel operacional**, com o aviso *"Deixou de ter acesso à gestão de permissões. Foi redirecionado para o painel operacional."* |
| você trocou o perfil no campo **Papel** sem salvar | as marcações feitas são **descartadas sem aviso** e a tela mostra as permissões gravadas do novo perfil |
| você sai pelo menu lateral com alterações não salvas | aparece **"Sair desta página?"**; **Sair e continuar** descarta as alterações, **Cancelar** volta à tela |

**Permissões obrigatórias do Administrador.** O perfil **Administrador** precisa manter sempre estas seis permissões, para que nunca se perca a capacidade de administrar contas e acessos:

- **Utilizadores: consultar**;
- **Utilizadores: editar**;
- **Utilizadores: repor senha**;
- **Utilizadores: forçar troca de senha**;
- **Trilha administrativa: consultar**;
- a permissão de **gerir as permissões por papel**.

> **Atenção às atualizações do sistema.** As permissões que a instalação atribui ao **Administrador** e ao **Gestor** podem ser **reatribuídas** quando o sistema passa por atualização da sua base de dados. Se você retirou de um desses perfis alguma permissão da configuração padrão, confira o perfil depois de cada atualização. Pelo mesmo motivo, **Configurações do sistema** pode deixar de constar no Administrador e no Gestor mesmo que alguém a tenha marcado.

[IMAGEM SUGERIDA: Tela Permissões por papel com o perfil Gestor selecionado no campo Papel, os grupos de permissões com caixas marcadas e desmarcadas e o botão Salvar alterações]

### 4.8 Conferir alterações de permissão na Trilha administrativa

Toda gravação feita em **Permissões por papel** fica registrada na **Trilha administrativa**.

1. Abra **Estrutura e administração → Trilha administrativa**.
2. No campo **Tipo de evento**, escolha **Permissões do papel atualizadas**. A lista se atualiza ao escolher; o botão **Aplicar filtros** também recarrega.
3. Leia as colunas:

| Coluna | Conteúdo, para este tipo de evento |
|---|---|
| **Quando** | data e hora da gravação |
| **Evento** | **Permissões do papel atualizadas** |
| **Actor** | o e-mail de quem gravou |
| **Alvo** e **Colab.** | um traço — a alteração é do perfil, não de uma conta |
| **Metadados** | um resumo em formato técnico com o código do perfil e os identificadores das permissões **acrescentadas** e **retiradas**. Passe o ponteiro do mouse sobre a célula para ver o texto inteiro |

A linha acima da tabela informa *"N evento(s) encontrado(s) (limite 100 mais recentes)."*: a tabela mostra no máximo os **100 eventos mais recentes**. Sem resultados, aparece *"Sem eventos para os filtros atuais."*.

Observações:

- **cada clique em Salvar alterações gera um registro**, mesmo que nada tenha mudado. Nesse caso, as listas de acrescentadas e retiradas aparecem vazias;
- a **troca do perfil de uma conta**, feita em **Usuários**, é registrada como **Usuário atualizado**, com o e-mail da conta na coluna **Alvo**. Os **Metadados** indicam quais dados mudaram, mas não qual era o perfil anterior nem o novo;
- o campo **ID do usuário alvo** pede um identificador interno que a interface não exibe nas outras telas. Na prática, filtre pelo **Tipo de evento**;
- o link **← Usuários**, no topo, leva à tela **Usuários**.

[IMAGEM SUGERIDA: Trilha administrativa filtrada por Permissões do papel atualizadas, com as colunas Quando, Evento, Actor, Alvo, Colab. e Metadados]

## O que esperar

### As alterações valem para o perfil inteiro

Marcar ou desmarcar uma permissão muda o que **todas** as contas daquele perfil podem fazer. Antes de alterar um perfil compartilhado por muitas pessoas, avalie se não é melhor trocar o perfil de uma conta só.

### Valem na hora, mas o menu só muda na recarga

O sistema confere as permissões a cada ação, de modo que uma alteração já vale na ação seguinte de cada pessoa. O menu e os botões de quem está com o sistema aberto só se atualizam quando a página é recarregada ou a pessoa entra de novo (seção 4.5). A única exceção é você mesmo, ao salvar o seu próprio perfil em **Permissões por papel**.

### O histórico não é desfeito

Retirar uma permissão impede **novas** ações. Nada do que já foi feito com ela — apontamentos, cadastros, alterações de esteira — é apagado ou revertido.

### Inativar uma função não retira as permissões

Uma função operacional inativada em **Configurações operacionais** continua aparecendo em **Permissões por papel**, e as contas que a usam como perfil **mantêm** as permissões marcadas nela. Para cortar o acesso, desmarque as permissões ou troque o perfil das contas.

## Quando algo é bloqueado

### Acesso às telas deste capítulo

| O que aparece | Causa | O que fazer |
|---|---|---|
| **Permissões por papel** ou **Trilha administrativa** não aparece no menu, ou o endereço direto mostra **"Sem permissão para esta área"** | falta a permissão correspondente | pedir a quem administra os acessos. Se ninguém na operação vê **Permissões por papel**, a permissão não foi liberada no ambiente — trate com o suporte técnico |

### Ao salvar permissões

| Mensagem | Causa | O que fazer |
|---|---|---|
| mensagem iniciada por *"O papel Administrador deve manter as permissões:"*, seguida de identificadores técnicos | você desmarcou alguma das seis permissões obrigatórias do Administrador | marque de novo as permissões listadas em 4.7 e salve |
| *"Deixou de ter acesso à gestão de permissões. Foi redirecionado para o painel operacional."* | você retirou do seu próprio perfil a permissão de gerir permissões. **A gravação foi feita** | se foi engano, peça a outra pessoa com essa permissão que a devolva ao seu perfil |
| janela **Sem permissão** | a sua permissão de gerir permissões foi retirada enquanto a tela estava aberta | recarregue a página; se o item sumir do menu, peça a liberação |
| janela de aviso com *"O recurso solicitado não foi encontrado ou não existe mais."* | o perfil foi excluído — por exemplo, uma função operacional apagada em Configurações operacionais — enquanto a tela estava aberta | recarregue a página e escolha outro perfil |

Quando a lista de perfis ou de permissões não carrega, a tela mostra o motivo em uma faixa no alto ou, em falhas de sessão e de comunicação, em uma janela de aviso. Recarregue a página e tente de novo.

### Na Trilha administrativa

| O que aparece | Causa | O que fazer |
|---|---|---|
| *"Sem eventos para os filtros atuais."* | nenhum registro do tipo escolhido, ou o campo **ID do usuário alvo** preenchido com um valor que não corresponde a nenhuma conta | voltar o **Tipo de evento** para **Todos os tipos** e esvaziar o campo de identificador |
| mensagem de erro no lugar da tabela | falha ao buscar os registros, inclusive quando o campo **ID do usuário alvo** tem um valor fora do formato esperado | esvaziar o campo e clicar em **Aplicar filtros** |

### Ações que não existem

| Limitação | Como proceder |
|---|---|
| dar uma permissão a **uma única conta** | trocar o perfil da conta ou alterar o perfil inteiro (seção 4.1) |
| dar a uma conta **mais de um perfil** | não existe; cada conta tem um perfil só |
| ver o seu próprio perfil na tela | perguntar a quem administra os acessos |
| alterar as permissões do perfil **Colaborador** | não é possível nesta versão |
| criar um perfil novo com outro nome nesta tela | não existe nesta tela. Toda função criada em **Configurações operacionais** aparece também como perfil, mas a lista é compartilhada com as funções da fábrica (capítulo 16, seção 16.1) |
| desfazer uma alteração de permissões | não há botão de desfazer. Consulte o registro na **Trilha administrativa** (seção 4.8) e remarque as permissões manualmente |

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
> O painel só reconhece o prazo da esteira quando consegue interpretá-lo como **uma data única**. O cadastro, porém, não guarda o prazo assim: a tela de **Nova esteira** — e a de **Alterar Esteira** — pede **Início previsto** e **Fim previsto**, e o sistema grava as duas datas juntas, em uma única linha de texto. Com duas datas nessa linha, o painel não identifica nenhuma delas e trata a esteira como **sem prazo**.
> O efeito prático é direto: **uma esteira cadastrada normalmente pela tela atual pode nunca entrar em Em atraso, mesmo depois de passar do fim previsto.** O cartão fica em zero enquanto há esteiras atrasadas de fato.
> Esteiras antigas, ou criadas por outros caminhos, podem ter o prazo gravado em formatos diferentes e aí o resultado é inconsistente: algumas são reconhecidas corretamente, outras aparecem atrasadas desde a criação, e quando só uma das duas datas foi preenchida o painel pode acabar comparando com a data errada. Não há como saber pelo cartão em que caso cada esteira se encaixa.
> Enquanto isso não for corrigido, **não use o cartão Em atraso como fonte única** para decidir prioridade. Confira o prazo na própria esteira. O registro desta pendência está no capítulo 21.

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

## Para que serve

A **esteira** é o trabalho completo que o SGP+ acompanha do início ao fim: um veículo, um pedido, uma entrega. Tudo o que a fábrica executa, planeja e aponta nasce de uma esteira.

Este capítulo responde quatro perguntas:

1. como o trabalho é criado e dividido;
2. em que situação ele está;
3. quem executa cada parte;
4. o que fazer quando o trabalho muda depois de já ter começado.

É o capítulo estrutural do manual. O Planejamento (capítulos 8 e 9), a fila do colaborador (capítulo 10) e o Modo Fábrica (capítulo 13) só funcionam sobre uma esteira que já existe e já tem estrutura.

[IMAGEM SUGERIDA: detalhe de uma esteira em andamento, com cabeçalho, situação, resumo operacional e o início da estrutura operacional]

## Onde fica

### Para criar uma esteira

| Caminho | Abre |
|---|---|
| Menu lateral, **Gestão** → **Nova esteira** | a tela de criação, com título **Nova esteira** |
| Menu lateral, **Gestão** → **Por documento** | a tela **Nova esteira por documento** |
| **Painel operacional**, botão **Nova Esteira Manual** (topo) | a mesma tela **Nova esteira** |
| **Painel operacional**, botão **Nova esteira por documento** (topo) | a mesma tela **Nova esteira por documento** |

São dois destinos, com duas entradas cada. O botão do painel e o item de menu levam exatamente à mesma tela.

> O botão do painel chama-se **Nova Esteira Manual**, mas a tela que ele abre também permite começar a partir de uma matriz. O nome do botão é mais estreito do que a tela. Não existe uma terceira tela "manual" separada.

### Para consultar uma esteira

| Caminho | Observação |
|---|---|
| **Painel operacional** → menu **Ações** da linha → **Consultar** | a entrada principal; descrita no capítulo 5 |
| **Painel operacional** → menu **Ações** da linha → **Editar** | abre direto a tela de alteração |
| **Dashboard** | listas de esteiras com link para o detalhe |
| **Minha fila** (capítulo 10) | cada cartão leva à esteira da atividade |
| **Minha jornada** (capítulo 11) e **Jornada por colaborador** (capítulo 12) | cada alocação leva à esteira |
| tela de **Apontamento** | link **Detalhe da esteira** |
| **Planejamento semanal** (capítulo 8) | o agrupamento por esteira e o painel de divergências de sincronização levam ao detalhe |

Dentro do detalhe, o botão **Alterar esta esteira** abre a tela **Alterar Esteira**.

> **Atenção:** três blocos do **Planejamento semanal** — **Desvios do responsável principal**, **Histórico da semana** e **Execução fora do plano** — têm links **Abrir esteira** / **Ver esteira** que **não funcionam**: em vez da esteira, levam você à tela inicial. Está registrado no capítulo 21. Para chegar à esteira nesses casos, use o Painel operacional.

## Quem costuma ter acesso

| O que fazer | Depende de |
|---|---|
| **consultar** o detalhe de qualquer esteira | nada além do acesso ao sistema |
| **criar** esteira (qualquer forma) | permissão de criar esteiras |
| **alterar** dados básicos e estrutura | permissão de criar esteiras |
| **concluir**, **reabrir**, **dispensar** e **restaurar** atividade pela esteira | permissão de criar esteiras |
| **incluir novo item** em esteira já existente | permissão de criar esteiras |
| **avançar**, **voltar** ou **cancelar** a situação da esteira | permissão específica de mudar situação |
| **excluir** a esteira inteira | permissão de criar esteiras, e a esteira precisa estar elegível |

Duas permissões diferentes governam esta tela: uma para **conteúdo** (dados, estrutura, atividades) e outra para **situação** (avançar, voltar, cancelar). É comum ter a primeira e não a segunda — nesse caso você edita a esteira mas não a faz andar no fluxo.

Quem só consulta vê a esteira inteira: dados, estrutura, tempos, situação e histórico. O que desaparece são os botões.

Quando você não tem a permissão de situação, em lugar dos botões aparece uma linha informando que as transições exigem uma permissão específica — o texto cita o nome interno da permissão, registrado no capítulo 21.

## Como fazer

### 6.1 A estrutura de uma esteira

Toda esteira tem quatro níveis, sempre nesta ordem:

```text
Esteira            o trabalho completo
└── Tarefa         um grande bloco de trabalho
    └── Setor      onde o bloco é executado
        └── Atividade   a unidade que o colaborador executa e aponta
```

Leia sempre de cima para baixo:

| Nível | O que é | Exemplo |
|---|---|---|
| **Esteira** | o trabalho inteiro, com cliente, veículo, prazo e responsável | "OS 12345 · Gol GTI" |
| **Tarefa** | um bloco do trabalho | "Revisão completa" |
| **Setor** | onde aquele bloco acontece | "Tapeçaria" |
| **Atividade** | o que uma pessoa faz e aponta | "Forrar bancos dianteiros" |

Regras fixas da estrutura, válidas em qualquer forma de criação:

- uma esteira precisa de **pelo menos uma tarefa**;
- uma tarefa precisa de **pelo menos um setor**;
- um setor precisa de **pelo menos uma atividade**;
- todos os quatro precisam de nome.

A **atividade** é o único nível que o colaborador enxerga no dia a dia. É nela que o tempo é apontado, é ela que entra no planejamento e é ela que tem situação própria. Tarefa e setor servem para organizar e para ler a esteira.

A ordem em que tarefas, setores e atividades aparecem na tela **é** a sequência operacional recomendada: o sistema lê a estrutura de cima para baixo e trata o que vem antes como anterior. Isso não bloqueia a execução, mas gera pedido de justificativa quando alguém trabalha fora de ordem — veja o capítulo 7.

[IMAGEM SUGERIDA: bloco Estrutura operacional do detalhe, mostrando Tarefa 1 → Setor 1 → lista de atividades numeradas, com tempo ao lado de cada uma]

### 6.2 Ler o detalhe de uma esteira

O detalhe é a tela de referência da esteira. De cima para baixo:

| Bloco | O que traz |
|---|---|
| **Cabeçalho** | nome da esteira, a linha de identificação, a forma de origem (**Manual**, **Base** ou **Misto**), o selo de situação e os botões de ação |
| **Resumo operacional** | contagem de **Tarefas**, **Setores**, **Atividades** e o **Tempo estimado total** |
| **Dados básicos** | cliente, responsável, veículo, modelo / versão, placa, prioridade, início e fim previstos, tempo total previsto, total de atividades, criada em, concluída em e observações |
| **Pendência e concentração por setor e atividade** | compara, por atividade, o previsto da estrutura com os minutos já apontados, e mostra a pendência |
| **Plano Operacional da Esteira** | bloco próprio de preparação da execução |
| **Eventos operacionais** | o histórico da esteira |
| **Estrutura operacional** | a árvore tarefa → setor → atividade, com as ações por atividade |

Pontos que costumam gerar dúvida:

- **a esteira não tem campo de código ou OS.** A linha sob o nome mostra o código quando existe; nas esteiras criadas pelo sistema esse código fica vazio e a linha repete o nome. Por isso a tela de criação sugere escrever a OS dentro do nome — o próprio campo traz o exemplo *"OS 12345 · Gol GTI"*. É também assim que a busca do Painel operacional encontra a esteira pela OS;
- **Tempo estimado total** e **Tempo total previsto (min)** mostram o mesmo número, calculado da estrutura;
- a situação exibida é a **situação formal** da esteira, com rótulo próprio. Ela não é igual aos recortes do Painel operacional — em especial, **Em atraso** é leitura de prazo, não situação. Veja o capítulo 5;
- o **Plano Operacional da Esteira** é um recurso de preparação da execução que vive nesta tela. Esta revisão do manual **não** documenta o passo a passo dele; quando a esteira ainda não tem plano, o bloco mostra *"Esta esteira ainda não possui Plano Operacional."* e, nas situações em que é permitido criar, o botão **Criar plano operacional**.

### 6.3 As formas de criar uma esteira

São **três formas realmente disponíveis**, e elas se distribuem em duas telas:

| Forma | Onde | O que faz |
|---|---|---|
| **Montar manualmente** | **Nova esteira** | você cria tarefas, setores e atividades do zero |
| **A partir de uma matriz** | **Nova esteira** | a estrutura de uma matriz de operação é copiada para a esteira |
| **Por documento** | **Por documento** | você envia um documento e o sistema propõe a esteira |

Na tela **Nova esteira**, montar manualmente e usar matriz **não são caminhos separados**: é a mesma tela, e você pode combinar os dois — começar de uma matriz e acrescentar tarefas manuais, ou o contrário. O resultado fica registrado como **Manual**, **Base** ou **Misto** no cabeçalho do detalhe.

> Existe uma quarta tela, o **Laboratório de Esteiras**, que compõe uma esteira a partir de várias matrizes. Ela **não tem item de menu nem link em nenhuma tela** e por isso não é um método disponível. O registro está no capítulo 21.

### 6.4 Criar manualmente

A tela **Nova esteira** tem três passos, mostrados como trilho no alto: **Dados básicos → Estrutura → Revisão**. Você pode clicar em qualquer um dos três a qualquer momento — eles indicam o que falta, não prendem você em uma ordem.

**Passo 1 — Dados básicos**

1. Preencha **Nome** — é o único campo obrigatório. O exemplo do campo é *"OS 12345 · Gol GTI"*.
2. Preencha o que fizer sentido: **Cliente**, **Veículo**, **Placa**, **Modelo / versão**, **Início previsto**, **Fim previsto**, **Responsável**, **Prioridade** e **Observações**.
3. **Tempo total previsto (min)** não é digitável: é calculado da estrutura. Enquanto a estrutura está vazia, mostra *"0 min"* e a nota *"Calculado após definir a estrutura"*.
4. Clique em **Continuar para estrutura**. O botão só libera depois que o nome é preenchido.

**Passo 2 — Estrutura**

A tela fica dividida: à esquerda **Bases e extras** (o catálogo), à direita **Sua esteira em montagem**.

Para montar do zero:

1. Clique em **+ Adicionar tarefa manual**. Entra uma tarefa chamada **Tarefa 1**, já com um setor e uma atividade em branco.
2. Dê nome à tarefa e ao setor.
3. Em cada atividade, preencha o nome, **Qtd** (quantidade prevista) e **Min/un.** (minutos por unidade).
4. Use **+ Atividade neste setor** e **+ Setor nesta tarefa** para crescer a estrutura.
5. Use as setas **↑** e **↓** para ordenar, e **Remover atividade** / **Remover setor** / **Remover tarefa** para enxugar. O último item de cada nível não pode ser removido — a estrutura precisa sempre de pelo menos um de cada.
6. Em cada atividade, aloque quem executa — veja 6.6.

**Passo 3 — Revisão**

O passo **Revisão** mostra o cartão **Antes de criar**, com **Base**, **Tarefas**, **Setores**, **Atividades**, **Minutos (estrutura)** e a lista de **Pendências**.

- sem pendências, aparece *"Nada a corrigir para criar."*;
- com pendências, cada uma é listada em uma frase do que falta.

Clique em **Criar esteira**. O botão existe também no cabeçalho, disponível nos três passos.

Não existe uma tela de pré-visualização separada: o cartão **Antes de criar** é a revisão.

[IMAGEM SUGERIDA: passo Estrutura da tela Nova esteira, com o catálogo Bases e extras à esquerda e a esteira em montagem à direita]

### 6.5 Criar a partir de uma matriz

A matriz de operação é um modelo de estrutura mantido em **Matrizes de operação**. Criar a partir dela poupa a montagem item a item.

No passo **Estrutura**, na coluna **Bases e extras**:

1. Em **Escolher base**, use **Buscar base…** para encontrar a matriz. Cada matriz mostra quantas tarefas tem e o total de minutos estimados.
2. Clique em **Usar esta base**. Todas as tarefas da matriz entram na esteira em montagem.
3. Se já houver uma matriz na esteira, o botão passa a ser **Trocar base** — ele substitui as tarefas vindas de matriz e **preserva** as tarefas que você acrescentou à mão.
4. Para acrescentar apenas um pedaço, em **Extras** arraste uma tarefa solta de qualquer matriz para a área de montagem.

**O que a matriz traz:**

| Item | Vem da matriz? |
|---|---|
| tarefas, setores e atividades, com nomes | sim |
| ordem | sim |
| minutos por unidade de cada atividade | sim |
| responsável padrão da atividade, como **responsável principal** | sim, quando a matriz tem um |
| equipe padrão da atividade, como apoio | sim, quando a matriz tem uma |
| **quantidade prevista** | **não** — toda atividade entra com **1 unidade**, mesmo que a matriz preveja mais |

A última linha é importante: se a matriz prevê 4 unidades de uma atividade, a esteira nasce com 1. **Confira e corrija a quantidade de cada atividade antes de criar.** A divergência está registrada no capítulo 21.

**Depois de criar, a esteira é independente da matriz.** A estrutura é copiada, não vinculada: alterar a matriz depois não muda nenhuma esteira já criada, e alterar a esteira não muda a matriz. A esteira guarda apenas o registro de qual matriz a originou, para consulta.

Tudo o que vem da matriz continua editável — antes de criar, na tela de criação; depois de criar, pela tela **Alterar Esteira**.

### 6.6 Responsável, equipe e alocação

O SGP+ usa três coisas diferentes que é fácil confundir:

| Conceito | Onde fica | O que significa |
|---|---|---|
| **Responsável** da esteira | Dados básicos | quem responde pelo trabalho inteiro, para gestão e para a busca do painel |
| **Colaborador alocado** na atividade | estrutura, em cada atividade | quem o cadastro aponta como executor daquela atividade |
| **Equipe** alocada na atividade | estrutura, em cada atividade | a equipe envolvida na atividade, sem nome individual |

**O responsável da esteira não executa nada por isso.** Ele é um dado de gestão. Quem aparece como executor é o colaborador alocado na atividade.

Em cada atividade, a faixa de alocação funciona assim:

- o **+** abre a busca **Buscar colaborador ou time…**, com colaboradores e equipes na mesma lista;
- cada colaborador alocado aparece como um círculo com as iniciais; passar o mouse mostra o nome;
- o círculo com **anel dourado** é o **responsável principal** da atividade. O primeiro colaborador alocado vira principal automaticamente;
- cada equipe aparece como uma etiqueta azul com o nome;
- para remover, clique no círculo do colaborador ou no **×** da etiqueta da equipe.

Regras que a tela cobra:

| Regra | Efeito |
|---|---|
| alocar colaboradores exige **exatamente um principal** | sem isso, a criação é recusada com o nome da atividade na mensagem |
| o mesmo colaborador não repete na mesma atividade | a tela nem oferece quem já está alocado |
| a mesma equipe não repete na mesma atividade | idem |
| **equipe nunca é responsável principal** | a equipe entra sempre como apoio |
| alocar é **opcional** | atividade sem ninguém alocado não impede criar a esteira |

Alocar uma equipe **não** expande os membros dela em alocações individuais: a equipe fica como uma alocação só.

**Alocação estrutural não é trabalho distribuído.** Alocar alguém na estrutura diz quem deveria executar; não coloca nada na fila de ninguém. A fila do colaborador (capítulo 10) e o Modo Fábrica (capítulo 13) só recebem o que foi distribuído **e publicado** no planejamento (capítulos 8 e 9). Os dois conceitos não são equivalentes.

Trocar a equipe de uma atividade não muda o responsável da esteira, e vice-versa: são campos independentes. Um colaborador que deixa de existir no cadastro não pode ser alocado — a inclusão é recusada com *"Colaborador de alocação inexistente, inativo ou indisponível."*. O mesmo vale para equipe inativa.

### 6.7 Tempo por unidade, quantidade prevista e total previsto

Cada atividade tem dois números, lado a lado na estrutura:

| Campo na tela | O que é | Regra |
|---|---|---|
| **Min/un.** | minutos para executar **uma** unidade | número inteiro, de 0 para cima; começa em **60** em atividade nova |
| **Qtd** | **quantidade prevista** de unidades | número inteiro **de 1 para cima**; começa em **1** |

O total previsto da atividade é sempre:

```text
tempo por unidade  ×  quantidade prevista  =  total previsto
```

O **Tempo estimado total** da esteira é a soma dos totais previstos de todas as atividades.

Como o detalhe mostra isso em cada atividade:

| Quantidade prevista | O que aparece |
|---|---|
| 1 unidade | só o tempo, por exemplo **30 min** |
| mais de 1 | a conta inteira, por exemplo **4 un. × 30 min = 2 h** |

Limites da **quantidade prevista**:

- **zero não é aceito**, e **fração não é aceita**. Digitar algo fora disso deixa o campo marcado e mostra *"A quantidade prevista deve ser um número inteiro maior ou igual a 1."*;
- enquanto o campo estiver inválido, a esteira não pode ser criada nem salva.

#### Alterar a quantidade de uma esteira que já existe

O comportamento atual é permissivo. Pela tela **Alterar Esteira** → **Estrutura**, a quantidade prevista de qualquer atividade pode ser alterada:

| Situação | A alteração é aceita? | Exige justificativa? |
|---|---|---|
| esteira em **Rascunho / Em elaboração** | sim | não |
| esteira em qualquer outra situação | sim | **sim** |
| atividade que **já tem horas apontadas** | **sim** | sim, pela regra da situação |
| atividade já **concluída** ou **dispensada** | **sim** | sim, pela regra da situação |

Ou seja: **não existe bloqueio por apontamento**. A única barreira fora de **Rascunho / Em elaboração** é a justificativa.

Alterar a quantidade muda o total previsto da atividade, o tempo total da esteira e, em consequência, a pendência de tempo exibida no detalhe. Em atividade que já tem horas apontadas, aumentar a quantidade faz a pendência crescer; reduzir faz encolher — sem tocar nas horas já registradas.

> **Use com cuidado.** O comportamento do sistema é mais permissivo do que a regra de negócio pretendia: alterar a quantidade de uma atividade já em execução reescreve o previsto contra o qual o realizado será comparado. Divergência registrada no capítulo 21.

> **Números diferentes para a mesma atividade.** O previsto do **detalhe da esteira** considera a quantidade e está correto. As telas de **jornada** (capítulos 11 e 12) calculam o previsto como se cada atividade tivesse 1 unidade, e por isso mostram menos. Em atividade com mais de uma unidade, a referência correta é a estrutura da esteira. Registrado no capítulo 21.

### 6.8 Criar por documento — visão geral

O item de menu **Por documento** abre a tela **Nova esteira por documento**. Exige a mesma permissão de criar esteiras.

Em resumo, o caminho é:

1. você **envia um documento em PDF**;
2. o sistema devolve um **rascunho**: dados sugeridos e itens inferidos, todos editáveis na tela;
3. você revisa, corrige e decide item por item;
4. ao confirmar em **Criar esteira no SGP+**, a esteira é criada de verdade e você cai no detalhe dela.

A partir daí, a esteira é uma esteira como qualquer outra: vale tudo o que este capítulo descreve.

Nesta tela, diferente da **Nova esteira**, o prazo aparece como um campo único de texto chamado **Prazo estimado**. Ele serve apenas de conferência: o que o sistema reconhece no documento durante a leitura **não é gravado automaticamente** na esteira, e o prazo da esteira criada fica em branco. Detalhes no capítulo 17.

**O passo a passo completo — envio, leitura, revisão de itens e aceite — está no capítulo 17, Importação por documento.** Este capítulo não o repete.

### 6.9 Dados básicos: campos, obrigatoriedade e prazo

Na **Nova esteira** e na **Alterar Esteira**, os campos são os mesmos:

| Campo | Obrigatório? | Como funciona |
|---|---|---|
| **Nome** | **sim** | texto livre; é o identificador prático da esteira |
| **Cliente** | não | texto livre |
| **Veículo** | não | texto livre |
| **Placa** | não | texto livre, exibido em maiúsculas; o exemplo é *ABC1D23*, mas o formato não é cobrado |
| **Modelo / versão** | não | texto livre |
| **Início previsto** | não | seletor de data |
| **Fim previsto** | não | seletor de data |
| **Responsável** | não | lista de colaboradores; não aceita nome digitado |
| **Prioridade** | não | **Baixa**, **Média** ou **Alta**; já vem em **Média** |
| **Tempo total previsto (min)** | — | só leitura, calculado da estrutura |
| **Observações** | não | texto livre |

Duas ausências que surpreendem:

- **não há campo de código ou OS**. Use o nome;
- **não há verificação de duplicidade**. Duas esteiras podem ter exatamente o mesmo nome, o mesmo cliente e a mesma placa, e o sistema aceita as duas sem aviso. Conferir antes de criar é responsabilidade de quem cadastra.

#### O prazo da esteira

A tela **Nova esteira** pede o prazo como **duas datas**: **Início previsto** e **Fim previsto**. Preencha pelos seletores de data, como a tela pede — não há formato a decorar.

No detalhe, as duas voltam nos campos **Início previsto** e **Fim previsto**. Em esteiras antigas, o prazo pode ter sido gravado como um texto único; nesse caso o detalhe mostra uma linha extra chamada **Prazo estimado** com aquele texto como está.

> **Limitação que afeta a leitura de atraso.** O cartão e o filtro **Em atraso** do Painel operacional, e o selo **Atrasada** dos cartões de backlog do Planejamento e da Agenda, só reconhecem o prazo em formatos específicos — e **não** reconhecem o par Início/Fim previsto que a tela de criação produz. Consequência prática: uma esteira cadastrada pela tela atual tende a **nunca** ser contada como atrasada. Não use esses indicadores como fonte única de prioridade; confira o prazo na própria esteira. Registrado no capítulo 21.

### 6.10 Alterar uma esteira existente

O botão **Alterar esta esteira**, no detalhe, abre a tela **Alterar Esteira**. Ela tem as mesmas três abas da criação — **Dados básicos**, **Estrutura** e **Revisão** — já carregadas com a esteira.

O que muda em relação à criação:

- o botão final é **Salvar alterações**, e só libera quando existe algo diferente para salvar. Sem alteração nenhuma, a revisão lista *"Nenhuma alteração para salvar."*;
- **a estrutura é editável em qualquer situação da esteira** — inclusive finalizada e cancelada. Não há bloqueio por situação;
- fora de **Rascunho / Em elaboração**, salvar abre a janela **Justificativa da alteração**, com o texto *"Esta esteira já saiu do Backlog. Informe o motivo da alteração para manter a rastreabilidade operacional."* e o campo **Motivo da alteração**. O motivo é obrigatório e precisa ter de 3 a 500 caracteres;
- a aba **Estrutura** traz também o atalho **Incluir novo item** — veja 6.14.

Ao salvar, você volta para o detalhe com o aviso **"Esteira atualizada com sucesso."**.

> Enquanto houver alteração não salva, os botões de situação ficam desligados, com o aviso **"Existem alterações não salvas. Salve ou descarte antes de mudar o status da esteira."**. Salve primeiro, mude a situação depois.

### 6.11 As situações da esteira

A esteira passa por **sete situações**. Toda esteira nasce em **Rascunho / Em elaboração**.

| Situação | O que significa | Como se entra | O que fica disponível |
|---|---|---|---|
| **Rascunho / Em elaboração** | ainda em montagem; invisível para a produção | é a situação de nascimento | **Enviar para planejamento**, **Cancelar esteira**; editar sem justificativa; excluir |
| **Aguardando planejamento** | cadastro pronto, esperando o gestor da fábrica aceitar | por **Enviar para planejamento**, ou por **Voltar para backlog** | **Aceitar e iniciar planejamento**, **Cancelar esteira**; excluir |
| **Em planejamento** | gestor definindo equipe, responsáveis e sequência | por **Aceitar e iniciar planejamento**, ou por **Voltar para planejamento** | **Liberar para produção**, **Cancelar esteira**, **Voltar para backlog**; excluir |
| **A iniciar** | liberada para a fábrica, sem nenhuma hora apontada ainda | por **Liberar para produção** | **Cancelar esteira**, **Voltar para planejamento**, **Voltar para backlog**; excluir; já aceita apontamento |
| **Em andamento** | tem execução registrada | **automaticamente**, no primeiro apontamento | **Finalizar esteira**, **Cancelar esteira**, **Voltar para planejamento**, **Voltar para backlog**; aceita apontamento |
| **Finalizada** | encerrada com conclusão | por **Finalizar esteira** | **nenhuma ação de situação**; não aceita apontamento |
| **Cancelada** | encerrada por cancelamento | por **Cancelar esteira**, de qualquer situação aberta | **nenhuma ação de situação**; não aceita apontamento |

Três consequências práticas:

1. **apontar só é possível em A iniciar e Em andamento.** Nas outras cinco, o apontamento é recusado com a explicação da situação;
2. **a produção não vê esteira em Rascunho / Em elaboração.** Ela existe só para a gestão;
3. **Finalizada e Cancelada não oferecem nenhuma ação de situação** na tela. São o fim da linha pelo caminho normal.

[IMAGEM SUGERIDA: cabeçalho do detalhe de uma esteira Em andamento, com o selo de situação e a faixa de botões Finalizar esteira, Cancelar esteira, Voltar para planejamento e Voltar para backlog]

### 6.12 Fazer a esteira avançar

Os botões de avanço ficam no cabeçalho do detalhe e no cabeçalho da tela **Alterar Esteira**. Cada situação tem o seu:

| De | Botão | Para |
|---|---|---|
| Rascunho / Em elaboração | **Enviar para planejamento** | Aguardando planejamento |
| Aguardando planejamento | **Aceitar e iniciar planejamento** | Em planejamento |
| Em planejamento | **Liberar para produção** | A iniciar |
| A iniciar | *nenhum* | Em andamento, **automático** |
| Em andamento | **Finalizar esteira** | Finalizada |

Características do avanço:

- **é um passo por vez, na ordem.** Não existe atalho de Rascunho direto para A iniciar. Tentar pular etapa é recusado;
- **não há pré-condição de conteúdo.** O sistema não exige estrutura mínima, responsável, prazo ou planejamento publicado para avançar. A conferência é sua;
- **A iniciar → Em andamento não tem botão.** A esteira passa sozinha quando o **primeiro apontamento** é registrado — tanto pelo totem quanto pelo navegador. É o único avanço que a execução dispara;
- **finalizar não cobra que as atividades estejam concluídas.** Uma esteira com atividades pendentes aceita **Finalizar esteira**;
- quem pode avançar é quem tem a permissão de mudar situação. Ao concluir, aparece **"Status da esteira atualizado."**.

Sobre planejamento: **publicar o planejamento não avança a esteira**, e avançar a esteira não publica planejamento. São dois eixos independentes. A esteira fica pronta para entrar no planejamento quando chega a **Aguardando planejamento**; o trabalho semanal em si está nos capítulos 8 e 9.

### 6.13 Fazer a esteira voltar

Existem **duas voltas distintas**, com regras próprias. Ambas pedem motivo.

| Botão | Disponível em | Leva para |
|---|---|---|
| **Voltar para planejamento** | A iniciar, Em andamento | **Em planejamento** |
| **Voltar para backlog** | Em planejamento, A iniciar, Em andamento | **Aguardando planejamento** |

Não as trate como "voltar uma etapa": elas têm destinos diferentes e alcances diferentes. **Voltar para planejamento** tira a esteira da fila da fábrica e a devolve ao planejamento ativo. **Voltar para backlog** recua mais, até a fila de espera do planejamento — e é a única volta disponível quando a esteira está em **Em planejamento**.

Ao clicar, abre uma confirmação:

| Botão | Título | O que a janela explica |
|---|---|---|
| **Voltar para planejamento** | *"Voltar esteira para planejamento?"* | *"Esta ação remove a esteira da fila de produção e permite ajustar responsáveis, sequência, datas ou estrutura planejada."* e *"O histórico e os apontamentos já registrados serão preservados."* |
| **Voltar para backlog** | *"Voltar esteira para backlog?"* | *"Esta ação remove a esteira da produção ou do planejamento ativo e retorna para a fila de planejamento da fábrica."* e *"O histórico, os apontamentos e a estrutura da esteira serão preservados."* |

O campo **Informe o motivo:** é **obrigatório**, texto livre, de 3 a 500 caracteres. Não há catálogo de motivos para retrocesso — ao contrário da dispensa de atividade, que tem lista fixa.

O que acontece depois:

- a esteira muda de situação e o retrocesso entra no histórico, com o motivo que você escreveu;
- **apontamentos e horas já registradas são preservados** — nada é apagado;
- a estrutura é preservada;
- **as duas voltas tiram a esteira das situações que aceitam apontamento.** A partir daí, nenhum colaborador consegue apontar nela até que ela volte a **A iniciar** ou **Em andamento**. Os itens já publicados no planejamento continuam no plano, mas deixam de ser apontáveis;
- aparece **"Esteira retornada para planejamento."** ou **"Esteira retornada para backlog."**.

Não existe volta de **Finalizada** nem de **Cancelada** por nenhum desses botões.

### 6.14 Cancelar e finalizar

**Cancelar** está disponível em **todas as cinco situações abertas**: Rascunho / Em elaboração, Aguardando planejamento, Em planejamento, A iniciar e Em andamento. O botão é **Cancelar esteira**.

**Esteira Finalizada não oferece Cancelar esteira.** Na prática, pela tela, **finalizada é terminal**: não há nenhuma ação de situação para ela.

O cancelamento é direto: **não há janela de confirmação e não há campo de motivo**. Um clique e a esteira passa a **Cancelada**.

> **Cancele com atenção.** É a ação menos reversível desta tela: sem confirmação, sem motivo e sem volta pela interface.

Efeitos do cancelamento:

| Onde | O que acontece |
|---|---|
| **situação da esteira** | passa a **Cancelada** |
| **apontamentos** | preservados integralmente; nada é apagado |
| **estrutura e atividades** | preservadas, com as situações que tinham |
| **novos apontamentos** | recusados, com *"Esta esteira está cancelada e não permite novos apontamentos."* |
| **dispensar e restaurar atividade** | deixam de ser possíveis |
| **planejamento** | os itens já publicados não são removidos automaticamente; remova-os no planejamento, pelos capítulos 8 e 9 |
| **Painel operacional** | sai das contagens dos cartões; aparece pelo filtro **Canceladas** |
| **editar dados e estrutura** | continua possível, com justificativa |

**Finalizar** segue a mesma lógica: um clique em **Finalizar esteira**, sem confirmação e sem motivo. A data de conclusão é gravada e aparece em **Concluída em**. Novos apontamentos passam a ser recusados com *"Esta esteira está finalizada e não permite novos apontamentos."*.

### 6.15 As situações da atividade

A atividade tem situação própria, independente da esteira. São **quatro situações** de verdade:

| Situação | O que significa | Como se chega |
|---|---|---|
| **Pendente** | ainda não encerrada; é como toda atividade nasce | situação inicial |
| **Concluída** | encerrada com conclusão | por **Concluir atividade** |
| **Reaberta** | volta a contar como trabalho em aberto | por **Reabrir atividade** ou por **Restaurar** |
| **Dispensada** | retirada do trabalho, sem ter sido executada | por **Dispensar** |

Como o detalhe mostra cada uma, ao lado do nome da atividade:

| Situação | O que você vê |
|---|---|
| **Concluída** | o selo **Atividade concluída** |
| **Dispensada** | o selo **Dispensada**; passar o mouse mostra o motivo, quem dispensou e quando |
| **Pendente** | **nenhum selo** |
| **Reaberta** | **nenhum selo** — fica igual a pendente na tela |

A última linha merece atenção: **uma atividade reaberta não se distingue de uma pendente** olhando a estrutura. Para saber que houve reabertura, consulte **Eventos operacionais**, onde ela aparece como **Atividade reaberta** ou **Dispensa restaurada**.

Separe três coisas que a tela mistura:

1. **a situação da atividade** — as quatro acima;
2. **a prontidão pela sequência** — não é situação: é a leitura de quem vem antes na estrutura. Uma atividade pendente com anteriores em aberto continua pendente; o que muda é o pedido de justificativa;
3. **o que o planejamento fez com ela** — estar planejada, publicada ou na fila de alguém é outro eixo, tratado nos capítulos 8, 9 e 10.

O que **não existe**: não há como **bloquear** nem **pausar** uma atividade. Os filtros **Bloqueios** e **Paradas** do histórico existem na tela, mas ficam sempre em zero. Registrado no capítulo 21.

Para a sequência da esteira, **concluída e dispensada valem o mesmo**: as duas liberam as atividades seguintes. Pendente e reaberta continuam bloqueando.

### 6.16 Concluir uma atividade

A ação fica **no detalhe da esteira**, na estrutura operacional: botão **Concluir atividade**, na linha da atividade.

Pré-condições:

- a atividade **não** pode estar concluída nem dispensada — nesses casos o botão não aparece;
- você precisa da permissão de criar esteiras;
- **não é preciso apontar nada antes.** Concluir é independente do apontamento: uma atividade sem uma única hora registrada pode ser concluída;
- **a situação da esteira não impede.** Quem tem a permissão conclui atividade mesmo em esteira ainda em rascunho.

Como fazer:

1. Clique em **Concluir atividade**.
2. Se não houver atividade anterior em aberto, aparece a pergunta **"Confirmar conclusão desta atividade?"**. Confirme e pronto.
3. Se houver atividade anterior em aberto, abre a janela **Concluir atividade** com o aviso *"Esta atividade está fora da sequência recomendada."*, a contagem de quantas atividades anteriores continuam pendentes, até três exemplos no formato **Tarefa › Setor › Atividade**, e um campo de **justificativa obrigatório**. Sem justificativa, a conclusão é recusada.

O que esperar:

- o selo **Atividade concluída** aparece na linha; o botão **Concluir atividade** dá lugar a **Reabrir atividade**;
- **não há mensagem de sucesso** — a tela simplesmente se atualiza;
- a pendência de tempo daquela atividade vai a zero no bloco de pendência e concentração, independente das horas apontadas;
- **a atividade seguinte fica liberada**: deixa de pedir justificativa por sequência;
- o histórico registra **Atividade concluída**;
- clicar duas vezes não gera erro nem registro duplicado.

O formulário de apontamento em si — data, minutos, quantidade executada, justificativas — é assunto do capítulo 7.

### 6.17 Reabrir uma atividade concluída

**Reabrir aplica-se exclusivamente a atividade concluída.** Não serve para atividade dispensada — para essa, a ação é **Restaurar** (6.19).

O botão **Reabrir atividade** só aparece na linha de uma atividade **concluída**, no detalhe da esteira, e exige a permissão de criar esteiras.

Como fazer:

1. Clique em **Reabrir atividade**.
2. Abre a janela **Reabrir atividade?**, que explica: *"A atividade voltará a ter pendência calculada normalmente. Os apontamentos e o histórico de conclusão serão mantidos."*
3. O campo **Observação da reabertura** é **opcional** — o exemplo é *"Contexto para a equipe…"*.
4. Confirme em **Reabrir atividade**.

O que esperar:

- a atividade passa a **Reaberta** e, na tela, volta a parecer pendente: o selo **Atividade concluída** desaparece e **nenhum selo** entra no lugar;
- a data e o autor da conclusão são limpos do registro da atividade, mas ficam preservados no histórico;
- **os apontamentos e as horas continuam todos lá**;
- a pendência de tempo volta a ser calculada: previsto menos realizado;
- a atividade volta a bloquear as seguintes pela sequência;
- aparece **"Atividade reaberta."** e o histórico registra **Atividade reaberta**.

### 6.18 Dispensar uma atividade

**Dispensar** retira a atividade do trabalho sem afirmar que ela foi feita. É para o que não será executado: deixou de ser necessário, foi substituído, entrou por erro.

O botão **Dispensar** fica no detalhe da esteira, na linha da atividade. Pré-condições:

- a atividade **não** pode estar concluída nem dispensada;
- a esteira **não** pode estar **Finalizada** nem **Cancelada**;
- permissão de criar esteiras.

> O botão **Dispensar** existe **só no detalhe** da esteira. A tela **Alterar Esteira** não o oferece, mesmo mostrando a mesma estrutura.

Como fazer:

1. Clique em **Dispensar**.
2. Abre a janela **Dispensar atividade?**, que explica: *"A atividade … deixa de bloquear a sequência e some das filas apontáveis. Horas já apontadas são preservadas. Não é conclusão."*
3. Escolha o **Motivo** na lista. O catálogo padrão é: **Não é mais necessária**, **Substituída por outra atividade**, **Erro de planejamento / escopo**, **Solicitação do cliente** e **Outro**. A lista é mantida em **Configurações operacionais**, então pode ser diferente na sua operação.
4. Se o motivo escolhido exigir, aparece o campo **Complemento obrigatório** — é o caso de **Outro**. Sem o complemento, não dá para confirmar.
5. Confirme.

O que esperar:

- o selo **Dispensada** entra na linha; o motivo, quem dispensou e quando ficam visíveis ao passar o mouse;
- **as horas já apontadas são preservadas**;
- **a sequência é liberada**: as atividades seguintes param de pedir justificativa por causa dela;
- **os itens de plano daquela atividade são cancelados** — tanto no plano da esteira quanto no planejamento semanal. A atividade sai do que estava programado;
- aparece **"Atividade dispensada."** e o histórico registra **Atividade dispensada**;
- novos apontamentos passam a ser recusados: *"Esta atividade foi dispensada; não é possível novo apontamento."*

> **Atividade dispensada continua aparecendo como planejável.** Apesar do cancelamento dos itens de plano, ela volta a aparecer na lista de atividades disponíveis do Planejamento e da Agenda, e o sistema aceita distribuí-la e publicá-la de novo. É uma pendência de produto conhecida, com efeitos na fila do colaborador e no Modo Fábrica. Ao planejar, **não** distribua atividade dispensada. Detalhes e sintomas no capítulo 21.

### 6.19 Restaurar uma atividade dispensada

**Restaurar** é a ação específica da atividade **dispensada** — e é diferente de **Reabrir**.

| Ação | Vale para | Botão |
|---|---|---|
| **Reabrir atividade** | atividade **concluída** | aparece na linha da concluída |
| **Restaurar** | atividade **dispensada** | aparece na linha da dispensada |

Pré-condições: a atividade precisa estar **dispensada**, a esteira **não** pode estar Finalizada nem Cancelada, e você precisa da permissão de criar esteiras.

Como fazer: clique em **Restaurar**. **Não há janela de confirmação e não há motivo a informar** — a ação é imediata.

O que esperar:

- a atividade passa a **Reaberta** — o mesmo destino de uma reabertura. O selo **Dispensada** desaparece e nenhum selo entra no lugar;
- o registro da dispensa anterior é preservado no histórico;
- a atividade **volta a bloquear** as seguintes pela sequência e volta a ter pendência de tempo;
- **os itens de plano que a dispensa cancelou não são reativados.** Restaurar devolve a atividade à estrutura, não ao plano;
- aparece **"Dispensa restaurada."** e o histórico registra **Dispensa restaurada**.

**Por isso, restaurar não basta para voltar a executar.** Para a atividade chegar de novo à fila de alguém, ela precisa ser planejada outra vez e o plano precisa ser **publicado** — capítulos 8 e 9. Enquanto isso não acontecer, ela existe na estrutura e não aparece para ninguém executar.

[IMAGEM SUGERIDA: duas linhas de atividade lado a lado — uma com o selo Dispensada e o botão Restaurar, outra concluída com o botão Reabrir atividade]

### 6.20 Remover da estrutura — e por que não é o mesmo que dispensar

São duas coisas diferentes, e confundi-las custa histórico:

| | **Dispensar atividade** | **Remover da estrutura** |
|---|---|---|
| Onde | detalhe da esteira, botão **Dispensar** | **Alterar Esteira** → **Estrutura**, botão **Remover atividade** / **Remover setor** / **Remover tarefa**, e depois **Salvar alterações** |
| O que faz | marca a atividade como dispensada e a mantém visível | tira o item da estrutura; ele deixa de aparecer |
| Motivo | obrigatório, escolhido em lista | não há campo de motivo próprio; fora de Rascunho, vale a justificativa geral da alteração |
| Rastro na tela | selo **Dispensada**, com motivo e autor | nenhum: o item simplesmente não está mais lá |
| Reversível pela tela | sim, por **Restaurar** | **não** |

Regras da remoção estrutural:

- **tarefa e setor também podem ser removidos**, com a mesma mecânica. Remover um deles leva tudo o que está abaixo;
- o **último** item de cada nível não pode ser removido: a esteira precisa de pelo menos uma tarefa, cada tarefa de um setor, cada setor de uma atividade;
- **a remoção é permitida em qualquer situação da esteira**, inclusive com apontamentos existentes. Não há mensagem de recusa;
- o que acontece depois depende do histórico do item: se ele **não** tem apontamento, plano ou histórico, é apagado de vez; se tem, ele é apenas retirado de vista e o histórico é preservado por baixo. Nos dois casos a tela não avisa qual foi o caso — o item apenas desaparece;
- o total previsto e as contagens da esteira são recalculados.

**Quando usar o quê:** se o trabalho existia e não será feito, **dispense** — fica o registro de que existia e por que saiu. Remova da estrutura apenas o que entrou por erro de cadastro e nunca deveria estar ali.

Para **excluir a esteira inteira** há uma ação separada, no **Painel operacional** (capítulo 5): menu **Ações** → **Excluir**. Ela só aparece até **A iniciar** e é recusada se a esteira já tiver movimentação.

### 6.21 Incluir trabalho em uma esteira já iniciada

Quando o escopo cresce depois que a esteira já começou, use **Incluir novo item**. É um caminho próprio, de acréscimo: ele **não** mexe no que já existe.

**Onde:** detalhe → **Alterar esta esteira** → aba **Estrutura** → botão **Incluir novo item**.

A janela se chama **Incluir novo item** e avisa: *"A estrutura existente permanece intacta. Itens novos entram no Backlog do Planejamento Semanal quando geram atividades."*

**São quatro modos**, em **O que você deseja incluir?**:

| Modo | Rótulo na tela | O que faz | Onde o item entra |
|---|---|---|---|
| 1 | **Tarefa da Matriz** | traz uma tarefa inteira do catálogo, com setores e atividades | como **nova tarefa**, no fim da esteira |
| 2 | **Tarefa manual** | você monta a tarefa na hora, com setor e atividades | como **nova tarefa**, no fim da esteira |
| 3 | **Setor em tarefa existente** | acrescenta um setor sob uma tarefa que já existe | no **fim** daquela tarefa |
| 4 | **Atividade em setor existente** | acrescenta uma atividade sob um setor que já existe | no **fim** daquele setor |

Em todos os quatro:

1. O **Motivo da inclusão** é **obrigatório** — texto livre, de 3 a 500 caracteres, com contador na tela. Sem ele o botão não libera.
2. Você escolhe o modo.
3. Nos modos 3 e 4, escolhe a tarefa ou o setor de destino.
4. Preenche a estrutura nova: nome, **Qtd** e **Min/un.** de cada atividade, e a alocação de quem executa — as mesmas regras de 6.6 e 6.7.
5. Confirma em **Incluir item**.

O que esperar:

- a estrutura existente **não muda**: nenhuma renumeração, nenhuma atividade mexida, nenhum apontamento afetado;
- o item novo entra **no fim** do nível escolhido;
- as contagens e o tempo total previsto da esteira crescem;
- aparece **"Novo item incluído. As novas atividades estão disponíveis no Backlog do Planejamento Semanal."**;
- o histórico registra **Item incluído na esteira**, com o motivo.

#### Em que situações a inclusão funciona

**Em todas.** O botão **Incluir novo item** aparece na aba Estrutura para qualquer pessoa com a permissão de alterar, em qualquer situação — e a operação é aceita em qualquer situação, **incluindo Finalizada e Cancelada**. Não há recusa por situação, nem na tela nem ao confirmar.

A tela não sinaliza nada a respeito. Vale como critério próprio:

| Situação da esteira | O que a inclusão significa na prática |
|---|---|
| Rascunho / Em elaboração, Aguardando planejamento | trabalho que ainda vai ser planejado normalmente |
| Em planejamento, A iniciar, Em andamento | é o uso esperado: escopo que cresceu com a esteira em curso |
| **Finalizada**, **Cancelada** | aceito pelo sistema, mas a esteira **não aceita apontamento** — ninguém poderá executar o item incluído. Se o trabalho é real, reabra o caminho da esteira antes, ou crie outra esteira |

#### O efeito no planejamento

Incluir item **não planeja nada**. O que a inclusão faz é colocar as atividades novas no **Backlog operacional**, disponíveis para planejar.

| Pergunta | Resposta |
|---|---|
| a atividade nova entra no plano da semana atual? | **não** |
| ela fica no backlog, esperando ser planejada? | **sim** |
| ela entra na fila do colaborador sem planejamento? | **não** |
| alocar alguém na atividade nova já a coloca na fila dele? | **não** — alocação estrutural não é distribuição |
| preciso salvar? | não: a inclusão é gravada na hora, pelo próprio botão **Incluir item** |
| preciso publicar? | **sim**, para chegar à fila de alguém |

Portanto, a sequência completa é: **incluir o item → planejar a atividade → publicar**. Só depois da publicação a atividade aparece na **Minha fila** (capítulo 10) e no **Modo Fábrica** (capítulo 13). Em semana já publicada, a mudança exige nova publicação. O passo a passo de planejar e publicar está nos capítulos 8 e 9.

[IMAGEM SUGERIDA: janela Incluir novo item, com o campo Motivo da inclusão e os quatro cartões de modo]

### 6.22 Imprimir tickets da esteira

No cabeçalho do detalhe, **Imprimir tickets** gera os tickets das atividades desta esteira de uma vez. Abre a janela **Imprimir tickets da esteira**, com:

- o agrupamento: **Estrutura da esteira**, **Tarefa** ou **Responsável**;
- a opção **Incluir atividades concluídas** — desligada por padrão. A tela informa quantas atividades estão elegíveis e quantas concluídas estão ocultas;
- o botão **Imprimir**.

O botão fica desligado quando a esteira não tem nenhuma atividade elegível. A impressão de um ticket isolado, a partir de um item do plano, é assunto dos capítulos 8 e 9.

### 6.23 O histórico da esteira

O bloco **Eventos operacionais** traz *"Histórico de mudanças relevantes da esteira."*, agrupado por data, com filtros por categoria — **Todos**, **Atrasos**, **Conclusões**, **Reaberturas**, **Bloqueios**, **Paradas**, **Observações** e **Outros** — e a contagem em cada um. O botão **Carregar mais** traz mais registros, até um teto.

**O que o histórico registra:**

| Evento | Aparece como |
|---|---|
| conclusão de atividade | **Atividade concluída** |
| reabertura de atividade | **Atividade reaberta** |
| dispensa de atividade | **Atividade dispensada** |
| restauração de dispensa | **Dispensa restaurada** |
| inclusão tardia | **Item incluído na esteira**, com o motivo |
| edição de estrutura | **Estrutura da esteira atualizada** |
| volta para backlog | **Esteira retornada para backlog**, com o motivo |
| volta para planejamento | **Esteira retornada para planejamento**, com o motivo |
| entrada e saída de atraso | **Esteira entrou em atraso** / **Esteira saiu do atraso** |

**O que o histórico não registra** — e é importante saber:

- **os avanços de situação.** Enviar para planejamento, aceitar, liberar para produção e finalizar **não** geram registro no histórico;
- **o cancelamento da esteira**;
- as categorias **Bloqueios** e **Paradas** ficam sempre em zero, porque essas ações não existem no sistema.

Ou seja: o histórico é forte em atividades, estrutura e retrocessos, e silencioso sobre o avanço normal da esteira. Para saber quando a esteira foi finalizada, use **Concluída em**, nos dados básicos.

## O que esperar

### Criar não libera para a fábrica

Uma esteira recém-criada nasce em **Rascunho / Em elaboração** e **a produção não a vê**. Depois de **Criar esteira**, você cai no detalhe com o aviso **"Esteira criada com sucesso."** e os atalhos **Ver backlog** e **Ir a Minha fila**.

Para o trabalho chegar a alguém, faltam três coisas, nesta ordem:

1. **fazer a esteira avançar** até pelo menos **A iniciar** (6.12);
2. **planejar** as atividades (capítulos 8 e 9);
3. **publicar** o plano.

Nenhuma delas acontece sozinha. Esteira criada e com gente alocada na estrutura, mas sem planejamento publicado, **não aparece para ninguém**.

### Estrutura e plano são coisas diferentes

Esta é a distinção que mais gera dúvida no sistema inteiro:

| | **Estrutura da esteira** | **Plano publicado** |
|---|---|---|
| O que é | o que o trabalho é e quem deveria executar | o que está programado para cada pessoa e cada dia |
| Onde se vê | detalhe e Alterar Esteira | Planejamento, Agenda, Minha fila, Modo Fábrica |
| **Total previsto** | tempo por unidade × quantidade, somado | minutos distribuídos na semana |
| Alocar alguém | diz quem deveria fazer | não distribui nada |

**O total previsto da esteira e o tempo planejado da semana não são o mesmo conceito** e não precisam coincidir. O primeiro é a estrutura; o segundo é a semana. No Modo Fábrica, quem dispara justificativa por excesso é o tempo planejado da semana — não o total previsto da esteira. Veja o capítulo 13.

### Números que podem divergir entre telas

| Comparação | O que esperar |
|---|---|
| **previsto no detalhe** × **previsto nas jornadas** | o detalhe considera a quantidade prevista e está correto; as jornadas (capítulos 11 e 12) calculam como se cada atividade tivesse 1 unidade e mostram menos. Registrado no capítulo 21 |
| **quantidade na matriz** × **quantidade na esteira criada** | a esteira nasce com 1 unidade por atividade, qualquer que seja a matriz. Confira antes de criar |
| **situação da esteira** × **cartões do Painel operacional** | os cartões são recortes, não situações; **Em atraso** é leitura de prazo. Veja o capítulo 5 |
| **cartão Em atraso** × **prazo real** | esteira cadastrada pela tela atual tende a nunca ser contada como atrasada. Veja o capítulo 21 |

### A tela não acompanha o que outras pessoas fazem

O detalhe mostra o estado do momento em que foi carregado. Ações feitas por outra pessoa, ou um apontamento registrado no totem, só aparecem quando você recarrega a página. As suas próprias ações — concluir, reabrir, dispensar, restaurar, incluir item — atualizam a tela na hora.

### Sair da tela de criação ou de alteração descarta o que não foi salvo

Na **Nova esteira** e na **Alterar Esteira**, nada é gravado antes de **Criar esteira** ou **Salvar alterações**. Trocar de tela com estrutura montada e não salva perde o trabalho. A exceção é o **Incluir novo item**, que grava sozinho ao confirmar.

## Quando algo é bloqueado

### Ao criar

| O que você vê | Por que | O que fazer |
|---|---|---|
| **Criar esteira** desligado | falta o nome, ou a estrutura está incompleta | veja a lista **Pendências** no passo Revisão |
| *"Indique o nome da esteira."* | nome vazio | preencha **Nome** nos Dados básicos |
| *"Adicione pelo menos uma tarefa."* | estrutura vazia | use **+ Adicionar tarefa manual** ou **Usar esta base** |
| *"Inclua pelo menos uma tarefa com setor e atividade."* | estrutura sem o mínimo | complete os três níveis |
| *"Cada tarefa precisa de um título."* / *"Cada setor precisa de um título."* / *"Cada atividade precisa de um título."* | nome em branco em algum nível | preencha o nome indicado |
| *"Cada tarefa precisa de pelo menos um setor."* / *"Cada setor precisa de pelo menos uma atividade."* | nível vazio | acrescente o que falta |
| *"A quantidade prevista deve ser um número inteiro maior ou igual a 1."* | **Qtd** com zero, fração, vazio ou texto | digite um inteiro de 1 para cima |
| *"«Atividade»: com colaboradores alocados, deve haver exatamente um principal."* | há colaboradores sem principal, ou com mais de um | deixe um só com o anel dourado |
| *"«Atividade»: o mesmo colaborador não pode repetir na atividade."* | colaborador repetido | remova a repetição |
| *"«Atividade»: time não pode ser responsável principal."* | equipe marcada como principal | o principal tem de ser uma pessoa |
| *"Colaborador de alocação inexistente, inativo ou indisponível."* | o colaborador saiu do cadastro ou está indisponível | escolha outro, ou regularize o cadastro |
| *"Time de alocação inexistente ou inativo."* | a equipe foi desativada | escolha outra equipe |
| *"Esta matriz já está na esteira."* / *"Matriz já adicionada. Soltura ignorada."* | a matriz já foi usada como base | use **Trocar base**, ou traga tarefas soltas em **Extras** |
| *"Tarefa já adicionada. Soltura ignorada."* | a tarefa já está na esteira | nada a fazer; ela já está lá |
| *"Matriz sem estrutura utilizável."* / *"Matriz sem tarefas materializáveis."* / *"Nenhuma tarefa com atividades nesta matriz."* | a matriz não tem nenhuma atividade sob tarefa e setor | complete a matriz em **Matrizes de operação**, ou use outra |
| *"Tarefa sem setores ou atividades utilizáveis."* | a tarefa arrastada está vazia na matriz | escolha outra tarefa |
| *"Matriz ainda não carregada."* / *"Árvore da matriz não disponível."* / *"Preparando árvores…"* | o catálogo ainda está carregando | aguarde e repita |

### Ao alterar

| O que você vê | Por que | O que fazer |
|---|---|---|
| **Salvar alterações** desligado | não há nada diferente do que está gravado | a revisão mostra *"Nenhuma alteração para salvar."* |
| janela **Justificativa da alteração** | a esteira já saiu de Rascunho / Em elaboração | escreva o **Motivo da alteração** |
| *"Motivo deve ter entre 3 e 500 caracteres."* | motivo curto demais ou longo demais | ajuste o texto |
| *"Existem alterações não salvas. Salve ou descarte antes de mudar o status da esteira."* | você tentou mudar a situação com edição pendente | salve primeiro, depois mude a situação |

### Ao mudar a situação

| O que você vê | Por que | O que fazer |
|---|---|---|
| nenhum botão de situação, e um aviso sobre permissão | você não tem a permissão de mudar situação | peça a quem administra os acessos |
| nenhum botão de situação em esteira **Finalizada** ou **Cancelada** | essas situações não oferecem ação | se o trabalho precisa continuar, crie outra esteira |
| *"Não é permitido mudar de … para …"* | tentativa de pular etapa do fluxo | avance um passo por vez |
| *"Não é permitido alterar para o mesmo status."* | destino igual à situação atual | nada a fazer |
| *"Informe o motivo para continuar."* | retrocesso sem motivo, ou com menos de 3 caracteres | escreva o motivo |
| *"O motivo deve ter no máximo 500 caracteres."* | motivo longo demais | encurte |
| *"Esta esteira não pode voltar para backlog a partir do status atual."* | **Voltar para backlog** só vale de Em planejamento, A iniciar ou Em andamento | confira a situação |
| *"Esta esteira não pode voltar para planejamento a partir do status atual."* | **Voltar para planejamento** só vale de A iniciar ou Em andamento | confira a situação |

### Nas ações de atividade

| O que você vê | Por que | O que fazer |
|---|---|---|
| nenhum botão na linha da atividade | falta a permissão de criar esteiras | peça acesso |
| janela **Concluir atividade** com *"Esta atividade está fora da sequência recomendada."* | existe atividade anterior ainda em aberto | escreva a justificativa, ou conclua a anterior primeiro |
| *"Informe uma justificativa para executar esta atividade fora da sequência recomendada."* | justificativa em branco | preencha |
| *"Esta atividade não está incluída na sequência operacional recomendada."* / *"Esta atividade não foi encontrada na estrutura atual desta esteira."* | a estrutura mudou desde que a tela carregou | recarregue a página |
| *"A etapa só pode ser reaberta quando estiver concluída."* | **Reabrir** usado em atividade não concluída | para dispensada, use **Restaurar** |
| *"Esta atividade já está dispensada."* | dispensa repetida | nada a fazer |
| *"A atividade só pode ser restaurada quando estiver dispensada."* | **Restaurar** usado fora de dispensada | para concluída, use **Reabrir atividade** |
| *"Não é possível dispensar atividades em esteira finalizada ou cancelada."* | a esteira está encerrada | reabra o caminho da esteira, ou trate em outra esteira |
| *"Não é possível restaurar atividades em esteira finalizada ou cancelada."* | idem | idem |
| *"Informe o complemento do motivo selecionado."* | o motivo escolhido exige complemento, como **Outro** | preencha o complemento |
| *"Motivo de dispensa inválido."* / *"Motivo de dispensa inativo."* | o motivo saiu do catálogo depois que a janela abriu | feche, reabra e escolha de novo |
| *"Sem permissão para reabrir esta atividade."* / *"Sem permissão para dispensar ou restaurar esta atividade."* | falta permissão | peça acesso |
| *"Esta atividade foi dispensada; não é possível novo apontamento."* | tentativa de apontar em dispensada | use **Restaurar** e planeje de novo |

### Ao incluir novo item

| O que você vê | Por que | O que fazer |
|---|---|---|
| **Incluir item** desligado | falta o motivo, falta escolher o modo, ou a estrutura nova está incompleta | complete o que falta |
| *"Preencha os dados da tarefa, do setor e da atividade."* | estrutura nova sem os três níveis preenchidos | complete nome, **Qtd** e **Min/un.** |
| *"— mínimo 3 caracteres"* junto ao contador | motivo curto demais | escreva um motivo real |
| *"Nó pai não encontrado ou removido."* / *"Nó pai está inativo."* / *"Nó pai não pertence a esta esteira."* | a tarefa ou o setor de destino mudou desde que a tela carregou | recarregue a página e repita |
| *"Área tardia deve ser incluída sob uma tarefa."* / *"Atividade tardia deve ser incluída sob um setor."* | destino do tipo errado | escolha uma tarefa para setor, um setor para atividade |
| *"Sem permissão para incluir item na estrutura da esteira."* | falta permissão | peça acesso |
| *"Nenhuma tarefa disponível no catálogo."* | nenhuma matriz tem tarefa utilizável | use **Tarefa manual** |

### Ao excluir a esteira

| O que você vê | Por que | O que fazer |
|---|---|---|
| **Excluir** não aparece no menu **Ações** | falta permissão, ou a esteira já passou de **A iniciar** | **Cancelar esteira** é o caminho para encerrar sem apagar |
| *"Esta esteira já possui apontamentos e não pode ser excluída. Cancele ou finalize para preservar o histórico."* | existe hora apontada | cancele ou finalize |
| *"Esta esteira já possui movimentações e não pode ser excluída."* | existe plano ou item de planejamento ligado à esteira | cancele ou finalize |
| *"Você não tem permissão para excluir esteiras."* | falta permissão | peça acesso |

### Ao entrar pelo endereço

| O que você vê | Por que | O que fazer |
|---|---|---|
| **"Sem permissão para esta área"** | você abriu **Nova esteira**, **Por documento** ou **Alterar Esteira** sem a permissão de criar esteiras | peça acesso; consultar o detalhe continua liberado |
| *"Esteira inválida."* ou aviso de esteira não encontrada | a esteira foi excluída, ou o endereço está errado | volte pelo **Painel operacional** |
| a tela inicial, ao clicar **Abrir esteira** / **Ver esteira** no Planejamento semanal | os links desses três blocos estão quebrados | chegue à esteira pelo **Painel operacional**; registrado no capítulo 21 |

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

## Para que serve

**Minha jornada** reúne as atividades atribuídas diretamente ao seu nome e os apontamentos de tempo registrados para você. Ela ajuda a conferir de onde vêm o **previsto** e o **realizado**, consultar a **data de realização** e reencontrar a esteira de um apontamento.

A tela combina duas leituras: as atividades e seu tempo previsto atual, e o trabalho registrado no período escolhido. Por isso, escolher um período não transforma o previsto em uma meta daquele período. Use **Minha fila** para consultar o trabalho distribuído no plano semanal para um dia específico.

Na versão atual, **cobertura** e **Extra Esteira** não são exibidos em Minha jornada. As limitações de quantidade e de conclusão descritas adiante também precisam ser consideradas ao ler os números.

## Onde fica

No menu lateral, entre em **Colaborador → Minha jornada**. O título da página é **Minha jornada**; abaixo dele aparece o nome do colaborador associado à conta.

O botão **Atualizar** fica no alto da página. **Período e filtros** abre as opções de consulta. Abaixo dos números ficam as colunas **Pendentes**, **Em andamento** e **Concluídas**, seguidas de **Apontamentos no período**.

## Quem costuma ter acesso

Qualquer pessoa que tenha entrado no sistema pode abrir Minha jornada, inclusive gestores e administradores. Para carregar os dados, a conta precisa estar **vinculada a um colaborador operacional**.

A jornada é sempre a do colaborador associado à conta. Não existe seleção de outra pessoa nessa tela. O nome exibido permite conferir de quem são os dados; se estiver incorreto ou faltar o vínculo, peça ao administrador para revisar o cadastro.

Uma atividade atribuída apenas à equipe, ou apenas distribuída no planejamento semanal, não entra automaticamente nos cartões da jornada: eles dependem da atribuição direta ao seu nome. Seus apontamentos nessas atividades podem aparecer no histórico mesmo sem um cartão correspondente.

## Como fazer

### Escolher o período

1. Abra **Período e filtros**.
2. Em **Recorte temporal**, escolha uma opção.
3. Confira as datas mostradas em **Janela**.
4. Aguarde a atualização dos números e dos apontamentos.

| Opção | O que considera |
|---|---|
| **Últimos 7 dias** | período padrão; as últimas 168 horas até o momento da consulta |
| **Últimos 15 dias** | as últimas 360 horas até o momento da consulta |
| **Últimos 30 dias** | as últimas 720 horas até o momento da consulta |
| **Mês atual (UTC)** | do início do primeiro dia do mês em São Paulo até o momento da consulta; o complemento do rótulo está incorreto |
| **Intervalo personalizado** | os dias informados em **De (data)** e **Até (data)**, incluindo os dois dias completos, pela referência de São Paulo |

As três opções de últimos dias são períodos móveis, não semanas de segunda a sexta nem dias completos de calendário. A data inicial mostrada em **Janela** não revela a hora de corte: um apontamento daquele dia pode ficar fora se foi realizado antes do início do período.

Para consultar **hoje**, escolha **Intervalo personalizado** e informe hoje nos dois campos. Para consultar uma semana ou um mês passado, informe suas datas inicial e final. Não há opções próprias de **Hoje** ou **Esta semana**, nem setas para avançar ou voltar um período.

No intervalo personalizado, o início deve ser igual ou anterior ao fim. A consulta não impõe duração máxima nem impede escolher datas futuras; isso não autoriza registrar trabalho em uma data futura. Ao trocar a opção de período, as datas personalizadas são apagadas.

[IMAGEM SUGERIDA: Período e filtros aberto, com o intervalo personalizado e a Janela visíveis.]

### Filtrar uma esteira

Em **Esteira (opcional)**, escolha uma esteira ou mantenha **Todas**. A seleção atualiza os cartões, o previsto, o realizado e o histórico dessa esteira; trocar o período mantém esse filtro.

A lista de opções é formada pelas atividades e pelos apontamentos carregados na própria tela. Ela pode não oferecer uma esteira que só tenha registros antigos, fora dos apontamentos exibidos. Depois de filtrar, use **Todas** para voltar às demais opções; se nenhuma opção aparecer, abra novamente Minha jornada pelo menu para iniciar uma consulta sem filtros.

### Ler previsto e realizado

| Número exibido | De onde vem |
|---|---|
| **Previsto** | soma do tempo previsto das atividades com atribuição direta ao seu nome, na estrutura atual das esteiras; não usa os minutos distribuídos no plano semanal |
| **Realizado (período)** e **Minutos apontados (período)** | soma de todos os apontamentos em atividades registrados para você cuja data de realização está no período escolhido |
| **Minutos apontados (acumulado)** | soma dos seus apontamentos em atividades, incluindo os realizados antes do período escolhido |
| **Atividades** | quantidade de vínculos diretos com atividades; pode incluir atividades de esteiras finalizadas ou canceladas que não aparecem nas colunas |
| **Pendente (em aberto)** | quantidade de atividades apresentadas nas colunas Pendentes e Em andamento; não é tempo faltante |
| **Esteiras em atraso** | conta suas atividades vinculadas a esteiras consideradas em atraso; várias atividades da mesma esteira podem aumentar esse número |

Os valores de tempo aparecem em minutos ou horas e minutos. Sem tempo previsto cadastrado, uma atividade não acrescenta minutos ao previsto; no cartão, o valor pode aparecer como **—**.

**Atenção à quantidade prevista:** nesta versão, a jornada usa o tempo de **uma unidade** de cada atividade, mesmo quando há várias unidades previstas. Por exemplo, uma atividade de 30 minutos por unidade com 4 unidades previstas acrescenta **30 minutos**, e não 2 horas, ao previsto da jornada. Se isso afetar sua leitura, confira a estrutura da esteira com a gestão.

O realizado soma os minutos efetivamente registrados: a **quantidade executada não multiplica nem reduz o tempo**. Um apontamento de 45 minutos continua somando 45 minutos, qualquer que seja a quantidade executada informada.

### Consultar as atividades

Cada cartão mostra a atividade, o código e o nome da esteira, seu papel **Principal** ou **Apoio**, o previsto e **Realizado na etapa**. Esse último rótulo significa o **seu tempo acumulado naquela atividade**, incluindo apontamentos anteriores ao período escolhido.

Use **Expandir detalhe** para ver a tarefa e o setor, apresentados como **Opção · Área**, a situação da esteira e o prazo estimado, quando houver. **Recolher detalhe** fecha essas informações. **Ver esteira** abre a esteira relacionada.

As colunas seguem a situação da **esteira**, não a conclusão individual da atividade:

| Coluna | Como interpretar |
|---|---|
| **Pendentes** | atividades de esteiras em elaboração, aguardando planejamento ou em planejamento, quando não estão classificadas em atraso |
| **Em andamento** | atividades de esteiras a iniciar ou em andamento, e também as classificadas em atraso pelo prazo da esteira |
| **Concluídas** | a coluna existe, mas não recebe as atividades encerradas na consulta atual; consulte os apontamentos e a Minha fila para conferir o trabalho realizado |

Não use a posição do cartão nem a palavra **Concluída** ao lado dele como confirmação de conclusão. Essa palavra também pode aparecer em um cartão de **Pendentes**, no lugar de Apontar, embora a atividade ainda não esteja concluída.

### Consultar os apontamentos

Em **Apontamentos no período**, cada registro mostra a esteira, a atividade, o tempo apontado, a data de realização e um link **Esteira**. A ordem começa pelos apontamentos com data de realização mais recente; em caso de empate, vem primeiro o registrado mais recentemente.

A lista exibe **até 20 apontamentos**. Não há botão para carregar os próximos registros. Para conferir um lançamento mais antigo, restrinja o intervalo ou filtre sua esteira.

O selo **Exceção** indica um apontamento fora da sua atribuição; **Fora de sequência** indica trabalho realizado fora da sequência recomendada. Ao posicionar o cursor sobre o selo, sua justificativa pode aparecer como informação de apoio.

A lista não mostra quantidade executada, observação, todos os tipos de justificativa nem a identificação de quem registrou por você. Para conferir esses detalhes, consulte o apontamento na esteira com a gestão. A ausência de selo não significa que o registro não tenha justificativa.

### Iniciar um apontamento

Quando o cartão oferecer **Apontar**, ele abre a página **Apontamento** da atividade. Informe a **data de realização**, os **Minutos realizados**, a **Quantidade executada** e, se necessário, a observação. Use **Registrar apontamento** para salvar.

A data começa em **hoje, pela referência de São Paulo**, mesmo que você esteja consultando um período antigo. Confira-a antes de registrar. Os valores iniciais de 30 minutos e 1 unidade também precisam ser ajustados ao trabalho realizado.

Após salvar, você retorna à Minha jornada e os dados são consultados novamente. O retorno abre o período padrão de últimos 7 dias, sem conservar o intervalo nem o filtro de esteira anteriores.

Essa página registra tempo; não oferece conclusão da atividade. Para registrar e concluir ou informar uma justificativa exigida, use **Apontar horas** na barra superior, conforme o capítulo 7.

## O que esperar

### O que muda com o período e o planejamento

O período selecionado altera o **realizado no período** e a lista de apontamentos. Ele não limita o previsto, as atividades, o realizado acumulado, os grupos nem a contagem de atraso.

Distribuir a mesma atividade em dias diferentes, mudar seus minutos no planejamento, salvar uma revisão, republicar ou remover um item do plano semanal não transforma o previsto da jornada em uma soma diária. Essa tela consulta os vínculos e os tempos atuais da estrutura da esteira. Alterar esses vínculos ou tempos pode mudar o previsto; retirar apenas o item do planejamento não equivale a retirar o vínculo.

**Minha fila** abre por padrão no dia atual do dispositivo e permite navegar por dia. **Minha jornada** abre nos últimos 7 dias e mostra suas datas de realização pela referência de São Paulo. Nenhuma das duas herda automaticamente a data escolhida na outra.

### Onde entram seus registros

Apontamentos feitos pela Minha fila, pela barra superior, pelo Modo Fábrica ou pela gestão em seu nome entram no realizado da jornada quando pertencem a você. O tempo segue a **data de realização**, não o dia em que o lançamento foi registrado.

Um apontamento em atividade fora do plano semanal também pode aparecer no realizado e no histórico. Ele não cria um cartão na jornada nem um vínculo de atividade por si só.

Apontamentos removidos deixam de aparecer e de somar. Se a gestão corrigir os minutos, a próxima atualização considera o novo tempo; corrigir apenas a quantidade executada não altera os totais de tempo. A remoção da própria atividade ou da esteira também retira seus apontamentos dessa consulta.

Ao perder um vínculo direto, ou quando a atividade, a tarefa ou o setor deixa de estar ativo, o cartão e sua contribuição ao previsto podem desaparecer. Os apontamentos já feitos podem continuar no realizado enquanto a atividade e a esteira permanecerem cadastradas sem remoção.

### Por que os totais e as listas podem divergir

- O **realizado no período** soma todos os apontamentos válidos do período; a lista mostra apenas os 20 mais recentes.
- O **realizado acumulado** inclui apontamentos anteriores ao período.
- Os cartões mostram vínculos atuais com atividades; o histórico pode incluir trabalho em atividades sem esses vínculos.
- O previsto e a contagem de atividades incluem vínculos de esteiras finalizadas ou canceladas que não chegam às colunas da tela.
- O previsto permanece o mesmo ao trocar apenas o período, e nesta versão não considera a quantidade de várias unidades.
- O filtro de esteira restringe a consulta de atividades e apontamentos, mas não garante que todas as esteiras com histórico estejam disponíveis no seletor.

Por exemplo: 25 apontamentos de 10 minutos no período somam **250 minutos** no realizado, embora a lista mostre no máximo 20 registros. Isso não significa que os outros cinco foram removidos.

### Cobertura e Extra Esteira

**Minha jornada não mostra um percentual de cobertura, saldo ou diferença de tempo, nem uma lista de atividades com cobertura incompleta.** O contador **Pendente (em aberto)** é uma contagem de cartões, não uma comparação entre horas previstas e trabalhadas.

Cobertura é a comparação do tempo acumulado apontado nas atividades atribuídas com o previsto dessas mesmas atividades. Ela não comprova conclusão e não equivale a dividir o realizado do período pelo previsto mostrado no alto. A gestão pode consultar esse indicador em **Jornada por colaborador**; a limitação de quantidade prevista descrita neste capítulo também afeta essa leitura.

Quando não há tempo previsto, a cobertura não se aplica. Ela pode ultrapassar 100% quando o tempo acumulado supera o previsto; isso também não confirma conclusão.

**Extra Esteira não aparece na lista, em um bloco separado ou nos totais de realizado de Minha jornada; também não entra na cobertura.** Sua ausência aqui não significa que o lançamento falhou. Confira os registros em **Apontar horas → Extra esteira → Últimos apontamentos extra esteira**. A gestão tem o resumo de Extra Esteira em **Jornada por colaborador**.

Minha jornada consulta apenas você e não oferece exportação. A Jornada por colaborador permite à gestão consultar uma ou várias pessoas, ver cobertura, Extra Esteira e pendências de tempo, e exportar os apontamentos. Seu uso será tratado no capítulo 12.

### Conclusão, pendências e atualização

Concluir uma atividade na Minha fila não a transfere automaticamente para **Concluídas** na jornada: enquanto a esteira continuar em andamento, o cartão pode permanecer em **Em andamento**, contar como pendente e manter **Apontar** disponível. A tentativa de registrar novo tempo nessa atividade será recusada. O mesmo cuidado vale para uma atividade dispensada.

Concluir sem registrar tempo novo não cria um apontamento nem aumenta o realizado. Atingir ou ultrapassar o previsto também não conclui uma atividade.

Para conferir uma ação feita em outra tela, ou pela gestão, entre novamente em Minha jornada ou use **Atualizar**. A página não acompanha essas mudanças continuamente. Ao registrar pela gaveta da barra superior, fechar a gaveta também não atualiza a jornada; use **Atualizar**.

O número **Esteiras em atraso** segue o prazo e a situação atuais da esteira. Ele não identifica apontamentos atrasados nem o atraso de cada atividade no dia planejado.

## Quando algo é bloqueado

### A jornada não carrega

| Situação ou mensagem | O que fazer |
|---|---|
| **Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu acesso.** | peça ao administrador para corrigir o vínculo; a consulta não carrega dados de outra pessoa como alternativa |
| **Intervalo personalizado: indique início e fim.** | preencha as duas datas; Tentar novamente só aparece depois de completar o intervalo |
| intervalo com início posterior ao fim | corrija as datas; a consulta é recusada |
| falha de comunicação ou indisponibilidade | confira a conexão e use **Tentar novamente** ou **Atualizar**; a faixa de erro apresenta a orientação recebida |
| sessão expirada ou acesso recusado | entre novamente ou solicite revisão do acesso, conforme a mensagem |

Durante a consulta, **Atualizar** passa a **Atualizando…**. Ao escolher um intervalo incompleto ou ocorrer uma falha de carga, os dados anteriores deixam de ser exibidos.

### A tela está vazia ou falta um registro

As mensagens **Nada neste estado no recorte atual.**, **Nenhuma atividade em execução neste recorte.** e **Sem alocações concluídas listadas aqui — veja apontamentos abaixo.** indicam colunas sem cartões. Não comprovam ausência de tempo trabalhado.

Se não houver apontamentos, a tela informa que não há registro com data na janela e sugere ampliar o período ou apontar em uma atividade aberta. Com filtro de esteira, a mensagem pode ser **Sem alocações ou apontamentos neste recorte. Experimente outro período ou remova o filtro de esteira.**

Confira o período, a data de realização e o filtro; depois use **Atualizar**. Para um registro antigo, reduza o intervalo ao dia em que o trabalho foi realizado. Para Extra Esteira, consulte a aba própria de apontamento.

### Apontar está disponível, mas o registro é recusado

O botão da jornada considera a classificação da esteira e pode continuar disponível em atividade concluída ou dispensada, ou em esteira ainda não liberada para produção. Ele não garante que o registro será aceito.

Mensagens como **Esta atividade já está concluída operacionalmente; não é possível novo apontamento.** e **Esta atividade foi dispensada; não é possível novo apontamento.** indicam que não cabe novo registro naquela atividade. Confira sua situação com a gestão, sem repetir o lançamento.

Se o vínculo com a atividade tiver mudado, a página Apontamento pode informar que ela não consta nas suas atribuições atuais. Volte à jornada, atualize a consulta e confira a atividade correta.

Se houver exigência de justificativa, a página aberta por **Apontar** não oferece campo para atendê-la. Use **Apontar horas** na barra superior, procure a mesma atividade e informe a justificativa pelo caminho descrito no capítulo 7. Não coloque a justificativa apenas em **Observação**: isso não atende à exigência.

As demais regras de data, tempo, quantidade e situação da atividade estão no capítulo 7. Nesta tela, ultrapassar o previsto não cria um bloqueio próprio nem um aviso de cobertura.

---

# 12. Jornada Gerencial

## Para que serve

**Jornada por colaborador** é a tela em que a gestão responde quatro perguntas sobre uma ou várias pessoas: **quanto estava previsto**, **quanto foi realizado**, **onde há desvio** e **para quem olhar primeiro**.

Ela reúne, no mesmo lugar, as atividades atribuídas a cada colaborador com o tempo previsto da estrutura das esteiras, os minutos apontados no período escolhido, o tempo acumulado, a **cobertura de tempo**, o resumo de **Extra Esteira**, as **pendências de tempo**, os sinais de atraso, o histórico recente de apontamentos e a **exportação em Excel**.

É a versão analítica da **Minha jornada** (capítulo 11): mesma origem dos dados, mas com seleção de pessoas, mais indicadores e exportação.

Dois cuidados valem desde já, e são detalhados adiante:

- **cobertura é comparação de tempo, não conclusão de trabalho.** Ela não diz que a atividade terminou;
- **nesta versão o previsto considera uma unidade de cada atividade**, mesmo quando há várias previstas. Isso reduz o previsto e, por consequência, infla a cobertura.

## Onde fica

No menu lateral, no bloco **Estrutura e administração**, entre em **Jornada por colaborador**.

O título da página é **Jornada por colaborador**. Logo abaixo, uma linha resume o que a tela traz. Em seguida vem o quadro de consulta, sempre nesta ordem:

| Elemento | Para que |
|---|---|
| **Colaboradores** | faixa de seleção das pessoas consultadas |
| **Recorte temporal** | escolha do período |
| **De (data)** e **Até (data)** | só aparecem no intervalo personalizado |
| **Esteira (opcional)** | só aparece depois de carregar uma consulta com esteiras disponíveis |
| **Exportar Excel** | só aparece com pelo menos uma pessoa selecionada |

Abaixo do quadro ficam os números do escopo, **Extra esteira (período)**, **Cobertura de tempo**, **Pressão de atraso**, as listas **Em aberto** e **Em risco**, **Pendência de tempo** e **Histórico recente**.

Não há botão **Atualizar** nesta tela. A consulta é refeita quando você muda a seleção, o período ou o filtro de esteira.

## Quem costuma ter acesso

Esta tela é de **gestão**. Ela aparece no menu para quem tem permissão de consultar o cadastro de colaboradores — tipicamente gestão de produção, coordenação e administração.

| Situação | O que acontece |
|---|---|
| sem a permissão | o item **não aparece** no menu; ao digitar o endereço, a tela abre com **Sem permissão para esta área** e *"Não tem permissão para acessar este conteúdo. Contate um administrador se precisar de acesso."* |
| com a permissão | a tela abre e a lista de colaboradores carrega |

Diferente da **Minha jornada**, esta consulta **não exige que a sua própria conta esteja vinculada a um colaborador operacional**. Você consulta a jornada de outras pessoas, não a sua.

O botão **Apontamento gerencial**, nos cartões de atividade, depende de **outra** permissão — a de corrigir apontamentos ou lançar em nome de outro colaborador. Quem pode abrir a jornada mas não tem essa permissão vê a tela completa **sem** esse botão; **Ver esteira** continua disponível. As regras de correção estão no capítulo 7.

## Como fazer

### Selecionar os colaboradores

1. Em **Colaboradores**, use o botão **+**.
2. Digite parte do nome em **Buscar colaborador…** para reduzir a lista.
3. Clique no nome desejado. Ele passa a aparecer como um círculo com as iniciais.
4. Repita para incluir outras pessoas.
5. Aguarde o carregamento dos números.

| Ação | Como fazer |
|---|---|
| **incluir** uma pessoa | botão **+**, depois o nome na lista |
| **buscar** | campo **Buscar colaborador…**, por parte do nome |
| **remover** uma pessoa | clique no círculo com as iniciais dela |
| **remover todas** | **Limpar seleção** |

A lista oferece os colaboradores **ativos e não removidos**, em ordem alfabética. Quem está inativo não aparece para seleção.

O máximo é de **20 colaboradores por consulta**. Ao atingir esse número, o botão **+** fica indisponível e informa *"Selecione no máximo 20 colaboradores"*. Para trocar alguém, remova um nome antes de incluir outro.

Logo abaixo da faixa, a tela confirma quem está no escopo: com uma pessoa, aparece o nome; com várias, aparece **"3 colaboradores: Nome · Nome · Nome"**. O título da página **não muda** com a seleção — confira sempre essa linha antes de ler os números.

Pontos importantes da seleção:

- **mudar a seleção limpa o filtro de esteira** e **mantém** o período escolhido;
- a consulta fica registrada no endereço da página: **recarregar a página preserva** a seleção, o período e o filtro;
- sair e voltar pelo menu **não** recupera a consulta anterior: a tela reabre sem ninguém selecionado;
- **Limpar seleção** apaga os números e devolve a tela ao estado inicial, com o convite **Escolha um colaborador**.

[IMAGEM SUGERIDA: Quadro de consulta com três colaboradores selecionados na faixa de iniciais, o popover de busca aberto e a linha de confirmação dos nomes.]

### Escolher o período

Em **Recorte temporal**, escolha uma opção. O catálogo e o cálculo são **os mesmos da Minha jornada**:

| Opção | O que considera |
|---|---|
| **Últimos 7 dias** | período padrão; as últimas 168 horas até o momento da consulta |
| **Últimos 15 dias** | as últimas 360 horas até o momento da consulta |
| **Últimos 30 dias** | as últimas 720 horas até o momento da consulta |
| **Mês atual (UTC)** | do início do primeiro dia do mês em São Paulo até o momento da consulta; o complemento do rótulo está incorreto |
| **Intervalo personalizado** | os dias informados em **De (data)** e **Até (data)**, incluindo os dois dias completos, pela referência de São Paulo |

As três opções de últimos dias são períodos móveis, não semanas nem dias completos de calendário. Para consultar **hoje**, use **Intervalo personalizado** com a mesma data nos dois campos. Não há opções de **Hoje** ou **Esta semana**, nem setas para avançar ou voltar um período.

No intervalo personalizado, o início deve ser igual ou anterior ao fim; caso contrário a consulta é recusada. Não há duração máxima e não há impedimento para escolher datas futuras — o que não autoriza registrar trabalho em data futura. Ao trocar a opção de período, as datas personalizadas são apagadas.

Depois do carregamento, uma linha acima dos números mostra o intervalo efetivamente consultado. Ao lado dela aparece um código curto do recorte escolhido; ele é informativo e está registrado no capítulo 21.

### Filtrar uma esteira

Em **Esteira (opcional)**, escolha uma esteira ou mantenha **Todas**.

O filtro vale para as alocações, o previsto, a cobertura, o realizado, as pendências, o histórico e a exportação. **Extra Esteira é a exceção: o resumo e a planilha de Extra Esteira ignoram esse filtro**, porque esse tempo não pertence a nenhuma esteira.

A lista de opções é montada a partir das alocações e dos apontamentos já carregados na tela. Ela pode não oferecer uma esteira que só tenha registros antigos, fora do histórico exibido. Trocar o período mantém o filtro; trocar a seleção de pessoas o remove.

### Exportar em Excel

1. Confirme a seleção, o período e o filtro de esteira.
2. Aguarde os números carregarem.
3. Clique em **Exportar Excel**.
4. O botão passa a **Exportando…** até o arquivo ser gerado.

O botão só funciona com pelo menos uma pessoa selecionada e com a consulta já carregada. Enquanto a tela está carregando, ou enquanto outra exportação está em andamento, ele fica indisponível.

A exportação usa **o mesmo período e o mesmo filtro de esteira da tela**, para **as mesmas pessoas** selecionadas. Pela interface, o limite da exportação é portanto o mesmo da consulta: **20 colaboradores**. Para um grupo maior, exporte em mais de uma rodada.

### Corrigir um apontamento

Nos cartões das listas **Em aberto** e **Em risco**, quem tem permissão de gestão de apontamentos vê o botão **Apontamento gerencial**. Ele abre a tela de correção **daquela atividade**, onde é possível:

- lançar horas em nome de um colaborador **já alocado** naquela atividade, com **motivo obrigatório**;
- editar os minutos ou a quantidade executada de um lançamento existente;
- remover um lançamento, com motivo.

Os campos, as regras de data, as justificativas exigidas e o registro na trilha administrativa estão no **capítulo 7**. Este capítulo não os repete.

Dois avisos sobre o retorno:

- a tela de correção **não devolve você à jornada**: o link de voltar leva ao **Dashboard**. Para retomar a consulta, use o botão de voltar do navegador ou entre novamente em **Jornada por colaborador**;
- a jornada **não se atualiza sozinha** depois da correção. Veja **Atualização da consulta**, adiante.

## O que esperar

### Ler previsto, realizado e cobertura

Os quatro números do alto resumem o escopo selecionado:

| Número | De onde vem |
|---|---|
| **Alocações (escopo)** | quantidade de vínculos diretos entre as pessoas selecionadas e atividades; **não** é quantidade de esteiras |
| **Previsto estrutural (soma das alocações)** | soma do tempo previsto dessas atividades, na estrutura atual das esteiras |
| **Minutos apontados (período)** | soma dos apontamentos em atividades cuja **data de realização** está no período |
| **Minutos apontados (acumulado) (escopo)** | soma dos apontamentos em atividades dessas pessoas em todo o histórico, sem limite de período |

O que **previsto estrutural** é — e o que não é:

- vem das **atribuições diretas** das pessoas às atividades, na estrutura da esteira. **Não** vem do planejamento semanal;
- **não é limitado pelo período**: escolher outro recorte não muda esse número;
- conta **uma vez por pessoa e por atividade**. Duas pessoas selecionadas na mesma atividade de 60 minutos somam 120 minutos previstos — o que é coerente, porque o realizado também é contado por pessoa;
- atividade atribuída **só à equipe**, ou apenas distribuída no planejamento semanal, **não** entra;
- inclui atividades de esteiras **finalizadas ou canceladas** e atividades já **concluídas ou dispensadas**, que não aparecem nas listas da tela;
- atividade sem tempo previsto cadastrado não acrescenta minutos; no cartão o valor aparece como **—**.

**Atenção à quantidade prevista.** Nesta versão, o previsto usa o tempo de **uma unidade** de cada atividade, mesmo quando há várias previstas. Uma atividade de 30 minutos por unidade com 4 unidades previstas acrescenta **30 minutos**, não 2 horas. O efeito é duplo: o previsto fica **menor** que o real e a **cobertura fica maior** do que deveria. Em atividades com várias unidades, confira a estrutura da esteira antes de concluir que há sobra de tempo. Pendência registrada no capítulo 21.

O que **realizado** inclui:

- apontamentos em atividades registrados para aquelas pessoas, pela **data de realização** e não pela data em que foram lançados;
- registros feitos pela Minha fila, pela barra superior, pelo Modo Fábrica e os lançados **pela gestão em nome da pessoa**;
- apontamentos **fora da atribuição** da pessoa (selo **Exceção**) e **fora de sequência**;
- apontamentos em atividades que **não** têm cartão na tela.

O que **não** entra no realizado: apontamentos removidos, tempo de **Extra Esteira** e a quantidade executada — **a quantidade não multiplica nem reduz o tempo**. Um apontamento de 45 minutos soma 45 minutos, qualquer que seja a quantidade informada.

**Cobertura de tempo** é um painel próprio, com o percentual em destaque e a sua própria explicação na tela. Leia-a assim:

| Parte | O que é |
|---|---|
| **numerador** | tempo acumulado que essas pessoas apontaram **nas atividades em que estão alocadas** |
| **denominador** | previsto estrutural **dessas mesmas alocações** |

Consequências práticas:

- a cobertura **não** é o resultado de dividir **Minutos apontados (acumulado)** por **Previsto estrutural**. O acumulado do cartão inclui trabalho em atividades **sem** alocação da pessoa; a cobertura, não. Os dois números podem divergir legitimamente;
- a cobertura **não** é limitada pelo período: ela compara acumulado contra previsto, sempre;
- sem previsto no escopo, a tela mostra **— (não aplicável)** e explica que não se aplica quando o previsto é zero ou menor. **Não** mostra 0%;
- a cobertura **pode passar de 100%**, quando o tempo apontado supera o previsto. Isso indica tempo acima do previsto, **não** conclusão;
- o percentual é arredondado com uma casa decimal;
- com várias pessoas, o percentual é **recalculado sobre os totais somados** — nunca a média dos percentuais individuais;
- a limitação de quantidade prevista descrita acima **afeta diretamente o denominador**.

**Cobertura não é percentual de conclusão física do trabalho.** Ela mede tempo. Uma atividade pode estar em 150% de cobertura e continuar inacabada, e pode estar em 20% e já ter sido concluída.

**Pressão de atraso** conta **alocações** em esteiras consideradas em atraso — várias atividades da mesma esteira aumentam o número. Abaixo dele, a tela traz uma contagem por situação da esteira. Essa contagem **não lista todas as situações possíveis**: situações como *em planejamento* e *cancelada* não têm linha própria ali, embora as alocações correspondentes contem nos totais do escopo.

[IMAGEM SUGERIDA: Resumo do escopo com os quatro números, o painel de Cobertura de tempo e o painel de Pressão de atraso.]

### Extra Esteira

O painel **Extra esteira (período)** mostra o tempo de apoio, deslocamento, limpeza e outras tarefas que não pertencem a nenhuma atividade de esteira. Ele traz:

- o **total de minutos** do período;
- a quantidade de lançamentos — *"N lançamento(s) fora de esteira neste período."*;
- até **três descrições principais**, cada uma com o tempo somado e a quantidade de lançamentos, da que consumiu mais tempo para a que consumiu menos.

Regras de leitura:

- o período segue o **dia de lançamento**, pela referência de São Paulo;
- **o filtro de esteira não se aplica** a este painel;
- **Extra Esteira fica fora do realizado das atividades e fora da cobertura.** Esse tempo não aparece nos cartões de minutos apontados nem altera o percentual de cobertura;
- com várias pessoas, o total, a contagem e as descrições são **consolidados**, sem separação por pessoa. A divisão por colaborador existe **na exportação**;
- quando não houver lançamentos, aparece *"Nenhum apontamento extra no período."*. Isso não significa que um lançamento falhou — confira o período e a data do lançamento.

### Pendências de tempo

**Pendência de tempo** lista as alocações em que o **previsto estrutural é maior que o tempo acumulado** apontado por aquela pessoa naquela atividade. É um sinal de onde ainda falta tempo registrado.

| Característica | Comportamento |
|---|---|
| universo | alocações em esteiras **ainda não finalizadas nem canceladas** |
| comparação | **acumulada**, não limitada ao período escolhido |
| ordenação | da **maior diferença** para a menor |
| informação exibida | a esteira, a atividade e a diferença de tempo; com várias pessoas, também o nome do colaborador |
| quantidade listada | no máximo **48 linhas** |
| ação | **apenas informativa** — a lista não tem link para outra tela |
| vazio | *"Nenhuma neste recorte."* |

Duas ressalvas:

- a lista **inclui atividades já concluídas ou dispensadas**, desde que a esteira continue aberta. Pendência aqui significa *tempo previsto não coberto*, não *trabalho por fazer*;
- a tela **não informa o total** de pendências quando há mais de 48. Esse total aparece na exportação, na coluna **Pendências de tempo** da aba **Resumo**.

### As listas de alocações

Duas listas apresentam os cartões de atividade:

| Lista | O que traz |
|---|---|
| **Em aberto** | alocações em esteiras que não estão finalizadas nem canceladas |
| **Em risco** | alocações cuja esteira está **em atraso** |

**As duas listas se sobrepõem:** uma alocação em atraso aparece em **Em aberto** e novamente em **Em risco**. Não some os cartões das duas listas — você contaria a mesma alocação duas vezes. Para contagem, use **Alocações (escopo)** e **Pressão de atraso**.

Cada cartão mostra o código e o nome da esteira, a situação da esteira, o papel **Principal** ou **Apoio**, a atividade, a tarefa e o setor, o previsto da atividade, o tempo acumulado daquela pessoa nela e o prazo, quando houver. Com várias pessoas selecionadas, um selo identifica de quem é a alocação. **Ver esteira** abre a esteira.

Os cartões vêm ordenados pela situação da esteira — em atraso primeiro, depois aguardando planejamento, em planejamento, em execução e rascunho —, em seguida pelo prazo e pelo nome da esteira.

### Histórico de apontamentos

**Histórico recente** lista os apontamentos em atividades do período. Cada linha mostra a esteira, a atividade, o tempo apontado, a data de realização e um link **Esteira**. Com várias pessoas, um selo identifica o colaborador de cada registro.

| Característica | Comportamento |
|---|---|
| limite | **20 linhas**, no conjunto de todas as pessoas selecionadas |
| ordenação | data de realização mais recente primeiro; em empate, o registrado mais recentemente |
| filtros | respeita o período e o filtro de esteira |
| paginação | **não existe**; não há botão para carregar mais |
| Extra Esteira | **não aparece** nesta lista |
| correção | não se edita nem remove um registro aqui; use **Apontamento gerencial** |

Os selos **Exceção** e **Fora de sequência** indicam, respectivamente, apontamento fora da atribuição da pessoa e trabalho realizado fora da sequência recomendada. Ao posicionar o cursor sobre o selo, a justificativa pode aparecer como informação de apoio.

A lista **não** mostra quantidade executada, observação, o texto completo das justificativas nem quem registrou em nome da pessoa. Esses dados estão **na exportação**.

**O histórico não tem o mesmo universo da exportação.** Com 20 linhas no máximo, ele é uma amostra do período; a exportação traz **todos** os apontamentos. A própria tela avisa isso ao lado do título.

### Uma pessoa × várias pessoas

| Elemento | Com uma pessoa | Com várias pessoas |
|---|---|---|
| **título da página** | **Jornada por colaborador** | igual — o título não muda |
| **identificação** | o nome aparece abaixo da faixa de seleção | **"N colaboradores: Nome · Nome"** abaixo da faixa |
| **linha do intervalo** | intervalo consultado | intervalo consultado **e** o aviso de escopo consolidado |
| **alocações, previsto, realizado, Extra Esteira, pressão de atraso** | valores da pessoa | **somados** sobre todas as pessoas |
| **cobertura** | realizado ÷ previsto da pessoa | **recalculada sobre os totais**, nunca média de percentuais |
| **cartões de atividade** | sem identificação de pessoa | cada cartão ganha o **selo com o nome** |
| **pendências de tempo** | uma linha por alocação | uma linha por alocação **e por pessoa**, com o nome; mesmo limite de 48 |
| **histórico** | até 20 registros da pessoa | até 20 registros **no conjunto**, cada um com o nome |
| **totais por pessoa** | o escopo já é a pessoa | **não existem na tela** — só na exportação |
| **filtros** | iguais | iguais |
| **exportação** | uma linha de resumo | uma linha **por pessoa** e uma linha **Total geral** |

O ponto mais importante: na tela, o escopo consolidado **soma** e **identifica cada registro**, mas **não decompõe os totais por pessoa**. Para saber quem contribuiu com o quê, use a exportação. É ela que responde *"para quais pessoas eu preciso olhar?"* quando a consulta tem várias pessoas.

### Por que os totais e as listas podem divergir

- **Minutos apontados (período)** soma todos os apontamentos válidos do período; o histórico mostra no máximo 20 linhas. Trinta apontamentos de 10 minutos somam **300 minutos** e exibem 20 linhas — nada foi removido.
- **Minutos apontados (acumulado)** inclui apontamentos anteriores ao período.
- O **numerador da cobertura** considera só as atividades em que a pessoa está alocada; o acumulado do cartão considera todas.
- **Alocações (escopo)** e **Previsto estrutural** incluem atividades de esteiras finalizadas e canceladas, que não chegam às listas.
- **Em aberto** e **Em risco** compartilham as alocações em atraso.
- **Extra Esteira** não entra no realizado nem na cobertura, e não obedece ao filtro de esteira.
- **Pendência de tempo** é acumulada; não mede o período escolhido.
- O **previsto** não muda ao trocar o período, e nesta versão não considera várias unidades.
- O seletor de esteira só oferece as esteiras presentes nos dados já carregados.

### O que a exportação traz

O arquivo tem **três abas**:

| Aba | Conteúdo |
|---|---|
| **Resumo** | cabeçalho com período, esteira filtrada, quantidade de colaboradores e data de geração; depois **uma linha por colaborador** e, com mais de uma pessoa, a linha **Total geral** |
| **Apontamentos** | **todos** os apontamentos em atividades do período, agrupados por colaborador, com **Subtotal** por pessoa e **Total geral** quando há mais de uma |
| **Extra esteira** | os lançamentos fora de esteira do período, com subtotal por pessoa; a própria aba avisa que **não dependem do filtro de esteira** |

As colunas da aba **Resumo** são: Colaborador, Código, Matrícula, Apontamentos no período, Minutos apontados (período), Extra esteira (período), Lançamentos extra esteira, Alocações (escopo), Previsto estrutural (escopo), Minutos apontados (acumulado), Cobertura de tempo, Alocações em atraso e Pendências de tempo. A cobertura aparece como percentual ou **Não aplicável**; na linha **Total geral** ela é recalculada sobre as somas.

A aba **Apontamentos** traz, para cada registro: Colaborador, Código, Data, Código/OS, Esteira, Tarefa, Setor, Atividade, Tempo, Minutos, **Qtd executada**, **Origem** (*Alocado* ou *Exceção (sem alocação)*), **Fora de sequência**, **Justificativa** e **Observações**.

A aba **Extra esteira** traz Colaborador, Código, Data, Descrição, Tempo, Minutos e Observações.

Diferenças entre a tela e a exportação:

| Assunto | Na tela | Na exportação |
|---|---|---|
| apontamentos do período | até **20 linhas** | **todos**, sem limite de linhas |
| quantidade executada | não aparece | coluna própria |
| origem, fora de sequência, justificativa, observação | apenas selos e dica ao passar o cursor | colunas próprias |
| totais por pessoa | não existem no escopo consolidado | uma linha por pessoa |
| Extra Esteira por pessoa | consolidado | separado por pessoa |
| pendências de tempo | até 48 linhas, sem total | **apenas o total**, sem a lista |
| alocações | listas de cartões | **apenas as contagens e as somas** |

O nome do arquivo identifica o escopo e o período — por exemplo `jornada-colaborador-2026-09-26-a-2026-10-03.xlsx` para uma pessoa, e `jornada-3-colaboradores-2026-09-26-a-2026-10-03.xlsx` para três.

O tempo é gravado como duração, somável no Excel, e há também a coluna em minutos. O cabeçalho da aba **Resumo** registra a regra: *período* são os apontamentos com data no intervalo; *escopo/acumulado* são as alocações e os apontamentos de todo o histórico.

Não há aba com a lista de alocações nem com a lista de pendências: para esses dois, a exportação traz somente os números.

[IMAGEM SUGERIDA: Aba Resumo da exportação, com uma linha por colaborador e a linha Total geral destacada.]

### Atualização da consulta

Esta tela **não** acompanha mudanças continuamente e **não tem botão Atualizar**.

| O que você faz | O que acontece |
|---|---|
| muda a seleção de pessoas | a consulta é refeita; o filtro de esteira é removido |
| muda o período ou as datas | a consulta é refeita; a seleção e o filtro de esteira permanecem |
| muda o filtro de esteira | a consulta é refeita |
| recarrega a página | a consulta é refeita com a mesma seleção, período e filtro |
| corrige um apontamento em outra tela | **nada muda** até você refazer a consulta |
| alguém aponta horas enquanto a tela está aberta | **nada muda** até você refazer a consulta |

Para ver o efeito de uma correção, volte à jornada e **recarregue a página** — a seleção, o período e o filtro são preservados. Trocar o período e voltar ao anterior também refaz a consulta. Enquanto a consulta carrega, os números anteriores deixam de ser exibidos e um espaço reservado ocupa o lugar deles.

Em caso de falha, a faixa de erro oferece **Tentar novamente** — é o único botão de recarga desta tela, e ele só existe quando houve erro.

### Diferenças em relação à Minha jornada

As duas telas usam a mesma origem de dados e o mesmo catálogo de períodos. O que muda é o alcance e o que é exibido:

| Minha jornada (capítulo 11) | Jornada por colaborador (este capítulo) |
|---|---|
| só a própria pessoa | **uma ou várias** pessoas, até 20 |
| acesso pelo **vínculo da conta** com um colaborador | acesso **gerencial**, por permissão; não exige vínculo da sua conta |
| visão simplificada, em colunas de situação | visão analítica, com indicadores e sinais |
| **não** mostra cobertura | **mostra** cobertura de tempo |
| **não** mostra Extra Esteira | **mostra** o resumo de Extra Esteira |
| **não** mostra pendências de tempo | **mostra** pendências de tempo |
| **sem** exportação | **exportação em Excel** |
| botão **Atualizar** disponível | **sem** botão Atualizar; refaça a consulta pelos filtros |
| botão **Apontar** para a própria pessoa | botão **Apontamento gerencial**, para corrigir e lançar por outra pessoa |

A limitação de quantidade prevista e a regra de que cobertura mede tempo, não conclusão, valem igualmente nas duas telas.

## Quando algo é bloqueado

### A consulta não carrega

| Situação ou mensagem | O que fazer |
|---|---|
| **Escolha um colaborador** / *"Selecione um colaborador na lista para carregar a jornada operacional (carga, risco e histórico)."* | nenhuma pessoa selecionada; use o botão **+**. O atalho **Abrir cadastro de colaboradores** leva ao cadastro, não carrega a jornada |
| *"Selecione um ou mais colaboradores."* | mesma situação, indicada ao lado da faixa de seleção |
| **Intervalo personalizado: indique as datas de início e fim.** | preencha os dois campos; a consulta fica suspensa até isso |
| intervalo com início posterior ao fim | corrija as datas; a consulta é recusada |
| *"Colaborador não encontrado."* | a pessoa foi removida do cadastro, ou o endereço traz uma pessoa inexistente; limpe a seleção e escolha de novo |
| falha de comunicação ou indisponibilidade | a faixa de erro traz a orientação recebida e *"Verifique sua conexão e tente novamente."*; use **Tentar novamente** |
| sessão expirada ou acesso recusado | entre novamente ou solicite revisão do acesso, conforme a mensagem |
| **Sem permissão para esta área** | a conta não tem permissão para esta tela; fale com quem administra os acessos |

Quando a carga falha, os dados anteriores deixam de ser exibidos. Corrigir o motivo e refazer a consulta recompõe a tela.

### O botão + não aceita mais ninguém

Você atingiu o máximo de **20 colaboradores**. O botão informa *"Selecione no máximo 20 colaboradores"*. Remova alguém clicando no círculo das iniciais, ou faça a consulta em mais de uma rodada.

Se a lista do popover trouxer *"Nenhum resultado"*, o texto buscado não corresponde a nenhum nome disponível — apague a busca e confira. *"Todos já adicionados"* significa que todos os colaboradores oferecidos já estão na seleção.

### A tela está vazia ou falta um registro

| Mensagem | O que significa |
|---|---|
| *"Nada em aberto neste recorte. Confira o bucket «em atraso» ou o histórico abaixo."* | nenhuma alocação em esteira aberta; confira a lista **Em risco** e o histórico |
| *"Nenhuma alocação em atraso neste recorte."* | nenhuma alocação em esteira considerada em atraso |
| *"Nenhuma neste recorte."* | nenhuma pendência de tempo |
| *"Nenhum apontamento extra no período."* | nenhum lançamento de Extra Esteira no período |
| *"Sem lançamentos no período. Alargue a janela temporal ou confira outra esteira."* | nenhum apontamento em atividade com data no período |
| *"Sem alocações ou apontamentos neste recorte. Experimente outro período ou remova o filtro de esteira."* | aparece no lugar das três primeiras quando há **filtro de esteira** ativo |

Nenhuma dessas mensagens comprova ausência de trabalho: confira o período, a **data de realização** do registro procurado e o filtro de esteira. Para um registro antigo, reduza o intervalo ao dia em que o trabalho foi realizado. A palavra **bucket**, que aparece em alguns desses textos, significa **situação da esteira**; veja o capítulo 21.

### A cobertura aparece como não aplicável

A tela mostra **— (não aplicável)** e explica que a cobertura não se aplica quando o previsto do escopo é zero ou menor. Isso ocorre quando as pessoas selecionadas não têm alocação direta, ou quando as atividades alocadas não têm tempo previsto cadastrado. Não é erro e **não** significa cobertura de 0%. Para obter o indicador, confira as atribuições e o tempo previsto na estrutura da esteira.

### A exportação falha

Se o arquivo não for gerado, a tela mostra a mensagem recebida ou **Não foi possível exportar o Excel da jornada.**, abaixo do botão.

O que conferir, nesta ordem: se há pessoas selecionadas; se os números da tela carregaram; se o intervalo personalizado está completo; e a conexão. Depois tente novamente. Trocar a seleção ou o período limpa a mensagem de erro.

### Apontamento gerencial não está disponível

Se o botão **Apontamento gerencial** não aparece nos cartões, a conta tem acesso à consulta, mas não à correção de apontamentos. Essa é uma permissão separada — solicite-a a quem administra os acessos, ou peça a correção a quem já a tem.

Na tela de correção, lançar horas exige que o colaborador esteja **alocado naquela atividade**; se não houver ninguém alocado, a tela informa *"Não há colaboradores alocados neste passo. Aloque antes de apontar."*. As demais regras de data, tempo, justificativa e remoção estão no **capítulo 7**.

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
| desabilitada | a credencial foi desligada fora das telas do sistema — nenhuma tela atual produz esse estado | falar com o gestor, que religa o acesso com **Redefinir PIN** (capítulo 16) |

Quem libera e redefine o PIN é quem administra colaboradores, em **Colaboradores** (capítulo 16). Não existe uma ação específica para desligar o PIN: para impedir que alguém entre no Modo Fábrica, a administração **inativa o cadastro do colaborador**, que deixa de aparecer na seleção do totem e do navegador da fábrica.

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
| **"Acesso desabilitado."** | a credencial de produção foi desligada fora das telas do sistema | falar com o gestor, que religa o acesso com **Redefinir PIN** (capítulo 16) |
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

## Para que serve

**Evolução das Esteiras** compara, lado a lado, o **tempo previsto** e o **tempo realizado** do trabalho da fábrica. A tela desce do geral para o detalhe: começa na esteira e vai até cada apontamento registrado.

São quatro níveis, na mesma sequência da estrutura da esteira:

```text
Esteira
└── Tarefa
    └── Setor
        └── Atividade
            └── Apontamentos
```

Em cada nível a tela mostra quanto tempo estava previsto, quanto já foi registrado, quanto falta, quanto passou do previsto e uma classificação de desvio. Serve para responder a perguntas como: esta esteira está consumindo mais tempo do que o planejado? Em qual tarefa, setor ou atividade o tempo estourou? Quem registrou esse tempo?

A tela é de **consulta e impressão**. Ela não altera planejamento, não cria nem corrige apontamentos e não muda a situação de esteiras ou atividades.

## Onde fica

No menu lateral, entre em **Gestão → Evolução das Esteiras**.

O título da página é **Evolução das Esteiras**, com a linha de apoio *"Acompanhe o progresso previsto x realizado de esteiras, tarefas, setores, atividades e apontamentos."*

A página é organizada de cima para baixo:

1. a **faixa de filtros**, com o botão **Gerar PDF** à direita;
2. a linha **Resumo geral**, com os totais do que está sendo exibido;
3. a **tabela**, com uma linha por esteira e as linhas internas que você abrir;
4. o **rodapé da tabela**, com a contagem de registros e a paginação.

Os dados carregam sozinhos ao abrir a página. Não é necessário acionar nada para a primeira consulta.

[IMAGEM SUGERIDA: Tela Evolução das Esteiras completa — faixa de filtros com Gerar PDF, linha Resumo geral e as primeiras linhas da tabela com as colunas Previsto, Realizado, Falta, Excedente, Evolução e Eficiência]

## Quem costuma ter acesso

O acesso é controlado por **permissão**, não por nome de perfil. A permissão exigida é a de **criar esteiras** — a mesma que libera **Nova esteira**, **Por documento**, **Planejamento** e **Agenda da semana**.

Na configuração padrão do sistema, essa permissão está atribuída à **administração** e à **gestão**. Contas de colaborador, sem permissões de gestão, não têm acesso.

A verificação acontece em dois pontos. Ao abrir a tela sem a permissão, aparece o aviso **"Sem permissão para esta área"**, com a orientação de contatar um administrador. A consulta dos dados exige a mesma permissão no servidor, de modo que não há caminho alternativo para ver o conteúdo sem ela.

O filtro por colaborador usa a lista de colaboradores e está disponível para quem já conseguiu abrir a tela.

## Como fazer

### Consultar a evolução

1. Abra **Gestão → Evolução das Esteiras**. A consulta é feita automaticamente.
2. Leia a linha **Resumo geral** para ter a visão do conjunto.
3. Localize a esteira que interessa na tabela.
4. Clique na seta (**›**) à esquerda do nome para abrir as **tarefas**.
5. Abra a tarefa para ver os **setores**; abra o setor para ver as **atividades**.
6. Abra a atividade para ver os **apontamentos analíticos** registrados nela.

Cada nível é aberto e fechado de forma independente. A seta aparece apenas quando existe conteúdo abaixo daquela linha.

### Filtrar

A faixa superior tem quatro campos sempre visíveis:

| Campo | O que faz |
|---|---|
| **Período** | duas datas, de e até. Limita quais **apontamentos** entram na conta |
| **Esteira** | busca por parte do **nome** ou do **código** da esteira |
| **Status** | deixa apenas as esteiras na situação escolhida. O padrão é **Todos** |
| **Agrupar por** | fixo em **Hierarquia**; não há outra opção para escolher |

O botão **Filtros** abre dois campos adicionais:

- **Colaborador** — deixa apenas as esteiras em que a pessoa escolhida tem apontamento ou alocação, e limita os apontamentos exibidos aos dela. O padrão é **Todos**;
- **Somente com tempo excedido** — deixa apenas as esteiras cujo total passou do previsto.

A consulta é refeita automaticamente pouco depois de você parar de digitar ou de alterar um campo. **Não existe botão Atualizar nesta tela:** para buscar dados novos sem mexer nos filtros, recarregue a página.

### Selecionar esteiras e gerar o PDF

1. Marque a caixa na coluna **Seleção**, na linha da esteira. A seleção existe apenas no nível da esteira.
2. Para marcar de uma vez todas as esteiras da página atual, use a caixa no cabeçalho da coluna.
3. Confira o contador abaixo do botão: enquanto nada estiver marcado, ele mostra **"Selecione ao menos uma esteira."**; depois, a quantidade selecionada.
4. Clique em **Gerar PDF**. O sistema abre a janela de impressão do navegador, onde você escolhe a impressora ou salva como PDF.

A seleção é mantida enquanto você muda de página e de filtro. Esteiras que deixam de aparecer no resultado saem da seleção.

### Imprimir o ticket de uma atividade

1. Abra a esteira até o nível **Atividade**.
2. Na linha da atividade, clique em **Imprimir ticket**.

O ticket sai na impressora térmica quando o agente de impressão local está disponível no computador; caso contrário, o sistema usa a impressão do navegador.

### Navegar entre as páginas

O rodapé da tabela mostra quantos registros estão sendo exibidos e o total. É possível escolher **10**, **25** ou **50** linhas por página — o padrão é 25 — e avançar ou voltar com as setas. A contagem considera **esteiras**, não as linhas internas abertas.

## O que esperar

### As colunas da tabela

As mesmas colunas valem para todos os níveis:

| Coluna | O que mostra |
|---|---|
| **Item** | o nível (Esteira, Tarefa, Setor, Atividade), o nome e, na esteira, o código. Na atividade, o nome do responsável aparece ao lado |
| **Status** | a situação da esteira ou da atividade. Tarefa e setor não têm situação própria e mostram **—** |
| **Previsto** | o tempo previsto. Mostra **—** quando não há tempo previsto |
| **Realizado** | o tempo já registrado em apontamentos |
| **Falta** | quanto ainda falta para alcançar o previsto. Nunca fica negativo |
| **Excedente** | quanto passou do previsto, destacado em âmbar. Mostra **—** quando não passou |
| **Evolução** | o percentual de realizado sobre previsto, com barra de progresso |
| **Eficiência** | a comparação entre previsto e realizado, com a classificação de desvio |
| **Seleção** | a caixa de seleção, apenas na linha da esteira |

Os tempos aparecem no formato de horas e minutos, como `02h30` ou `0h45`.

A coluna **Evolução** pode passar de 100% quando o realizado supera o previsto — a barra enche até o limite, mas o número continua subindo. Quando não há tempo previsto, a coluna mostra **—**.

### A linha Resumo geral

Acima da tabela, o **Resumo geral** mostra, para tudo o que o filtro devolveu: a quantidade de esteiras, **Previsto**, **Realizado**, **Falta**, **Excedente**, **Evolução média** e **Eficiência ponderada**.

Dois pontos mudam a leitura desses números:

- **Falta** e **Excedente** do resumo são valores **líquidos** do conjunto: somam-se todos os previstos e todos os realizados e compara-se o resultado. Uma esteira adiantada compensa outra atrasada, e o excedente do conjunto pode ficar menor do que o excedente visível nas linhas, ou até aparecer como **—** mesmo havendo esteiras estouradas;
- **Evolução média** é a **média dos percentuais das esteiras** que têm tempo previsto, e não o realizado total dividido pelo previsto total. Os dois cálculos não coincidem.

O resumo acompanha os filtros, inclusive a paginação não o altera: ele descreve todo o resultado, não apenas a página visível.

### A classificação de desvio

A coluna **Eficiência** compara previsto e realizado. O percentual é o **previsto sobre o realizado**: acima de 100% o trabalho levou menos tempo do que o previsto; abaixo de 100%, levou mais. Abaixo do percentual aparecem a diferença em minutos e em percentual, como `+15 min · +50%`.

Quando há base de cálculo, a classificação é uma destas cinco:

| Classificação | Quando aparece |
|---|---|
| **Mais rápido que previsto** | o realizado ficou abaixo do previsto |
| **Dentro do previsto** | realizado e previsto são iguais |
| **Leve desvio** | o realizado passou do previsto em até 10% |
| **Atenção** | passou em mais de 10% e até 30% |
| **Crítico** | passou em mais de 30% |

Há três situações em que **não existe base de cálculo** e nenhuma classificação é atribuída:

| Situação | O que significa |
|---|---|
| **Sem tempo previsto** | a atividade não tem tempo previsto registrado |
| **Não iniciada** | tem tempo previsto, nenhum apontamento e não está concluída |
| **Concluída sem apontamento** | está concluída, tem tempo previsto, mas nenhum tempo foi registrado |

Nesses casos a célula mostra o texto da situação ou, quando nem isso se aplica, **"Sem base calculável"**.

Na linha da atividade, abaixo da classificação aparece ainda **Parcial** — quando a atividade entrou na conta sem estar concluída — ou **Concluída**.

### Como a eficiência do conjunto é formada

Nas linhas de setor, tarefa e esteira, e também no **Resumo geral**, a eficiência é **ponderada**: somam-se os previstos e os realizados **apenas das atividades que têm base de cálculo** e aplica-se a mesma tabela de faixas ao resultado. Atividades sem tempo previsto, não iniciadas ou concluídas sem apontamento ficam **fora** desse cálculo.

Para que nada se perca de vista, essas atividades são contadas ao lado, em uma linha de apoio como:

`4 no cálculo · 1 parcial · 2 não iniciadas · 1 sem tempo previsto`

Essa contagem explica diferenças entre o que a classificação indica e o volume de atividades existente. Uma esteira com muitas atividades não iniciadas pode aparecer **Dentro do previsto** porque apenas as poucas atividades com tempo registrado entraram na conta.

Quando nenhuma atividade tem base de cálculo — ou quando o previsto ou o realizado somados ficam em zero — não há percentual e a célula fica em **—** ou **"Sem base calculável"**, ainda que as contagens de apoio apareçam.

### As situações exibidas

Nenhuma situação é excluída da consulta. Aparecem esteiras em **Rascunho / Em elaboração**, **Aguardando planejamento**, **Em planejamento**, **A iniciar**, **Em andamento**, **Finalizada** e **Cancelada** — inclusive esteiras já encerradas e canceladas, que continuam somando no **Resumo geral**. Para analisar só o trabalho corrente, use o filtro **Status**.

Nas atividades, as situações possíveis são **Aberta**, **Em andamento**, **Concluída**, **Reaberta**, **Bloqueada** e **Dispensada**.

Esteiras removidas do sistema não aparecem.

### De onde vêm os números

- O **previsto** vem da estrutura da esteira: é o tempo unitário da atividade **multiplicado pela quantidade prevista**. Quando a quantidade não está informada, o sistema considera uma unidade. A quantidade prevista **não é exibida em coluna própria** — ela entra já embutida no previsto;
- o **realizado** vem dos apontamentos de tempo da atividade, respeitando os filtros de período e de colaborador;
- o **responsável** mostrado na atividade é apenas o **responsável principal** dela. Alocações de equipe e colaboradores adicionais não aparecem nessa coluna;
- os totais de tarefa, setor e esteira são sempre a **soma das atividades** abaixo deles, nunca um valor informado à parte.

Alterar o planejamento da semana não muda os números desta tela: ela lê a estrutura da esteira e os apontamentos, não a distribuição semanal.

### Os apontamentos analíticos

Ao abrir uma atividade, aparece o bloco **Apontamentos analíticos**, com um registro por linha, **do mais recente para o mais antigo**. Cada linha traz:

- a **data de realização** do trabalho, no formato dia/mês/ano, pela referência de São Paulo — e não a data em que o lançamento foi digitado;
- o **nome de quem registrou**;
- um selo com a **forma de registro** do apontamento;
- o **tempo** do apontamento, na coluna Realizado;
- a **observação**, quando houver;
- a **quantidade executada** (**Qtd**), quando informada.

As demais colunas ficam em **—** nas linhas de apontamento: previsto, falta, excedente, evolução e eficiência existem por atividade, não por apontamento.

Se a atividade estiver aberta e não houver registros, aparece **"Nenhum apontamento analítico registrado."**

### Atividade dispensada

Uma atividade **Dispensada** é tratada de forma própria, e vale entender exatamente como:

- **na linha dela**, o tempo previsto original continua visível na coluna **Previsto**;
- **Falta** e **Evolução** ficam zerados: não se espera mais execução dela;
- a coluna **Eficiência** mostra **Sem tempo previsto**, porque a atividade foi retirada da base de cálculo;
- **nos totais** de setor, tarefa, esteira e no **Resumo geral**, o previsto dela conta como **zero** — ou seja, dispensar uma atividade reduz o previsto do conjunto.

Há um ponto que exige atenção na leitura: se a atividade dispensada **já tinha apontamentos**, esse tempo realizado **continua somando** nos totais acima dela, enquanto o previsto correspondente foi retirado. O conjunto pode então apresentar excedente, ou uma eficiência pior, por causa de tempo registrado em algo que deixou de ser previsto. Nesse caso, abra as atividades e confira as dispensadas antes de concluir que houve estouro de tempo.

[IMAGEM SUGERIDA: Linha de atividade com o selo Dispensada mostrando Previsto preenchido, Falta e Evolução zerados e Eficiência como Sem tempo previsto, com a linha do setor acima evidenciando o previsto reduzido]

### O que o período muda e o que não muda

O filtro **Período** limita **apenas os apontamentos**. Ele não limita quais esteiras aparecem nem o tempo previsto.

Em consequência, ao escolher uma janela curta você verá o previsto completo das atividades diante de um realizado parcial. O resultado tende a mostrar baixa evolução e muitas atividades como **Não iniciada**, sem que isso signifique atraso. Para avaliar execução total, deixe o período em branco.

As datas informadas são interpretadas pelo fuso do computador em uso, enquanto a data de realização exibida nos apontamentos segue a referência de São Paulo. Em um equipamento configurado em outro fuso, um apontamento no limite da janela pode entrar ou sair do resultado de forma diferente do que a data mostrada sugere.

### O resultado do PDF

O documento gerado traz, nesta ordem: o título **Evolução das Esteiras**, a data e hora de geração, a linha de filtros aplicados, o **Resumo geral** das esteiras selecionadas e, em seguida, um bloco por esteira.

Dois pontos diferem da tela:

- cada bloco sai com a **hierarquia inteira aberta** — tarefas, setores, atividades e apontamentos — independentemente do que você tinha expandido na tela;
- o documento **não traz a coluna Eficiência**. Ele é um relatório de previsto, realizado, falta, excedente e evolução; a classificação de desvio permanece apenas na tela.

O **Resumo geral** do documento é recalculado apenas sobre as esteiras **selecionadas**, e por isso costuma diferir do resumo exibido na tela, que considera todo o resultado do filtro.

Na linha de filtros aplicados, a situação escolhida e as datas aparecem no formato interno do sistema, e o filtro de colaborador aparece como **"Colaborador filtrado"**, sem o nome da pessoa. Para registrar com clareza o recorte usado, anote-o junto ao documento.

### O ticket da atividade

O ticket impresso identifica o trabalho e traz: esteira (com o código, quando existir), tarefa, setor, atividade, um código curto de identificação da atividade, a situação, os tempos previsto, realizado e pendente, o responsável e a data e hora da impressão.

A impressão sai pela impressora térmica quando o agente local está disponível. Quando não está, o sistema recorre à impressão do navegador. **Esta tela não exibe aviso quando essa troca acontece:** se o ticket abrir a janela de impressão do navegador em vez de sair na impressora térmica, é esse o motivo.

## Quando algo é bloqueado

### Falta de permissão

Sem a permissão de **criar esteiras**, a tela não aparece no menu e o endereço direto mostra **"Sem permissão para esta área"**, com a orientação de contatar um administrador. Não há visão parcial nem somente-leitura reduzida: ou a permissão existe, ou o conteúdo não é exibido.

### Enquanto os dados carregam

Durante a consulta, a área da tabela mostra **"Carregando evolução das esteiras…"**. Os filtros continuam acessíveis; cada alteração reinicia a busca.

### Quando não há dados

| O que aparece | Quando aparece |
|---|---|
| **"Nenhuma esteira encontrada com os filtros atuais."** | nenhuma esteira atende à combinação de filtros |
| **"Nenhum apontamento analítico registrado."** | a atividade aberta não tem apontamentos no recorte atual |
| **Nenhum registro**, no rodapé | a tabela está sem linhas |

Quando a mensagem de ausência de esteiras aparecer sem explicação óbvia, verifique a combinação de filtros — em especial **Período**, **Colaborador** e **Somente com tempo excedido**, que atuam em conjunto. Limpe os filtros antes de concluir que não existem dados.

Uma esteira **sem estrutura cadastrada** aparece na tabela, mas sem seta de abertura, com **Previsto** e **Evolução** em **—** e a eficiência como **"Sem base calculável"**. Não é erro: não há atividades para comparar.

### Quando a consulta falha

Há duas respostas diferentes, conforme o tipo de falha:

- em falhas tratadas como recuperáveis, aparece um painel vermelho com a mensagem do sistema e o botão **Tentar novamente**;
- em falhas impeditivas — sessão expirada, falta de permissão no servidor, ausência de comunicação ou indisponibilidade do serviço — abre-se uma janela com o título **"Não foi possível carregar a evolução das esteiras"** e a mensagem *"Ocorreu um problema ao obter os dados. Tente novamente em instantes ou confirme a sua sessão."*, com o botão **Entendi**.

Atenção a um comportamento desta segunda situação: ao fechar a janela em **Entendi**, a tela passa a exibir **"Nenhuma esteira encontrada com os filtros atuais."**, como se o filtro não tivesse retornado dados, e **não oferece Tentar novamente**. A consulta não foi concluída. Recarregue a página — e, se a mensagem indicar sessão, entre novamente no sistema.

### Ações que não existem nesta tela

| Limitação | Como proceder |
|---|---|
| Não é possível **ordenar** a tabela. As esteiras vêm da mais recente para a mais antiga, e tarefas, setores e atividades seguem a sequência da estrutura | use **Esteira** e **Status** para reduzir o resultado |
| **Agrupar por** está fixo em **Hierarquia** e não aceita outra escolha | — |
| Não há botão **Atualizar** | altere um filtro ou recarregue a página |
| **Gerar PDF** fica indisponível sem seleção | marque ao menos uma esteira; o contador indica a situação |
| A seleção e o PDF existem apenas no nível da **esteira** | não é possível gerar o documento de uma tarefa, setor ou atividade isolada |
| Não é possível **corrigir apontamentos, alterar tempos ou mudar situações** aqui | use as telas de apontamentos, planejamento e esteiras |
| A **quantidade prevista** não tem coluna própria | consulte-a no detalhe da esteira; aqui ela já está embutida no previsto |
| O filtro **Colaborador** lista apenas colaboradores **ativos** | o trabalho de uma pessoa inativa aparece nos totais e nos apontamentos, mas não é possível filtrar por ela |
| **Somente com tempo excedido** avalia o **total da esteira** | uma esteira com atividade estourada, mas total dentro do previsto, não passa por esse filtro; desmarque-o e procure o excedente nas linhas internas |

### Ao sair da tela com esteiras selecionadas

Com esteiras marcadas, sair pelo menu lateral abre a confirmação **"Sair desta página?"**, avisando que o contexto atual — filtros e seleções — pode ser descartado. Escolha **Cancelar** para permanecer e concluir o PDF, ou **Sair e continuar** para seguir e perder a seleção.

---

# 15. Dashboard e indicadores

## Para que serve

O Dashboard reúne, em uma tela, os **números consolidados da operação inteira**: quantas esteiras há em cada situação, quantas estão atrasadas, quanto tempo está previsto, quanto já foi apontado, como as alocações se distribuem entre as pessoas e quais foram os últimos apontamentos.

Ele tem duas visões:

| Visão | Pergunta que responde |
|---|---|
| **Operacional** | "como está a produção agora, e quem está com mais trabalho?" |
| **Gerencial** | "quantas esteiras estão abertas, quantas fechamos no período e quanto do que está aberto já atrasou?" |

É uma tela **só de leitura**: nada é alterado a partir dela. Dos números você chega à lista de esteiras do **Painel operacional** (capítulo 5) ou ao detalhe de uma esteira (capítulo 6).

O Dashboard **não tem filtros**: os números valem sempre para todas as esteiras e todas as pessoas. Para outras perguntas, use a tela própria:

| Você quer… | Use |
|---|---|
| analisar uma pessoa ou um grupo em um período | **Jornada por colaborador** (capítulo 12) |
| ver o desvio de tempo atividade por atividade | **Evolução das Esteiras** (capítulo 14) |
| ver a carga do dia de cada pessoa frente à capacidade | **Planejamento** e **Agenda da semana** (capítulos 8 e 9) |
| encontrar e abrir uma esteira específica | **Painel operacional** (capítulo 5) |

## Onde fica

Menu lateral, agrupamento **Gestão** → **Dashboard**.

O título exibido na tela é **Dashboards**, com a etiqueta **Painel** acima.

Na faixa abaixo do título ficam os controles da tela:

| Controle | O que faz |
|---|---|
| **Operacional** · **Gerencial** | alterna entre as duas visões. Só aparece para quem tem acesso às duas |
| **Janela (conclusões)** | período das esteiras concluídas, com **7d**, **15d**, **30d**, **60d** e **90d**. Só aparece na visão **Gerencial** |
| **Cards** · **Gráficos** | alterna entre números em cartões e a mesma informação em gráficos |
| **Atualizar** | busca os números de novo |

[IMAGEM SUGERIDA: Tela Dashboards na visão Operacional, modo Cards — faixa com Operacional/Gerencial, Cards/Gráficos e Atualizar; abaixo, o bloco Resumo com os quatro cartões]

## Quem costuma ter acesso

Cada visão tem a sua própria permissão (capítulo 4, seção 4.3):

| Visão | Permissão | Na configuração padrão |
|---|---|---|
| **Operacional** | **Dashboard operacional** | Administrador, Gestor |
| **Gerencial** | **Dashboard gerencial** | Administrador |

O que você vê depende da combinação:

| Você tem | O que acontece |
|---|---|
| as duas permissões | aparecem as abas **Operacional** e **Gerencial**; a tela abre em **Operacional** |
| só uma | não há abas: o nome da visão aparece sozinho na faixa, e só ela é exibida |
| nenhuma | o item **Dashboard** não aparece no menu; o endereço direto mostra **"Sem permissão para esta área"** |

Contas com o perfil **Colaborador** não têm acesso.

Dentro da visão Operacional, duas partes dependem de outras permissões:

- a coluna **Previsto vs capacidade diária**, na tabela de carga por colaborador, só aparece para quem tem acesso a **Configurações operacionais** (capítulo 16);
- o atalho **Colaboradores** leva a uma tela que exige a permissão de consultar colaboradores. Sem ela, a tela abre com **"Sem permissão para esta área"**.

## Como fazer

### 15.1 Escolher a visão e a forma de exibição

1. Abra **Gestão → Dashboard**. Enquanto os números são buscados, aparece **"Carregando indicadores…"**. No modo **Gráficos**, os gráficos podem levar mais um instante para aparecer.
2. Se tiver acesso às duas visões, escolha **Operacional** ou **Gerencial**.
3. Escolha **Cards** ou **Gráficos**. Os dois modos mostram **os mesmos dados**; mudam a forma e alguns detalhes, descritos em 15.8.

O modo de exibição, o período adicional da visão Operacional (15.2) e a janela da visão Gerencial (15.7) ficam **guardados neste navegador**: na próxima vez, a tela abre com as mesmas escolhas.

Os números são uma **fotografia do momento em que foram buscados**. A tela não se atualiza sozinha. No rodapé de cada visão, a linha **"Gerado em …"** mostra a data e a hora da busca. Para trazer números novos, clique em **Atualizar** — o botão mostra **Atualizando…** e busca as duas visões de uma vez.

### 15.2 Visão Operacional — Resumo

O bloco **Resumo** traz quatro cartões:

| Cartão | O que conta | Ao clicar |
|---|---|---|
| **Esteiras (total)** | todas as esteiras existentes, em **qualquer situação** — inclusive finalizadas e canceladas | abre o **Painel operacional** sem filtro, em nova aba |
| **Pressão de atraso (esteiras)** | as esteiras contadas como **em atraso**, pela mesma regra do Painel operacional (capítulo 5) | abre o **Painel operacional** já filtrado em **Em atraso**, em nova aba |
| **Alocações em STEPs** — leia "alocações em atividades" | o total de alocações de pessoas e equipes em atividades, em esteiras de qualquer situação. Abaixo, a divisão **Principal** · **Apoio**. Alocações de equipe contam sempre como **apoio** | nada |
| **Minutos apontados (acumulado)** | a soma de **todos** os apontamentos em atividades de esteira já registrados, de qualquer data. Apontamentos removidos não contam. **Extra Esteira não entra** | nada |

Acima dos cartões, o seletor *"Opcional: soma de apontamentos num recorte temporal (não altera o acumulado global)."* permite somar os apontamentos de um período:

| Opção | Período somado |
|---|---|
| **Sem período adicional** | nenhum (padrão) |
| **Últimos 7 dias** · **Últimos 15 dias** · **Últimos 30 dias** | conta para trás 7, 15 ou 30 vezes 24 horas **a partir do momento da consulta**. Não são dias de calendário fechados: o dia mais antigo da janela pode entrar só em parte |
| **Mês atual (UTC)** | do dia 1 do mês, à meia-noite, até o momento da consulta. O cálculo usa o fuso de São Paulo; o "UTC" do rótulo está incorreto (capítulo 21) |

Com um período escolhido, aparece um quinto cartão, **Minutos apontados (período)**. O período considera a **data do trabalho** informada no apontamento, não o dia em que ele foi digitado (capítulo 7). O cartão **Minutos apontados (acumulado)** não muda.

O seletor de período só aparece no modo **Cards**, mas a escolha vale também para o modo **Gráficos**.

### 15.3 Visão Operacional — esteiras por situação e atrasadas

**Esteiras por bucket operacional** — leia "esteiras por situação". Uma barra para cada recorte, nesta ordem: **Em atraso**, **Aguardando planejamento**, **Em planejamento**, **Em execução**, **Rascunho / Em elaboração**, **Finalizadas** e **Canceladas**. O número de cada barra é a quantidade de esteiras.

- Os recortes seguem **exatamente as regras do Painel operacional** (capítulo 5): cada esteira está em um recorte só, o atraso tem prioridade sobre a situação, e **Em execução** reúne as esteiras **A iniciar** e **Em andamento**.
- Diferente dos cartões do Painel, aqui **há** uma barra para **Canceladas**.
- Clicar em uma barra abre o **Painel operacional** filtrado por aquele recorte, em nova aba.

**Destaque — Pressão de atraso** lista até **12** esteiras em atraso, em **ordem alfabética de nome** — não da mais atrasada para a menos atrasada. O link **Abrir** abre o detalhe da esteira em nova aba. Sem nenhuma esteira em atraso, aparece *"Nenhuma esteira neste bucket."*.

> **A limitação do prazo vale também aqui.** A contagem de atraso usa a mesma leitura de prazo do Painel operacional e tem a mesma limitação descrita no capítulo 5: esteiras cadastradas pela tela atual tendem a nunca ser contadas como atrasadas. O cartão **Pressão de atraso**, a barra **Em atraso**, a lista de destaque e a **Participação de atraso** da visão Gerencial podem mostrar menos atraso do que existe. Confira o prazo na própria esteira.

### 15.4 Visão Operacional — previsto e apontado

O bloco **Previsto estrutural vs minutos apontados** mostra três totais, de toda a operação:

| Linha | O que soma |
|---|---|
| **Previsto estrutural (referência — STEPs)** | o tempo previsto de **todas as atividades ativas de todas as esteiras**: tempo por unidade × quantidade prevista. Inclui esteiras de qualquer situação — rascunhos, finalizadas e canceladas também |
| **Total por esteira (OS) — apoio** | a soma do tempo total registrado em cada esteira. Serve de conferência e **pode divergir** do previsto estrutural quando o total de alguma esteira não foi recalculado depois de mudanças na estrutura |
| **Minutos apontados (acumulado)** | o mesmo número do cartão do Resumo |

Com um período escolhido em 15.2, aparece também a linha **Minutos apontados (período)**.

O texto explicativo logo abaixo do título repete essas definições citando nomes internos do sistema. Eles não têm significado para o uso.

**Não divida um número pelo outro para medir andamento.** O previsto inclui esteiras que ainda nem começaram e esteiras canceladas; o apontado inclui todo o histórico. A razão entre os dois não diz quanto da produção está pronta. Para comparar previsto e realizado de forma útil, use a **Evolução das Esteiras** (capítulo 14) ou a **Jornada por colaborador** (capítulo 12).

### 15.5 Visão Operacional — carga por colaborador

O bloco **Carga por colaborador** traz dois gráficos de barras e uma tabela. O texto de apoio resume: *"Atividades = alocações por colaborador; minutos = soma dos apontamentos de cada um."*

**A tabela** lista os colaboradores com pelo menos **uma alocação direta** em atividade, do que tem mais alocações para o que tem menos (empate em ordem alfabética):

| Coluna | Conteúdo |
|---|---|
| **Colaborador** | nome |
| **Alocações** | quantidade de atividades em que a pessoa está alocada |
| **Principal / apoio** | quantas dessas alocações são como responsável principal e quantas como apoio |
| **Previsto estrutural (STEPS)** | a soma do tempo previsto das atividades em que a pessoa está alocada |
| **Previsto vs capacidade diária** | só para quem tem acesso a Configurações operacionais; veja abaixo |
| **Minutos apontados (acumulado)** | todos os apontamentos da pessoa em atividades de esteira, de qualquer data — **inclusive** em atividades em que ela não está alocada |

O que entra e o que fica de fora:

- contam as alocações em esteiras de **qualquer situação**, inclusive finalizadas e canceladas. A tabela não é a carga atual: é o acumulado de alocações registradas;
- **alocações de equipe não aparecem** para os membros da equipe. Só contam as alocações feitas diretamente na pessoa;
- quem **apontou, mas não tem nenhuma alocação direta**, não aparece na tabela — nem os seus minutos;
- colaboradores **inativos** continuam aparecendo enquanto tiverem alocações; colaboradores removidos não aparecem.

**A coluna Previsto vs capacidade diária** mostra *previsto / capacidade por dia · percentual*, seguido de uma classificação:

| Classificação | Quando |
|---|---|
| **Dentro da capacidade** | o previsto é até 80% da capacidade de um dia |
| **Próximo do limite** | acima de 80% e até 100% |
| **Acima da capacidade** | acima de 100% |

A capacidade usada é a **efetiva hoje** de cada pessoa (capítulo 16, seção 16.13). Enquanto ela é buscada, a célula mostra **…**.

> **Leia esta coluna com cuidado.** Ela compara o previsto de **todas** as alocações da pessoa — de todas as esteiras e de qualquer data — com a capacidade de **um único dia**. Basta a pessoa ter mais de um dia de trabalho alocado para o resultado passar de 100% e aparecer **Acima da capacidade**, sem que isso indique sobrecarga real. A própria tela avisa que a comparação é indicativa quando o previsto passa de um dia. Para saber se alguém está sobrecarregado em um dia, use o **Planejamento** ou a **Agenda da semana** (capítulos 8 e 9).

**Os gráficos** acima da tabela:

| Gráfico | O que mostra |
|---|---|
| **Atividades alocadas** | as 12 primeiras pessoas da tabela, com a quantidade de alocações |
| **Minutos apontados** | entre as pessoas da tabela, na mesma ordem, as 12 primeiras que têm algum apontamento, com o total **em minutos** — o número da barra é a quantidade de minutos, sem conversão para horas |

O gráfico de minutos **não** traz quem mais apontou: ele segue a ordem por número de alocações.

O link **Colaboradores**, ao lado do título, abre a tela **Colaboradores** (capítulo 16).

Sem nenhuma alocação direta na operação, aparece *"Sem dados de colaboradores."*, e os gráficos mostram *"Sem alocações."* e *"Sem apontamentos registados."*.

### 15.6 Visão Operacional — últimos apontamentos

O bloco **Últimos apontamentos** lista os **12 apontamentos mais recentes** em atividades de esteira. Cada linha mostra o nome da esteira, a **data do trabalho** e, abaixo, a atividade, o colaborador e o tempo. Clicar na linha abre o detalhe da esteira em nova aba.

- A ordem é pela **data do trabalho**, da mais recente para a mais antiga. Um apontamento lançado hoje para um dia passado aparece abaixo dos apontamentos dos dias seguintes — ou nem aparece, se houver 12 mais recentes.
- **Extra Esteira não aparece** nesta lista.
- Apontamentos removidos e apontamentos de esteiras excluídas não aparecem.

Sem nenhum apontamento, aparece *"Nenhum apontamento registrado."*.

### 15.7 Visão Gerencial

No alto, a frase **"Visão executiva (agregados operacionais)"**, abaixo do título, e uma linha que explica: a janela vale **só para as concluídas**; as ativas são o estado atual.

**Escolher a janela:**

1. Na faixa de controles, em **Janela (conclusões)**, clique em **7d**, **15d**, **30d**, **60d** ou **90d**. O padrão é **30d**.
2. Os números são buscados de novo. Enquanto isso, aparece **"Atualizando painel gerencial…"** e os botões da janela ficam desativados.

**Os cartões:**

| Cartão | O que conta | Ao clicar |
|---|---|---|
| **Esteiras ativas** | todas as esteiras **não finalizadas e não canceladas**, em qualquer outra situação — rascunhos e atrasadas inclusive. Não depende da janela | abre o **Painel operacional** no recorte **Ativas**, em nova aba |
| **Concluídas (Nd)** | esteiras **finalizadas** com data de conclusão nos últimos N dias, contados para trás a partir do momento da consulta | abre o **Painel operacional** em **Finalizadas**, com a etiqueta **Janela: N dias**, em nova aba |
| **Participação de atraso (ativas)** | a proporção de esteiras **em atraso** entre as **ativas**, em percentual arredondado. Mostra **—** quando não há esteira ativa | nada |

O bloco **Previsto estrutural e minutos apontados** traz os mesmos três totais da visão Operacional (15.4). A janela não os altera.

O bloco **Esteiras em atraso (amostra)** lista até **8** esteiras em atraso, em **ordem alfabética de nome**, com o **Prazo** como está registrado na esteira e o link **Abrir**, que abre o detalhe em nova aba. Sem nenhuma, aparece *"Nenhuma esteira em atraso no momento."*. A limitação do prazo descrita em 15.3 vale também aqui.

### 15.8 O modo Gráficos

O modo **Gráficos** desenha os mesmos dados. Passe o ponteiro do mouse sobre um gráfico para ver os valores.

**Visão Operacional:**

| Bloco | O que muda em relação ao modo Cards |
|---|---|
| **Esteiras por bucket operacional** | um gráfico em anel com as sete situações e o **Total: N esteiras**. Clicar em um segmento ou em um item da legenda abre o Painel operacional filtrado, em nova aba. Sem nenhuma esteira, aparece *"Sem esteiras no recorte."* |
| **Destaque — em atraso** | a mesma lista de 15.3 |
| **Previsto estrutural vs minutos apontados** | um gráfico de barras com os mesmos totais; com período escolhido, uma barra a mais |
| **Carga por colaborador** | as **10** pessoas com mais alocações, com duas barras cada: o previsto das atividades alocadas e os minutos apontados. Não há a tabela nem a coluna de capacidade. O link **Colaboradores** abre em nova aba |
| **Últimos apontamentos** | a mesma lista de 15.6 |

**Visão Gerencial:**

| Bloco | O que muda em relação ao modo Cards |
|---|---|
| **Ativas · Concluídas · Em atraso (esteiras)** | um gráfico em anel com três segmentos. Clicar em um segmento ou na legenda abre o Painel operacional no recorte correspondente, em nova aba. Sem dados, aparece *"Sem dados agregados."* |
| **Participação de atraso (ativas)** | o percentual com **uma casa decimal** e uma barra proporcional. No modo Cards, o mesmo número aparece arredondado para inteiro |
| **Previsto estrutural e minutos apontados** | gráfico de barras com os três totais |
| **Esteiras em atraso (amostra)** | a mesma lista |

> **O anel da visão Gerencial não é uma divisão do todo.** As esteiras **em atraso** também estão contadas em **Ativas**, e o mesmo número aparece em dois segmentos. Leia cada segmento pelo seu valor, não pelo tamanho da fatia.

### 15.9 Do número ao detalhe

| Onde você clica | Para onde vai |
|---|---|
| cartão **Esteiras (total)** | Painel operacional, sem filtro |
| cartão **Pressão de atraso**, barra ou segmento **Em atraso** | Painel operacional, recorte **Em atraso** |
| qualquer outra barra ou segmento de situação | Painel operacional, recorte daquela situação |
| cartão ou segmento **Esteiras ativas** / **Ativas** | Painel operacional, recorte **Ativas** |
| cartão ou segmento **Concluídas** | Painel operacional, recorte **Finalizadas** limitado à janela, com a etiqueta **Janela: N dias** |
| **Abrir**, nas listas de esteiras em atraso | detalhe da esteira |
| uma linha de **Últimos apontamentos** | detalhe da esteira do apontamento |
| **Colaboradores** | tela **Colaboradores** |

Todos os destinos abrem em **nova aba**, para você não perder o Dashboard — exceto o link **Colaboradores** no modo **Cards**, que abre na mesma aba.

No Painel operacional, o recorte chega aplicado no filtro **Situação**, com a etiqueta correspondente acima da lista. A etiqueta **Janela: N dias** vem com uma linha explicativa que cita nomes internos do sistema; ela pode ser ignorada. Ao trocar o filtro **Situação** no Painel, a janela de dias é descartada. Lembre também que os **cartões** do Painel sempre contam todas as esteiras; só a lista respeita o recorte (capítulo 5).

## O que esperar

### Cada indicador tem o seu período

| Indicador | Período |
|---|---|
| esteiras por situação, ativas, em atraso, participação de atraso | **agora** — a situação de cada esteira no momento da busca |
| **Concluídas (Nd)** | os últimos N dias, pela janela da visão Gerencial |
| **Minutos apontados (acumulado)**, inclusive por colaborador | **todo o histórico** |
| **Minutos apontados (período)** | o período escolhido na visão Operacional |
| previsto estrutural, total por esteira, alocações e previsto por colaborador | **toda a estrutura existente**, sem data — inclui esteiras encerradas |
| **Últimos apontamentos** | os 12 mais recentes, pela data do trabalho |

A janela da visão Gerencial e o período da visão Operacional são independentes: um não altera o outro.

### Os números conferem com o Painel operacional

As contagens por situação usam a mesma regra do Painel operacional. Buscados no mesmo momento, os números das barras do Dashboard e os cartões do Painel tendem a coincidir. A diferença é que o Dashboard mostra também as **canceladas** — e por isso **Esteiras (total)** pode ser maior que a soma dos cartões do Painel.

### Ninguém altera nada pelo Dashboard

Nenhum clique na tela muda dados. As listas e os cartões levam a outras telas, onde valem as permissões e as regras de cada uma.

### Rótulos técnicos que aparecem na tela

Alguns rótulos ainda usam termos internos. Leia assim:

| Na tela | Leia como |
|---|---|
| **"STEPs"**, **"STEPS"**, **"etapas"** | atividades |
| **"bucket"**, **"bucket operacional"** | situação da esteira, no sentido dos recortes do Painel operacional |
| **"OS"**, em **Total por esteira (OS)** | o total registrado em cada esteira |
| **"snapshot_atual"** e **"snapshot"**, no rodapé e no texto do modo Gráficos | fotografia do momento da busca |
| **"Janela 7d (UTC)."**, **"(7d)"**, **"(query)"** e similares | o período escolhido |
| **"backlog"**, nas dicas dos cartões | o **Painel operacional** |

## Quando algo é bloqueado

| O que aparece | Causa | O que fazer |
|---|---|---|
| **Dashboard** não aparece no menu, ou o endereço direto mostra **"Sem permissão para esta área"** | a conta não tem nenhuma das duas permissões | pedir a quem administra os acessos (capítulo 4, seção 4.6) |
| só uma visão, sem abas | a conta tem apenas uma das permissões | idem, se precisar da outra visão |
| a tabela de carga não tem a coluna **Previsto vs capacidade diária** | falta acesso a **Configurações operacionais** | idem |
| o link **Colaboradores** abre **"Sem permissão para esta área"** | falta a permissão de consultar colaboradores | idem |
| faixa vermelha com uma mensagem, no lugar dos números | os números não puderam ser buscados | clicar em **Atualizar**; se persistir, abrir chamado com o texto exibido |
| janela de aviso, como **Sem permissão**, **Sessão inválida** ou **Não foi possível continuar** | falha de permissão, de sessão ou de comunicação ao buscar os números. A permissão pode ter sido retirada com a tela aberta (capítulo 4, seção 4.5) | fechar a janela e seguir a orientação dela; recarregar a página |

Quando a busca falha, **as duas visões ficam vazias** ao mesmo tempo, mesmo que o problema seja de uma só. **Atualizar** tenta as duas de novo.

### Ações que não existem nesta tela

| Limitação | Como proceder |
|---|---|
| filtrar por esteira, colaborador, setor, cliente ou data | não há filtros. Use o **Painel operacional**, a **Jornada por colaborador** ou a **Evolução das Esteiras** |
| escolher um período personalizado | só os períodos fixos de 15.2 e 15.7 |
| exportar ou imprimir os números | não há exportação. A **Jornada por colaborador** exporta em Excel (capítulo 12) |
| ordenar a tabela de carga por outra coluna | a ordem é fixa, por número de alocações |
| ver a lista completa de esteiras em atraso | as listas são amostras de até 12 e 8. Use o cartão ou a barra **Em atraso** para abrir a lista completa no Painel operacional |
| ver os apontamentos de Extra Esteira | não entram no Dashboard. Use a **Jornada por colaborador** ou a **Minha jornada** (capítulos 11 e 12) |

---

# 16. Cadastros e administração

## Para que serve

Este capítulo reúne os cadastros que sustentam a operação: **quem** trabalha, **com que conta** cada pessoa entra no sistema, **como** as pessoas se agrupam e **quais listas e parâmetros** as outras telas usam.

São cinco frentes:

| Frente | O que você mantém | Onde isso aparece depois |
|---|---|---|
| **Colaboradores** | as pessoas que executam o trabalho, com setor, função e acesso ao Modo Fábrica | alocação nas esteiras, planejamento, Minha fila, Modo Fábrica, jornadas |
| **Usuários** | as contas de acesso por e-mail e senha, com perfil de acesso e vínculo com o colaborador | entrada no sistema, menus liberados, Apontar horas, Minha fila, Minha jornada |
| **Equipes** | grupos de colaboradores que podem ser alocados de uma vez | alocação nas esteiras e nas matrizes |
| **Capacidade** | quantas horas por dia cada colaborador tem disponível | aviso de sobrecarga no planejamento, na agenda e na Minha fila; saúde operacional |
| **Configurações operacionais** | setores, funções, capacidade e os catálogos usados nos apontamentos e na dispensa de atividades | cadastro de colaboradores, Apontar horas, Extra Esteira, Modo Fábrica, dispensa de atividade |

Três distinções atravessam o capítulo inteiro:

- **colaborador não é usuário.** O colaborador é a pessoa da fábrica; o usuário é a conta de acesso. Uma pessoa pode ter os dois, ligados entre si, ou só um deles;
- **função não é permissão.** A função diz o que a pessoa faz na operação; a permissão diz o que a conta pode fazer no sistema;
- **equipe não é pessoa.** Uma equipe reúne colaboradores reais. Para nomes como "Ajudante" ou "Costura", a própria tela de colaboradores orienta a usar equipe, e não um colaborador fictício.

## Onde fica

| Frente | Caminho no menu | Título da tela |
|---|---|---|
| Colaboradores | **Cadastros operacionais → Colaboradores** | **Colaboradores operacionais** |
| Usuários | **Cadastros operacionais → Usuários** | **Usuários de acesso** |
| Capacidade, setores, funções e catálogos | **Cadastros operacionais → Configurações operacionais** | **Configurações operacionais** |
| Equipes | **Gestão → Equipes** | **Equipes** |

A tela **Configurações operacionais** é dividida em seis abas: **Setores**, **Funções operacionais**, **Capacidade operacional**, **Descrições de apontamentos**, **Justificativas operacionais** e **Motivos de dispensa**. Ela sempre abre em **Setores**.

Há também atalhos entre as telas:

| Atalho | Onde está | Para onde leva |
|---|---|---|
| **Saúde operacional** | topo de **Colaboradores** | diagnóstico de carga por colaborador (capítulo 18) |
| **Abrir usuário** | coluna **Usuário (acesso)** de **Colaboradores** | a conta vinculada, em **Usuários**, em uma **nova aba** |
| **Abrir colaborador** | coluna **Colaborador** de **Usuários** | o cadastro vinculado, em **Colaboradores**, em uma **nova aba** |
| **Ver trilha administrativa** | topo de **Usuários** | o histórico das alterações em contas de acesso |
| **Gerir em Configurações operacionais — Capacidade operacional** | janela **Editar colaborador** | a aba de capacidade |
| link **Equipes**, no texto de apoio | topo de **Colaboradores** | a lista de equipes |

As telas **Colaboradores**, **Usuários** e **Configurações operacionais** trazem a etiqueta **Governança** acima do título; **Equipes** traz **Gestão**. Os textos de apoio de **Colaboradores** e de **Usuários** citam nomes internos do sistema entre parênteses — eles não têm significado para o uso e podem ser ignorados.

[IMAGEM SUGERIDA: Tela Colaboradores operacionais — filtros Buscar, Setor, Papel operacional e Situação, a tabela com as colunas Colaborador, Setor, Usuário (acesso), Atualizado e Situação, e o menu de ações de uma linha aberto]

## Quem costuma ter acesso

Cada frente tem as **suas próprias permissões**, e dentro de cada uma as ações são liberadas separadamente. O item de menu só aparece para quem pode **consultar** aquela frente; sem essa permissão, o endereço direto mostra **"Sem permissão para esta área"**.

| Frente | Ações controladas separadamente | Na configuração padrão |
|---|---|---|
| **Colaboradores** | consultar · cadastrar · alterar (inclui **Redefinir PIN**) · ativar · inativar · remover · restaurar | a **administração** tem todas; a **gestão** consulta, cadastra, altera, ativa e inativa, mas **não remove nem restaura** |
| **Usuários** | consultar · criar · alterar (inclui vincular e desvincular colaborador) · ativar · inativar · remover · restaurar · forçar troca de senha · redefinir senha | somente a **administração** |
| **Configurações operacionais** | uma única permissão libera as seis abas, inclusive capacidade | **administração** e **gestão** |
| **Equipes** | consultar · criar · alterar a equipe (inclui ativar, inativar e remover) · gerenciar membros | **administração** e **gestão** |

A permissão efetiva pode ter sido ajustada na sua operação. Na dúvida, fale com quem administra os acessos.

**As telas não se comportam da mesma forma quando falta uma permissão:**

- em **Colaboradores** e em **Usuários**, todos os botões e itens de menu aparecem para quem consegue abrir a tela. A verificação acontece **ao confirmar**: sem a permissão daquela ação, abre a janela **Sem permissão**, com *"Você não tem permissão para esta operação. Peça acesso ao administrador se necessário."*, e nada é alterado. É o caso típico do gestor que tenta **Remover** um colaborador;
- em **Equipes**, o que você não pode fazer **não aparece**: sem permissão de criar, não há **Nova equipe**; sem permissão de alterar, os itens **Inativar**, **Ativar** e **Remover** somem do menu e o bloco **Dados da equipe** mostra um aviso de falta de permissão em lugar dos campos; sem permissão de gerenciar membros, não há **Adicionar colaborador** nem a coluna **Ações** dos membros;
- em **Colaboradores**, a linha **Capacidade** de cada pessoa e o quadro **Capacidade operacional** da janela de edição só aparecem para quem também tem acesso a **Configurações operacionais**.

## Como fazer

### 16.1 Colaborador, usuário, função e permissão

| Conceito | O que é | Onde se mantém |
|---|---|---|
| **Colaborador** | a pessoa real que executa e aponta o trabalho | **Colaboradores** |
| **Usuário** | a conta que entra no sistema por e-mail e senha | **Usuários** |
| **Função operacional** | o que a pessoa faz na operação; é um dado do cadastro do colaborador | lista mantida em **Configurações operacionais → Funções operacionais** |
| **Perfil de acesso** | o conjunto de permissões da conta; a tela de usuários o chama de **Papel operacional** | escolhido em **Usuários**; as permissões de cada perfil são definidas em **Permissões por papel** |

O que depende de cada um:

- o **Modo Fábrica** pertence ao **colaborador**: entra-se com colaborador e PIN, sem conta de acesso (capítulo 13);
- **Apontar horas**, **Minha fila** e **Minha jornada** dependem da **conta vinculada a um colaborador**. Sem o vínculo, essas telas avisam que a conta não está associada a um colaborador operacional (capítulos 7, 10 e 11);
- o que aparece no menu depende do **perfil de acesso** da conta (capítulo 3).

> **Funções e perfis de acesso compartilham a mesma lista.** Cada função criada em **Configurações operacionais** também aparece na lista **Papel operacional** de **Usuários** — mas sem permissão nenhuma, até que alguém as defina em **Permissões por papel**. No sentido inverso, a lista **Função / papel operacional** do cadastro de colaboradores mostra **todos** os perfis ativos, inclusive perfis de acesso como **Administrador**. Ao cadastrar um colaborador, escolha a função que corresponde ao trabalho da pessoa; ao criar uma conta, escolha o perfil de acesso que corresponde ao que ela pode fazer no sistema.

### 16.2 Consultar colaboradores

1. Abra **Cadastros operacionais → Colaboradores**.
2. Use os filtros, que se aplicam sozinhos:

| Filtro | Como funciona |
|---|---|
| **Buscar** | procura enquanto você digita, em nome, e-mail, código, apelido, matrícula, cargo, setor e função |
| **Setor** | **Todos** ou um setor ativo |
| **Papel operacional** | **Todos** ou uma função |
| **Situação** | **Todos**, **Ativos** ou **Inativos** |
| **Por página** | 25, 50 ou 100 linhas |

A linha abaixo dos filtros informa *"N registro(s) · página X de Y"*. No fim da tabela, **Anterior** e **Seguinte** mudam de página. A lista vem em ordem alfabética de nome.

O que cada coluna mostra:

| Coluna | Conteúdo |
|---|---|
| **Colaborador** | foto (ou as iniciais), nome, e-mail e, para quem tem acesso a Configurações operacionais, a linha **Capacidade: 8h/dia** — com **(ajuste)** quando vale um ajuste individual |
| **Setor** | o setor do cadastro |
| **Usuário (acesso)** | o e-mail da conta vinculada, com o atalho **Abrir usuário**; ou **Sem vínculo** |
| **Atualizado** | data e hora da última alteração do cadastro |
| **Situação** | **Ativo** ou **Inativo**; e o selo **Com usuário** quando há conta vinculada |
| **Ações** | o menu com as ações da linha |

Quando nada corresponde aos filtros, a tabela mostra *"Nenhum colaborador neste filtro."*, com o lembrete de que colaborador é pessoa real e que funções como Ajudante ou Costura devem ser cadastradas como equipe.

Quando você chega a esta tela pelo atalho **Abrir colaborador**, a linha da pessoa fica destacada. Se ela estiver fora dos filtros atuais, aparece *"Este registro está fora dos filtros atuais."*, com **Limpar filtros e mostrar** e **Manter filtros**.

### 16.3 Cadastrar um colaborador

1. Em **Colaboradores**, clique em **Novo colaborador**.
2. Preencha a janela **Novo colaborador**. Os campos com **\*** são obrigatórios:

| Campo | Observação |
|---|---|
| **Nome \*** | o nome da pessoa. Não pode repetir o de outro colaborador, sem diferença entre maiúsculas e minúsculas |
| **Status \*** | **Ativo** (padrão) ou **Inativo** |
| **Setor \*** | lista dos setores ativos |
| **Função / papel operacional \*** | lista das funções e perfis ativos — veja o aviso em 16.1 |
| **URL do avatar** | opcional; endereço de uma foto, começando por `http://` ou `https://` |
| **Observações** | opcional, texto livre |

3. Clique em **Salvar**. Aparece **"Colaborador criado."** e a lista é recarregada.

**Cancelar**, ou um clique fora da janela, fecha sem salvar.

O cadastro **não cria conta de acesso** nem **libera o Modo Fábrica**. São passos separados: a conta, em **Usuários** (16.7); o acesso à fábrica, com **Redefinir PIN** (16.5).

### 16.4 Alterar um colaborador

1. No menu da linha, clique em **Editar…**.
2. A janela **Editar colaborador** traz os mesmos campos do cadastro, já preenchidos.
3. Altere o que precisar e clique em **Salvar**. Aparece **"Dados atualizados."**.

Abaixo dos campos, a janela mostra dois quadros:

| Quadro | O que traz |
|---|---|
| **Capacidade operacional** | **Padrão global**, **Ajuste individual**, **Efetiva (hoje)** e a **Origem** do valor. É só consulta: o atalho **Gerir em Configurações operacionais — Capacidade operacional** leva aonde se altera (16.13). Só aparece para quem tem acesso a Configurações operacionais |
| **PIN do Modo Fábrica** | a situação do acesso à fábrica e o botão **Redefinir PIN** (16.5) |

Pontos de atenção:

- se o setor ou a função atual do colaborador tiver sido **inativado** em Configurações operacionais, ele continua aparecendo na lista daquele cadastro, para não se perder ao salvar;
- se o setor tiver sido **excluído**, o campo **Setor** aparece vazio e precisa ser preenchido de novo para salvar;
- **apagar todo o texto de Observações não limpa o campo**: o texto anterior é mantido ao salvar. Para trocar a observação, escreva o novo texto no lugar;
- um colaborador removido não oferece **Editar…**.

### 16.5 Liberar e redefinir o acesso ao Modo Fábrica

O quadro **PIN do Modo Fábrica**, na janela **Editar colaborador**, mostra a situação do acesso:

| Selo | Texto ao lado | Significa |
|---|---|---|
| **Sem credencial** | *"Nenhuma credencial provisionada para este colaborador"* | o acesso à fábrica nunca foi liberado |
| **Ativo** | *"Acesso ao Modo Fábrica habilitado"* | a pessoa entra com o próprio PIN |
| **Aguardando troca** | *"Será solicitado um novo PIN no próximo acesso"* | o PIN provisório ainda não foi trocado |
| **Bloqueado** | *"Conta bloqueada por excesso de tentativas"* | erros de PIN em excesso; o bloqueio é temporário |
| **Desabilitado** | *"Acesso ao Modo Fábrica desabilitado"* | a credencial foi desligada fora das telas do sistema; **Redefinir PIN** religa o acesso |

Um único botão cobre liberar, desbloquear e redefinir:

1. Abra **Editar…** do colaborador.
2. No quadro **PIN do Modo Fábrica**, clique em **Redefinir PIN**.
3. Confirme a pergunta *"Redefinir o PIN do Modo Fábrica? O colaborador receberá PIN 1234 e deverá criar um novo PIN no próximo acesso ao Modo Fábrica."*.
4. O botão mostra **Redefinindo…** e, ao terminar, o selo passa a **Aguardando troca**.

O efeito é o mesmo em qualquer situação: o acesso fica **habilitado**, o PIN volta a ser o provisório **1234**, o contador de erros é zerado e um eventual **bloqueio é retirado na hora**. Informe o PIN provisório à pessoa. No primeiro acesso, o Modo Fábrica obriga a criar um PIN próprio e não aceita manter o provisório (capítulo 13). Oriente o uso de **4 dígitos**, o único tamanho que funciona tanto no totem quanto no navegador da fábrica (capítulo 21).

A redefinição vale na hora; **não é preciso clicar em Salvar** na janela. Se você fechar com **Cancelar**, o PIN continua redefinido.

> **Não há botão para desligar o acesso ao Modo Fábrica.** Para cortar o acesso de alguém à fábrica, **inative o colaborador** (16.6). O selo **Desabilitado** não pode ser produzido por esta tela.

A mensagem exibida logo após a redefinição — *"PIN redefinido. Próximo acesso exigirá nova senha."* — fala em senha, mas se refere ao **PIN** (capítulo 21). Se a redefinição falhar, aparece *"Erro ao redefinir o PIN. Tente novamente."*.

[IMAGEM SUGERIDA: Janela Editar colaborador com os quadros Capacidade operacional e PIN do Modo Fábrica, o selo Aguardando troca e o botão Redefinir PIN]

### 16.6 Inativar, ativar e remover um colaborador

No menu da linha:

| Item | Aparece quando | Confirmação | Resultado |
|---|---|---|---|
| **Inativar** | o colaborador está ativo | *"Inativar este colaborador? Continua no cadastro e no histórico."* | **"Colaborador inativado."** |
| **Ativar** | o colaborador está inativo | **nenhuma** — acontece no clique | **"Colaborador ativado."** |
| **Remover** | o colaborador não foi removido | *"Remover logicamente este colaborador? O registro deixa de aparecer nas listagens normais; o histórico operacional é mantido."* | **"Colaborador removido logicamente."** |

O rótulo de **Remover** na tela traz um complemento técnico entre parênteses (capítulo 21).

O mesmo efeito de **Inativar** e **Ativar** se obtém mudando o campo **Status** na edição.

**O que muda ao inativar:**

- a pessoa **não entra mais no Modo Fábrica** e deixa de aparecer na seleção do totem e do navegador da fábrica. Se estiver com uma sessão aberta, ela é encerrada na ação seguinte, com *"Acesso de produção indisponível para este colaborador."*;
- não pode mais ser **alocada** em atividades (capítulo 6, seção 6.6), **incluída em equipes** nem **vinculada a uma conta de acesso**;
- deixa de aparecer na aba **Capacidade operacional**;
- continua na lista de **Colaboradores** (filtro **Inativos**), nas equipes de que já fazia parte, com o selo **Colaborador inativo**, e em todo o histórico de apontamentos.

**O que muda ao remover:**

- o colaborador **sai de todas as listas**, inclusive da própria tela de Colaboradores, e também não entra no Modo Fábrica;
- o histórico operacional é preservado;
- o nome fica livre para um novo cadastro.

> **Pela interface, remover é, na prática, definitivo.** O menu tem um item **Restaurar** para colaboradores removidos, mas a lista **nunca exibe** removidos — nem com o filtro **Todos** —, então esse item não fica ao seu alcance. Para afastar alguém da operação, **prefira Inativar**, que pode ser desfeito a qualquer momento com **Ativar**.

Remover o colaborador **não mexe na conta de acesso** vinculada a ele. Se a pessoa também deixa de usar o sistema, trate a conta em **Usuários** (16.10).

### 16.7 Consultar usuários

1. Abra **Cadastros operacionais → Usuários**.
2. Use os filtros:

| Filtro | Como funciona |
|---|---|
| **Busca** | procura enquanto você digita, no e-mail e no nome do colaborador vinculado |
| **Papel** | **Todos** ou um perfil, mostrado como código e nome (por exemplo, **ADMIN — Administrador**) |
| **Por página** | 25, 50 ou 100 linhas |

Não há filtro por situação: ativos e inativos aparecem juntos, em ordem de e-mail.

| Coluna | Conteúdo |
|---|---|
| **Usuário** | foto (ou as iniciais), nome de exibição e e-mail |
| **Papel** | o código do perfil, com o nome entre parênteses |
| **Colaborador** | o colaborador vinculado, com o atalho **Abrir colaborador**; ou um traço |
| **Situação** | **Ativo** ou **Inativo**; e o selo **Trocar senha** quando a próxima entrada exigirá nova senha |
| **Último login** | data e hora da última entrada |
| **Ações** | o menu com as ações da linha |

Sem resultados, a tabela mostra *"Nenhum usuário encontrado com os filtros atuais."*.

Quando existem contas ativas sem colaborador, aparece no alto o aviso **Pendências de vínculo operacional**, com a quantidade. O sistema não faz o vínculo sozinho, nem pelo e-mail: ele precisa ser feito na edição de cada conta.

O atalho **Abrir usuário**, vindo de **Colaboradores**, destaca a linha da conta e, se ela estiver fora dos filtros, oferece **Limpar filtros e mostrar** e **Manter filtros**, como em 16.2.

### 16.8 Criar uma conta de acesso

1. Em **Usuários**, clique em **Novo usuário**.
2. Preencha a janela:

| Campo | Observação |
|---|---|
| **E-mail \*** | o login da pessoa. Não pode repetir o de outra conta — **inclusive de contas removidas** |
| **Senha inicial \*** | no mínimo 8 caracteres. *"Não será mostrada novamente."* |
| **Papel operacional \*** | o perfil de acesso da conta — veja 16.1 |
| **Colaborador** | opcional. A lista só traz colaboradores **ativos** e **ainda sem conta**, com o código entre parênteses quando houver |
| **URL do avatar** | opcional; endereço começando por `http://` ou `https://` |

3. Clique em **Salvar**. Aparece **"Usuário criado."**.

Toda conta nova nasce **ativa** e com **troca de senha obrigatória**: na primeira entrada, a pessoa usa a senha inicial e o sistema pede uma senha nova (capítulo 3). A linha mostra o selo **Trocar senha** até lá. Entregue a senha inicial por um canal seguro.

Se a conta for de quem aponta produção, **vincule o colaborador** já na criação. Sem o vínculo, a pessoa entra no sistema, mas não aponta horas nem vê a própria fila e a própria jornada.

### 16.9 Alterar uma conta, vincular e desvincular colaborador

1. No menu da linha, clique em **Editar**.
2. Na janela **Editar usuário**, altere **E-mail**, **Papel operacional**, **Colaborador** ou **URL do avatar**.
3. O campo **Senha inicial** fica vazio e é opcional: deixe em branco para manter a senha atual.
4. Clique em **Salvar**. Aparece **"Usuário atualizado."**.

**Se você preencher uma senha na edição**, ela passa a valer imediatamente, **sem** exigir troca na próxima entrada, e qualquer sessão aberta daquela conta é encerrada. Para entregar uma senha que a pessoa precise trocar, use **Redefinir senha** (16.10).

Para **vincular** ou **trocar** o colaborador, escolha-o no campo **Colaborador** e salve. Para **desvincular**, use o item **Desvincular colaborador** do menu da linha, que pede confirmação (*"Desvincular o colaborador deste usuário?"*) e mostra **"Colaborador desvinculado."**. Esse item só aparece quando há colaborador vinculado.

> **Conta vinculada a colaborador inativo ou removido.** Nesse caso, o campo **Colaborador** da janela de edição aparece **vazio**, mas o vínculo continua existindo — e qualquer **Salvar** é recusado com *"Colaborador inválido, inativo ou já vinculado a outro usuário."*, mesmo que você só quisesse trocar o perfil. Para seguir: reative o colaborador em **Colaboradores** ou use antes **Desvincular colaborador**.

### 16.10 Senha, inativação e remoção de contas

Itens do menu da linha:

| Item | Confirmação | Resultado |
|---|---|---|
| **Forçar troca de senha** | janela **Forçar troca de senha**: *"O usuário precisará definir uma nova senha no próximo acesso. A senha atual se mantém até lá."* | **"Troca de senha obrigatória aplicada."**; selo **Trocar senha** |
| **Redefinir senha** | janela **Redefinir senha**: uma senha temporária será gerada, mostrada **uma única vez**, e deve ser transmitida por canal seguro | abre a janela **Senha temporária** |
| **Inativar** | *"Inativar este usuário? Não poderá autenticar-se."* | **"Usuário inativado."** |
| **Ativar** | **nenhuma** | **"Usuário ativado."** |
| **Desvincular colaborador** | ver 16.9 | **"Colaborador desvinculado."** |
| **Remover** | *"Remover logicamente este usuário? O registro permanece na base."* | **"Usuário removido logicamente."** |

As janelas de senha têm **Cancelar** e **Confirmar**; durante a ação, o botão mostra **Aplicando…**.

**Redefinir senha, passo a passo:**

1. No menu da linha, clique em **Redefinir senha** e depois em **Confirmar**.
2. A janela **Senha temporária** mostra a **Conta** e a senha gerada, com o aviso *"Guarde agora — não será possível recuperar esta senha depois."*.
3. Clique em **Copiar** (aparece **"Copiado para a área de transferência."**) e transmita a senha à pessoa.
4. Clique em **Fechar**.

Ao redefinir, a senha anterior deixa de valer, **qualquer sessão aberta daquela conta é encerrada**, um eventual **bloqueio por tentativas é retirado** e a próxima entrada exige troca de senha. É o caminho para quem esqueceu a senha ou foi bloqueado.

**Inativar** impede novas entradas: quem tentar entrar vê *"Sua conta está inativa. Contacte o administrador."*. A inativação **não garante** a desconexão imediata de quem já está com o sistema aberto; se precisar cortar o acesso na hora, use também **Redefinir senha**.

**Remover** impede a entrada e encerra a sessão aberta na ação seguinte. Mas tenha em conta, antes de remover:

- o **e-mail** da conta removida **continua reservado**: não pode ser usado para criar outra conta;
- o **colaborador** vinculado **continua preso** à conta removida: ele não aparece mais na lista de vínculo de nenhuma outra conta — embora a tela de Colaboradores passe a mostrá-lo como **Sem vínculo**. **Desvincule o colaborador antes de remover**;
- assim como em Colaboradores, removidos **não aparecem na lista**, e o item **Restaurar** não fica ao seu alcance. Para afastar alguém do sistema, **prefira Inativar**.

As ações sobre contas de acesso ficam registradas na **Trilha administrativa**, aberta pelo atalho **Ver trilha administrativa**.

**Ações sobre a sua própria conta.** Você não consegue inativar, remover nem redefinir a senha da sua própria conta por esta tela. Para trocar a sua senha, use **Alterar senha**, no menu do seu nome.

### 16.11 Setores

Aba **Setores** de **Configurações operacionais**. A linha de apoio mostra *"N setor(es) · visível nas listagens quando ativo."*.

| Ação | Como | Resultado |
|---|---|---|
| criar | **Novo setor** → **Nome \*** → **Salvar** | **"Setor criado."** |
| renomear | menu da linha → **Editar nome** → **Salvar** | **"Setor atualizado."** |
| ativar ou inativar | marque ou desmarque a caixa da coluna **Ativo** — vale no clique, sem confirmação | **"Setor ativado."** / **"Setor inativado."** |
| excluir | menu da linha → **Excluir** → confirme *"Excluir este setor? Referências em colaboradores ficarão sem setor."* | **"Setor excluído."** |

O nome não pode repetir o de outro setor, sem diferença entre maiúsculas e minúsculas: *"Já existe um setor com este nome."*.

Um setor **inativo** some das listas de escolha (cadastro de colaborador e filtros), mas continua nos colaboradores que já o tinham. A **exclusão** é permitida mesmo com colaboradores no setor, e **todos eles ficam sem setor**; ao editar qualquer um deles depois, será preciso escolher outro. Prefira **inativar**.

O setor desta lista é o **setor do colaborador**. Ele **não é** o setor da estrutura de uma esteira: aquele é digitado na própria esteira ou vem da matriz (capítulo 6), e não depende deste cadastro.

### 16.12 Funções operacionais

Aba **Funções operacionais**. A lista mostra **Código**, **Nome** e **Ativo**, e inclui as funções **Colaborador** e **Gestor**.

| Ação | Como | Resultado |
|---|---|---|
| criar | **Nova função** → **Nome \*** e **Código (opcional)** → **Salvar** | **"Função criada."** |
| alterar | menu da linha → **Editar** → **Nome \*** e **Código \*** → **Salvar** | **"Função atualizada."** |
| ativar ou inativar | caixa da coluna **Ativo**, sem confirmação | **"Função ativada."** / **"Função inativada."** |
| excluir | menu da linha → **Excluir** → confirme | **"Função excluída."** |

Regras:

- na criação, se o código ficar vazio, o sistema gera um automaticamente. Na edição, o código é obrigatório. Códigos não podem repetir: *"Já existe um papel com este código."*;
- a exclusão só é aceita quando **nenhuma conta de acesso e nenhum colaborador** usam a função; caso contrário: *"Não é possível excluir: existem usuários ou colaboradores usando esta função. Inative-a em vez disso."*;
- uma função **inativa** deixa de aparecer na lista **Função / papel operacional** de Colaboradores **e** na lista **Papel operacional** de Usuários.

> **Cuidado com Colaborador e Gestor.** Essas duas funções são, ao mesmo tempo, **perfis de acesso** do sistema. Inativá-las as retira da lista de perfis em **Usuários**; renomeá-las muda o nome que aparece nas contas. **Não altere o código nem inative essas duas.**

### 16.13 Capacidade operacional

Aba **Capacidade operacional**. A capacidade é o número de horas por dia que o sistema compara com o tempo planejado para cada pessoa.

**Como o sistema decide a capacidade de um dia:**

1. se o colaborador tem um **ajuste individual** válido naquela data, vale o ajuste;
2. senão, vale a **capacidade padrão**;
3. se nem o padrão estiver disponível, o sistema assume **8 horas**.

**Alterar a capacidade padrão:**

1. No quadro **Capacidade padrão** — *"Este valor será usado para colaboradores sem ajuste individual."* —, informe **Horas por dia**. Aceita decimais com vírgula: **8** ou **7,5**.
2. Clique em **Salvar padrão**. Aparece **"Capacidade atualizada com sucesso."**.

O quadro mostra a **Última atualização**. O valor precisa estar entre 1 minuto e 24 horas; fora disso: *"A capacidade deve estar entre 1 minuto e 24 horas por dia."*. Valor vazio, zero ou negativo: *"Informe um número positivo de horas."*.

**Consultar a capacidade de cada pessoa.** O bloco **Ajustes por colaborador** lista **somente colaboradores ativos**, com os filtros **Buscar nome**, **Setor** e **Por página**:

| Coluna | Conteúdo |
|---|---|
| **Colaborador** · **Setor** | identificação |
| **Padrão (org.)** | a capacidade padrão |
| **Ajuste individual** | o ajuste **válido hoje**, ou um traço |
| **Capacidade efetiva** | o que vale hoje, por dia |
| **Origem** | **Ajuste individual**, **Padrão global** ou **Padrão (fallback)** — este último quando o sistema usou as 8 horas |
| ações | **Editar** e, quando há ajuste válido hoje, **Remover** |

**Definir um ajuste individual:**

1. Na linha do colaborador, clique em **Editar**.
2. A janela **Ajuste de capacidade** mostra o nome e o **Padrão atual da organização**.
3. Informe a **Capacidade individual (horas/dia)**.
4. Se o ajuste vale só por um período, abra **Vigência opcional (datas)** e preencha **De** e/ou **Até**. As duas datas entram no período. Com as duas vazias, o ajuste vale sem prazo.
5. Clique em **Salvar ajuste**. Aparece **"Capacidade atualizada com sucesso."**.

Cada colaborador tem **um ajuste por vez**: salvar de novo **substitui** o anterior, inclusive as datas.

**Voltar ao padrão:** clique em **Remover** na linha — confirmação *"Remover o ajuste de capacidade de {nome}? Voltará ao padrão global."* e aviso **"Ajuste removido; volta ao padrão global."** — ou em **Restaurar padrão**, dentro da janela, que mostra **"Capacidade restaurada ao padrão global."**.

> **Ajuste com início no futuro não aparece na tabela.** Enquanto a data **De** não chega, a linha mostra **Padrão global**, sem valor de ajuste e sem **Remover**. O ajuste existe: abra **Editar** para ver as datas. Para descartá-lo antes de começar, altere-o para um período que inclua hoje e então use **Remover**.

Se **Até** for anterior a **De**, o ajuste é recusado com uma mensagem que cita os nomes internos das duas datas.

**Onde a capacidade aparece:** no aviso **Capacidade diária ultrapassada** e nas células do **Planejamento** (capítulo 8) e da **Agenda da semana** (capítulo 9), na faixa de capacidade da **Minha fila** (capítulo 10), na exportação do planejamento, na **Saúde operacional** (capítulo 18) e na linha **Capacidade** da lista de **Colaboradores**. O planejamento usa a capacidade de **cada dia**: um ajuste com vigência vale só nos dias do período.

[IMAGEM SUGERIDA: Aba Capacidade operacional — quadro Capacidade padrão com Horas por dia e Salvar padrão, e a tabela Ajustes por colaborador com as colunas Padrão (org.), Ajuste individual, Capacidade efetiva e Origem]

### 16.14 Descrições de apontamentos

Aba **Descrições de apontamentos**: a lista de descrições que o colaborador escolhe ao registrar tempo **Extra Esteira** — apoio, limpeza, deslocamento e semelhantes (capítulo 7). O texto de apoio da aba usa o termo técnico `STEP`; leia como **atividade**.

Filtros: **Busca** e **Status** (**Todos**, **Ativos**, **Inativos**). Colunas: **Descrição**, **Status**, **Ordem**, **Atualizado em**.

Para criar, clique em **Nova descrição**; para alterar, use **Editar** no menu da linha. Campos:

| Campo | Observação |
|---|---|
| **Descrição \*** | de 3 a 120 caracteres; é o texto que o colaborador vê. Não pode repetir outra descrição — a comparação ignora acentos, maiúsculas e espaços extras: *"Já existe uma descrição com este conteúdo."* |
| **Ordem de exibição** | número, 0 ou maior; padrão 100. Menor aparece primeiro |
| **Observação interna (opcional)** | nota para a gestão; não aparece para o colaborador |
| **Ativo** | marcado por padrão |

Mensagens: **"Descrição criada."**, **"Descrição atualizada."**; no menu, **Inativar** / **Ativar** (**"Descrição inativada."** / **"Descrição ativada."**) e **Excluir**, com *"Excluir esta descrição? A ação é irreversível."* e **"Descrição excluída."**.

Só descrições **ativas** são oferecidas no apontamento, na ordem definida. Inativar ou excluir **não altera** apontamentos já feitos com aquela descrição.

### 16.15 Justificativas operacionais

Aba **Justificativas operacionais** — *"Catálogo padronizado para apontamentos por exceção de alocação e fora de sequência."* É a lista do campo **Justificativa operacional** de **Apontar horas** e do Modo Fábrica (capítulos 7 e 13).

Filtros: **Busca** e **Status**. Colunas: **Justificativa** (com a descrição, quando houver), **Categoria**, **Complemento** (**Obrigatório** ou **Opcional**), **Ordem**, **Ativo**.

Campos da janela **Nova justificativa** / **Editar justificativa**:

| Campo | Observação |
|---|---|
| **Justificativa \*** | o texto da opção, de 3 a 200 caracteres. Não pode repetir outra: *"Já existe uma justificativa com este rótulo."* |
| **Descrição** | opcional, explica a opção |
| **Categoria** | opcional: **Substituição**, **Sequência**, **Planejamento**, **Retrabalho**, **Prioridade**, **Emergência** ou **Outro** |
| **Ordem** | 0 ou maior; padrão 100 |
| **Exige complemento** | quando marcado, quem escolher esta opção precisa escrever o **Complemento** |
| **Ativo** | marcado por padrão |

No menu da linha: **Editar** e **Desativar** / **Ativar** (**"Justificativa desativada."** / **"Justificativa ativada."**). **Não existe exclusão**: para tirar uma opção de uso, desative-a. Só as ativas aparecem para escolha.

### 16.16 Motivos de dispensa

Aba **Motivos de dispensa**: a lista do campo **Motivo** ao **dispensar** uma atividade (capítulo 6, seção 6.18). O texto de apoio da aba usa o termo técnico `STEP`; leia como **atividade**.

Filtros: **Busca** (por código ou motivo) e **Status**. Colunas: **Código**, **Motivo**, **Complemento**, **Ordem**, **Ativo**.

| Campo | Observação |
|---|---|
| **Código \*** | identificador curto. O sistema converte para maiúsculas e só aceita letras sem acento, números e sublinhado. **Não pode ser alterado depois de criado**. Não pode repetir: *"Já existe um motivo de dispensa com este código."* |
| **Motivo \*** | o texto que aparece na lista, até 200 caracteres |
| **Descrição** | opcional |
| **Ordem** | 0 ou maior |
| **Exige complemento** | quando marcado, a dispensa com este motivo exige o **Complemento obrigatório** — como no motivo **Outro** do catálogo padrão |
| **Ativo** | marcado por padrão |

No menu da linha: **Editar** e **Desativar** / **Ativar** (**"Motivo desativado."** / **"Motivo ativado."**). Mensagens de gravação: **"Motivo criado."** e **"Motivo atualizado."**. **Não existe exclusão**: desative o que não deve mais ser usado.

Se um motivo for desativado enquanto alguém está com a janela de dispensa aberta, a dispensa é recusada e a pessoa precisa escolher de novo (capítulo 6).

### 16.17 Equipes: consultar, criar e alterar

1. Abra **Gestão → Equipes**. A tela explica que equipes servem para grupos ou funções operacionais — Ajudante, Costura, Montagem, Acabamento —, inclusive como **padrão na matriz de operação**.
2. Filtros: **Buscar** (pelo nome), **Situação** (**Todas**, **Ativas**, **Inativas**) e **Por página**.
3. A tabela mostra **Nome**, **Membros** (quantos estão na equipe), **Situação** (**Ativa** ou **Inativa**) e **Atualizado**, em ordem de nome.

Sem resultados: *"Nenhuma equipe encontrada."* — *"Crie uma equipe para agrupar colaboradores em operações futuras."*.

**Criar:**

1. Clique em **Nova equipe**.
2. Informe **Nome** (obrigatório), **Descrição (opcional)** e deixe ou desmarque **Equipe ativa**.
3. Clique em **Criar equipe**. Aparece **"Equipe criada."** e abre o detalhe da equipe, onde se incluem os membros.

O sistema **não impede** duas equipes com o mesmo nome: confira a lista antes de criar.

**Alterar:** no menu da linha, **Editar** abre o detalhe. No bloco **Dados da equipe**, altere **Nome**, **Descrição** e **Equipe ativa** e clique em **Salvar alterações** (**"Equipe atualizada."**). Nome vazio: *"Indique o nome da equipe."*.

**Inativar, ativar e remover**, pelo menu da linha:

| Item | Confirmação |
|---|---|
| **Inativar** | *"Deseja inativar esta equipe?"* |
| **Ativar** | *"Deseja ativar esta equipe?"* |
| **Remover** | *"Deseja remover esta equipe?"* |

Uma equipe **inativa** ou **removida** não pode mais ser alocada em atividade: a tentativa é recusada com *"Time de alocação inexistente ou inativo."* (capítulo 6). A equipe removida sai da lista e **não há como restaurá-la pela tela**. As alocações já feitas não são desfeitas por essas ações.

### 16.18 Equipes: membros e referência

No detalhe da equipe, o bloco **Membros** lista quem está nela, com a referência primeiro e os demais em ordem de nome:

| Coluna | Conteúdo |
|---|---|
| **Colaborador** | nome e e-mail |
| **Papel na equipe** | texto livre, opcional |
| **Referência** | o selo **Referência**, quando marcado |
| **Situação** | **Na equipe**; e **Colaborador inativo** ou **Removido do cadastro** quando o cadastro da pessoa mudou depois |

Equipe vazia: *"Nenhum colaborador nesta equipe."*.

**Incluir um membro:**

1. Clique em **Adicionar colaborador**.
2. Em **Colaborador**, escolha a pessoa. A lista traz **só colaboradores ativos** que ainda não estão na equipe.
3. Opcionalmente, informe o **Papel na equipe** (por exemplo, *"Líder de turno"*) e marque **Marcar como referência da equipe**.
4. Clique em **Adicionar** (fica desativado até você escolher alguém). Aparece **"Membro adicionado."**.

**Alterar um membro:** menu da linha → **Editar** → altere **Papel na equipe** ou **Marcar como referência da equipe** → **Salvar** (**"Membro da equipe atualizado."**).

**Referência:** cada equipe tem **no máximo uma**. Ao marcar outra pessoa, a marcação anterior é retirada **automaticamente, sem aviso**. A referência é uma indicação para quem consulta a equipe; nenhuma outra tela do sistema a utiliza.

**Retirar um membro:** menu da linha → **Remover** → confirme *"Remover {nome} desta equipe? O vínculo fica inativo (não apaga o histórico)."*. Aparece **"Membro removido da equipe."** e a pessoa sai da lista. Ela pode ser incluída de novo depois.

Inativar ou remover um colaborador **não o tira** das equipes: ele continua listado, com o selo correspondente. Se ele não deve mais fazer parte, retire-o manualmente.

**Alocar a equipe em uma atividade** é feito na esteira, não aqui: veja o capítulo 6, seção 6.6. Alocar uma equipe **não** cria alocações individuais para os membros, e a equipe nunca é responsável principal.

## O que esperar

### As alterações valem na hora

Não há etapa de aprovação nem de publicação. Uma função inativada some das listas, um PIN redefinido já vale para o Modo Fábrica, uma capacidade nova já entra no cálculo de sobrecarga, uma justificativa desativada sai da lista de escolha. Outras pessoas veem o efeito na próxima vez que suas telas carregarem os dados.

### O histórico é preservado

Nenhuma das ações deste capítulo apaga apontamentos já feitos. Colaboradores, contas e equipes removidos deixam de aparecer, mas os registros ligados a eles continuam no histórico. Descrições e motivos já usados continuam aparecendo nos registros antigos.

### Inativar e remover são coisas diferentes

| | Inativar | Remover |
|---|---|---|
| continua na lista da tela | sim, como **Inativo** | **não** |
| pode ser desfeito pela tela | sim, com **Ativar** | **não**, na prática |
| libera o nome ou o e-mail | não | colaborador: libera o nome · conta: **não** libera o e-mail |
| recomendado para afastamento | **sim** | só para cadastro feito por engano |

### Cadastro não é acesso

Criar o colaborador não libera a fábrica, e criar a conta não liga a conta à pessoa. Para alguém que vai **entrar no sistema e apontar produção**, o caminho completo é:

1. cadastrar o colaborador (16.3);
2. liberar o Modo Fábrica com **Redefinir PIN**, se a pessoa usar o totem ou o navegador da fábrica (16.5);
3. criar a conta de acesso já com o colaborador vinculado, se a pessoa usar o sistema por e-mail e senha (16.8);
4. incluí-la nas equipes pertinentes (16.18);
5. conferir a capacidade, se for diferente do padrão (16.13).

### Sair com uma janela aberta

Em **Colaboradores** e em **Usuários**, sair pelo menu lateral com uma janela de cadastro, edição ou senha aberta pede confirmação em **"Sair desta página?"**. **Sair e continuar** descarta o que não foi salvo.

## Quando algo é bloqueado

### Falta de permissão

| Situação | O que aparece | O que fazer |
|---|---|---|
| a tela não aparece no menu, ou o endereço direto mostra **"Sem permissão para esta área"** | falta a permissão de consultar aquela frente | pedir a liberação a quem administra os acessos |
| em **Colaboradores** ou **Usuários**, a ação abre a janela **Sem permissão** | falta a permissão daquela ação específica | idem; nada foi alterado |
| em **Equipes**, o botão ou item de menu não existe | falta a permissão de criar, alterar ou gerenciar membros | idem |

### Colaboradores

| Mensagem | Causa | O que fazer |
|---|---|---|
| *"Informe o nome."* · *"Escolha um setor."* · *"Escolha uma função / papel operacional."* | campo obrigatório vazio | preencher |
| *"URL do avatar deve começar por http:// ou https://."* | endereço da foto fora do formato | corrigir ou deixar vazio |
| *"Já existe um colaborador com este nome."* | outro colaborador não removido usa o mesmo nome | diferenciar o nome; confira se a pessoa já não está cadastrada, inclusive como **Inativo** |
| *"Setor ou cargo informado não existe."* | o setor ou a função foi excluído enquanto a janela estava aberta | fechar, reabrir e escolher de novo |
| *"Colaborador removido logicamente. Restaure antes de alterar."* | a ação foi feita sobre um colaborador removido por outra pessoa | não há como alterar pela tela |
| *"Erro ao redefinir o PIN. Tente novamente."* | a redefinição do PIN falhou, inclusive por falta de permissão | tentar de novo; se persistir, confirmar a permissão |

### Usuários

| Mensagem | Causa | O que fazer |
|---|---|---|
| *"Indique o e-mail."* · *"E-mail inválido."* · *"Selecione um papel operacional."* | campo obrigatório vazio ou fora do formato | corrigir |
| *"A senha inicial deve ter pelo menos 8 caracteres."* · *"A nova senha deve ter pelo menos 8 caracteres."* | senha curta | usar 8 ou mais caracteres |
| *"URL do avatar deve usar http:// ou https://."* · *"URL do avatar inválida."* | endereço da foto fora do formato | corrigir ou deixar vazio |
| *"Já existe um usuário com este e-mail."* | o e-mail já pertence a outra conta, **ativa, inativa ou removida** | usar outro e-mail; se a conta existente estiver inativa, reative-a em vez de criar outra |
| *"Colaborador inválido, inativo ou já vinculado a outro usuário."* · *"Este colaborador já está vinculado a outro usuário."* | o colaborador escolhido está inativo, removido ou preso a outra conta — inclusive a uma conta removida | ver 16.9 e 16.10 |
| *"Papel de acesso não encontrado."* · *"Papel ou colaborador informado não existe."* | o perfil ou o colaborador foi excluído enquanto a janela estava aberta | fechar, reabrir e escolher de novo |
| *"Não pode inativar a sua própria conta."* · *"Não pode remover a sua própria conta."* | ação sobre a própria conta | pedir a outra pessoa com a permissão |
| *"Não pode redefinir a sua própria senha por aqui. Utilize «Alterar senha» na sua conta."* | redefinição da própria senha | usar **Alterar senha** |
| *"Sua conta está inativa. Contacte o administrador."* | mensagem que **a pessoa** vê ao tentar entrar com uma conta inativa | reativar com **Ativar** |

### Configurações operacionais

| Mensagem | Causa | O que fazer |
|---|---|---|
| *"Informe o nome."* · *"Informe o código."* · *"Informe a justificativa."* · *"Informe o motivo."* | campo obrigatório vazio | preencher |
| *"Já existe um setor com este nome."* · *"Já existe um papel com este código."* · *"Já existe uma descrição com este conteúdo."* · *"Já existe uma justificativa com este rótulo."* · *"Já existe um motivo de dispensa com este código."* | o item já existe | usar o existente ou diferenciar |
| *"Não é possível excluir: existem usuários ou colaboradores usando esta função. Inative-a em vez disso."* | função em uso | inativar |
| *"Descrição deve ter no mínimo 3 caracteres."* · *"Informe uma ordem válida (0 ou maior)."* · *"Ordem inválida."* | texto curto ou ordem negativa ou não numérica | corrigir |
| *"Informe um número positivo de horas."* · *"A capacidade deve estar entre 1 minuto e 24 horas por dia."* · *"Valor inválido para minutos diários."* | capacidade vazia ou fora do limite | informar um valor entre 1 minuto e 24 horas |
| mensagem iniciada por *"Campo inválido:"* | um dado foi recusado pela validação do servidor, como datas de vigência invertidas | conferir o campo citado; nas datas, **Até** não pode ser anterior a **De** |

### Equipes

| Mensagem | Causa | O que fazer |
|---|---|---|
| *"Indique o nome da equipe."* | nome vazio | preencher |
| *"Escolha um colaborador."* | nenhum colaborador selecionado | escolher |
| *"Só é possível associar colaboradores ativos à equipe."* | a pessoa foi inativada ou removida enquanto a janela estava aberta | escolher outra pessoa ou reativar o cadastro |
| *"Este colaborador já está nesta equipe."* | a pessoa foi incluída por outro caminho enquanto a janela estava aberta | fechar e conferir a lista |
| **Não foi possível carregar as equipes** | falha ao buscar a lista | tentar de novo em instantes; quando o aviso aparece abaixo dos filtros, use **Tentar novamente** |
| **Equipe não encontrada**, com **Voltar à listagem** | a equipe foi removida ou o endereço está incorreto | voltar à lista |

### Erros de comunicação

Quando o problema é de sessão, de comunicação ou de um registro que deixou de existir, o sistema mostra uma janela de aviso que precisa ser fechada — por exemplo, *"O recurso solicitado não foi encontrado ou não existe mais."*. As demais recusas aparecem em um aviso rápido, que some sozinho após alguns segundos. Em todos os casos a tela continua utilizável: corrija o que o aviso indicar e tente de novo.

### Ações que não existem nestas telas

| Limitação | Como proceder |
|---|---|
| ver ou **restaurar** colaboradores e contas removidos | não há como pela tela; prefira **Inativar** |
| **desligar** o Modo Fábrica de um colaborador sem inativá-lo | inative o colaborador |
| definir o PIN do colaborador diretamente | use **Redefinir PIN**; a pessoa cria o próprio PIN no primeiro acesso |
| **limpar** o campo **Observações** do colaborador | substitua o texto |
| excluir **justificativas** ou **motivos de dispensa** | desative-os |
| alterar o **código** de um motivo de dispensa | crie outro motivo e desative o antigo |
| restaurar uma **equipe removida** | não há como pela tela; prefira **Inativar** |
| filtrar **Usuários** por situação | use a coluna **Situação** da tabela |
| definir permissões de um perfil | é feito em **Permissões por papel**, fora deste capítulo |

---

# 17. Importação por documento

## Para que serve

**Importação por documento** cria uma esteira a partir de uma **ordem de serviço em PDF**, em vez de montá-la item a item. Você envia o arquivo, o sistema lê o texto, propõe um **rascunho** e compara cada serviço encontrado com as **matrizes de operação** já cadastradas. Você revisa, decide o que reaproveitar e só então confirma.

Três pontos definem o recurso:

- **o envio não cria a esteira.** Ele só gera um rascunho. A esteira existe depois que você clica em **Criar esteira no SGP+** e confirma;
- **a revisão é sua.** O sistema sugere; itens duvidosos ficam parados até você decidir;
- **o resultado é uma esteira comum.** Depois de criada, vale tudo o que o capítulo 6 descreve.

## Onde fica

Há duas entradas, que abrem a mesma tela:

| Entrada | Caminho |
|---|---|
| Menu lateral | **Gestão → Por documento** |
| Painel operacional | botão **Nova esteira por documento**, no topo da tela |

O título da página é **Nova esteira por documento**, com a linha de apoio *"Envie um PDF da ordem de serviço. O sistema gera um rascunho automático para revisar e corrigir antes de criar a esteira oficialmente no SGP+."*

A tela é organizada de cima para baixo:

1. a área **1. Documento (PDF)**, para enviar o arquivo, ao lado da área **2. Situação do rascunho**;
2. os **avisos**, quando houver;
3. a **Revisão da OS importada**, com as decisões item por item;
4. os **Dados sugeridos (editáveis)**;
5. os **Itens / etapas inferidos**;
6. os botões **Criar esteira no SGP+** e **Novo documento**.

Os blocos 3 a 6 só aparecem depois que o sistema devolve um rascunho utilizável.

[IMAGEM SUGERIDA: Tela Nova esteira por documento logo após o envio — as áreas 1 e 2 lado a lado, o painel Revisão da OS importada com os quatro contadores e as seções de itens]

## Quem costuma ter acesso

O acesso é controlado por **permissão**. A exigida é a de **criar esteiras** — a mesma de **Nova esteira**, **Planejamento**, **Agenda da semana** e **Evolução das Esteiras**. Na configuração padrão, ela está com a **administração** e a **gestão**.

A verificação acontece em dois pontos. Sem a permissão, o item **Por documento** não aparece no menu. Os botões do Painel operacional continuam visíveis, mas levam ao aviso **"Sem permissão para esta área"** — o mesmo que o endereço direto mostra. Além disso, o servidor exige a mesma permissão tanto para ler o documento quanto para criar a esteira, de modo que não há caminho alternativo.

## Como fazer

### Enviar o documento

1. Abra **Gestão → Por documento**.
2. **Arraste o PDF** para a área tracejada ou clique em **Escolher PDF** e selecione o arquivo.
3. Aguarde. O envio começa **sozinho**, assim que o arquivo é escolhido — não há botão de enviar. Enquanto isso aparece *"Processando o documento e gerando o rascunho…"* e o botão fica como **Processando…**.

O nome do arquivo escolhido aparece abaixo do botão. Para trocar de documento, escolha outro PDF: o envio recomeça e **as decisões já tomadas na revisão anterior são descartadas**. O botão **Novo documento**, no fim da tela, limpa tudo e volta ao início, também sem pedir confirmação.

Antes do primeiro envio, a área **2. Situação do rascunho** mostra *"Ainda sem resultado. Envie um PDF para ver o rascunho e os avisos do interpretador."*

**Limites a conhecer:**

- o seletor de arquivos filtra por PDF, mas o sistema foi preparado para ler **PDF com texto**. Não há leitura de imagem: um PDF que seja apenas uma foto ou digitalização, sem texto selecionável, tende a resultar em rascunho vazio ou em avisos de que nada foi lido;
- existe um **tamanho máximo** de arquivo. Por padrão, 15 MB; a equipe técnica pode alterar esse valor. Acima do limite, o envio é recusado.

### Ler o resultado do envio

Na área **2. Situação do rascunho** aparecem:

| Informação | Como ler |
|---|---|
| **Situação** | **Concluído**: nenhuma das condições de Parcial ou Falhou. **Parcial**: o texto veio vazio ou vários dados importantes não foram identificados — o rascunho existe, mas pede mais atenção. **Falhou**: não há rascunho utilizável |
| **Confiança global** | percentual que resume o quanto o sistema confia na leitura. É uma referência para sua atenção, não uma garantia |

Abaixo, a faixa **Rastreabilidade (suporte)** mostra dois identificadores, **Pedido** e **Correlação**, e o botão **Copiar referência**. Se precisar abrir um chamado sobre um documento, copie e cole essa referência; o aviso *"Referência copiada para a área de transferência."* confirma. Não é preciso fazer nada com ela no uso normal.

Outras linhas dessa área (estratégia, especialista, identificação do arquivo) são informações de apoio técnico e podem ser ignoradas.

Uma faixa informativa pode aparecer acima das áreas, indicando **como o rascunho foi gerado** (*"Modo local: este rascunho foi gerado no servidor SGP+…"*, *"Modo demonstração (stub)…"* ou *"Modo remoto…"*). É um aviso de configuração do ambiente, sem relação com o seu documento. Se aparecer *"Modo demonstração (stub)"*, o rascunho é mínimo, apenas para teste: **não use para criar esteiras reais** e avise a equipe técnica.

### Ler os avisos

Quando o sistema encontra pontos duvidosos, abre-se a caixa **Avisos para revisão**, que diz que esses pontos *"não bloqueiam por si o envio, mas devem ser confirmados por um humano antes de criar a esteira"*. Cada aviso traz uma mensagem e, acima dela, um código técnico pequeno — **vale a mensagem**.

As mensagens que o sistema pode mostrar:

| Mensagem | O que significa | O que fazer |
|---|---|---|
| *"Número da OS não identificado com confiança suficiente."* | o número da ordem de serviço não foi lido com segurança | confira o número no PDF e preencha o nome da esteira a seu critério |
| *"Linhas de serviço não identificado com confiança suficiente."* | nenhum serviço foi reconhecido no texto | confira se o PDF tem texto legível; sem serviços, não há o que revisar |
| *"Nome sugerido da esteira não identificado com confiança suficiente."* | o sistema não conseguiu sugerir um nome | digite o nome em **Nome da esteira** |
| *"… presente mas com confiança baixa."* | o dado foi lido, mas com pouca certeza | confira o dado na tela contra o PDF |
| *"Trechos financeiros, tabulares ou sensíveis foram removidos antes do rascunho operacional."* | valores, totais, dados pessoais ou tabelas de preço foram retirados de propósito | nada a fazer; é proteção do sistema |
| *"Nenhum serviço operacional válido foi identificado após filtros de ruído documental."* | depois da limpeza, não sobrou nenhum serviço | verifique o PDF; se for o documento correto, crie a esteira manualmente |
| *"Texto vazio após extração; sugestões baseadas apenas no nome do ficheiro, se aplicável."* / *"Nenhum texto legível extraído do ficheiro."* | o PDF não tem texto que o sistema consiga ler | veja o limite sobre PDF de imagem, acima |
| *"Não foi possível ler a estrutura do PDF; texto obtido por fallback pode ser incompleto."* | o arquivo está danificado ou fora do padrão; o sistema tentou recuperar o texto | confira o rascunho com atenção redobrada ou gere o PDF de novo |
| *"Nenhuma atividade de Matriz compatível encontrada; revisão manual necessária."* | nenhum serviço do documento se parece com atividade das matrizes | todos os itens entram como novos; veja a seção abaixo |
| *"Falha ao consultar candidatos de matriz; revisão manual recomendada."* | a comparação com as matrizes não pôde ser feita | os itens entram como novos; tente enviar de novo se quiser a comparação |

### Conferir o resumo da revisão

O painel **Revisão da OS importada** abre com um resumo do documento: **Origem**, **Tipo**, **Número**, **Status**, **Veículo**, **Placa mascarada** (parte da placa fica oculta de propósito) e **Confiança global**. Campos que o sistema não leu aparecem como **Não informado**.

Se houve remoção de informação sensível, aparece o bloco **Dados protegidos removidos**, que informa se foram retirados dados pessoais e dados financeiros e quais categorias (por exemplo, preços, totais, telefone, endereço). Isso confirma que esses dados **não seguem** para a esteira.

Quatro contadores resumem o que o sistema encontrou:

| Contador | Significa |
|---|---|
| **Serviços extraídos** | quantos serviços foram lidos no documento |
| **Itens reaproveitados (plano)** | quantos têm correspondência forte com uma matriz |
| **Revisar similaridade** | quantos têm correspondência moderada ou ambígua e **exigem sua decisão** |
| **Novos sugeridos** | quantos não encontraram atividade parecida e **exigem sua decisão** |

Logo abaixo, **Pendências de revisão: N** mostra quantas decisões obrigatórias ainda faltam, com o detalhe de itens similares e novos pendentes, alternativas selecionadas e itens ignorados. Quando chega a zero, aparece *"Revisão obrigatória concluída."*

**Esse número é o que libera o botão de criar:** enquanto houver pendência, **Criar esteira no SGP+** fica desativado. A tela também avisa, em faixa amarela, *"Existem itens que exigem decisão explícita antes da criação oficial da esteira."*

### Entender como o sistema compara os itens

Para cada serviço lido no documento, o sistema compara o **texto da descrição** com o nome e a descrição das atividades (e também das tarefas) das matrizes de operação. A comparação é por **palavras**: ignora acentos, maiúsculas e minúsculas, palavras comuns e ruídos como o nome do modelo do veículo, e reconhece variações de escrita (plural e singular, sinônimos de uso comum). Termos fortes do ofício — banco, ombreira, lateral, tampa, couro e semelhantes — pesam mais.

O resultado é um percentual de **Confiança** por item e um **Motivo** em texto. A comparação **não** usa semelhança de som, nem outro código além do texto da descrição.

Cada item cai em um de três grupos, e o grupo define o que se espera de você:

| Seção | O que o sistema encontrou | O que você precisa fazer |
|---|---|---|
| **Reaproveitar da Matriz** | uma atividade (ou uma estrutura inteira) muito parecida | nada: o candidato já vem **pré-selecionado**. Você pode confirmar ou trocar por outra alternativa |
| **Revisar similaridade** | correspondência moderada, ou dois candidatos tão próximos que o sistema não escolhe sozinho | **decidir**. O item fica pendente até lá |
| **Nova atividade sugerida** | nada suficientemente parecido (*"Nenhuma atividade suficientemente parecida foi encontrada."*) | **decidir**. O item fica pendente até lá |

### Decidir item por item

Cada cartão mostra a descrição do serviço lido, o grupo, a **Confiança**, o **Motivo** e, quando há candidato, os dados dele: **Atividade**, **Setor**, **Etapa**, **Tempo**, **Time** e **Responsável**. Uma linha **Estado** informa a decisão atual.

Os botões variam conforme o grupo:

| Botão | Onde aparece | O que faz |
|---|---|---|
| **Manter candidato sugerido** | Reaproveitar da Matriz | confirma o candidato principal |
| **Aceitar sugestão** | Revisar similaridade | aceita o candidato sugerido como correto |
| **Ver alternativas** / **Escolher alternativa** / **Ocultar alternativas** | quando há outros candidatos | abre a lista de alternativas; **Usar esta** escolhe uma, e o botão passa a **Selecionado** |
| **Criar como novo item** | Revisar similaridade e Nova atividade sugerida | descarta a correspondência e cria o item como atividade nova |
| **Ignorar item** | Revisar similaridade e Nova atividade sugerida | tira o item da esteira |

Pontos de atenção:

- em **Nova atividade sugerida** não há **Aceitar sugestão**, porque não existe candidato;
- em **Reaproveitar da Matriz** **não há** botão para ignorar nem para criar como novo. Se o candidato não serve, abra as alternativas e escolha outra. Se nenhuma serve, o caminho é criar a esteira e ajustar a atividade depois (capítulo 6);
- uma decisão pode ser **refeita** a qualquer momento antes de criar: basta clicar em outro botão do mesmo cartão;
- a alternativa pode ser **uma estrutura inteira** (uma tarefa ou um setor com várias atividades). Nesse caso o cartão mostra **Estrutura da Matriz sugerida**, com áreas, atividades e minutos, e avisa que, ao aceitar, *"esta estrutura representa um reaproveitamento composto da Matriz (não um item novo simples)"*;
- quando a mesma estrutura é sugerida para mais de um item, ela entra **uma única vez** na esteira.

O Estado de cada item usa estas expressões: **Decisão pendente**, **Candidato principal aceite**, **Alternativa da matriz selecionada**, **Confirmado como novo item** e **Item ignorado pelo revisor**.

[IMAGEM SUGERIDA: Cartão de item em Revisar similaridade com os botões Aceitar sugestão, Escolher alternativa, Criar como novo item e Ignorar item, e a lista de alternativas aberta]

### Peças e observações

Se o documento listava **peças ou insumos**, o painel mostra um aviso de que o SGP+ **não** usa essa informação para montar a esteira nem para controle de estoque: só serviços entram. As peças não aparecem para decisão.

O bloco **Observações operacionais** lista anotações do documento que interessam à operação, ou informa *"Não foram identificadas observações operacionais adicionais."*

### Ajustar os dados da esteira

Em **Dados sugeridos (editáveis)**, o texto reflete a leitura automática — *"não a versão final na base"*. Corrija o que for preciso:

| Campo | Observação |
|---|---|
| **Nome da esteira** | **obrigatório**. Sem ele, a criação é recusada |
| **Cliente** | texto livre |
| **Veículo** | texto livre |
| **Modelo / versão** | texto livre |
| **Placa** | texto livre |
| **Prazo estimado** | texto livre, sem formato obrigatório |
| **Observações** | texto livre |
| **Prioridade sugerida** | **Alta**, **Média** ou **Baixa**. Vem como **Média** quando o documento não indica |
| **Referência OS (lida)** | só aparece quando o sistema leu o número da OS; é informativo |

> **Nem tudo o que a tela mostra é gravado.** Na configuração padrão do sistema, todo PDF é lido como ordem de serviço do modelo da oficina. Nesse caso, os campos **Modelo / versão**, **Placa**, **Prazo estimado** e **Observações** aparecem **travados**, e **Cliente**, **Placa** e **Prazo estimado** **não são gravados** na esteira, mesmo que a tela mostre ou aceite um valor. Seguem de fato para a esteira o **Nome da esteira**, o **Veículo**, a **Prioridade** e a **Referência OS**, que é acrescentada às observações. Se precisar de cliente, placa ou prazo, preencha depois, em **Alterar Esteira** (capítulo 6).

Em **Itens / etapas inferidos** você vê a estrutura que será criada. A tela a chama de **Opção → Área → Etapa**; na esteira criada, isso corresponde a **tarefa → setor → atividade**. Os títulos de cada nível e o campo **Min** (tempo planejado, em minutos) podem ser editados.

Por padrão, os serviços novos entram em uma tarefa chamada **Itens inferidos do documento**, no setor **Serviço**. Quando você aceita uma estrutura inteira da matriz, uma **tarefa** da matriz entra como tarefa própria na esteira, com os setores e atividades dela; um **setor** da matriz entra como setor da tarefa **Itens inferidos do documento**. Mas atenção ao efeito das decisões sobre o que você editou:

| Decisão | O que acontece com a atividade |
|---|---|
| **Manter candidato sugerido** / **Aceitar sugestão** | título e tempo vêm da matriz e **substituem** o que você digitou |
| **Usar esta** (alternativa) | título e tempo vêm da alternativa escolhida |
| **Criar como novo item** | vale o que está na tela, com o tempo que você informou |
| **Ignorar item** | a atividade **não entra** na esteira |

Em atividades novas, o **Min** parte de **0**. A tela não obriga a preencher, mas uma atividade sem tempo previsto não ajuda o planejamento: informe o tempo antes de criar.

### Criar a esteira

1. Confirme que **Pendências de revisão** está em zero e que o **Nome da esteira** está preenchido.
2. Clique em **Criar esteira no SGP+**.
3. O sistema abre uma confirmação do navegador:
   - se havia itens que exigiam revisão: *"Confirmar criação da esteira oficial. Você confirmou os itens que exigiam revisão. A esteira oficial será criada a partir deste draft revisado."*;
   - sem itens de revisão: *"Confirmar criação da esteira oficial a partir do draft revisado?"*.
4. Em ambas, o texto traz o **Resumo das decisões**: **Alinhados à matriz**, **Novos confirmados**, **Ignorados pelo revisor** e **Alternativas selecionadas**. Confira os números e confirme.

Durante a criação, o botão mostra **Criando…**. Cancelar a confirmação mantém tudo como estava, sem criar nada.

## O que esperar

### Depois de confirmar

Você é levado ao **detalhe da esteira** criada, com o aviso **"Esteira criada a partir do documento revisto."**

A esteira nasce em **Rascunho / Em elaboração**, como qualquer outra, e **a produção ainda não a vê**. Para o trabalho chegar à fábrica, valem as mesmas etapas do capítulo 6: fazer a esteira avançar, planejar e publicar o plano.

O que a esteira traz:

- as **atividades reaproveitadas** vêm com o **responsável** e a **equipe** que a matriz já tinha como padrão, quando existirem. Atividades novas nascem **sem responsável**;
- a **quantidade prevista** não é pedida nesta tela. Confira e ajuste cada atividade no detalhe da esteira (capítulo 6);
- as decisões da revisão ficam registradas internamente na esteira, para rastreabilidade. Não há tela para consultá-las.

Esta tela **não** mostra os atalhos **Ver backlog** e **Ir a Minha fila** que aparecem ao criar pela **Nova esteira**; só o aviso acima.

> Se, após a revisão, não restar nenhuma atividade (por exemplo, todos os itens foram ignorados), a esteira é criada com uma única atividade provisória chamada **Defina as etapas do serviço**, com tempo zero. Edite ou substitua essa atividade antes de planejar.

### Proteções de conteúdo

O sistema não deixa passar para a esteira valores, totais, descontos, condições de pagamento, dados pessoais ou outros dados sensíveis. Eles são retirados na leitura e, se algum trecho suspeito ainda estiver no que você vê na tela, a criação é recusada (ver abaixo). Peças e insumos também ficam de fora.

### Sair da tela no meio da revisão

Depois de enviar um documento, sair pelo menu lateral abre a confirmação **"Sair desta página?"**, avisando que o contexto atual — filtros, seleções ou alterações ainda não guardadas — pode ser descartado. **Cancelar** mantém você na revisão; **Sair e continuar** descarta o rascunho e as decisões. A revisão **não é salva**: se sair, terá de enviar o PDF novamente.

## Quando algo é bloqueado

### Falta de permissão

Sem a permissão de **criar esteiras**, a tela mostra **"Sem permissão para esta área"**. Peça a liberação a quem administra os acessos.

### O botão Criar esteira no SGP+ está desativado

| Causa | Como saber | O que fazer |
|---|---|---|
| há itens em **Revisar similaridade** ou **Nova atividade sugerida** sem decisão | **Pendências de revisão** maior que zero | decida cada item pendente |
| o conteúdo contém dado financeiro ou sensível | aparece em faixa vermelha *"O draft contém conteúdo financeiro ou sensível removido por segurança. Reimporte ou revise o documento antes de criar a esteira."* | retire o trecho do campo em que aparece ou envie o documento de novo |
| a criação já está em andamento | o botão mostra **Criando…** | aguarde |

O botão fica desativado **sem explicação na própria tela** — a pista é o contador **Pendências de revisão**.

### Mensagens ao tentar criar

| Mensagem | Causa | O que fazer |
|---|---|---|
| *"Indique o nome da esteira antes de criar."* | **Nome da esteira** vazio | preencha o campo |
| *"O draft contém conteúdo financeiro ou sensível removido por segurança. Reimporte ou revise o documento antes de criar a esteira."* | texto com valores, totais ou dados sensíveis nos campos ou nas observações | remova o trecho ou reenvie o documento |
| *"O draft contém conteúdo não operacional (partItems). Revise antes de criar."* / *"O draft contém campos de debug internos e não pode ser enviado para criação."* | o rascunho contém informação que não deve seguir para a esteira | reenvie o documento; se persistir, abra chamado com a **referência de suporte** |
| *"Cada opção precisa de um título."* / *"Cada área precisa de um título."* / *"Cada etapa precisa de um título."* | você apagou o título de uma tarefa, de um setor ou de uma atividade | preencha o título que ficou vazio (lembrando: **opção** = tarefa, **área** = setor, **etapa** = atividade) |
| *"A estrutura contém uma etapa sintética de Matriz. Remova o item agregado e mantenha apenas as atividades reais."* | a estrutura final contém um item agregado que não corresponde a uma atividade real | escolha outra alternativa ou **Criar como novo item** para o serviço envolvido; se persistir, abra chamado |

A mensagem aparece em faixa vermelha no alto da tela. O texto usa a palavra **draft**, que é o **rascunho** deste capítulo.

### Quando o documento não gera rascunho

Se o documento não rende um rascunho utilizável, a tela mostra, em vermelho, *"Não foi possível obter um rascunho utilizável a partir deste documento. Corrija o arquivo ou tente outro envio. Se o problema continuar, contate o suporte."*, com a lista dos motivos e o botão **Enviar outro documento**. O caso mais comum é o arquivo **vazio** (*"Ficheiro vazio; nada a interpretar."*).

Quando o problema é de comunicação, sessão ou serviço, o sistema mostra o erro de duas formas, conforme a gravidade: em **faixa vermelha** no alto da tela, ou em uma **janela de aviso** que precisa ser fechada. Nos dois casos, a tela continua utilizável: corrija o que o aviso indicar e envie de novo. Se a sessão expirou, entre novamente no sistema.

### Ações que não existem nesta tela

| Limitação | Como proceder |
|---|---|
| Não é possível **salvar** a revisão para continuar depois | conclua na mesma visita, ou envie o documento de novo |
| Só se envia **um PDF por vez** | envie um documento, crie a esteira e repita |
| Não é possível **adicionar ou remover** atividades na lista **Itens / etapas inferidos** | use **Ignorar item** para tirar; para acrescentar, use **Incluir novo item** no detalhe da esteira (capítulo 6) |
| Não há como informar **responsável**, **equipe** ou **quantidade prevista** aqui | faça no detalhe da esteira, depois de criada |
| Não é possível **desfazer** a criação nesta tela | a esteira criada é uma esteira normal e segue as regras do capítulo 6 |
| Peças e insumos do documento são ignorados | não há como importá-los |
| O sistema **não** lê imagem | use PDF com texto, ou crie a esteira manualmente |

---

# 18. Saúde operacional

## Para que serve

**Saúde operacional** é a tela em que a gestão confere, pessoa por pessoa, se o trabalho em aberto cabe na capacidade de cada colaborador e se os apontamentos estão acontecendo. Ela ajuda a responder perguntas como:

- quem tem mais trabalho em aberto do que consegue fazer no período?
- quem tem atividades em aberto, mas não aponta nada há dias?
- quem apontou muito pouco, apesar de ter trabalho em aberto?
- para quem o cálculo depende de um dado incompleto, como a capacidade não configurada?

Para cada colaborador, a tela compara três números — a **carga pendente** das atividades em aberto em que ele está alocado, a **capacidade** dele no período escolhido e o **tempo apontado** nesse período — e resume o resultado em um **estado**, um **risco** e uma lista de **sinais**.

A classificação segue **regras fixas de cálculo**, iguais para todos. A própria tela avisa que não há julgamento de desempenho individual: os sinais servem para decidir onde olhar primeiro.

É uma tela **só de consulta**. Nada é alterado a partir dela; as providências são tomadas nas telas de esteira, planejamento, apontamento e cadastro.

Dois cuidados valem desde já e são detalhados adiante:

- **a carga vem da alocação na estrutura das esteiras, não do planejamento publicado.** Ela soma todas as atividades em aberto em que a pessoa está alocada, sem olhar datas nem a semana planejada;
- **"sobrecarga" aqui não é a mesma do planejamento.** No Planejamento e na Agenda da semana, sobrecarga é o planejado de **um dia** passar da capacidade daquele dia (capítulos 8 e 9). Aqui, é o total em aberto passar da capacidade de **todo o período** escolhido.

| Você quer… | Use |
|---|---|
| ver quem tem trabalho em aberto acima da capacidade ou quem não está apontando | **Saúde operacional** (este capítulo) |
| ver se o dia de alguém foi planejado acima da capacidade | **Planejamento** e **Agenda da semana** (capítulos 8 e 9) |
| analisar previsto, realizado e cobertura de uma ou mais pessoas em um período | **Jornada por colaborador** (capítulo 12) |
| ajustar a capacidade de alguém | **Configurações operacionais → Capacidade operacional** (capítulo 16, seção 16.13) |

## Onde fica

No menu lateral, agrupamento **Cadastros operacionais** → **Saúde operacional**. A mesma tela abre pelo botão **Saúde operacional**, no topo da tela **Colaboradores** (capítulo 16).

O título exibido é **Saúde operacional dos colaboradores**, com a etiqueta **Gestão** acima. Logo abaixo, duas linhas de apoio dizem que a tela traz carga pendente, capacidade e apontamentos recentes, e uma faixa avisa: *"Regras determinísticas do SGP — sem julgamento de desempenho individual. Use os sinais para priorização operacional."*

A tela é organizada de cima para baixo:

1. o cabeçalho, com os botões **Voltar a colaboradores** e **Atualizar**;
2. o quadro de filtros, com a linha que informa o limite de colaboradores;
3. seis **cartões de resumo**;
4. a **tabela**, com uma linha por colaborador e o link **Ver detalhe**;
5. o **painel de detalhe**, que abre à direita quando você pede o detalhe de alguém.

Os dados carregam sozinhos ao abrir a tela.

[IMAGEM SUGERIDA: Tela Saúde operacional dos colaboradores — quadro de filtros com Janela (dias), Incluir colaboradores inativos, Busca local e Estado operacional; os seis cartões de resumo; as primeiras linhas da tabela com as colunas Estado, Risco, Carga pendente, Uso e Sinais]

## Quem costuma ter acesso

A tela exige a permissão **Colaboradores admin: consultar** — a mesma que libera **Colaboradores** e **Jornada por colaborador** (capítulo 4, seção 4.3). Na configuração padrão, ela está com os perfis **Administrador** e **Gestor**. Contas com o perfil **Colaborador** não têm acesso.

| Situação | O que acontece |
|---|---|
| sem a permissão | o item **não aparece** no menu — nem o item **Colaboradores**, onde fica o atalho, porque as duas telas exigem a mesma permissão. Pelo endereço direto, a tela mostra **"Sem permissão para esta área"** e *"Não tem permissão para acessar este conteúdo. Contate um administrador se precisar de acesso."* |
| com a permissão | a tela abre e o diagnóstico carrega |

Nenhuma outra permissão muda a tela: quem a abre vê todos os números, e não há ação a liberar. Também não é preciso que a sua conta esteja vinculada a um colaborador.

## Como fazer

### 18.1 Abrir e atualizar o diagnóstico

1. Abra **Cadastros operacionais → Saúde operacional**. Enquanto os dados são buscados, aparece **"Carregando saúde operacional…"**.
2. Leia os cartões de resumo (18.3) para ter a visão do conjunto.
3. Na tabela, localize quem está em **Crítico** e em **Atenção** (18.4 e 18.7). Para ver só essas pessoas, use o filtro **Estado operacional** (18.2).
4. Para conferir os números de alguém, clique em **Ver detalhe** (18.5).

Os números são uma **fotografia do momento da busca**. A tela não se atualiza sozinha: para buscar de novo, clique em **Atualizar**. Durante a busca, o botão fica desativado e a área dos cartões e da tabela volta a mostrar **"Carregando saúde operacional…"**.

**Voltar a colaboradores** leva à tela **Colaboradores** (capítulo 16).

### 18.2 Escolher a janela e filtrar a lista

O quadro de filtros tem quatro campos:

| Campo | O que faz | Busca os dados de novo? |
|---|---|---|
| **Janela (dias)** | o período analisado: **7 dias** (padrão), **15 dias** ou **30 dias**, terminando hoje. Muda a capacidade considerada e os apontamentos que contam (18.6) | sim |
| **Incluir colaboradores inativos** | desmarcado (padrão), analisa só colaboradores ativos; marcado, inclui também os inativos. Colaboradores removidos nunca aparecem | sim |
| **Busca local (nome ou código)** | filtra a lista já carregada pelo nome ou pelo código do colaborador, enquanto você digita. Maiúsculas e minúsculas não importam, mas os acentos sim: "joao" não encontra "João" | não |
| **Estado operacional** | **Todos** (padrão), **Crítico**, **Atenção**, **Saudável** ou **Sem dados suficientes (estado)** | não |

Os dois filtros que não buscam de novo só escondem linhas da tabela. **Os cartões de resumo não mudam com eles**: continuam contando todas as pessoas carregadas.

Abaixo dos campos, a linha **"Limite atual: 50 colaboradores por pedido."** informa o teto da análise. Quando existem mais colaboradores do que isso, aparece também *"Existem mais colaboradores para além dos exibidos. Refine os filtros locais ou aguarde evoluções de listagem."*

> **Atenção ao limite de 50.** A tela analisa somente os **50 primeiros colaboradores em ordem alfabética de nome**. Quem vem depois não entra na tabela nem nos cartões, e os filtros locais não o trazem de volta: eles só filtram o que já foi carregado, apesar do que sugere a mensagem. Marcar **Incluir colaboradores inativos** faz os inativos ocuparem parte dessas 50 vagas. Em operações com mais de 50 pessoas, deixe essa opção desmarcada e lembre-se de que o diagnóstico não cobre todo mundo.

As escolhas não ficam guardadas: ao sair e voltar, a tela abre de novo com **7 dias**, sem inativos e sem filtros.

### 18.3 Ler os cartões de resumo

| Cartão | O que conta, entre as pessoas carregadas |
|---|---|
| **Colaboradores analisados** | quantas pessoas entraram na análise — no máximo 50 |
| **Sobrecarga** | pessoas com carga pendente acima da capacidade da janela. **Quem está em sobrecarga crítica é contado duas vezes** — veja o aviso abaixo |
| **Baixa ocupação** | pessoas com atividades em aberto e carga pendente que apontaram, na janela, menos de 15% da capacidade da janela |
| **Sem apontamento recente** | pessoas sem nenhum apontamento na janela — **inclusive quem não tem nenhuma atividade em aberto** |
| **Sem etapas abertas** | pessoas sem nenhuma atividade em aberto alocada |
| **Carga via time** | pessoas com pelo menos uma atividade em aberto que chega a elas por meio de uma equipe |

> **O cartão Sobrecarga conta em dobro quem está em sobrecarga crítica.** Ele soma as pessoas acima da capacidade com as pessoas acima do dobro da capacidade — e quem está acima do dobro também está acima da capacidade. Com três pessoas acima da capacidade, uma delas acima do dobro, o cartão mostra **4**. Para saber quantas pessoas estão de fato em sobrecarga, filtre **Estado operacional** em **Crítico** e conte as linhas: na prática, só a sobrecarga leva ao estado **Crítico** (18.7).

Os cartões não são clicáveis.

### 18.4 Ler a tabela

A tabela traz uma linha por colaborador, em **ordem alfabética de nome**. Não é possível reordenar por outra coluna.

| Coluna | O que mostra |
|---|---|
| **Colaborador** | o nome e, abaixo, o código (**Cód.**) e o setor, quando existem |
| **Estado** | **Saudável**, **Atenção**, **Crítico** ou **Sem dados suficientes**, em selo verde, amarelo, vermelho ou cinza (18.7) |
| **Risco** | **Baixo**, **Médio**, **Alto**, **Crítico** ou **Indefinido** (18.7) |
| **Carga pendente** | o tempo que ainda falta nas atividades em aberto da pessoa (18.6) |
| **Capacidade da janela** | a capacidade diária multiplicada pelos dias da janela |
| **Uso** | a carga pendente dividida pela capacidade da janela, em percentual. A partir de 999%, aparece **999%+** |
| **Etapas abertas** | quantas atividades em aberto a pessoa tem |
| **Apontamentos recentes** | o tempo apontado na janela e a quantidade de registros, por exemplo **12h30 · 9 reg.** |
| **Último apontamento** | **hoje**, **há 1 dia**, **há N dias** ou **sem registro na janela** |
| **Sinais** | até **dois** sinais, os mais graves primeiro; os demais aparecem resumidos como **+N** (18.8 a 18.10). Sem nenhum sinal, aparece um traço |
| **Detalhe** | o link **Ver detalhe** (18.5) |

Os tempos aparecem em horas e minutos, como **8h**, **1h30** ou **0h**.

Sobre a coluna **Sinais**:

- a cor indica a gravidade: **vermelho** para crítico, **amarelo** para alerta e **cinza** para informação. Os vermelhos vêm primeiro, depois os amarelos e, por fim, os cinzas;
- passar o mouse sobre um sinal mostra o texto completo do sistema, que usa alguns termos técnicos (veja "Rótulos técnicos que aparecem na tela");
- o resumo **+N** não abre lista nem dica, e o painel de detalhe também não mostra os sinais. Um sinal importante pode ficar escondido atrás de outros do mesmo nível — por exemplo, **Pendência acima da capacidade da janela** atrás de **Capacidade por fallback** e **Sem apontamento recente com etapas abertas**. Por isso, **confira sempre as colunas Uso e Último apontamento**, que mostram a mesma informação em números.

Quando nenhuma pessoa atende aos filtros, aparece *"Não há colaboradores para exibir com os filtros atuais."*.

### 18.5 Abrir o detalhe de um colaborador

1. Na linha da pessoa, clique em **Ver detalhe**.
2. O painel **Saúde operacional** abre à direita, com o nome da pessoa e uma linha com o código, **Ativo** ou **Inativo**, a data de **Referência** — no formato ano-mês-dia — e a **Janela** em dias.
3. Para fechar, clique em **Fechar** ou fora do painel.

O painel tem quatro blocos:

| Bloco | Linhas |
|---|---|
| **Capacidade** | **Capacidade diária**; **Capacidade da janela**; **Fonte** — **Capacidade específica** (ajuste individual), **Capacidade padrão** ou **Fallback operacional** (as 8 horas que o sistema assume) |
| **Carga** | **Etapas abertas**; **Carga planejada (aberta)** — o tempo previsto total das atividades em aberto; **Pendência estimada (aberta)** — a carga pendente; **Realizado pelo colaborador (nessas etapas)** — o que a própria pessoa já apontou nessas atividades, em qualquer data |
| **Apontamentos recentes** | **Quantidade** de registros na janela; **Total de minutos** — apesar do nome, mostrado em horas e minutos; **Último apontamento**, com a data no formato dia/mês/ano, ou um traço; **Recência face à data de referência** — o mesmo **hoje**, **há N dias** ou **sem registro na janela** da tabela |
| **Qualidade dos dados** | os avisos que pedem cuidado na leitura (18.10), ou *"Sem avisos adicionais."* |

No fim do painel aparece sempre *"Interpretação automática ainda não habilitada para saúde do colaborador."*. É um aviso fixo: não há nada a fazer.

Observações:

- o painel **não mostra o estado, o risco nem os sinais**. Leia-os na linha da tabela;
- os números do painel são buscados de novo ao abrir. Se alguém apontou ou mudou alocações desde a última busca da tabela, os dois podem diferir — clique em **Atualizar** para alinhar;
- a pendência de cada atividade nunca fica negativa. Se a pessoa já apontou mais do que o previsto em alguma atividade, aquela atividade conta zero — por isso **Carga planejada** menos **Realizado** pode não bater com **Pendência estimada**.

[IMAGEM SUGERIDA: Painel de detalhe aberto à direita, com os blocos Capacidade, Carga, Apontamentos recentes e Qualidade dos dados e o aviso fixo no rodapé]

### 18.6 O que o diagnóstico considera

| Elemento | O que entra | O que fica de fora |
|---|---|---|
| **Pessoas** | colaboradores ativos, em ordem alfabética, até 50; com **Incluir colaboradores inativos**, também os inativos | colaboradores removidos; quem passa do limite de 50 |
| **Atividades em aberto** — na tela, **etapas abertas** | as atividades em que a pessoa está **alocada na estrutura** da esteira — como responsável principal, como apoio ou por meio de uma equipe de que é membro ativo — e que **não estão concluídas**. Entram esteiras de **qualquer situação** | atividades **concluídas**, atividades removidas da estrutura e esteiras excluídas |
| **Carga planejada** | o tempo por unidade × a quantidade prevista de cada atividade em aberto (capítulo 6, seção 6.7) | — |
| **Realizado pelo colaborador** | os apontamentos **da própria pessoa** nessas atividades, de **qualquer data** | o que outras pessoas apontaram na mesma atividade |
| **Carga pendente** | para cada atividade, o previsto menos o realizado pela pessoa, nunca abaixo de zero; depois, a soma de todas | — |
| **Capacidade diária** | a capacidade válida **hoje**, pela regra do capítulo 16, seção 16.13: ajuste individual, capacidade padrão ou, sem os dois, 8 horas | a variação dentro da janela: um ajuste que começa ou termina no meio do período não é considerado dia a dia — vale, para todos os dias, a capacidade de hoje |
| **Capacidade da janela** | a capacidade diária × os dias da janela, contando **todos os dias corridos** — sábados, domingos e feriados inclusive | — |
| **Apontamentos recentes** | os apontamentos da pessoa em atividades de esteira cuja **data de realização** cai na janela — inclusive os feitos pelo Modo Fábrica e os de atividades em que ela não está alocada | **Extra Esteira** e apontamentos removidos |

Três consequências práticas:

- **a janela não muda a carga pendente.** Ela é sempre o total em aberto. O que muda com a janela é a capacidade e o tempo apontado considerados. Por isso, ao passar de 7 para 30 dias, o **Uso** cai e menos pessoas aparecem em sobrecarga, sem que nada tenha mudado na operação;
- **a capacidade da janela conta dias sem expediente.** Com 8 horas por dia, a janela de 7 dias vale 56 horas, e não as 40 de uma semana de cinco dias;
- **a carga não depende do planejamento.** Distribuir, retirar ou publicar atividades no Planejamento e na Agenda da semana não muda nada aqui. O que muda a carga é, por exemplo, alocar a pessoa em uma atividade ou retirá-la da alocação, concluir a atividade, apontar ou alterar o tempo previsto.

Para uma capacidade de 8 horas por dia, os limites ficam assim:

| Janela | Capacidade da janela | Atenção, acima de | Sobrecarga, acima de | Sobrecarga crítica, acima de | Baixa ocupação, apontado abaixo de |
|---|---|---|---|---|---|
| **7 dias** | 56h | 42h | 56h | 112h | 8h24 |
| **15 dias** | 120h | 90h | 120h | 240h | 18h |
| **30 dias** | 240h | 180h | 240h | 480h | 36h |

### 18.7 Os estados e o risco

O **estado** resume a situação da pessoa; o **risco** gradua essa situação. Os dois são calculados juntos:

| Estado | Risco | Quando aparece |
|---|---|---|
| **Crítico** | **Crítico** | carga pendente acima do **dobro** da capacidade da janela — **sobrecarga crítica** |
| **Crítico** | **Alto** | carga pendente acima da capacidade da janela, até o dobro — **sobrecarga** |
| **Atenção** | **Médio** | carga pendente acima de **75%** da capacidade da janela, até 100% |
| **Atenção** | **Alto** | o mesmo caso anterior, para um colaborador **inativo** |
| **Atenção** | **Médio** | carga até 75%, mas o colaborador está **inativo** |
| **Atenção** | **Médio** | carga até 75%, atividades em aberto **sem nenhum apontamento na janela** e capacidade pelas **8 horas assumidas** pelo sistema, sem capacidade padrão nem ajuste individual |
| **Saudável** | **Baixo** | nenhum dos casos acima |
| **Sem dados suficientes** | **Indefinido** | reservado para quando não há capacidade para comparar. **Na prática não aparece**: o sistema sempre encontra uma capacidade para a pessoa, nem que seja a de 8 horas |

Como ler:

- **só a sobrecarga leva a Crítico.** Para diferenciar os dois níveis, olhe o **Risco**: **Alto** é sobrecarga; **Crítico** é sobrecarga crítica;
- **ficar sem apontar não muda o estado sozinho.** Quem tem atividades em aberto e nenhum apontamento na janela recebe o sinal amarelo **Sem apontamento recente com etapas abertas**, mas continua **Saudável** se a carga estiver até 75% — exceto no caso da capacidade assumida de 8 horas, na tabela acima;
- **colaborador inativo nunca aparece como Saudável**, mesmo sem carga;
- o percentual de **Uso** é arredondado. Perto dos limites — 75%, 100% e 200% —, confie no **Estado** e no **Risco**.

A opção **Sem dados suficientes (estado)** do filtro **Estado operacional** existe, mas, pelo motivo acima, tende a não trazer ninguém.

### 18.8 Sobrecarga e sobrecarga crítica

Nesta tela, **sobrecarga** é ter, em aberto, mais trabalho do que cabe na capacidade de **todo o período** escolhido. Com a janela de 7 dias, a pessoa está em sobrecarga quando a carga pendente passa do que ela faria em 7 dias corridos; em **sobrecarga crítica**, quando passa do dobro — mais do que caberia em 14 dias.

| Nível | Regra | Sinal na tabela | Estado e risco |
|---|---|---|---|
| **Sobrecarga** | carga pendente acima de 100% da capacidade da janela | **Pendência acima da capacidade da janela**, amarelo | Crítico, risco Alto |
| **Sobrecarga crítica** | carga pendente acima de 200% da capacidade da janela | **Pendência acima do dobro da capacidade da janela**, vermelho | Crítico, risco Crítico |

A pessoa recebe um sinal ou o outro, nunca os dois. Entre 75% e 100% não há sinal de carga: a indicação é o estado **Atenção**.

> **Não confunda com a sobrecarga do planejamento.** No Glossário (capítulo 20), sobrecarga é o planejado para o colaborador passar da capacidade dele — e é isso que o **Planejamento**, a **Agenda da semana** e a **Minha fila** avisam, **dia a dia**. Aqui a comparação é entre **todo o trabalho em aberto** e a capacidade de **vários dias**, sem olhar o planejamento. Uma pessoa pode estar em sobrecarga aqui e ter todos os dias da semana dentro da capacidade no planejamento — e o contrário também.

A carga pode parecer maior do que a real por motivos que a tela não mostra. Antes de concluir que alguém está sobrecarregado, confira "Atividades que continuam contando como abertas" e "Atividade compartilhada pesa inteira para cada pessoa", em **O que esperar**.

### 18.9 Falta de apontamento recente e baixa ocupação

Dois sinais olham para o tempo apontado na janela:

| Sinal | Quando aparece | Cor |
|---|---|---|
| **Sem apontamento recente com etapas abertas** | a pessoa tem atividades em aberto e **nenhum** apontamento na janela | amarelo |
| **Sinal de baixa ocupação recente** | a pessoa tem atividades em aberto com carga pendente e apontou, na janela, **menos de 15%** da capacidade da janela | cinza |

Os dois podem aparecer juntos: quem não apontou nada também apontou menos de 15%.

Conta como apontamento o registro em atividade de esteira, feito em **Apontar horas** (capítulo 7) ou no **Modo Fábrica** (capítulo 13), pela data de realização do trabalho. **Extra Esteira não conta**: quem passou a janela em apoio, limpeza ou deslocamento aparece sem apontamento recente ou com baixa ocupação, mesmo tendo registrado o tempo.

Os cartões correspondentes têm alcance um pouco diferente dos sinais:

- **Sem apontamento recente** conta **todas** as pessoas sem apontamento na janela, inclusive as que não têm atividade em aberto. O sinal só aparece para quem tem atividade em aberto;
- **Baixa ocupação** usa exatamente a regra do sinal.

A coluna **Último apontamento** mostra há quantos dias foi o apontamento mais recente **dentro da janela**. Se o último registro da pessoa é mais antigo do que a janela, aparece **sem registro na janela** — a tela não informa quando ele foi.

### 18.10 Os sinais de qualidade dos dados

Quatro sinais não falam de carga nem de apontamento: avisam que algum dado pede cuidado na leitura. Eles aparecem também, com outro texto, no bloco **Qualidade dos dados** do painel de detalhe.

| Sinal na tabela | Cor | Texto no painel de detalhe | O que significa |
|---|---|---|---|
| **Capacidade por fallback** | amarelo | *"A capacidade foi estimada por fallback operacional."* | não há capacidade padrão nem ajuste individual válido hoje; o sistema assumiu **8 horas** por dia (capítulo 16, seção 16.13) |
| **Colaborador inativo** | amarelo | *"O colaborador está inativo."* | só aparece com **Incluir colaboradores inativos** marcado |
| **Carga via time** | cinza | *"A carga inclui etapas atribuídas a times dos quais o colaborador participa."* | parte da carga vem de atividades alocadas a uma equipe de que a pessoa é membro ativo |
| **Sem etapas abertas** | cinza | *"Nenhuma etapa aberta foi encontrada para este colaborador."* | a pessoa não tem nenhuma atividade em aberto alocada |

### 18.11 O que fazer diante de cada sinal

A Saúde operacional não altera nada: ela indica onde olhar. As providências são tomadas em outras telas, cada uma com as suas permissões e regras.

| Sinal ou estado | O que verificar primeiro | Onde agir |
|---|---|---|
| **Pendência acima do dobro da capacidade da janela** ou **Pendência acima da capacidade da janela** | se as atividades em aberto ainda são trabalho da pessoa: atividades já executadas e não concluídas, alocações em esteiras finalizadas ou canceladas, atividades dispensadas, alocações por equipe | concluir o que já foi feito (capítulo 6, seção 6.16); retirar ou trocar a alocação na estrutura (capítulo 6, seções 6.6 e 6.10); redistribuir o trabalho da semana (capítulos 8 e 9), o que alivia o dia a dia, mas não muda os números desta tela |
| estado **Atenção** por carga | se o trabalho em aberto vai se concentrar nos próximos dias | acompanhar no **Planejamento** e na **Agenda da semana** (capítulos 8 e 9) |
| **Sem apontamento recente com etapas abertas** | se a pessoa trabalhou e não apontou, esteve ausente, trabalhou só em Extra Esteira ou tem alocações que não correspondem mais ao trabalho real | orientar o apontamento (capítulos 7 e 13); corrigir apontamentos (capítulo 7); revisar as alocações (capítulo 6) |
| **Sinal de baixa ocupação recente** | as mesmas causas do sinal anterior, com algum apontamento registrado | os mesmos caminhos do sinal anterior |
| **Capacidade por fallback** | se a capacidade padrão foi configurada | **Configurações operacionais → Capacidade operacional** (capítulo 16, seção 16.13) |
| **Carga via time** | se a pessoa de fato executa as atividades da equipe | rever a alocação da equipe na estrutura ou os membros da equipe (capítulos 6 e 16) |
| **Colaborador inativo** com atividades em aberto | se essas atividades precisam passar para outra pessoa — colaborador inativo não recebe novas alocações nem entra no Modo Fábrica | trocar a alocação na estrutura (capítulo 6) |
| **Sem etapas abertas** | se a pessoa deveria ter trabalho alocado | alocar na estrutura da esteira (capítulo 6) e planejar (capítulos 8 e 9) |

Para ver em quais atividades a pessoa está alocada, use a lista **Em aberto** da **Jornada por colaborador** (capítulo 12). Ela mostra apenas as alocações **diretas** em esteiras que não estão finalizadas nem canceladas; as alocações por equipe e as de esteiras encerradas, que aqui continuam somando, só aparecem no detalhe de cada esteira (capítulo 6).

> **Dispensar não tira a atividade desta conta.** Hoje, atividade dispensada continua somando na carga pendente (veja **O que esperar**). Concluir a atividade ou retirar a pessoa da alocação a tiram da conta; dispensar, não.

## O que esperar

### Atividades que continuam contando como abertas

Na conta da carga, só a atividade **concluída** sai. Enquanto a pessoa estiver alocada, continuam somando:

- **atividades dispensadas**, embora não aceitem mais apontamento (capítulo 6, seção 6.18);
- atividades de esteiras **finalizadas** ou **canceladas** que não foram concluídas uma a uma. Finalizar ou cancelar a esteira não conclui as atividades (capítulo 6, seção 6.14);
- atividades de esteiras ainda em **Rascunho / Em elaboração**, que nem foram liberadas para a fábrica;
- atividades alocadas a uma equipe que foi **inativada** ou **removida**, para os membros que ela tinha.

Em operações com esteiras antigas encerradas sem concluir as atividades, a carga pendente de quem trabalhou nelas pode ficar muito acima da real.

### Atividade compartilhada pesa inteira para cada pessoa

Quando duas pessoas — ou uma equipe inteira — estão alocadas na mesma atividade, **cada uma** recebe o tempo previsto inteiro da atividade como carga, e só o que ela mesma apontou é descontado. Uma atividade de 10 horas com duas pessoas alocadas soma 10 horas para cada uma; se uma delas apontar 6 horas, a carga da outra continua em 10 horas.

### Os dias seguem o horário universal

A data de referência — a **Referência** do painel de detalhe — é o dia de hoje pelo **horário universal**, três horas à frente do horário de Brasília. No restante do sistema, os apontamentos são datados pela referência de São Paulo (capítulo 7). Na prática:

- entre **21h e meia-noite**, horário de Brasília, a tela já considera o dia seguinte como hoje: a janela avança um dia e a contagem de **Último apontamento** muda;
- um apontamento feito depois das 21h, horário de Brasília, para o próprio dia entra na conta como do dia seguinte. Apontamentos lançados para dias anteriores não são afetados.

### Números que não batem com outras telas

| Tela | Por que difere |
|---|---|
| **Planejamento**, **Agenda da semana** e **Minha fila** (capítulos 8 a 10) | comparam o planejado de **um dia** com a capacidade daquele dia; aqui é todo o trabalho em aberto contra a capacidade da janela |
| **Dashboard**, coluna **Previsto vs capacidade diária** (capítulo 15) | compara o previsto de todas as alocações diretas, inclusive de atividades concluídas, com a capacidade de um único dia, sem descontar o que foi apontado |
| **Jornada por colaborador** (capítulo 12) | considera só alocações diretas e, no previsto, uma unidade de cada atividade, inclusive das concluídas; aqui entram as alocações por equipe e a quantidade prevista inteira, e só as atividades não concluídas |

### Rótulos técnicos que aparecem na tela

Alguns rótulos e dicas ainda usam termos internos. Leia assim:

| Na tela | Leia como |
|---|---|
| **"etapas"**, em **Etapas abertas**, **Sem etapas abertas** e nos textos de apoio | atividades |
| **"STEPs"**, no texto que aparece ao passar o mouse sobre os sinais | atividades |
| **"fallback"**, em **Capacidade por fallback**, **Fallback operacional** e nos textos de apoio | as 8 horas por dia que o sistema assume quando não há capacidade padrão nem ajuste individual |
| **"default global"** e **"override"**, no texto do sinal de capacidade | capacidade padrão e ajuste individual |
| **"time"**, **"membership de equipe"** e **"membership de time"**, em **Carga via time** e nos textos de apoio | equipe e participação como membro da equipe |
| **"snapshot"**, no texto do sinal **Sem etapas abertas** | o cálculo feito no momento da busca |
| **"Regras determinísticas"**, no topo da tela | regras fixas de cálculo, iguais para todos |
| **"capacidade agregada na janela (minutos)"**, nos textos de sobrecarga | capacidade da janela |
| **"Total de minutos"**, no painel de detalhe | tempo total apontado na janela, exibido em horas e minutos |
| **"Recência face à data de referência"**, no painel de detalhe | há quantos dias foi o último apontamento dentro da janela |

## Quando algo é bloqueado

### Falta de permissão

Sem **Colaboradores admin: consultar**, o item não aparece no menu e o endereço direto mostra **"Sem permissão para esta área"**. Peça a liberação a quem administra os acessos (capítulo 4, seção 4.6).

### Enquanto os dados carregam

A área dos cartões e da tabela mostra **"Carregando saúde operacional…"**. Os filtros continuam acessíveis; mudar a janela ou a opção de inativos reinicia a busca. No painel de detalhe, o título mostra **Carregando…** até os números chegarem.

### Quando não há dados

| O que aparece | Quando aparece | O que fazer |
|---|---|---|
| *"Não há colaboradores para exibir com os filtros atuais."* | nenhuma pessoa atende à **Busca local** ou ao **Estado operacional** escolhido; ou não há colaborador ativo cadastrado | apagar a busca, voltar o estado para **Todos** e, se for o caso, marcar **Incluir colaboradores inativos** |
| um traço na coluna **Sinais** | a pessoa não tem nenhum sinal | nada: é o resultado esperado de quem está em dia |
| *"Sem avisos adicionais."*, no painel | não há aviso de qualidade dos dados para a pessoa | nada |

### Quando a consulta falha

| O que aparece | Causa | O que fazer |
|---|---|---|
| janela **Não foi possível carregar a saúde operacional**, com *"Ocorreu um problema ao obter o resumo. Tente novamente em instantes ou confirme a sua sessão."* e o botão **Entendi**. Pode vir acompanhada de um **Código de suporte** | falha de comunicação, sessão expirada ou indisponibilidade do serviço | clicar em **Entendi** e depois em **Atualizar**; se a sessão expirou, entrar de novo; persistindo, abrir chamado com o texto e o código exibidos |
| faixa vermelha *"Não foi possível carregar a saúde operacional dos colaboradores. Tente atualizar a página ou verificar sua conexão."* | outras falhas na busca | clicar em **Atualizar** ou recarregar a página |
| *"Não foi possível carregar o detalhe deste colaborador."*, dentro do painel | falha ao buscar o detalhe | fechar o painel e clicar de novo em **Ver detalhe** |

Atenção a um comportamento da primeira situação: depois de **Entendi**, a área abaixo dos filtros fica **vazia** se era a primeira busca, ou volta a mostrar os **números da busca anterior** se a falha aconteceu em **Atualizar**. Nesse segundo caso, os números **não foram atualizados**, embora nada indique isso. Clique em **Atualizar** de novo ou recarregue a página.

### Ações que não existem nesta tela

| Limitação | Como proceder |
|---|---|
| analisar mais de 50 colaboradores | não há paginação nem filtro que traga os demais. Deixe **Incluir colaboradores inativos** desmarcado; para quem fica de fora, use a **Jornada por colaborador** e o **Planejamento** (capítulos 8 e 12), sabendo que as contas são diferentes |
| filtrar por setor | não há esse filtro. O setor aparece na coluna **Colaborador**, mas a busca local procura só nome e código |
| escolher outra data de referência ou um período livre | só **7**, **15** ou **30 dias**, sempre terminando hoje |
| ordenar a tabela | a ordem é alfabética e fixa. Use **Estado operacional** para separar os casos |
| ver as atividades da pessoa ou ir da linha para o cadastro dela | não há lista nem link na tela. Use a **Jornada por colaborador** (capítulo 12), o detalhe das esteiras (capítulo 6) e a tela **Colaboradores** (capítulo 16) |
| ver todos os sinais de uma linha | o resumo **+N** não abre. Confira as colunas **Uso** e **Último apontamento** e o painel de detalhe |
| acompanhar a evolução ao longo do tempo | cada busca é uma fotografia; a tela não guarda o histórico dos estados |
| exportar ou imprimir | não há exportação nem impressão |
| alterar capacidade, alocação ou apontamento | não há ações nesta tela. Use os capítulos 6, 7 e 16 |
| ver a interpretação automática citada no painel | ainda não existe; o aviso é fixo |

---

# 19. Mensagens, bloqueios e como agir

## Para que serve

Este capítulo é o ponto de partida quando o SGP+ recusa algo, mostra um aviso que você não reconhece ou não faz o que você esperava. Ele ajuda a responder três perguntas:

- **o que o sistema está dizendo?** — reconhecer o tipo de aviso e o que ele indica;
- **é falha ou é regra?** — separar bloqueio de operação, bloqueio de acesso e falha de comunicação;
- **o que fazer agora?** — resolver você mesmo, pedir a alguém da operação ou registrar um **chamado** de suporte.

Cada capítulo de recurso já traz, no bloco **Quando algo é bloqueado**, as mensagens próprias daquela tela. Este capítulo **não repete** essas listas: ele reúne as situações que aparecem em várias telas, explica as regras de bloqueio que valem para o sistema inteiro e indica onde está o detalhe. A única tela descrita por completo aqui é a de **chamados**.

| Você quer… | Vá para |
|---|---|
| entender uma janela de aviso que apareceu em qualquer tela | seção 19.1 |
| achar rapidamente o que fazer diante de uma mensagem | seção 19.2 |
| saber por que o apontamento foi recusado pela situação da esteira | seção 19.3 |
| entender o pedido de justificativa por sequência ou por tempo acima do previsto | seção 19.4 |
| resolver um problema para entrar ou para continuar conectado | seção 19.5 |
| decidir se cabe um chamado, abri-lo e acompanhá-lo | seções 19.6 a 19.9 |

## Onde fica

Não existe uma tela de mensagens: cada aviso aparece na tela em que você está.

| O que você procura | Onde está |
|---|---|
| as mensagens de uma tela específica | bloco **Quando algo é bloqueado** do capítulo daquela tela |
| abrir um chamado | botão **Abrir chamado**, na barra superior, presente em todas as telas da área autenticada |
| consultar os chamados que você abriu | menu lateral, agrupamento **Colaborador** → **Chamados** |
| situações já conhecidas, telas sem entrada no menu e botões sem funcionamento | capítulo 21 |

O botão **Abrir chamado** e o item **Chamados** só existem quando o **módulo de chamados está ativo no seu ambiente** (capítulo 3, seções 3.3 e 3.4). Com o módulo desligado, nenhum dos dois aparece, e o endereço direto da tela de chamados leva ao **Painel operacional**.

O **Modo Fábrica** não tem botão de chamado, e a tela de entrada do sistema também não. Quem não consegue entrar não abre chamado pelo SGP+ (seção 19.6).

[IMAGEM SUGERIDA: Barra superior da área autenticada com o botão Abrir chamado destacado ao lado de Apontar horas, e o menu lateral aberto no agrupamento Colaborador mostrando o item Chamados]

## Quem costuma ter acesso

As mensagens deste capítulo aparecem para qualquer pessoa, conforme o que ela tenta fazer.

Abrir e consultar chamados **não depende de permissão**: qualquer conta que entre na área autenticada pode abrir chamado e ver os próprios chamados, inclusive com o perfil **Colaborador**. Também não é preciso que a conta esteja vinculada a um colaborador.

| Situação | O que acontece |
|---|---|
| módulo de chamados ativo | o botão **Abrir chamado** e o item **Chamados** aparecem para todos |
| módulo desligado no seu ambiente | nem o botão nem o item aparecem |
| botão visível, mas o serviço de chamados desligado | a janela de abertura recusa o envio com *"Módulo de suporte está desativado."*, e a tela **Chamados** mostra *"Não foi possível carregar os chamados. Tente novamente."*. É uma questão de configuração do ambiente: avise a administração do sistema por outro meio |

**Cada pessoa vê somente os chamados que ela mesma abriu.** Não há, no SGP+, tela em que a gestão ou a administração consulte os chamados de outras pessoas.

## Como fazer

### 19.1 Reconhecer o tipo de aviso

O SGP+ comunica recusas e falhas de seis formas. A forma já diz muito sobre a causa.

| Forma | Como aparece | O que costuma indicar |
|---|---|---|
| **mensagem no formulário** | texto curto junto ao campo ou ao botão, antes ou depois de confirmar | um dado faltando ou fora da regra |
| **botão desativado** | o botão de confirmar fica apagado | falta preencher algo obrigatório |
| **aviso rápido** | caixa no canto da tela que some sozinha após alguns segundos | confirmação de sucesso ou recusa simples |
| **faixa vermelha** | faixa no alto da tela ou do bloco | dado recusado, conflito com outra alteração ou falha ao carregar parte da tela |
| **janela de aviso** com o botão **Entendi** | precisa ser fechada para continuar | falta de permissão, sessão encerrada, falha de comunicação ou de serviço |
| tela **"Sem permissão para esta área"** | ocupa a área de conteúdo | você abriu uma tela que a sua permissão não libera (capítulo 4, seção 4.4) |

**Uma recusa não grava nada.** Quando o sistema recusa uma ação — por permissão ou por regra —, aquela ação não é gravada. Corrija o que a mensagem pede e envie de novo; não há nada a desfazer.

#### As janelas de aviso comuns a várias telas

Boa parte das telas usa o mesmo conjunto de janelas. O título indica a causa:

| Título da janela | Mensagem mais comum | Causa | O que fazer |
|---|---|---|---|
| **Sem permissão** | *"Você não tem permissão para esta operação. Peça acesso ao administrador se necessário."* | a sua permissão não cobre a ação, ou foi retirada com a tela aberta | recarregar a página; se continuar, seguir o capítulo 4, seção 4.6 |
| **Sessão inválida** | uma mensagem sobre a sessão, como *"Sessão expirada ou inválida. Faça login novamente."* | a sessão terminou ou deixou de valer | entrar de novo (seção 19.5) |
| **Operação não concluída** | *"O recurso solicitado não foi encontrado ou não existe mais."* | o registro foi excluído ou deixou de existir enquanto a tela estava aberta | recarregar a página e conferir |
| **Operação não concluída** | *"Serviço temporariamente indisponível. Tente novamente em instantes."* | o sistema não conseguiu processar o pedido | tentar de novo em instantes; persistindo, abrir chamado |
| **Não foi possível continuar**, com a linha **Sistema indisponível no momento** | *"Não foi possível comunicar com o sistema agora. Tente novamente em instantes. Se o problema continuar, abra um chamado."* | o navegador não conseguiu falar com o sistema: rede, conexão ou serviço fora do ar | conferir a conexão, esperar e tentar de novo; persistindo, abrir chamado |

Nem toda tela usa essas janelas: algumas mostram a mensagem dentro da própria tela, em texto próprio. O capítulo de cada recurso indica o caso.

**Código de suporte.** Algumas janelas trazem, abaixo da mensagem, a linha **Código de suporte:** seguida de um código iniciado por **SGP-** — por exemplo, nas falhas de comunicação, de serviço e de permissão. Ele não muda nada no uso; identifica o tipo de falha para quem dá suporte. Se for abrir chamado, **copie o código exatamente como aparece** para a descrição (seção 19.8).

[IMAGEM SUGERIDA: Janela "Não foi possível continuar" com a linha Sistema indisponível no momento, a mensagem de falha de comunicação, a linha Código de suporte e o botão Entendi]

### 19.2 Índice de mensagens por situação

Localize a situação e a mensagem. A última coluna diz onde a explicação completa está.

**Entrar e continuar conectado**

| Mensagem | Causa | O que fazer | Detalhe |
|---|---|---|---|
| *"E-mail ou senha inválidos."* | e-mail ou senha errados | revisar os dados; cada erro conta para o bloqueio temporário | 19.5 |
| *"Não foi possível entrar agora. Tente novamente mais tarde."* | bloqueio temporário por tentativas erradas | aguardar, ou pedir a redefinição da senha | 19.5 |
| *"Sua conta está inativa. Contacte o administrador."* | a conta foi inativada | pedir a reativação à administração | 19.5; capítulo 16, seção 16.10 |
| *"Senha atual incorreta."* | ao trocar a senha, a senha atual foi digitada errada | digitar de novo | 19.5 |
| janela **Sua sessão está prestes a expirar** | a sessão vai terminar por inatividade | **Continuar conectado** | 19.5 |
| *"Sua sessão expirou. Faça login novamente."* | a sessão terminou | entrar de novo | 19.5 |
| *"Sua sessão foi encerrada porque suas credenciais foram alteradas. Faça login novamente."* | a senha da conta mudou | entrar com a senha nova | 19.5 |

**Acesso a telas e ações**

| Mensagem | Causa | O que fazer | Detalhe |
|---|---|---|---|
| o item não aparece no menu | falta a permissão de consultar a tela | pedir a quem administra os acessos | capítulo 4, seções 4.4 e 4.6 |
| **"Sem permissão para esta área"** | a tela foi aberta sem a permissão | idem | capítulo 4, seção 4.4 |
| janela **Sem permissão** | a ação não é coberta pela sua permissão | idem | capítulo 4, seções 4.4 e 4.5 |
| **"Contexto operacional ausente"**, *"Sua conta não está associada a um colaborador operacional…"* ou *"Conta sem colaborador operacional associado. Contate o administrador."* | a conta não está vinculada a um colaborador | pedir o vínculo à administração | capítulo 7; capítulo 16, seção 16.9 |
| *"PIN não configurado. Solicite ao gestor."*, *"Acesso bloqueado. Solicite ao gestor."*, *"Acesso desabilitado."*, *"PIN inválido. Tente novamente."* | credencial do Modo Fábrica | seguir o capítulo 13 | capítulo 13 |

**Apontar e concluir atividades**

| Mensagem | Causa | O que fazer | Detalhe |
|---|---|---|---|
| *"Esta esteira ainda não foi liberada para produção."* e as demais mensagens sobre a situação da esteira | a esteira não está **A iniciar** nem **Em andamento** | falar com a gestão | 19.3 |
| *"Esta esteira não está liberada para conclusão operacional de atividades."* | idem, ao concluir | idem | 19.3 |
| *"Esta atividade já está concluída operacionalmente; não é possível novo apontamento."* | a atividade foi concluída | pedir a reabertura à gestão | 19.3; capítulo 6, seção 6.17 |
| *"Esta atividade foi dispensada; não é possível novo apontamento."* | a atividade foi dispensada | pedir a restauração à gestão | 19.3; capítulo 6, seção 6.19 |
| *"Informe uma justificativa para executar esta atividade fora da sequência recomendada."* | há atividade anterior pendente | informar a justificativa | 19.4 |
| *"Informe uma justificativa para apontar acima do tempo previsto da atividade."* | no Modo Fábrica, o tempo passa do planejado | informar a justificativa | 19.4 |
| aviso de que a atividade não está incluída na sequência operacional | a atividade não entra na sequência daquela esteira | falar com a gestão | 19.4 |
| *"Esta atividade não está no seu planejamento publicado ou não permite apontamento."* | no Modo Fábrica, a atividade saiu do seu planejamento | atualizar a fila e confirmar com a gestão | capítulo 13 |
| *"A data de realização não pode ser futura."* | data posterior a hoje | usar hoje ou data anterior | capítulos 7 e 13 |
| fila vazia, *"Nenhuma atividade disponível no momento."* | planejamento da semana não publicado, ou tudo concluído | confirmar com a gestão | capítulos 10 e 13 |

**Falhas de carregamento, gravação e comunicação**

| Mensagem | Causa | O que fazer | Detalhe |
|---|---|---|---|
| mensagens iniciadas por *"Não foi possível carregar…"*, *"Não foi possível salvar…"*, *"Não foi possível publicar…"* | falha momentânea ao buscar ou gravar | tentar de novo e recarregar a página; persistindo, abrir chamado | capítulo da tela |
| janelas **Operação não concluída** e **Não foi possível continuar** | falha de serviço ou de comunicação | idem | 19.1 |

### 19.3 Bloqueios de apontamento por situação da esteira

A **situação da esteira** decide se ela aceita trabalho. A regra é a mesma em **todos** os caminhos de apontamento — **Apontar horas**, página **Apontamento**, lançamento em nome de outro colaborador e **Modo Fábrica** — e vale também para **concluir** atividade.

| Situação da esteira | Aceita apontamento e conclusão? | Mensagem ao tentar apontar | Quem destrava |
|---|---|---|---|
| **Rascunho / Em elaboração** | não | *"Esta esteira ainda não foi liberada para produção."* | a gestão, avançando a esteira até **Liberar para produção** (capítulo 6, seção 6.12) |
| **Aguardando planejamento** | não | *"Esta esteira está em planejamento e ainda não permite apontamento."* | idem |
| **Em planejamento** | não | *"Esta esteira está em planejamento e ainda não permite apontamento."* | a gestão, com **Liberar para produção** |
| **A iniciar** | **sim** — o primeiro apontamento passa a esteira para **Em andamento** | — | — |
| **Em andamento** | **sim** | — | — |
| **Finalizada** | não | *"Esta esteira está finalizada e não permite novos apontamentos."* | pelo caminho normal, ninguém: a tela não oferece ação de situação em esteira finalizada (capítulo 6, seção 6.11). Fale com a gestão |
| **Cancelada** | não | *"Esta esteira está cancelada e não permite novos apontamentos."* | idem |

Ao **concluir** uma atividade em esteira fora de **A iniciar** e **Em andamento**, a mensagem é *"Esta esteira não está liberada para conclusão operacional de atividades."*.

Mesmo com a esteira aceitando apontamento, a **atividade** pode recusar:

| Situação da atividade | Mensagem | Quem destrava |
|---|---|---|
| **concluída** | *"Esta atividade já está concluída operacionalmente; não é possível novo apontamento."* | quem pode alterar esteiras, com **Reabrir atividade** (capítulo 6, seção 6.17) |
| **dispensada** | *"Esta atividade foi dispensada; não é possível novo apontamento."* | quem pode alterar esteiras, com **Restaurar** (capítulo 6, seção 6.19) |

Na prática:

- as listas de apontamento já escondem ou marcam o que não aceita registro — **Apontar horas** só lista atividades de esteiras **A iniciar** e **Em andamento** (capítulo 7), e o Modo Fábrica mostra o cartão como **Apontamento bloqueado para esta atividade** (capítulo 13). Se mesmo assim a recusa aparecer, a situação mudou depois que a tela foi carregada: atualize a tela e confira a esteira no detalhe (capítulo 6, seção 6.2);
- **Extra Esteira** não pertence a nenhuma esteira e por isso nunca é recusado pela situação da esteira;
- atividades **incluídas** em esteira **Finalizada** ou **Cancelada** também não aceitam apontamento — a inclusão é aceita, mas o trabalho fica impossível de registrar (capítulo 21).

### 19.4 Sequência e tempo acima do previsto: quando o sistema pede justificativa

Estes casos **não são bloqueios**: o sistema pede uma **justificativa** e, com ela, aceita o registro. A recusa só acontece quando a justificativa exigida não é informada. A justificativa é escolhida de uma lista mantida pela gestão (capítulo 16, seção 16.15); algumas opções pedem um **complemento**.

O comportamento muda conforme o caminho usado:

| Caso | **Apontar horas** (área autenticada) | **Totem** do Modo Fábrica | **Navegador da fábrica** |
|---|---|---|---|
| há **atividade anterior pendente** na sequência | pede justificativa quando a tela indica **Fora de sequência** (capítulo 7) | pede justificativa | pede justificativa |
| a atividade está **fora da sua alocação** ou do seu planejamento | pede justificativa (capítulo 7) | só por **+ Outra atividade**, sempre com justificativa (capítulo 13) | não é possível: não há **Outra atividade** |
| o tempo passa do **previsto** | **não há verificação**: nenhum aviso, nenhuma justificativa | pede justificativa, com a faixa **Tempo acima do previsto — confirme o apontamento** | **recusado sem campo para justificar** — veja abaixo |
| a atividade **não faz parte da sequência operacional** da esteira | recusado | recusado | recusado |

Em todos os caminhos, o apontamento **fora de sequência** fica marcado como exceção no histórico da esteira (capítulos 6 e 7).

#### Como o tempo acima do previsto é calculado no Modo Fábrica

A conta compara dois números que aparecem no próprio cartão da atividade:

- **Planejado** — o tempo planejado **para você** naquela atividade, no planejamento publicado;
- **Realizado** — tudo o que já foi apontado na atividade, **por qualquer pessoa**, somado aos minutos que você está registrando agora.

Se a soma passar do planejado, a justificativa é pedida. Consequências práticas:

- **em atividade compartilhada, o tempo dos colegas conta.** A justificativa pode ser pedida mesmo que você tenha apontado pouco;
- **sem tempo planejado para você** naquela atividade, a verificação não acontece;
- **concluir sem registrar tempo novo** não passa pela verificação.

#### No navegador da fábrica não há onde justificar o tempo acima do previsto

O registro de apontamento do **navegador da fábrica** mostra o campo de justificativa **somente** quando há atividade anterior pendente. Quando o único motivo é o tempo acima do previsto, o sistema recusa com *"Informe uma justificativa para apontar acima do tempo previsto da atividade."* e a tela **não oferece** onde informá-la.

**Como proceder:** registrar esse apontamento pelo **totem**, que tem o campo, ou pedir à gestão o lançamento em nome do colaborador (capítulo 7), que não faz essa verificação.

### 19.5 Bloqueios de acesso e credencial

#### Ao entrar no sistema

As mensagens da entrada aparecem em uma **janela de aviso**, e o título da janela nem sempre corresponde à causa. Oriente-se pela mensagem:

| Título da janela | Mensagem | Causa | O que fazer |
|---|---|---|---|
| **Sessão inválida** | *"E-mail ou senha inválidos."* | e-mail ou senha errados. O sistema não diz qual dos dois. Apesar do título, não há problema de sessão | revisar os dados com atenção: cada erro conta para o bloqueio temporário |
| **Sem permissão** | *"Não foi possível entrar agora. Tente novamente mais tarde."* | depois de várias tentativas erradas seguidas, a conta fica **bloqueada por um tempo** — tipicamente **5 tentativas** e **15 minutos**, conforme a configuração do ambiente. Durante o bloqueio, nem a senha correta entra | aguardar e tentar de novo, ou pedir à administração **Redefinir senha** (capítulo 16, seção 16.10), que retira o bloqueio na hora |
| **Sem permissão** | *"Sua conta está inativa. Contacte o administrador."* | a conta foi inativada | pedir à administração que a ative (capítulo 16, seção 16.10) |

Depois da entrada, se a conta estiver marcada para troca de senha, abre a tela **Alterar senha obrigatória** (capítulo 3, seção 3.1).

#### Ao trocar a senha

Vale para **Alterar senha** e para **Alterar senha obrigatória**:

| Mensagem | Causa | O que fazer |
|---|---|---|
| *"A nova senha deve ter pelo menos 8 caracteres."* | senha curta | escolher uma senha mais longa |
| *"A confirmação não coincide com a nova senha."* | os dois campos ficaram diferentes | digitar de novo |
| *"A nova senha deve ser diferente da senha atual."* | a nova senha é igual à atual | escolher outra |
| janela **Sessão inválida** com *"Senha atual incorreta."* | a senha atual foi digitada errada. Apesar do título, você continua conectado | fechar a janela e digitar de novo a senha atual |

Depois de trocar, você continua conectado no equipamento em que fez a troca. **Sessões abertas da mesma conta em outros equipamentos são encerradas** na ação seguinte delas (veja a tabela abaixo).

#### Durante o uso

| O que aparece | Causa | O que fazer |
|---|---|---|
| janela **Sua sessão está prestes a expirar**, com *"Por inatividade, sua sessão será encerrada em"* e um contador | o tempo sem uso está chegando ao limite definido pela administração (capítulo 3, seção 3.6) | **Continuar conectado** renova a sessão; **Sair agora** encerra |
| tela de entrada com *"Sua sessão expirou. Faça login novamente."* | a sessão terminou por inatividade ou atingiu o tempo máximo total | entrar de novo. O que já foi gravado continua gravado; o que estava digitado e não salvo precisa ser refeito |
| tela de entrada com *"Sua sessão foi encerrada porque suas credenciais foram alteradas. Faça login novamente."* | a senha da conta mudou: você a trocou em outro equipamento, ou a administração definiu ou redefiniu a senha (capítulo 16, seções 16.9 e 16.10) | entrar com a senha nova; se você não a conhece, pedir à administração |
| janela **Sessão inválida** com *"Sessão expirada ou inválida. Faça login novamente."* | a sessão deixou de valer — por exemplo, a conta foi removida | entrar de novo; se não conseguir, procurar a administração |

**O aviso de inatividade pode aparecer enquanto você usa o sistema.** O contador da janela é calculado a partir da sua entrada ou da última vez em que você clicou em **Continuar conectado** — não do seu último clique. Por isso, a janela pode surgir mesmo durante uso contínuo. Clique em **Continuar conectado** e siga normalmente. Se o contador chegar a zero, a janela some; a sessão só termina de fato se você realmente ficou sem usar o sistema pelo tempo definido, e isso se revela na ação seguinte, com a tela de entrada.

#### Permissão, vínculo e Modo Fábrica

- Para separar falta de permissão de outras causas — conta sem vínculo, conta inativa, troca de senha, regra de operação —, use a tabela **"Nem todo bloqueio é falta de permissão"** do capítulo 4, seção 4.4.
- Para o **Modo Fábrica** — PIN não configurado, bloqueio por tentativas, credencial desabilitada, sessão de produção expirada —, use o bloco **Quando algo é bloqueado** do capítulo 13.
- **A senha de acesso e o PIN do Modo Fábrica são independentes.** O bloqueio por tentativas em um não afeta o outro, e redefinir um não altera o outro.

### 19.6 Quando abrir um chamado

Abra chamado quando:

- uma falha **se repete** depois de tentar de novo e recarregar a página — mensagens iniciadas por *"Não foi possível…"*, janelas **Operação não concluída** ou **Não foi possível continuar**;
- a tela mostra um **Código de suporte** e o problema continua;
- o sistema se comporta de forma diferente da descrita neste manual, e a situação não consta do capítulo 21;
- ninguém na sua operação consegue resolver um problema de acesso — por exemplo, ninguém vê **Permissões por papel** (capítulo 4).

Antes de abrir, confira se não é uma destas situações, que se resolvem dentro da operação:

| Situação | Quem resolve |
|---|---|
| falta de permissão | quem administra os acessos (capítulo 4, seção 4.6) |
| conta sem vínculo com colaborador | administração, em **Usuários** (capítulo 16, seção 16.9) |
| conta inativa ou bloqueada por tentativas | administração, em **Usuários** (capítulo 16, seção 16.10) |
| PIN do Modo Fábrica | quem administra colaboradores (capítulo 16, seção 16.5) |
| recusa pela situação da esteira, por atividade concluída ou dispensada, ou pedido de justificativa | é regra de operação: gestão (seções 19.3 e 19.4) |
| fila vazia | planejamento da semana não publicado: gestão (capítulos 8 e 10) |
| botão sem funcionamento ou divergência já conhecida | capítulo 21 — não geram chamado |

**Sem acesso ao sistema não há como abrir chamado pelo SGP+.** O chamado só é aberto de dentro da área autenticada. Quem não consegue entrar, ou está no Modo Fábrica, precisa procurar a administração ou pedir a alguém com acesso que registre o chamado.

### 19.7 Abrir um chamado

1. **Vá para a tela em que o problema aconteceu.** O chamado registra sozinho o endereço da tela de onde foi aberto.
2. Clique em **Abrir chamado**, na barra superior. Abre a janela **Abrir chamado**.
3. Em **Categoria**, escolha o tipo do pedido (tabela abaixo). A janela abre com **Dúvida** selecionada.
4. Em **Assunto**, escreva um resumo de uma linha. O campo aceita até **160 caracteres** e para de receber texto nesse limite.
5. Em **Descrição**, conte o que aconteceu, seguindo a seção 19.8.
6. Marque **Isso está me impedindo de continuar** somente se você não consegue seguir com o trabalho sem a solução.
7. Clique em **Registrar chamado**. Durante o envio, o botão mostra **Enviando...**.
8. A janela se fecha e aparece **Chamado registrado com sucesso**, com o **Protocolo** — um código no formato **CHM-** seguido de números — e duas linhas sobre o aviso ao suporte, **E-mail** e **WhatsApp** (tabela abaixo).
9. **Anote o protocolo** e clique em **Fechar**. Ele também fica disponível na tela **Chamados** (seção 19.9).

Para desistir, clique em **Cancelar** ou fora da janela. Nada é registrado. O texto digitado continua na janela se você a abrir de novo, até recarregar a página ou sair do sistema.

**Categorias**

| Categoria | Quando usar |
|---|---|
| **Dúvida** | você não sabe como fazer algo, e este manual não respondeu |
| **Erro** | o sistema mostrou falha ou fez algo diferente do esperado |
| **Bloqueio operacional** | uma regra está impedindo o trabalho e você precisa de análise |
| **Solicitação de apoio** | você precisa de ajuda de outra pessoa para concluir uma tarefa |
| **Acesso/permissão** | problema de acesso que a sua operação não conseguiu resolver |

**Prioridade.** A janela não tem campo de prioridade. Ela é definida pela marcação **Isso está me impedindo de continuar**: marcada, o chamado nasce com severidade **Alta**; desmarcada, **Média**. Conforme a configuração do ambiente, os chamados de severidade **Alta** podem ser avisados a destinatários diferentes. A categoria não muda quem é avisado.

**As linhas de aviso da confirmação**

As linhas **E-mail** e **WhatsApp** mostram um código em inglês, que diz se o suporte foi avisado:

| Linha | Código | O que significa |
|---|---|---|
| **E-mail** | **SENT** | o aviso por e-mail foi enviado |
| **E-mail** | **FAILED** | o envio do e-mail falhou |
| **E-mail** | **SKIPPED** | nenhum e-mail foi enviado: o envio está desligado ou não há destinatário configurado no ambiente |
| **WhatsApp** | **SKIPPED** | nesta versão, o aviso por WhatsApp não é enviado. A linha mostra sempre este código |

**Se a linha E-mail não mostrar SENT, o chamado está gravado, mas ninguém foi avisado por ele.** Informe o protocolo a quem dá suporte na sua operação por outro meio.

[IMAGEM SUGERIDA: Janela Abrir chamado preenchida — Categoria, Assunto, Descrição com mensagem e Código de suporte copiados, a marcação Isso está me impedindo de continuar e os botões Cancelar e Registrar chamado]

[IMAGEM SUGERIDA: Janela Chamado registrado com sucesso mostrando o Protocolo e as linhas E-mail e WhatsApp]

### 19.8 O que informar no chamado

O chamado leva automaticamente a **sua conta** (e o colaborador vinculado a ela, se houver), a **categoria**, a **severidade**, o **assunto**, a **descrição**, a **data e hora** e o **endereço da tela** de onde foi aberto.

Ele **não** leva a mensagem que apareceu, o código de suporte, imagens nem anexos — não há como anexar arquivo. Tudo isso precisa estar escrito na **Descrição**:

| Informe | Exemplo |
|---|---|
| o que você estava fazendo e em qual tela | "Ao salvar o rascunho na Agenda da semana" |
| o **texto exato** da mensagem e o título da janela | "Janela Operação não concluída: «Serviço temporariamente indisponível. Tente novamente em instantes.»" |
| o **Código de suporte**, se apareceu | "Código de suporte: SGP-…" |
| a esteira, a atividade, o colaborador e a data envolvidos | "Esteira da OS 1234, atividade Costura do banco, semana de 05/10" |
| quando começou e se acontece sempre | "Desde as 14h, em todas as tentativas" |
| o que você já tentou | "Recarreguei a página e entrei de novo no sistema" |
| em importação por documento, a referência copiada | o texto de **Copiar referência** (capítulo 17) |

**Nunca escreva senha nem PIN no chamado.**

### 19.9 Acompanhar os seus chamados

1. Abra **Colaborador → Chamados**. A tela **Chamados** informa: *"Lista dos seus chamados de suporte. Utilize os filtros para localizar um protocolo ou assunto."* Enquanto os dados são buscados, aparece **"Carregando chamados…"**.
2. Se precisar, use os filtros e clique em **Aplicar filtros**.
3. Na linha do chamado, use **Detalhe** para ler tudo, ou **Copiar protocolo**.

**Filtros**

| Filtro | O que faz |
|---|---|
| **Busca (protocolo ou assunto)** | encontra pelo protocolo ou pelo assunto, com qualquer parte do texto; maiúsculas e minúsculas não importam. A descrição não entra na busca |
| **Status** | **Todos** (padrão), **Aberto**, **Em progresso**, **Resolvido**, **Fechado**. Veja em "O que esperar" por que só **Aberto** traz resultado |
| **Categoria** | campo de texto que exige o **código exato** da categoria, como ele aparece na coluna **Categoria** — por exemplo, **BLOQUEIO_OPERACIONAL**. O nome em português não encontra nada. Na prática, deixe vazio |
| **Severidade** | **Todas** (padrão), **Baixa**, **Média**, **Alta**, **Crítica**. Só **Média** e **Alta** ocorrem (seção 19.7) |
| **Período (criação)** | **Todos** (padrão), **Hoje**, **7 dias** ou **30 dias**, pela data de abertura |

Os filtros **só valem depois de Aplicar filtros**; o botão fica desativado durante a busca. As escolhas não ficam guardadas: ao voltar à tela, ela abre sem filtros.

**A lista**

| Coluna | Conteúdo |
|---|---|
| **Protocolo** | o código **CHM-…** |
| **Status** | em português |
| **Categoria** | o **código** da categoria (tabela "Códigos que aparecem na tela", adiante) |
| **Severidade** | **Média** ou **Alta** |
| **Assunto** | cortado quando é longo; o texto inteiro aparece ao passar o ponteiro do mouse |
| **Criado em** e **Última atualização** | data e hora no horário local |
| **Ações** | **Detalhe** e **Copiar protocolo** |

Todos os seus chamados aparecem, sem divisão em páginas, do mais recente para o mais antigo.

**Copiar protocolo** copia o código e mostra **"Protocolo copiado."**. Se o navegador não permitir, aparece **"Não foi possível copiar o protocolo."** — copie o código direto da coluna.

**Detalhe** abre a janela **Chamado**, com o protocolo no topo e os campos **Assunto**, **Status**, **Severidade**, **Categoria**, **Descrição**, **Criado em** e **Atualizado em**. Nessa janela, **Status**, **Severidade** e **Categoria** aparecem em **código** (tabela adiante). Feche pelo botão **Fechar** ou clicando fora da janela.

[IMAGEM SUGERIDA: Tela Chamados com o quadro de filtros, a lista com as colunas Protocolo, Status, Categoria, Severidade, Assunto, Criado em, Última atualização e os botões Detalhe e Copiar protocolo]

## O que esperar

### Registrar não é o mesmo que avisar

O chamado é **sempre gravado** quando a confirmação aparece, mesmo que o aviso ao suporte falhe ou não seja enviado. O aviso por e-mail depende da configuração do seu ambiente, e o aviso por WhatsApp não é enviado nesta versão. Confira a linha **E-mail** da confirmação (seção 19.7).

### O status não muda pelo sistema

Não existe, no SGP+, ação que altere um chamado depois de aberto. Por isso:

- todo chamado fica em **Aberto**, mesmo depois de atendido;
- **Última atualização** mostra sempre a mesma data e hora de **Criado em**;
- os filtros **Em progresso**, **Resolvido** e **Fechado** não trazem nada.

A resposta do suporte chega **fora do sistema**, pelo canal que a sua operação usa. Não espere ver o andamento na tela **Chamados**: ela é um registro do que você pediu.

### Não é possível complementar, cancelar nem reabrir

Um chamado registrado não pode ser editado, complementado, cancelado nem respondido pela tela. Para acrescentar informação, abra **outro** chamado e cite o protocolo do primeiro na descrição.

### Só você vê os seus chamados

A tela **Chamados** mostra apenas os chamados abertos pela sua conta. Outra pessoa — inclusive a gestão — não os vê pelo SGP+. Quem atende recebe o chamado pelo aviso por e-mail.

### A data do protocolo segue o horário universal

A data e a hora que compõem o protocolo seguem o **horário universal**, três horas à frente do horário de Brasília. Um chamado aberto às 22h pode ter, no protocolo, a data do dia seguinte. Para saber quando o chamado foi aberto, use a coluna **Criado em**, que está no horário local.

### Justificativa não é bloqueio

Quando o sistema pede justificativa por sequência ou por tempo, o trabalho **pode** ser registrado: basta informar o motivo. Não abra chamado por esse pedido — ele é regra de operação (seção 19.4). A exceção é o navegador da fábrica, que não oferece campo para o tempo acima do previsto (mesma seção).

## Quando algo é bloqueado

### Ao abrir um chamado

| Mensagem | Causa | O que fazer |
|---|---|---|
| *"Informe o assunto."* | o assunto ficou vazio | preencher o assunto |
| *"Informe a descrição."* | a descrição ficou vazia | preencher a descrição |
| *"Módulo de suporte está desativado."* | o serviço de chamados está desligado no ambiente, embora o botão apareça | avisar a administração do sistema por outro meio |
| mensagem técnica iniciada por *"NETWORK_ERROR: falha ao contatar a API"* | o navegador não conseguiu falar com o sistema. O texto é técnico e não tem orientação para você | conferir a conexão e tentar de novo; nada foi registrado |
| mensagem iniciada por *"Campo inválido: description"* | a descrição passou do limite de **10 mil caracteres** | encurtar a descrição |
| tela de entrada, com aviso de sessão | a sessão terminou enquanto a janela estava aberta | entrar de novo e refazer o chamado; o texto digitado se perde |

### Na tela Chamados

| O que aparece | Causa | O que fazer |
|---|---|---|
| *"Nenhum chamado encontrado com os filtros atuais."* | você ainda não abriu chamado, ou os filtros não trazem nada | voltar **Status** e **Período (criação)** para **Todos**, esvaziar **Busca** e **Categoria** e clicar em **Aplicar filtros** |
| *"Não foi possível carregar os chamados. Tente novamente."*, com *"Nenhum chamado encontrado com os filtros atuais."* logo abaixo | falha ao buscar a lista, ou serviço de chamados desligado. A segunda frase **não** significa que você não tem chamados | clicar em **Aplicar filtros** ou recarregar a página; persistindo, avisar a administração |
| *"Não foi possível carregar o chamado."*, na janela de detalhe | falha ao buscar o chamado | fechar a janela e clicar de novo em **Detalhe** |
| o item **Chamados** não aparece no menu | o módulo de chamados está desligado no ambiente | não há o que fazer pela tela |

### Códigos que aparecem na tela

Os chamados mostram alguns valores como **código interno em inglês ou em maiúsculas**. Eles estão aqui apenas para você reconhecê-los:

| O que aparece | Onde | Leia como |
|---|---|---|
| **OPEN** | **Status**, na janela de detalhe | **Aberto** |
| **MEDIUM** · **HIGH** | **Severidade**, na janela de detalhe | **Média** · **Alta** |
| **DUVIDA** · **ERRO** · **BLOQUEIO_OPERACIONAL** · **SOLICITACAO_APOIO** · **ACESSO_PERMISSAO** | **Categoria**, na lista e na janela de detalhe; também é o que o filtro **Categoria** exige | **Dúvida** · **Erro** · **Bloqueio operacional** · **Solicitação de apoio** · **Acesso/permissão** |
| **SENT** · **FAILED** · **SKIPPED** | linhas **E-mail** e **WhatsApp** da confirmação | **enviado** · **falhou** · **não enviado** |
| **SGP-…** | linha **Código de suporte** das janelas de aviso | identificador da falha para o suporte |

### Ações que não existem

| Limitação | Como proceder |
|---|---|
| acompanhar o andamento do chamado pela tela | o status não muda; aguarde o retorno do suporte fora do sistema |
| responder, complementar, anexar arquivo ou imagem | abrir outro chamado citando o protocolo; descrever em texto o que a imagem mostraria |
| cancelar ou encerrar um chamado | avisar quem dá suporte, citando o protocolo |
| ver chamados de outra pessoa | não existe; cada um vê só os seus |
| abrir chamado pelo Modo Fábrica ou sem entrar no sistema | procurar a administração ou pedir a alguém com acesso que abra |
| escolher a prioridade além de Alta ou Média | usar a marcação **Isso está me impedindo de continuar** com critério |
| exportar ou imprimir a lista de chamados | não há exportação nem impressão |
| justificar tempo acima do previsto pelo navegador da fábrica | usar o totem ou pedir o lançamento à gestão (seção 19.4) |

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
| `STEP`, "Etapa (STEP)", "Alocações em STEPs", "STEPs em aberto" | **atividade** | termo técnico legado |
| **"bucket"**, em **Jornada por colaborador** ("bucket «em atraso»", "bucket ≠ concluídas", "Bucket operacional") | **situação da esteira** | termo técnico legado; aparece em títulos e em mensagens de lista vazia |
| **"preset: 7d"**, na linha do intervalo em **Jornada por colaborador** | o **recorte temporal** escolhido | código curto do período, sem efeito sobre o uso |
| Situação da atividade exibida em código, no painel de encaixe do planejamento | **situação da atividade** | a tela ainda mostra o código interno em alguns casos |
| **"Mês atual (UTC)"**, no seletor de período | mês atual pelo calendário local | o cálculo usa o fuso de São Paulo; o rótulo está incorreto |
| Após redefinir o PIN: "Próximo acesso exigirá nova senha." | próximo acesso exigirá **novo PIN** | o recurso é o PIN do Modo Fábrica, não a senha |
| Sete nomes com símbolos sem sentido no lugar das letras acentuadas, em **Permissões por papel** | o nome correto, listado na seção 4.3 | defeito de codificação no cadastro de permissões, regravado a cada atualização da base de dados |
| Botão **"Remover (soft delete)"**, em Usuários e Colaboradores | **remover preservando o histórico** | o registro deixa de aparecer nas listas e a opção de restaurar não fica acessível pela tela; trate a remoção como definitiva |
| Textos de filtro que citam nomes internos de parâmetro, no Painel operacional | o filtro correspondente | sem efeito sobre o uso; basta usar os filtros da tela |
| **"passo"**, nas telas de Apontamento gerencial ("Lançamentos no passo", "Apontamento gerencial neste passo") | **atividade** | mesmo conceito, nome diferente |
| **"Voltando ao Kiosk…"**, após registrar por Outra atividade ou Extra Esteira no totem | voltando ao **Modo Fábrica** | "Kiosk" é o nome interno do totem |
| **"SGP+ Produção"**, no cabeçalho do navegador da fábrica | **Modo Fábrica** | o totem exibe "SGP · Modo Fábrica"; os dois cabeçalhos deveriam usar o mesmo nome |
| **"Daily"**, no seletor de Visualização do Planejamento semanal | **visão por dia** | rótulo em inglês em uma interface em português; a opção ao lado, "Semana", está traduzida |
| **"Atividades de hoje"**, **"Minutos planejados"** e a frase *"Atividades planejadas para hoje, em ordem de execução."*, na Minha fila | os mesmos dados **da data exibida** | os rótulos continuam dizendo "hoje" quando você navega para outro dia; os números sempre acompanham a data escolhida |
| Aviso sobre transições de situação, no detalhe da esteira e na tela **Alterar Esteira**, quando falta a permissão | **é preciso a permissão de mudar a situação da esteira** | a frase cita o nome interno da permissão em lugar do nome funcional |

### Numeração dos cartões da Minha fila não segue a ordem da tela

Divergência confirmada em 2026-10-03, de impacto apenas na leitura.

O número no quadrado azul de cada cartão da **Minha fila** é a posição que o **planejamento** deu à atividade dentro do dia. A ordem em que os cartões são exibidos obedece a outro critério — grupo, atividades livres antes das que têm atividade anterior pendente, data e sequência da própria esteira. Resultado: é comum a coluna de números não ficar em ordem crescente.

**Orientação:** não usar o número do cartão como ordem de execução. A ordem a seguir é a dos cartões na tela, junto com o selo **Próxima atividade recomendada**. Pendência de produto registrada.

### Página Apontamento sem campo de justificativa

Divergência confirmada em 2026-10-03.

A página **Apontamento**, aberta pelo botão **Apontar** em **Minha jornada**, oferece data, minutos, quantidade executada e observação — **mas não tem campo de justificativa operacional**.

Quando a atividade exige justificativa (atividade anterior pendente, ou atividade fora da alocação do colaborador), o registro é recusado e não há como atender ao pedido naquela tela.

**Orientação até a correção:** nesses casos, usar o botão **Apontar horas** da barra superior, que tem o campo de justificativa. Pendência de produto registrada.

### Previsto e cobertura das jornadas ignoram a quantidade prevista

Divergência confirmada em 2026-10-03, com impacto direto em decisão de gestão.

As duas telas de jornada — **Minha jornada** (capítulo 11) e **Jornada por colaborador** (capítulo 12) — calculam o **previsto** usando o tempo de **uma unidade** de cada atividade, mesmo quando a estrutura da esteira prevê várias. O mesmo caminho de dados alimenta as duas telas, então o efeito é idêntico nas duas.

| Como a atividade está cadastrada | O que a jornada considera |
|---|---|
| 30 min por unidade, **1 unidade** prevista | 30 min — correto |
| 30 min por unidade, **4 unidades** previstas | **30 min** — deveria ser 2h |

Efeitos em cadeia, todos na **Jornada por colaborador**:

| Indicador | Efeito |
|---|---|
| **Previsto estrutural (soma das alocações)** | menor que o previsto real |
| **Cobertura de tempo** | **maior** que a real, porque o denominador está reduzido; pode indicar folga onde há atraso |
| **Pendência de tempo** | subestimada; a alocação pode nem entrar na lista |
| **Exportação em Excel** | reproduz os mesmos valores, nas colunas de previsto, cobertura e pendências |

Outras telas que mostram previsto a partir da estrutura, como o detalhe da esteira, não têm esse desvio — o que explica a divergência entre números de telas diferentes para a mesma atividade.

**Orientação até a correção:** em atividades com mais de uma unidade prevista, não concluir pela cobertura da jornada que houve tempo excedente; conferir o previsto na estrutura da esteira (capítulo 6). Pendência de produto registrada.

### Apontamento gerencial aberto pela jornada volta para o Dashboard

Divergência confirmada em 2026-10-03, de impacto no fluxo de trabalho.

Ao usar **Apontamento gerencial** em um cartão da **Jornada por colaborador**, a tela de correção abre normalmente, mas o link de voltar leva ao **Dashboard** — e não à jornada de onde você saiu. A seleção de colaboradores, o período e o filtro de esteira não são recuperados por esse caminho.

Some-se a isso que a **Jornada por colaborador** não tem botão **Atualizar** e não acompanha mudanças continuamente: a correção feita não aparece na jornada enquanto a consulta não for refeita.

**Orientação até a correção:** depois de corrigir, voltar pelo botão de voltar do navegador — que preserva a consulta — e recarregar a página para ver os novos números. Pendência de produto registrada.

### Cálculo de atraso no Painel operacional

Divergência confirmada em 2026-10-03, com impacto direto na leitura do painel.

O cartão e o filtro **Em atraso** só reconhecem o prazo da esteira quando ele está registrado como **data**. O prazo, porém, é guardado como **texto livre**, e nenhuma das telas que o preenchem produz o formato que o painel sabe ler:

| Tela | Como pede o prazo | O que grava |
|---|---|---|
| **Nova esteira** e **Alterar Esteira** | dois seletores de data, **Início previsto** e **Fim previsto** | uma linha de texto no formato "Início previsto … · Fim previsto …" |
| **Nova esteira por documento** | mostra um campo de texto, **Prazo estimado**, que não é gravado no funcionamento padrão (capítulo 17) | nada: a esteira criada fica sem prazo |

Consequência prática: **esteira cadastrada pela tela atual de Nova esteira tende a nunca ser contada como atrasada**, porque o par Início/Fim previsto não é reconhecido como data. Os demais formatos da tabela abaixo ocorrem em esteiras antigas. Esteira criada por documento, no funcionamento padrão, nasce sem prazo e também não é contada como atrasada.

> **Correção de 2026-10-03.** Até esta revisão, este anexo e o capítulo 5 afirmavam que o campo **Prazo estimado** do cadastro de Nova esteira "pede um número de dias". A verificação no código mostrou que essa tela **não tem mais** esse campo: ela pede duas datas. O campo de texto livre **Prazo estimado** sobrevive apenas na tela **Por documento** — que o exibe, mas não grava o valor (capítulo 17) — e na exibição de prazos antigos. A falha de leitura do atraso permanece; o que estava errado era a causa descrita. O texto equivalente no capítulo 5 foi corrigido na mesma data, em rodada própria.

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

### Criação a partir de matriz descarta a quantidade prevista

Divergência confirmada em 2026-10-03, com impacto direto no previsto da esteira.

Ao criar uma esteira a partir de uma matriz de operação, o sistema copia nomes, ordem, minutos por unidade, responsável padrão e equipe padrão de cada atividade — mas **não** copia a **quantidade prevista**. Toda atividade nasce com **1 unidade**, mesmo quando a matriz prevê mais.

| Na matriz de operação | Na esteira criada |
|---|---|
| 30 min por unidade, **4 unidades** | 30 min por unidade, **1 unidade** |

O efeito é um total previsto menor que o planejado na matriz, propagando-se para o tempo total da esteira, a pendência de tempo e tudo o que deriva do previsto estrutural.

**Orientação até a correção:** depois de **Usar esta base**, percorrer as atividades no passo **Estrutura** e corrigir o campo **Qtd** antes de criar a esteira. Pendência de produto registrada.

### Quantidade prevista pode ser alterada mesmo com horas já apontadas

Divergência confirmada em 2026-10-03, entre o comportamento implementado e a regra de negócio pretendida.

A regra de negócio do produto prevê que a quantidade prevista de uma atividade só possa mudar **enquanto ela não tiver apontamentos**. O sistema **não aplica esse bloqueio**: pela tela **Alterar Esteira** → **Estrutura**, a quantidade prevista de qualquer atividade pode ser alterada em qualquer situação da esteira, inclusive em atividade que já tem horas apontadas, já concluída ou já dispensada.

A única barreira existente é a **justificativa da alteração**, exigida quando a esteira já saiu de **Rascunho / Em elaboração** — e ela não distingue atividade com apontamento de atividade intocada.

Como o previsto é a referência contra a qual o realizado é comparado, alterar a quantidade de uma atividade em execução reescreve essa referência depois do fato: a pendência de tempo, a cobertura e os desvios passam a ser calculados contra um previsto que não era o vigente quando o trabalho foi feito.

**Orientação até a decisão de produto:** tratar a alteração de quantidade em atividade já apontada como exceção, sempre com justificativa explícita no motivo da alteração. Pendência de produto registrada.

### Incluir novo item é aceito em esteira finalizada ou cancelada

Divergência confirmada em 2026-10-03.

O botão **Incluir novo item**, na tela **Alterar Esteira**, aparece em **qualquer** situação da esteira, e a inclusão é **aceita** em todas elas — incluindo **Finalizada** e **Cancelada**. Não há recusa, nem aviso, nem sinalização de risco na tela.

O resultado é trabalho acrescentado a uma esteira que **não aceita apontamento**: as atividades novas entram na estrutura e no Backlog operacional, mas ninguém consegue executá-las enquanto a esteira permanecer encerrada.

Diferente de outras ações da mesma tela, a dispensa e a restauração de atividade **são** bloqueadas em esteira finalizada ou cancelada. A inclusão tardia é a exceção.

**Orientação até a decisão de produto:** antes de incluir item, conferir a situação da esteira. Se o trabalho é real e a esteira está encerrada, reabrir o caminho dela ou criar outra esteira. Pendência de produto registrada.

### O histórico da esteira não registra o avanço de situação nem o cancelamento

Divergência confirmada em 2026-10-03, com impacto em rastreabilidade.

O bloco **Eventos operacionais** do detalhe da esteira registra conclusão, reabertura, dispensa e restauração de atividade, inclusão tardia, edição de estrutura, entrada e saída de atraso e os dois retrocessos — com motivo.

Não registra:

| O que não entra no histórico |
|---|
| **Enviar para planejamento** |
| **Aceitar e iniciar planejamento** |
| **Liberar para produção** |
| **Finalizar esteira** |
| **Cancelar esteira** |

Ou seja, o histórico é detalhado sobre atividades e retrocessos e **silencioso sobre o avanço normal da esteira e sobre o cancelamento**. Não há como saber pela tela quem enviou a esteira para planejamento, quem a liberou para produção, quem a finalizou ou quem a cancelou.

Some-se a isso que **Cancelar esteira** e **Finalizar esteira** não pedem confirmação nem motivo: um clique encerra a esteira, sem registro de quem foi e por quê. Para a finalização resta a data em **Concluída em**; para o cancelamento, nada.

Os filtros **Bloqueios** e **Paradas** do mesmo bloco ficam permanentemente em zero, porque bloquear e pausar atividade não existem no sistema (ver 21.5).

**Orientação até a correção:** registrar decisões de encerramento fora do sistema quando a rastreabilidade for necessária, e usar a janela de **Justificativa da alteração** para deixar contexto quando a ação envolver edição. Pendência de produto registrada.

### Atividade reaberta não se distingue de atividade pendente

Divergência confirmada em 2026-10-03, de impacto na leitura da estrutura.

Na **Estrutura operacional** do detalhe da esteira, a atividade **concluída** exibe o selo **Atividade concluída** e a **dispensada** exibe o selo **Dispensada**. A atividade **reaberta** — por **Reabrir atividade** ou por **Restaurar** — **não recebe selo nenhum** e fica visualmente idêntica a uma atividade que nunca foi tocada.

Como **Restaurar** também leva a atividade para reaberta, uma atividade que já foi dispensada e depois restaurada também não deixa marca visível na estrutura.

**Orientação:** para saber se houve reabertura ou restauração, consultar o bloco **Eventos operacionais**, onde os registros aparecem como **Atividade reaberta** e **Dispensa restaurada**. Pendência de produto registrada.

### Links de esteira quebrados no Planejamento semanal

Divergência confirmada em 2026-10-03, de impacto na navegação.

Três blocos do **Planejamento semanal** oferecem um link para abrir a esteira do item e **o link não funciona**: em vez da esteira, ele leva o usuário à tela inicial, perdendo também o contexto da semana que estava aberta.

| Bloco | Rótulo do link |
|---|---|
| **Desvios do responsável principal** | **Abrir esteira** |
| **Histórico da semana** | **Ver esteira** |
| **Execução fora do plano** | **Abrir esteira** |

Os demais caminhos para a esteira funcionam normalmente — Painel operacional, Dashboard, Minha fila, as duas jornadas, a tela de Apontamento, o agrupamento por esteira e o painel de divergências de sincronização do próprio Planejamento.

**Orientação até a correção:** chegar à esteira pelo **Painel operacional**. Pendência de produto registrada.

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
