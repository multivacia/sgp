# Retorno — Capítulo 12: Jornada Gerencial

## Identificação e estado da entrega

- **TASK_ID:** `manual-usuario-sgp-cap12-jornada-gerencial`
- **Data/hora:** 2026-10-03, 21:26 UTC
- **Repositório:** `multivacia/sgp`
- **Branch:** `docs/manual-usuario-sgp-cap12-jornada-gerencial`
- **SHA base:** `1ea1465fc2a173335212963135884b7b2eb9c415` (tip de `origin/docs/manual-usuario-sgp-cap11-minha-jornada`)
- **SHA final:** registrado na seção *Commit e publicação*, abaixo
- **Status final:** concluído — capítulo 12 enriquecido, cabeçalho corrigido, capítulo 21 complementado
- **Natureza:** exclusivamente documental; nenhum arquivo de aplicação alterado
- **Uso/tokens disponíveis:** INDISPONÍVEL — a sessão não fornece métrica confiável.

## Objetivo e resultado

Substituir o marcador pendente do capítulo 12 de `docs/manual/source/MANUAL_USUARIO_SGP.md` por um capítulo operacional completo da **Jornada por colaborador**, auditado contra o código atual, e corrigir a linha de situação do cabeçalho do manual.

Resultado: capítulo 12 com os seis blocos obrigatórios, 410 linhas, 3 marcadores de imagem sugerida (limite 4), sem marcador de pendência e sem os termos técnicos proibidos.

## Base Git e governança

| Verificação | Resultado |
|---|---|
| `git fetch origin --prune` | executado |
| tip de `origin/docs/manual-usuario-sgp-cap11-minha-jornada` | `1ea1465fc2a173335212963135884b7b2eb9c415` — **igual ao esperado**, sem divergência |
| branch criada a partir dessa base | `docs/manual-usuario-sgp-cap12-jornada-gerencial` |
| rebase / force-push / reescrita de histórico | nenhum |
| `main`, `develop`, `homol` e cadeia documental anterior | preservadas, nenhuma alteração |
| base indevida (`main`/`develop`/`homol`) | não utilizada |

## Referências lidas

`CLAUDE.md`; `AGENTS.md`; `docs/ai/context/PROJECT_CONTEXT.md`; `docs/ai/context/SESSION_CHECKPOINT.md`; `docs/manual/source/README.md`; `docs/manual/source/MANUAL_FUNCIONAL_SGP.md` (seções 13, 45.7, 45.8, JOR-001/003); `docs/manual/source/MANUAL_USUARIO_SGP.md` (cabeçalho, capítulos 7, 10, 11, 12, 21); `docs/ai/returns/manual-usuario-sgp-cap11-minha-jornada-retorno.md` (índice e achados).

Código auditado nesta rodada:

- `src/features/gestor/JornadaColaboradorGestorPage.tsx`
- `src/features/gestor/jornadaColaboradorScope.ts` e seus testes
- `src/features/gestor/JornadaColaboradorGestorPage.test.tsx`
- `src/features/gestor/ApontamentoGestorPage.tsx`
- `src/components/collaborators/CollaboratorMultiSelectStrip.tsx`
- `src/services/operational-journey/operationalJourneyApiService.ts`
- `src/services/admin/adminCollaboratorsApiService.ts`
- `src/lib/operationalSemantics.ts`, `src/lib/transversalUxCopy.ts`, `src/lib/shell/app-nav-config.ts`
- `src/routes/AppRoutes.tsx`, `src/routes/RequirePermission.tsx`
- `src/domain/operational/workDate.ts`, `src/lib/backlog/operationalBuckets.ts`
- `server/src/modules/operational-journey/` (controller, service, repository, schemas, export)
- `server/src/modules/collaborators/collaborators.routes.ts`
- `server/src/modules/admin-users/admin-users.routes.ts`
- `server/src/modules/my-activities/my-activities.service.ts` e `.repository.ts`
- `server/src/shared/` — `activityOperationalQuantity.ts`, `coberturaTempo.ts`, `operationalPeriod.ts`, `operationalBucket.ts`

## Evidências principais — entrada e permissão

