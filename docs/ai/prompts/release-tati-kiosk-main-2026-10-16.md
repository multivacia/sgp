# SGP+ — Release controlada: ajustes da Tati + pesquisa OS & Atividade do Kiosk

**TASK_ID:** `release-tati-kiosk-main-2026-10-16`  
**Repositório:** `multivacia/sgp`  
**Executor recomendado:** Claude Code, agente `sgp-implementer` para alterações de código  
**Modelo/esforço:** Claude Opus, esforço alto (ou modelo mais capacitado disponível)

## Instrução do responsável — atualização de escopo em 16/10/2026

O objetivo **não é mais publicar somente a pesquisa do Kiosk**. A release destinada à `main` deverá conter:

1. **As dez solicitações da Tati de 07/10/2026** (item 1: Guias Práticos; itens 2–10: funcionalidades e correções).
2. **Pesquisa `OS & Atividade` do Kiosk**, nas caixas `Buscar atividade…` e `Outra atividade`, já homologada pelo usuário na implementação da `develop`.

Não transformar esta instrução de **inclusão no escopo** em aceite automático dos demais comportamentos, nem em autorização para alterar regras operacionais não listadas. A publicação em `main` aciona deploy automático; portanto, esta rodada termina preparando e validando a **release candidata e PR**, com gate de homologação. **Não fazer merge em `main`, deploy, alteração na VPS, migração de banco ou mudança em `homol`/`develop` sem gate adicional explicitamente satisfeito.**

## 1. Contexto auditado (revalidar imediatamente)

