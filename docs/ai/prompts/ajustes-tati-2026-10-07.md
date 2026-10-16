# SGP+ — Ajustes alinhados com a Tati (07/10/2026)

**Modelo recomendado:** GPT-6.1-Sol ou Claude Opus, com esforço **alto**.

## Objetivo

Investigar, corrigir e validar os nove pontos abaixo no repositório `multivacia/sgp`, sem regressão de funcionalidades existentes. A validação funcional com a Tati ocorrerá em 08/10/2026, entre 09:00 e 09:30 (horário de São Paulo).

1. Revisar e reconstruir primeiro os **Guias Práticos de Colaborador e Gestor**, com capturas detalhadas das telas. O manual completo não faz parte desta rodada.
2. Em **Apontar horas**, permitir filtrar na mesma pesquisa por **esteira** e **atividade**.
3. Em **Evolução das Esteiras**, verificar e, se tecnicamente seguro, disponibilizar exportação PDF em **retrato** e **paisagem**.
4. Em **Minha Fila**, permitir pesquisa por período.
5. Em **Planejamento**, permitir pesquisa por período.
6. Em **Minha Jornada**, permitir pesquisa por período.
7. Corrigir a não exibição de apontamentos **Extra Esteira**.
8. Corrigir a não exibição das **justificativas dos apontamentos**.
9. Corrigir a falta de atualização dos cards do **Dashboard**.
10. No **Planejamento**, exportar para Excel o Backlog, o que já está planejado no recorte e a carga horária dos colaboradores, para uso posterior por uma IA de sugestão de planejamento.

## Regras obrigatórias

- Leia integralmente `AGENTS.md`, `CLAUDE.md`, `docs/ai/context/PROJECT_CONTEXT.md` e `docs/ai/context/SESSION_CHECKPOINT.md`, se existirem, antes de alterar qualquer arquivo.
- Execute `git fetch origin --prune` e registre os SHAs de `origin/main`, `origin/develop` e `origin/homol`.
- **Não trabalhe no checkout atual**, pois ele pode estar sujo e em uma branch documental. Crie um worktree novo e uma única branch dedicada a partir do tip confirmado de `origin/develop`, por exemplo `fix/ajustes-tati-2026-10-07`.
- Não altere `main`, `develop`, `homol`, branches documentais, versões, infraestrutura, autenticação, RBAC, migrations ou dados de produção, exceto se a investigação demonstrar que uma migration é indispensável. Nesse caso, pare e peça autorização explícita com a justificativa.
- Não faça merge, rebase, force-push, deploy, exclusão de branch, nem publique a branch sem autorização explícita após a revisão do resultado.
- Preserve rotas, guards, permissões, filtros existentes, Kiosk, exportações já disponíveis e a agregação canônica do Dashboard. Não resolva divergência visual com números inventados no frontend.
- Não inclua arquivos gerados, `.env`, `node_modules`, `dist`, chaves ou dados reais de clientes no commit.

## Etapa 1 — Diagnóstico completo antes da alteração

Para cada um dos nove itens, localize tela, rota, controller/service/repository, contratos e testes relacionados. Registre:

- comportamento atual comprovado;
- causa-raiz ou limitação técnica;
- arquivos que precisarão mudar;
- impacto e risco de regressão;
- critério objetivo de aceite;
- se o item é correção, melhoria pequena, ou precisa de uma decisão de produto.

Faça uma execução local com dados simulados ou testes existentes, quando possível. Para os itens 7 a 9, rastreie o dado da origem até a renderização, incluindo filtros, cache/query invalidation, serialização e agregações; não conclua apenas pela inspeção do componente visual.

## Etapa 2 — Implementação delimitada

Após o diagnóstico, implemente somente as soluções compatíveis com as regras abaixo.

### 1. Guias Práticos de Colaborador e Gestor — prioridade desta rodada

O feedback da Tati é que os Guias Práticos atuais estão pobres, confusos e contêm orientações que não correspondem ao que o sistema permite fazer. Portanto, trate os guias como material operacional prioritário e **não invista tempo agora na revisão do Manual do Usuário completo** (mais de 260 páginas).