| Item | Evidência |
|---|---|
| rótulo no menu | **Jornada por colaborador** — `app-nav-config.ts` |
| agrupamento do menu | bloco **Estrutura e administração**, seção de gestão — `SHELL_NAV_GROUP_LABEL` |
| permissão de tela e de dados | a mesma do cadastro de colaboradores, aplicada no guard da rota e nas três rotas da jornada (consulta individual, consolidada e exportação) |
| sem permissão | o item **não aparece** no menu; pelo endereço direto, o guard exibe **Sem permissão para esta área** / *"Não tem permissão para acessar este conteúdo. Contate um administrador se precisar de acesso."* — a tela não fica oculta nesse caminho |
| dependência de vínculo com colaborador | **não existe** nesta tela; é exigência apenas da Minha jornada |
| lista de colaboradores | mesma permissão da tela, logo quem abre a jornada consegue listar; apenas **ativos e não removidos**, ordem alfabética, até 250 registros |
| botão **Apontamento gerencial** | permissão distinta (lançar em nome de, editar ou remover apontamento); sem ela o cartão mostra só **Ver esteira** |

Nome técnico de permissão não foi exposto no capítulo.

## Seleção e limite de colaboradores

Reconfirmado integralmente:

- faixa de seleção por **avatares com iniciais**; clique no avatar **remove**;
- botão **+** abre popover com busca (**"Buscar colaborador…"**), filtro por parte do nome, mensagens *"Nenhum resultado"* e *"Todos já adicionados"*;
- **Limpar seleção** zera a seleção, apaga a jornada e devolve a tela ao estado inicial (coberto por teste);
- **máximo de 20 colaboradores na tela** — `MAX_JORNADA_COLABORADORES = 20`, igual ao teto do servidor (`MAX_JOURNEY_COLLABORATORS = 20`). Ao atingir, **+** fica indisponível com a dica *"Selecione no máximo 20 colaboradores"*. A mensagem do servidor *"Selecione no máximo 20 colaboradores por consulta."* não é alcançável pela interface;
- **uma pessoa** usa a consulta individual; **duas ou mais** usam a consolidada;
- duplicados removidos preservando a ordem; excedente cortado no teto;
- **parâmetro legado de colaborador único** é aceito como entrada e descartado ao editar a seleção — tratado apenas como evidência, **não citado no capítulo**;
- **trocar a seleção limpa o filtro de esteira** e mantém o período;
- seleção, período e filtro vivem no endereço da página: **recarregar preserva** a consulta; reabrir pelo menu **não** recupera.

## Uma pessoa × várias pessoas

| Elemento | Uma | Várias |
|---|---|---|
| título da página | **Jornada por colaborador** | **idêntico** — o título não recebe nome nem contagem |
| identificação do escopo | nome abaixo da faixa | `"N colaboradores: Nome · Nome"` |
| linha do intervalo | intervalo | intervalo + aviso de escopo consolidado (totais somados; percentuais recalculados) |
| alocações, previsto, realizado período/acumulado, Extra Esteira, pressão de atraso | valores da pessoa | **somados** |
| cobertura | realizado ÷ previsto da pessoa | **recalculada sobre os totais**, nunca média de percentuais |
| cartões | sem selo de pessoa | selo com o nome em cada cartão |
| pendências | uma linha por alocação | uma linha por alocação **e por pessoa**, com o nome; mesmo teto de 48 |
| histórico | até 20 da pessoa | até 20 **no conjunto**, com selo de pessoa |
| **totais por pessoa** | o escopo é a pessoa | **não existem na tela** — somente na exportação |
| exportação | 1 linha de resumo | 1 linha por pessoa + linha **Total geral** |

O que é somado: minutos previstos, minutos apontados no período, acumulados, contagem de alocações, Extra Esteira, atraso e pendências. O que continua individual: a identificação de cada alocação, de cada pendência e de cada apontamento.

## Períodos

Catálogo e cálculo são **os mesmos da Minha jornada** — mesmo catálogo de rótulos no frontend e a mesma resolução de período no servidor. **Equivalência funcional declarada no capítulo.**

- `7d` padrão, `15d`, `30d` = janelas móveis de 168 / 360 / 720 horas até o instante da consulta;
- **Mês atual (UTC)**: o cálculo usa o início do primeiro dia do mês **no fuso de São Paulo**; o rótulo está incorreto (VAL-017, já registrado no capítulo 21);
- intervalo personalizado: data pura convertida para 00:00 e 23:59:59.999 **de São Paulo**, incluindo os dois dias completos;
- início posterior ao fim é **recusado** (validação no servidor);
- **sem duração máxima** e **sem bloqueio de datas futuras**;
- trocar o preset apaga as datas personalizadas;
- intervalo personalizado incompleto não consulta e exibe *"Intervalo personalizado: indique as datas de início e fim."*;
- a linha acima dos números mostra o intervalo resolvido **e o código curto do preset** (ex.: `preset: 7d`) — registrado no capítulo 21.

