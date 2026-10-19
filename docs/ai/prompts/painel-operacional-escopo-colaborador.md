# Claude Code — Painel Operacional: escopo por colaborador

## Modelo e esforço recomendados

- Modelo: o mais capaz disponível no Claude Code (preferencialmente Opus).
- Esforço: alto.

## Objetivo

Partindo da `develop` atual do repositório `multivacia/sgp`, implemente a seguinte regra de negócio **somente para a listagem que abastece o Painel Operacional** (`/app/backlog`):

| Perfil autenticado | Esteiras que o Painel Operacional deve exibir |
| --- | --- |
| `COLABORADOR` | Somente as OSs que tenham pelo menos uma atividade ativa alocada diretamente para o colaborador vinculado ao usuário logado. |
| `GESTOR`, `ADMIN` e demais perfis não-colaborador | Todas as OSs, mantendo exatamente o comportamento atual. |

Exemplo obrigatório: se a Edna não estiver alocada diretamente em nenhuma atividade da OS `7070`, a OS `7070` não pode aparecer na tabela, nos cartões, na paginação ou nas opções de filtros do Painel Operacional dela.

## Escopo congelado — obrigatório

1. **Não altere nenhuma outra tela** que lista, consulta, planeja, aponta ou detalha esteiras.
   - Não alterar Minha fila, Minha jornada, Apontamento de horas, Kiosk, Planejamento Semanal, Agenda da semana, Dashboard, Evolução das Esteiras ou detalhe da esteira.
   - Não alterar rotas de detalhe (`GET /conveyors/:id`) nem suas permissões.
2. Não criar filtro visual novo no frontend e não enviar `collaboratorId` pela URL ou pelo cliente.
3. Não mudar o comportamento de gestor/admin.
4. Não incluir alocação por equipe neste critério. Para esta demanda, “alocada no nome dele” significa somente:
   - `conveyor_node_assignees.assignment_type = 'COLLABORATOR'`; e
   - `conveyor_node_assignees.collaborator_id` igual ao colaborador vinculado à conta logada.
5. Não fazer refactors, renomes, formatação ampla, alterações de manual, migrations, versão, deploy, merge ou push fora do estritamente necessário. Não faça merge nem push sem autorização explícita posterior.

## Diagnóstico já confirmado

- O Painel Operacional usa `src/pages/BacklogPage.tsx` e chama `listConveyors()`.
- O único consumidor frontend de `listConveyors()` é o Painel Operacional.
- Essa chamada usa `GET /api/v1/conveyors`.
- Hoje essa rota exige apenas `requireAuth()` e o repositório lista `conveyors` globalmente; os filtros atuais são `q`, `priority`, `responsible` e `operationalStatus`.
- O perfil autenticado pode ser obtido no servidor por `app_users` + `app_roles`: há `role_code` e `collaborator_id`. O código do perfil de colaborador é `COLABORADOR`.
- A fonte de verdade das alocações diretas é `conveyor_node_assignees`; as alocações são em nós `STEP`.

## Implementação esperada

1. Antes de editar, leia integralmente as instruções do repositório aplicáveis (`CLAUDE.md`, `AGENTS.md`, `PROJECT_CONTEXT.md`, `SESSION_CHECKPOINT.md` e regras locais, se existirem). Faça `git fetch origin develop`, confirme que a base local é a `develop` atual e registre o SHA inicial.
2. Crie uma branch de trabalho a partir da `develop`, por exemplo `fix/painel-operacional-escopo-colaborador`.
3. Implemente o escopo no **backend** da listagem `GET /api/v1/conveyors`; não resolva isto apenas no frontend.
   - No controller/serviço, derive o escopo a partir do usuário autenticado no servidor.
   - Para `role_code = 'COLABORADOR'`, passe ao repositório um escopo interno com o `collaborator_id` da conta.
   - Para os demais perfis, passe escopo global.
   - Se uma conta `COLABORADOR` não tiver `collaborator_id`, a resposta deve ser `200` com lista vazia. Nunca pode haver fallback para a lista global.
4. No SQL de `listConveyors`, quando o escopo for de colaborador, adicione um predicado `EXISTS` correlacionado à OS que exija:
   - alocação não excluída (`cna.deleted_at IS NULL`);
   - `cna.assignment_type = 'COLLABORATOR'`;
   - `cna.collaborator_id` igual ao colaborador do usuário;
   - o nó associado ser um `STEP` ativo e não excluído (`node_type = 'STEP'`, `is_active = TRUE`, `deleted_at IS NULL`).
   - Não use `JOIN` direto que possa duplicar uma OS com várias atividades da mesma pessoa.
   - Não recorte por situação da atividade (concluída/dispensada) além da regra acima: a regra de negócio é existência de atividade alocada na OS, e não apenas atividade pendente.
5. Preserve integralmente os filtros existentes (`q`, prioridade, responsável e situação) e a ordenação atual. Eles devem ser aplicados sobre o conjunto já autorizado ao colaborador.
6. Não altere `BacklogPage.tsx`, salvo se uma necessidade estritamente técnica e diretamente causada pelo contrato exigir isso. A intenção é que os KPIs, os filtros, as opções de responsável, a paginação e a tabela já reflitam o conjunto retornado pela API sem mudança visual.

## Testes obrigatórios

Inclua ou adapte testes automatizados da rota/serviço de listagem. Não use somente teste unitário de SQL se já houver infraestrutura de integração HTTP adequada.

Cobrir no mínimo:

1. Colaborador vinculado com alocação direta em uma atividade da OS: a OS é retornada.
2. Colaborador vinculado sem alocação direta na OS `7070`: a OS não é retornada.
3. A mesma OS com duas ou mais atividades do colaborador: aparece uma única vez.
4. Alocação apenas por equipe: não torna a OS visível para este requisito.
5. Conta `COLABORADOR` sem `collaborator_id`: retorna `200` e lista vazia.
6. Gestor e Admin continuam recebendo todas as OSs, inclusive uma sem alocação para eles.
7. Pelo menos um filtro existente continua funcionando dentro do escopo do colaborador.

Execute os testes direcionados e os checks de tipo/lint definidos pelo repositório. Não masque falhas preexistentes: se houver alguma, separe-a do resultado desta alteração.

## Entrega esperada

Ao terminar, não faça merge nem push. Retorne um relatório objetivo contendo:

- SHA inicial da `develop` e branch criada;
- arquivos alterados e justificativa de cada um;
- regra de visibilidade final, inclusive o tratamento de conta sem vínculo;
- testes executados e resultados;
- confirmação explícita de que nenhuma das telas congeladas foi alterada;
- pendências ou riscos, se existirem.