- Localize os dois guias canônicos: um de **Colaborador** e outro de **Gestor**. Não crie uma terceira fonte concorrente nem substitua o manual completo.
- Audite cada orientação do guia contra o código e, quando possível, contra execução local com dados fictícios. O comportamento do sistema é a fonte da verdade.
- Remova ou corrija no fluxo principal toda orientação incompatível com a aplicação. Não mantenha instruções ambíguas para "ajudar" o usuário.
- **Nada pode ser ignorado:** toda divergência entre a orientação atual e o sistema, comportamento que não puder ser comprovado, ambiguidade de regra de negócio ou ponto que fique confuso/bloqueado para a execução deve ser incluído em um capítulo próprio, ao final de cada Guia Prático, chamado **"Divergências, ressalvas e decisões pendentes"**.
- Para cada item desse capítulo, registrar: orientação/tela afetada, perfil afetado, evidência no código ou na execução, comportamento observado, impacto operacional, risco de manter o texto atual e a decisão necessária. Não inventar a decisão e não tratar a ressalva como funcionalidade entregue.
- Os itens desse capítulo devem ter identificadores estáveis (por exemplo, `GUIA-COL-001` e `GUIA-GES-001`) e ser referenciados na seção correspondente do guia, quando necessário.
- Reestruture ambos os guias em jornadas curtas e orientadas à ação: o que fazer, onde clicar, o que deve acontecer, bloqueios/validações relevantes e como recuperar-se de um erro comum.
- Inclua capturas de tela detalhadas e legíveis para cada passo/tela importante, com dados integralmente fictícios. As imagens devem mostrar o estado correto da tela, filtros ou campos relevantes, resultado esperado e mensagens de validação quando forem necessárias para a operação.
- Não use imagens decorativas nem invente estados. Se uma tela não puder ser capturada fielmente, registre o bloqueio e use uma imagem de ambiente simulado somente se reproduzir com precisão a regra confirmada no código.
- Preserve privacidade: nunca use dados reais de colaboradores, clientes, OS, e-mails, documentos ou credenciais nas capturas.
- Mantenha o guia visualmente leve, com índice, capítulos por tarefa e links/âncoras internos quando o formato permitir. Evite transformar o Guia Prático em uma cópia do manual extenso.
- Para cada funcionalidade alterada nesta tarefa, atualize o(s) Guia(s) Prático(s) afetado(s) somente depois da implementação e da validação funcional.
- No retorno, apresentar uma tabela de cobertura: jornada do guia, perfil (Colaborador/Gestor), tela/captura, regra comprovada no código, divergência corrigida e identificador de ressalva/decisão pendente, quando houver.

### 2. Apontar horas: pesquisa de Esteira + Atividade por `&`

- Manter um único campo de pesquisa e interpretar `&` como separador entre **esteira** (lado esquerdo) e **atividade** (lado direito).
- Exemplo obrigatório: ao pesquisar `7070 & XPTO`, localizar a esteira/OS `7070` e retornar somente suas atividades cujo nome contenha `XPTO`: `corte do tecido XPTO`, `Costura do tecido XPTO` e `Revestir banco com tecido XPTO`.
- Exemplo obrigatório: ao pesquisar `7070 & banco`, localizar a esteira/OS `7070` e retornar somente `Revestir banco do couro` e `Revestir banco com tecido XPTO`.
- A busca deve ser parcial, sem diferenciar maiúsculas/minúsculas e sem diferenciar acentos. Remover espaços extras ao redor do `&`.
- Sem `&`, manter a pesquisa atual, sem mudar o comportamento de links, filtros e resultados existentes.
- Não trate os dois termos como uma busca livre única em todos os campos: o termo esquerdo restringe a esteira e o direito restringe as atividades pertencentes a ela.
- Mostrar no placeholder uma orientação curta, por exemplo: `Esteira & atividade (ex.: 7070 & XPTO)`.
- Backend deve continuar sendo a autoridade dos dados; não filtre apenas a lista já carregada caso isso oculte paginação ou registros.

### 3. Evolução das Esteiras: PDF

- Primeiro confirme qual biblioteca/rota gera o PDF e se já há suporte nativo à orientação.
- Caso seja seguro, ofereça escolha explícita de **Retrato** ou **Paisagem**, com retrato como padrão para preservar o comportamento atual.
- Valide que os dois arquivos são gerados, abrem e não cortam título, colunas, legendas ou conteúdo de mais de uma página.
- Caso a solução exija reescrever motor de PDF, dependência nova de alto impacto ou gere regressão, não implemente por aproximação: registre alternativa, esforço e bloqueio para decisão.

### 4–6. Pesquisa por período

Aplicar em **Minha Fila**, **Planejamento** e **Minha Jornada**, reutilizando o padrão de filtro de período já canônico no sistema, se houver.

- Definir claramente a semântica de cada tela antes de codificar: qual data o período filtra (criação, planejamento, execução/apontamento ou vigência) e por quê.
- Intervalo inclusivo, data inicial e final opcionais, validação `início <= fim`, timezone `America/Sao_Paulo` e feedback visível ao usuário.
- O filtro deve ser refletido na consulta/endpoint e na exportação, se a tela tiver exportação vinculada.
- Não usar filtro apenas no frontend quando a tela for paginada ou possuir totais agregados.
- Preservar demais filtros e a compatibilidade de links/URLs existentes.