## Previsto estrutural

- fonte: **atribuições diretas** colaborador × atividade na estrutura atual das esteiras; **não** o planejamento semanal;
- atribuição **só de equipe** não entra (a consulta usa apenas alocações diretas);
- **não é filtrado pelo período**;
- conta **uma vez por alocação colaborador × atividade** — duas pessoas na mesma atividade de 60 min somam 120 min, coerente com o realizado, que também é por pessoa;
- **inclui** alocações de esteiras **finalizadas e canceladas** e atividades já **concluídas ou dispensadas** (a consulta filtra apenas remoção e atividade inativa), que não chegam às listas da tela;
- consolidação multi-colaborador: soma simples das alocações do escopo.

### Verificação crítica — quantidade prevista

**Confirmado: a Jornada Gerencial usa exatamente o mesmo mapeamento da Minha jornada e sofre o mesmo defeito.**

Cadeia de evidência:

1. o serviço da jornada gerencial chama o mesmo listador de atividades por colaborador usado pela Minha jornada;
2. a consulta desse listador **não seleciona a quantidade prevista da atividade**, embora o tipo da linha a declare;
3. o mapeamento resolve o total como *unitário × quantidade* e a quantidade ausente cai no padrão **1**;
4. o cálculo do previsto da jornada prefere o total já resolvido, portanto consome o valor com quantidade 1.

Efeito na tela gerencial, mais amplo que na Minha jornada: além de subestimar **Previsto estrutural**, **infla a cobertura de tempo** (denominador reduzido), **subestima as pendências de tempo** (uma alocação pode nem entrar na lista) e **propaga o desvio para a exportação**.

Ações tomadas: limitação registrada no capítulo 12 em linguagem de usuário, com exemplo numérico; defeito registrado no capítulo 21 em subseção própria, por ainda **não** estar lá. Código **não** alterado.

## Realizado

- universo: apontamentos de esteira não removidos, com esteira e atividade existentes;
- **data de realização** é o critério de período, não a data de lançamento;
- inclui lançamentos **gerenciais em nome da pessoa**, apontamentos **fora da alocação** (origem de exceção) e **fora de sequência**;
- inclui apontamentos em atividades **sem cartão** na tela;
- registros removidos deixam de somar;
- registros corrigidos passam a valer na próxima consulta; corrigir só a quantidade executada **não** altera tempo;
- **quantidade executada não multiplica nem reduz minutos**;
- **Extra Esteira é calculado em separado** e não entra no realizado;
- os dois cartões respeitam o filtro de esteira: **Minutos apontados (período)** limitado ao intervalo; **Minutos apontados (acumulado) (escopo)** sobre todo o histórico;
- consolidação multi-colaborador: soma única por conjunto de pessoas, sem duplicidade (cada lançamento pertence a um só colaborador).

## Cobertura de tempo

- fórmula real: **realizado acumulado nas alocações do escopo ÷ previsto estrutural dessas mesmas alocações**;
- numerador: tempo acumulado da pessoa **nas atividades em que ela está alocada**;
- denominador: previsto estrutural das mesmas alocações;
- **divergência relevante documentada:** a cobertura **não** é `Minutos apontados (acumulado)` ÷ `Previsto estrutural`, porque o cartão de acumulado inclui trabalho em atividades **sem alocação** da pessoa, e a cobertura não;
- previsto ≤ 0 → **`— (não aplicável)`**, nunca 0%; a tela explica a condição;
- **pode ultrapassar 100%** e isso não comprova conclusão;
- arredondamento: uma casa decimal;
- rótulo exibido: **Cobertura de tempo**; a explicação do numerador e do denominador está impressa na própria tela;
- várias pessoas: **recalculada sobre os totais somados**, nunca média de percentuais (mesma regra na linha **Total geral** da exportação);
- quantidade prevista incorreta **afeta o denominador** — registrado.

Capítulo redigido sem chamar cobertura de "percentual de conclusão física", com nota explícita de que ela mede tempo.

## Extra Esteira