- `origin/main`: `c611d10feacf329bdc217fe391ebf47a90a6ea7a` — versão 1.9.8, produção observada na última auditoria.
- `origin/develop`: `247b698589edf78d90f01461b264821f143ccd5a` — versão 1.9.9, PR #37 já integrada.
- `origin/homol`: `6b768c852a18b7428e3dadf761bad7e35c1d61ef`, bastante defasada.
- Auditoria detalhada: `docs/ai/returns/promocao-main-deploy-producao-2026-10-16-retorno.md` na branch `ccr-fbc450f2-g81mhb` (`30fe3ed2`).
- Retornos da Tati: `docs/ai/returns/ajustes-tati-2026-10-07-retorno.md`, `docs/ai/returns/ajustes-tati-2026-10-07-integracao-retorno.md`.
- Retorno da pesquisa Kiosk: `docs/ai/returns/kiosk-busca-os-atividade-retorno.md`.
- Commits funcionais de integração da Tati: `935dc943` e `438f8a00`; guias `3d6f1a30` e revisões posteriores, como `a4a3d5d6`.
- Pesquisa do Kiosk: `f4d38a42`, `4a0bc0bf`, integrados pela [PR #37](https://github.com/multivacia/sgp/pull/37) (merge `247b6985`).
- O código da `develop` mistura, em determinadas rotas de produção, a pesquisa com a **nova regra de apontamento somente em atividades planejadas**, que **não foi homologada para produção**.
- O CI `verify` não usa PostgreSQL real. A auditoria executou banco isolado e identificou **duas falhas novas**: contrato de campos sensíveis do Kiosk e fixture do teste de busca `&`.
- `server/migrations/` não apresentava diferenças entre `main` e `develop` na auditoria; a aplicação efetiva do schema de produção continua **não verificada**.

Ler antes de editar, na ordem: `AGENTS.md`, `CLAUDE.md`, `docs/ai/context/PROJECT_CONTEXT.md`, `docs/ai/context/SESSION_CHECKPOINT.md`, os três retornos acima e os testes citados. Realizar `git fetch origin --prune`, validar SHAs atuais, working tree, CI e regras de merge. Se o repositório avançou, recalcular o escopo; os SHAs acima são referências, não comandos cegos.

## 2. Escopo funcional obrigatório: todas as solicitações da Tati

Conferir contra o prompt e o retorno original; a tabela é inventário resumido, não substitui os critérios detalhados da fonte.

| Item | Entrega a incluir e validar |
| --- | --- |
| 1 | **Guias Práticos de Colaborador e Gestor** revisados, capturas e conteúdo atualizados. Confirmar acesso pelo fluxo oficial e permissões do guia de gestor; incluir apenas dependências realmente indispensáveis do menu Ajuda e tema, sem arrastar alterações de interface não autorizadas. |
| 2 | **Apontar horas — pesquisa `Esteira/OS & atividade`** num único campo (`7070 & XPTO`), parcial, tolerante a acentos e caixa no modo `&`; manter pesquisa livre preexistente sem `&`. |
| 3 | **Evolução das Esteiras — PDF** com seleção retrato/paisagem, quebras e múltiplas páginas corretas, sem interferir na impressão térmica. |
| 4 | **Minha Fila — pesquisa por período** de até 92 dias, atravessando semanas publicadas, com datas e totais coerentes. |
| 5 | **Planejamento — pesquisa por período** atravessando semanas e preservando a navegação e o quadro semanal. |
| 6 | **Minha Jornada — período** com datas opcionais e validação consistente. |
| 7 | **Extra Esteira — exibição** em jornadas de colaborador/gestor e preservação do histórico após exclusão lógica do catálogo. |
| 8 | **Justificativas/observações — exibição** em jornadas e apontamentos pertinentes, preservando permissões e histórico. |
| 9 | **Dashboard — atualização de cards** após apontamentos, sem polling desnecessário e sem alterar regras canônicas de agregação. |
| 10 | **Exportação Excel para IA** do Planejamento, por semana ou período, incluindo 5 abas (Prompt para IA, Backlog, Planejado, Carga dos colaboradores, Carga por dia), campos e cores, dados reais da API, fórmulas de carga, proteção contra perda de planejamentos e limites documentados para alocações somente por equipe. |

A **pesquisa do Kiosk** é um item adicional: busca na caixa principal e em `Outra atividade`, por OS, atividade e combinação `7070 & XPTO`, mantendo visualização, ordem, seleção, PIN, permissões e apontamentos. Compatibilizar a regra com o item 2 sem importar automaticamente regras de elegibilidade adicionais.

## 3. Fora de escopo por padrão / decisões obrigatórias

- **Não incluir automaticamente `apontamento-somente-planejado`** (`allOpenPlanned`, rejeição `TIME_ENTRY_NOT_PLANNED` e novas regras para colaborador/gestor). Ela muda fortemente a rotina da fábrica, e sua homologação específica não foi demonstrada. Se for tecnicamente inseparável do pacote Tati + Kiosk, **parar antes da PR de release** ou abrir uma decisão explícita de ampliação de escopo; jamais introduzir a regra silenciosamente.
- Não transportar por conveniência toda a `develop`: o delta auditado foi de **67 commits / 269 arquivos**, incluindo ajuda/manual, tema e textos pt-BR que podem estar fora do escopo atual. Dependências estritamente necessárias devem ser justificadas uma a uma. Não remover funcionalidades já existentes na `main`.
- Não incluir PRs pendentes: backup/restore #36, ajustes de data #27, redesign do Kiosk #21, capacidade #7, homologação #4, nem outras branches não aprovadas.
- **Não presumir que os dez itens da Tati foram homologados.** A mensagem do usuário aprova que sejam incluídos na release planejada; antes de publicação exigir aceite explícito do conjunto ou comprovação item a item pelo responsável. Registrar a matriz de aceite e os testes na PR.
- **Não interpretar o aceite da pesquisa na `develop` como homologação de uma implementação diferente sobre `main`.** Será exigido novo teste/homologação da combinação Tati + Kiosk, inclusive com dados reais de homologação.
- Preservar dados e permissões; não usar migrations em base compartilhada, mudar secrets ou fazer deploy durante esta atividade.

## 4. Estratégia Git e dependências

1. Criar worktree/branch **a partir da `main` corrente**, por exemplo `release/tati-kiosk-main-2026-10-16`; não fazer merge indiscriminado da `develop` ou rebase/force em branches compartilhadas.
2. Elaborar **matriz de dependências de código** do escopo Tati + Kiosk, relacionando commits originais, arquivos e componentes, especialmente `my-activities`, `my-work-queue`, `operational-planning`, `operational-journey`, `production-work-queue`, exportações e guias. Distinguir alterações necessárias de evoluções posteriores sem aprovação.
3. Portar seletivamente as mudanças aprováveis, preferindo commits com autoria preservada onde livres de efeitos colaterais. Se houver mistura de funcionalidades em um mesmo commit, portar **trechos específicos com testes**, documentando qualquer divergência. Resolver conflitos mantendo contratos atuais da `main` e todas as entregas listadas no item 2.
4. Conferir a integração dos guias: capturas, instruções e menu Ajuda precisam representar o **comportamento efetivamente incluído** nesta release; não deixar documentação de recursos que foram excluídos.
5. Não usar patch de versão 1.9.9 como atalho: propor `app-version.json` e `releaseName` fiéis ao pacote resultante, verificar testes de versão; não alterar versão sem registrar o critério e sem revisão.
6. Confrontar cada arquivo modificado com uma entrega do item 2 ou dependência obrigatória. Relatar separadamente **novas dependências não autorizadas**; se exigirem mudança de regra, interromper e solicitar decisão.
7. Manter `develop`, `main` e `homol` intactas nesta etapa. Apenas branch de release, commits normais e PR **sem merge** estão autorizados.

## 5. Gate de privacidade/contrato do Kiosk — obrigatório

Na `develop`, o endpoint `GET /api/v1/production/me/work-queue` passou a enviar `clientName`, `vehicleDescription`, `licensePlate` com `conveyorCode`. Isso quebra um teste de contrato que proíbe os três primeiros campos; a auditoria reproduziu o problema com banco real.

- **Manter fora da resposta do Kiosk `clientName`, `vehicleDescription` e `licensePlate`** (e demais campos expressamente proibidos pelo contrato), sem desabilitar/enfraquecer o teste.
- O código de OS (`conveyorCode`) pode ser avaliado estritamente como identificador operacional mínimo, com teste de autorização e documentação do contrato.
- Caso seja necessário preservar a semântica de pesquisa Tati por cliente/veículo/placa, realizar a busca **no backend**, se tecnicamente viável, sem expor esses dados no payload do Kiosk. Não ampliar por padrão os campos visíveis para o usuário de fábrica. Se a compatibilidade exata for impossível dentro do escopo, registrar a divergência para a homologação humana.
- Criar fixture de integração com **ao menos um item retornado**, garantindo que o contrato nunca passe por ser testado apenas sobre lista vazia.
- Preservar isolamento de sessões Kiosk e RBAC; verificar ausência de vazamento lateral entre colaboradores e que um código de OS não desbloqueie apontamento indevido.

## 6. Gate de testes reais — obrigatório

Executar com PostgreSQL **local e descartável**, em banco dedicado criado para esta análise. Não utilizar `sgp_prod`, não reutilizar credenciais de produção. No mínimo:

- `npm ci`, `npm --prefix server ci`, `npm run verify:deploy`, typecheck do servidor, lint de código-fonte e testes focalizados; depois integração com banco da release candidata, comparando falhas reais com baseline `main` **sob as mesmas condições**. Não declarar sucesso geral porque `verify:deploy` passa.
- Corrigir a **fixture** do teste de `Outra atividade` da `develop`: o caso `OS & atividade` deve ter item de plano publicado quando a regra efetivamente incluída na candidata assim exigir. Usar `seedPublishedPlanItem` ou equivalente e cleanup correto; não relaxar regra de negócio para passar teste.
- Cobrir item 1 a 10 com testes e/ou evidência de uso real: datas em semanas distintas, validação 92 dias, abas/fórmulas/cores do XLSX, PDF retrato/paisagem multipágina, histórico de Extra Esteira, justificativas e atualização do Dashboard após apontamento.
- Busca web e Kiosk: `7070`, `XPTO`, `7070 & XPTO`, `7070 &`, `& XPTO`, outra OS com mesma atividade, espaços, acentos, caixa e pesquisa livre sem `&`; após a busca selecionar e efetuar apontamento. Verificar critérios e autorização tanto na lista principal quanto em `Outra atividade`.
- Testes de contrato para **campos sensíveis ausentes com lista não vazia**, sessões inválidas, colaborador sem permissão e isolamento de Kiosk.
- Regressão do fluxo completo de registro de tempo, planejamento publicado e status das esteiras, além dos papéis Admin/Gestor/Colaborador.
- Registrar, com comandos, contagens, exit codes e provas, falhas preexistentes versus regressões introduzidas. Não mascarar, excluir ou ignorar novos testes falhando.

## 7. Critérios de PR pronta para homologação

A PR deve incluir:

1. Matriz rastreável dos **10 itens Tati + Kiosk**, com arquivos, rotas e testes de cada um, e limitações conhecidas.
2. Lista de dependências adicionais necessárias e prova de que nenhuma regra de apontamento apenas planejado foi incorporada silenciosamente.
3. Testes com banco local, especialmente as **duas novas falhas identificadas**, resolvidas e reproduzidas.
4. Comparação dos contratos `main` → candidata, alertas de privacidade e performance (especialmente consulta multissemanal, export Excel e pesquisa).
5. Plano de homologação por perfil e em ambiente isolado, incluindo exportação de planilha real, impressão no navegador da fábrica e comparação web/Kiosk.
6. Revisão de versionamento e plano de integração posterior com `develop`, sem perder alterações já existentes lá.
7. Resultado final classificado como `PRONTA PARA HOMOLOGAR`, `BLOQUEADA POR DEPENDÊNCIA` ou `REPROVADA`; nunca presumir `HOMOLOGADA` sem retorno humano.

## 8. Gate futuro de promoção/produção (não executar agora)

**Somente após homologação explícita dos itens Tati + Kiosk e correção dos bloqueios:**

- Confirmar a política `homol`: ambiente separado disponível ou exceção de processo aprovada e documentada. `homol` defasada não pode receber merge às cegas.
- Acesso autorizado à VPS/HostGator para verificar **backup recuperável** da aplicação, frontend e PostgreSQL, junto de restauração validável. Não confundir simples presença de arquivo com backup restaurável.
- Inspecionar read-only o esquema de `sgp_prod` e a situação real de migrations (o migrador pode reexecutar SQL; **não rodá-lo cegamente**).
- Preparar plano de rollback **do backend e frontend**: o workflow `Deploy HostGator VPS` em push da `main` usa `git reset --hard` no servidor, `npm ci`, build, cópia `rsync` e `pm2 restart`. Há backup de frontend, mas isso por si só não demonstra rollback completo.
- Validar saúde HTTP real, funcionalidades críticas, logs e capacidade de restaurar a versão anterior se falhar. Conferir SHAs imediatamente antes/depois do merge.
- **Nova instrução humana de liberação** deve identificar a PR e o SHA candidato aprovados. Somente então integrar em `main` usando método compatível com as regras Git e monitorar workflow e produção. Nunca forçar push.

## 9. Entregáveis e documentação

- Branch candidata a partir da `main` e PR com base em `main`, **aberta e não mergeada**, se todos os gates técnicos forem satisfeitos.
- Se houver bloqueio de dependência, abrir apenas branch de análise ou registrar o resultado; não apresentar uma PR quebrada como pronta.
- Prompt no repositório: `docs/ai/prompts/release-tati-kiosk-main-2026-10-16.md`.
- Retorno obrigatório: `docs/ai/returns/release-tati-kiosk-main-2026-10-16-retorno.md`, conforme `CLAUDE.md`, com status, SHAs, diff, testes e saídas reais, mapa de riscos, validações pendentes, próximos passos e estado do working tree. Não publicar o retorno automaticamente na `main`.
- Relatar o link da PR candidata, SHA inicial/final, número de arquivos e se há qualquer alteração em `main`/`develop`/`homol` ou produção (o resultado correto nesta etapa será **nenhuma**).

**Condição de parada prioritária:** se o pacote Tati + Kiosk exigir a nova regra de apontamentos não homologada, exposição indevida de dados ou mudanças significativas fora do escopo, **interromper sem promover nada**. Explicar claramente as alternativas e decisões necessárias. Não escolher uma liberação mais ampla por conta própria.