### 7. Extra Esteira não exibido

Confirme quais tipos/status de apontamento são considerados Extra Esteira e em quais telas deveriam aparecer. Corrija a origem, contrato, agregação e/ou renderização necessária, preservando apontamentos normais e Kiosk. Inclua ao menos um caso de teste que cubra a exibição e os totais, quando aplicável.

### 8. Justificativas não exibidas

Rastreie o campo desde a persistência até a API e a tela. Verifique inclusive diferenças entre justificativa de catálogo, texto livre e permissão de visualização. Não exponha justificativa a um perfil que hoje não tenha permissão para consultar o apontamento. Cubra com teste ou cenário reprodutível.

### 9. Cards do Dashboard não atualizam

- Reproduza o problema alterando um dado que deva afetar os cards.
- Preserve a arquitetura: a projeção operacional e a fila/backlog têm eixos distintos; filtros se aplicam somente ao agregado central, conforme a implementação canônica.
- Corrija invalidação de cache, refetch, estado derivado ou consulta de origem que for comprovadamente responsável.
- Não adicione atualização contínua/polling sem necessidade e não duplique regra de negócio no frontend.

### 10. Planejamento: exportação Excel para apoio de IA

- Antes de implementar, verificar se já existe trabalho, branch, endpoint ou planilha de exportação de planejamento e evoluí-lo sem duplicar comportamento ou quebrar o export atual.
- A exportação deve respeitar o escopo selecionado na tela: **semana**, quando a consulta estiver por semana, ou **período**, quando o novo filtro de período estiver em uso.
- Gerar um `.xlsx` com abas separadas e nomes claros, no mínimo:
  1. **Backlog** — atividades ainda disponíveis para planejamento, com todos os atributos já existentes e necessários para a decisão (identificadores, esteira/documento, atividade, equipe/responsável quando houver, quantidade, duração/horas previstas, prioridade, prazo e situação).
  2. **Planejado** — atividades já planejadas no recorte, incluindo semana/data, colaborador(es) ou equipe, horas previstas, quantidade, status e demais dados usados no planejamento.
  3. **Carga dos colaboradores** — para cada colaborador elegível no escopo, equipe, jornada/capacidade configurada para o recorte, horas já planejadas, saldo disponível e percentual de ocupação. Não inventar capacidade: derivar das regras e dados canônicos já existentes.
- O Backlog representa o estoque atual elegível; as abas **Planejado** e **Carga dos colaboradores** devem obedecer exatamente à semana ou ao período selecionado.
- Se já existir uma aba de instruções/prompt para IA, preservá-la e atualizá-la para orientar a IA a: não alterar atividades já planejadas, respeitar capacidade/saldo de cada colaborador, datas/prazos, equipe, duração e prioridades. Se não existir, incluir uma aba **Prompt para IA** com essa instrução e explicar os campos da planilha.
- Aplicar a formatação e as cores canônicas já usadas nas planilhas de exportação; usar cabeçalhos legíveis, filtros, congelamento da primeira linha e datas/horas em formatos inequívocos. Não usar cor como única fonte de significado.
- A geração deve partir do backend/contrato canônico e cobrir registros paginados, sem depender somente dos dados já carregados no navegador.
- Validar a planilha real abrindo o `.xlsx` e conferindo abas, cabeçalhos, fórmulas/totais quando houver, filtros, cores e consistência entre Planejado e Carga dos colaboradores.

## Validação obrigatória

1. Execute os testes específicos descobertos no repositório para cada domínio alterado.
2. Execute typecheck/lint quando houver scripts aplicáveis; se houver falhas preexistentes, diferencie-as com evidência.
3. Execute `npm run build` (e o build do servidor, se separado e aplicável).
4. Faça validação manual local das dez jornadas, usando dados fictícios/mocks quando necessário.
5. Confirme explicitamente que os filtros combinados, períodos, exportações, Extra Esteira, justificativas e Dashboard não afetaram permissões, paginação, totais ou telas não relacionadas.

## Entregáveis antes de qualquer publicação

- Um retorno em `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md` com: branch, SHA base/final, status do worktree, diagnóstico item a item, arquivos alterados, decisões de semântica, testes/comandos/resultados reais, limitações, riscos e roteiro objetivo de validação com a Tati.
- Atualização de `docs/ai/context/SESSION_CHECKPOINT.md` somente se as regras do repositório exigirem.
- Commit local coeso, limitado ao escopo, sem publicar.

Pare e reporte antes de continuar caso encontre dados sensíveis, alteração estrutural/migration necessária, ambiguidade de regra de negócio, ou impossibilidade de reproduzir algum dos defeitos.