- aparece em painel próprio **Extra esteira (período)**;
- total de minutos do período; contagem como *"N lançamento(s) fora de esteira neste período."*;
- até **3 descrições principais** (teto no serviço), cada uma com tempo somado e quantidade;
- ordenação das descrições: **maior tempo total**, empate por maior quantidade, empate por descrição em ordem alfabética;
- várias pessoas: a agregação soma todos os selecionados **antes** de ordenar — não é um top por pessoa concatenado; **não há divisão por pessoa na tela**, só na exportação;
- período pelo **dia de lançamento** convertido para o fuso de São Paulo;
- **o filtro de esteira não se aplica** — a consulta de Extra Esteira não recebe esse parâmetro; a aba da exportação declara isso no próprio título;
- **fora do realizado e fora da cobertura** — declarado no capítulo;
- vazio: *"Nenhum apontamento extra no período."*

## Pendências de tempo

- entra em pendência a alocação **em aberto** (esteira não finalizada nem cancelada) cujo **previsto estrutural é maior que o acumulado apontado** por aquela pessoa naquela atividade;
- comparação **acumulada**, não limitada ao período;
- **inclui atividades já concluídas ou dispensadas**, desde que a esteira siga aberta;
- ordenação pela **maior diferença**;
- exibe esteira, atividade e a diferença de tempo; com várias pessoas, também o nome;
- teto de **48 itens** listados;
- **divergência nova:** o contador do universo existe no contrato, mas **a tela não o exibe** — com mais de 48 pendências o gestor não vê o total. O total aparece na coluna **Pendências de tempo** da aba **Resumo** da exportação. Registrado no capítulo;
- **apenas informativa** — a lista não oferece link para outra tela;
- vazio: *"Nenhuma neste recorte."*

## Histórico de apontamentos

- **limite visual de 20 linhas**, fixado na tela (o contrato aceita de 1 a 100);
- com várias pessoas o limite vale para o **conjunto**, e a própria tela diz *"máx. 20 linhas no conjunto dos colaboradores"*;
- ordenação: data de realização mais recente, empate pelo registro mais recente;
- respeita período e filtro de esteira;
- identificação do colaborador por selo apenas no escopo múltiplo;
- **não** mostra quantidade executada, observação, texto completo das justificativas nem quem registrou em nome da pessoa;
- selos **Exceção** e **Fora de sequência**, com justificativa como dica ao passar o cursor;
- **Extra Esteira não aparece** nesta lista;
- **sem paginação e sem carregar mais**; sem edição ou exclusão no local;
- **universo diferente da exportação** — tratado explicitamente no capítulo, com exemplo numérico.

## Exportação Excel

| Item | Resultado |
|---|---|
| rótulo do botão | **Exportar Excel**; durante a geração, **Exportando…** |
| habilitação | exige seleção **e** consulta já carregada; indisponível enquanto carrega ou exporta |
| recorte | **mesmo período e mesmo filtro de esteira da tela**, mesmas pessoas |
| limite de colaboradores aceito pela exportação | **50** no contrato (*"Selecione no máximo 50 colaboradores por exportação."*) |
| limite de seleção da tela | **20** |
| exportação pode ultrapassar 20 via contrato, mas não via interface | **sim** — confirmado; a montagem do pedido reaproveita a seleção da tela, limitada a 20 |
| linhas de apontamento | **todas** as do período; o pedido de exportação **remove** o limite de linhas |
| abas | **Resumo**, **Apontamentos**, **Extra esteira** |
| colunas do Resumo | Colaborador, Código, Matrícula, Apontamentos no período, Minutos apontados (período), Extra esteira (período), Lançamentos extra esteira, Alocações (escopo), Previsto estrutural (escopo), Minutos apontados (acumulado), Cobertura de tempo, Alocações em atraso, Pendências de tempo |
| colunas de Apontamentos | Colaborador, Código, Data, Código/OS, Esteira, Tarefa, Setor, Atividade, Tempo, Minutos, Qtd executada, Origem, Fora de sequência, Justificativa, Observações |
| colunas de Extra esteira | Colaborador, Código, Data, Descrição, Tempo, Minutos, Observações |
| quantidade | **Qtd executada** presente na aba de apontamentos; ausente na tela |
| previsto / realizado / cobertura | no Resumo; cobertura como percentual ou **Não aplicável**, recalculada no **Total geral** |
| pendências | **apenas o total** no Resumo; **sem** aba de detalhe |
| alocações | **apenas contagem e soma de previsto**; **sem** aba de detalhe |
| subtotais | **Subtotal** por colaborador nas abas de detalhe; **Total geral** só com mais de uma pessoa |
| nome do arquivo | `jornada-colaborador-<de>-a-<ate>.xlsx` para uma pessoa; `jornada-<N>-colaboradores-<de>-a-<ate>.xlsx` para várias |
| ordem dos colaboradores | alfabética por nome, independente da ordem de seleção |
| estados de loading | botão em **Exportando…**, desabilitado |
| mensagens de erro | mensagem recebida ou **Não foi possível exportar o Excel da jornada.**; limpa ao trocar seleção |
| rótulo de período dentro do arquivo | repete **Mês atual (UTC)**, com o mesmo desvio de rótulo |

O capítulo explica apenas o que o usuário consegue fazer pela interface — limite efetivo de 20 — e **não** ensina manipulação de endereço para superar o limite visual.

## Correção gerencial de apontamentos

- entrada existe: botão **Apontamento gerencial** nos cartões das listas **Em aberto** e **Em risco**, condicionado à permissão de gestão de apontamentos;
- a tela de destino permite **lançar em nome de** colaborador **já alocado** na atividade (motivo obrigatório, registrado na trilha), **editar** minutos ou quantidade executada e **remover** com motivo;
- campos do novo lançamento: colaborador alvo, data de realização, minutos, observação opcional, motivo obrigatório e, quando exigido, justificativa de fora de sequência;
- **não há campo de quantidade no novo lançamento**; a quantidade só é ajustável na edição de um lançamento existente;
- a tela de correção **não** mostra a jornada atualizada: ela recarrega apenas os lançamentos daquela atividade;
- **divergência nova:** a origem é informada no endereço ao abrir a correção, mas a tela de destino **só reconhece a origem "esteira"**; vindo da jornada, o link de voltar leva ao **Dashboard**, perdendo seleção, período e filtro. Registrado no capítulo 12 e no capítulo 21;
- não há controle de concorrência visível na jornada;
- capítulo 7 **não** duplicado — remissão feita em três pontos.

## Atualização

- **não existe botão Atualizar nesta tela** — divergência relevante em relação à Minha jornada, que o tem; o capítulo e a tabela comparativa declaram isso;
- **não existe estado "Atualizando…"**: durante a carga a tela exibe um espaço reservado e **oculta os números anteriores**;
- a consulta é refeita automaticamente ao mudar seleção, período, datas ou filtro de esteira;
- **sem polling** e **sem recarga ao retomar o foco** da janela;
- retorno de correção não atualiza a jornada;
- recarregar a página refaz a consulta preservando seleção, período e filtro;
- **Tentar novamente** existe apenas na faixa de erro;
- respostas de cargas antigas são descartadas quando a seleção muda no meio da requisição (coberto por teste).

## Mensagens e estados vazios — textos reais catalogados

| Situação | Texto real |
|---|---|
| nenhum colaborador selecionado | **Escolha um colaborador** / *"Selecione um colaborador na lista para carregar a jornada operacional (carga, risco e histórico)."* / **Abrir cadastro de colaboradores** |
| faixa sem seleção | *"Selecione um ou mais colaboradores."* |
| limite excedido | *"Selecione no máximo 20 colaboradores"* (dica do botão **+**); no servidor, *"Selecione no máximo 20 colaboradores por consulta."* e *"Selecione no máximo 50 colaboradores por exportação."* |
| busca sem resultado | *"Nenhum resultado"* / *"Todos já adicionados"* |
| intervalo incompleto | *"Intervalo personalizado: indique as datas de início e fim."* |
| intervalo inválido | recusado pelo servidor (início deve ser anterior ou igual ao fim) |
| colaborador inexistente | *"Colaborador não encontrado."* |
| sem alocações em aberto | *"Nada em aberto neste recorte. Confira o bucket «em atraso» ou o histórico abaixo."* |
| sem alocações em atraso | *"Nenhuma alocação em atraso neste recorte."* |
| sem pendências | *"Nenhuma neste recorte."* |
| sem Extra Esteira | *"Nenhum apontamento extra no período."* |
| sem apontamentos | *"Sem lançamentos no período. Alargue a janela temporal ou confira outra esteira."* |
| qualquer lista vazia com filtro de esteira | *"Sem alocações ou apontamentos neste recorte. Experimente outro período ou remova o filtro de esteira."* |
| falha de consulta | mensagem recebida + *"Verifique sua conexão e tente novamente."* + **Tentar novamente** |
| falha de exportação | **Não foi possível exportar o Excel da jornada.** |
| cobertura sem previsto | **— (não aplicável)** + *"Não aplicável se o previsto estrutural no escopo for ≤ 0."* |
| acesso negado | **Sem permissão para esta área** / *"Não tem permissão para acessar este conteúdo. Contate um administrador se precisar de acesso."* |
| sem colaborador alocado, na correção | *"Não há colaboradores alocados neste passo. Aloque antes de apontar."* |

Nenhuma mensagem foi inventada.

## Diferenças para Minha Jornada — confirmadas

| Minha Jornada | Jornada Gerencial |
|---|---|
| própria pessoa | uma ou várias pessoas, até 20 |
| acesso pelo vínculo da conta com colaborador | acesso gerencial por permissão; **sem** exigência de vínculo |
| visão simplificada | visão analítica |
| **não** mostra cobertura | **mostra** — confirmado |
| **não** mostra Extra Esteira | **mostra** resumo com total, contagem e até 3 descrições — confirmado |
| **não** mostra pendências de tempo | **mostra** até 48, sem o total — confirmado |
| sem exportação | **exportação em Excel** — confirmado |
| tem botão **Atualizar** | **não tem** — divergência adicional confirmada |
| botão **Apontar** para si | botão **Apontamento gerencial** |

Catálogo de períodos e cálculo idênticos. Capítulo 11 não foi repetido.

## Divergências novas registradas nesta rodada

1. **Quantidade prevista ignorada também no caminho gerencial** — confirmada na mesma consulta compartilhada; efeito ampliado para cobertura, pendências e exportação. Não estava no capítulo 21; **registrada lá** nesta rodada.
2. **Volta do Apontamento gerencial leva ao Dashboard** quando aberto pela jornada: a origem é enviada, mas só a origem "esteira" é reconhecida. Registrada no capítulo 12 e no capítulo 21.
3. **Ausência de botão Atualizar na Jornada por colaborador**, combinada com a falta de recarga automática após correção. Documentada no capítulo 12 e citada no registro anterior do capítulo 21.
4. **Total de pendências de tempo não é exibido na tela**, apesar de existir no contrato; acima de 48 itens o gestor não tem o universo. Documentado no capítulo 12 (com o caminho pela exportação).
5. **Sobreposição das listas Em aberto e Em risco**: alocação em atraso aparece nas duas. Documentada no capítulo 12 com orientação de não somar as listas.
6. **Contagem por situação incompleta** no painel de pressão de atraso: as situações *em planejamento* e *cancelada* não têm linha própria, embora contem nos totais do escopo. Documentada no capítulo 12.
7. **Termos técnicos na interface** — "bucket" (em títulos e mensagens de lista vazia) e o código curto do preset (`preset: 7d`). Acrescentados à tabela de ajustes de texto pendentes do capítulo 21; "STEPs em aberto" somado à linha de `STEP`.
8. **Cobertura divergindo do cartão de acumulado** por universos diferentes (alocadas × todas). Não é defeito, mas é fonte certa de dúvida; explicada no capítulo 12.

Bugs encontrados **não** foram corrigidos — somente documentados, conforme o escopo.

## Correções na matriz técnica

**Nenhuma necessária.** As seções 13 (JOG-001/002/003), 45.7 e 45.8 de `MANUAL_FUNCIONAL_SGP.md` foram reconferidas contra o código e estão corretas quanto a rota, permissão, tetos de 20 e 50, remoção de duplicados, contagem do previsto por alocação e conteúdo da exportação. `MANUAL_FUNCIONAL_SGP.md` **não** foi alterado.

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `docs/manual/source/MANUAL_USUARIO_SGP.md` | capítulo 12 substituído (410 linhas); linha de situação do cabeçalho atualizada; capítulo 21 com duas subseções novas e três linhas na tabela de ajustes de texto |
| `docs/ai/returns/manual-usuario-sgp-cap12-jornada-gerencial-retorno.md` | criado (este arquivo) |
| `docs/ai/context/SESSION_CHECKPOINT.md` | atualizado para esta atividade |

Nenhum arquivo criado ou removido além desses. Nada em `src/`, `server/`, migrations, testes, CSS, assets, `package.json`, `app-version.json`, HTML/PDF ou relatórios históricos.

## Correção do cabeçalho do manual

- **antes:** *"capítulos 1 a 3, 5, 7 a 9, 13, 20 e 21 com conteúdo final. Os capítulos 4, 6, 10 a 12 e 14 a 19 seguem marcados como pendentes…"*
- **depois:** *"capítulos 1 a 3, 5, 7 a 13, 20 e 21 com conteúdo final. Os capítulos 4, 6 e 14 a 19 seguem marcados como pendentes…"*

Concluídos: 1–3, 5, 7–13, 20, 21. Pendentes: 4, 6, 14–19. Nenhum outro metadado do cabeçalho foi alterado.

## Validações executadas

| Comando / verificação | Resultado real |
|---|---|
| `git fetch origin --prune` | executado; tip do capítulo 11 igual ao esperado |
| `git status --short` | antes do commit: `M docs/manual/source/MANUAL_USUARIO_SGP.md` (depois, mais o retorno e o checkpoint) |
| `git diff --check` | **sem saída** — nenhum problema de espaço em branco |
| `git diff --name-only 1ea1465f..` | somente arquivos de documentação permitidos |
| capítulo 12 sem marcador pendente | **confirmado** |
| capítulos 10 e 11 intactos | **confirmado** por comparação textual integral contra a base |
| capítulos 13 e 20 intactos | **confirmado** pela mesma comparação |
| cabeçalho atualizado | **confirmado** |
| capítulos 4, 6 e 14–19 ainda pendentes | **confirmado** — marcador presente nos oito |
| capítulos 1–3, 5, 7–13, 20 e 21 reconhecidos no cabeçalho | **confirmado** |
| seis blocos principais no capítulo 12 | **confirmado** |
| termos técnicos proibidos no capítulo 12 | **ausentes** — varredura por `STEP`, `endpoint`, `backend`, `migration`, `schema`, `repository`, `query`, `UUID`, `payload`, `enum`, `API`, nomes de rota, de permissão, de tabela e de função. As ocorrências de "limit" são a palavra portuguesa *limite/limitado*. O nome do arquivo gerado pela exportação é informação de usuário, não identificador interno |
| marcadores de imagem sugerida | **3**, dentro do teto de 4 |

**Execução visual:** não houve. A auditoria foi feita no código e nos testes do repositório, não na interface em execução.

**Build, lint e testes:** **não executados** — tarefa exclusivamente documental, sem alteração de código, conforme autorizado. Nenhuma execução é alegada.

## Pendências, riscos e ressalvas

- O defeito de quantidade prevista continua **aberto no código** e agora está documentado em dois capítulos. Correção depende de decisão humana.
- A divergência do rótulo **Mês atual (UTC)** (VAL-017) permanece aberta.
- O retorno do **Apontamento gerencial** para o Dashboard e a ausência de **Atualizar** na jornada são pendências de produto, documentadas e não corrigidas.
- O capítulo descreve o teto efetivo da exportação pela interface (20). Se a interface passar a expor seleção maior, a frase sobre o limite precisará ser revista junto do teto de 50 do contrato.
- A seleção de colaboradores só oferece **ativos**; uma consulta antiga guardada no endereço pode conter alguém inativo, caso em que a identificação cai para o identificador bruto. Não documentado no capítulo por não ser caminho de uso pela interface.

## Próximo passo recomendado

**Capítulo 6 — Esteiras**, por ser dependência conceitual dos capítulos 8, 9, 10, 14 e 17 — e também do capítulo 12, que remete a ele para conferência da quantidade prevista.

Nenhuma atividade foi iniciada automaticamente.

## Commit e publicação

- **Branch publicada:** `docs/manual-usuario-sgp-cap12-jornada-gerencial`
- **Commit documental:** incluído, com o capítulo, o cabeçalho, o capítulo 21, este retorno e o checkpoint
- **SHA final:** obtido após o commit pela referência da branch (`git rev-parse HEAD`); informado na resposta da sessão, pois não pode constar dentro do próprio arquivo versionado
- **Push:** `git push -u origin docs/manual-usuario-sgp-cap12-jornada-gerencial`
- **PR:** não criado, conforme instrução
- **Merge, force-push, rebase, exclusão de branch:** nenhum
- **Estado final do working tree:** limpo após o commit

## Uso de contexto / sessão

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
