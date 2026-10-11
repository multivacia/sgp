# Auditoria Funcional e Matriz Mestre de Documentação — SGP+

**Repositório:** `multivacia/sgp`  
**Branch de referência:** `develop`  
**Commit analisado:** `c611d10feacf329bdc217fe391ebf47a90a6ea7a`  
**Data da fotografia:** 2026-10-03  
**Fotografia anterior:** `8e9fd062c6edf350ffab095c6aba986dd9520860` (2026-10-01)  
**Natureza:** **matriz técnica / fonte funcional auditável.** Não é o manual do usuário.  
**Manual do usuário:** `docs/manual/source/MANUAL_USUARIO_SGP.md` — artefato canônico destinado ao usuário final, do qual HTML/PDF devem ser derivados. Este documento não deve ser convertido em tutorial passo a passo.  
**Regra de atualização:** qualquer mudança de comportamento, estado, permissão, validação, mensagem relevante ou efeito sistêmico deve avaliar atualização deste documento  
**Documentos atuais analisados (alvo das classificações de cobertura):**
- `docs/manual/colaborador.html`
- `docs/manual/gestor-esteira.html`

**Método desta revisão:** auditoria por leitura de código, migrations e testes do repositório. **Nenhuma tela foi executada ou observada visualmente e nenhum banco foi consultado.**

**Revisão de 2026-10-03 — correções factuais aplicadas:** ATI-001 (estados efetivamente persistidos), ATI-003/ATI-005 (duas ações distintas com o mesmo destino), 45.4/45.5 (vocabulário de alocação), JOG-002/45.8 (seleção multi-colaborador e tetos), VAL-004, VAL-006, VAL-013 (0 minutos no Modo Fábrica), VAL-014, VAL-015 e VAL-017. Evidências em:
`docs/ai/reports/auditoria-cobertura-funcional-manual-2026-10-02/RELATORIO_AUDITORIA_COBERTURA_FUNCIONAL_MANUAL.md`

---

# 1. Objetivo e método

Este documento é a fonte mestre para reconstrução da documentação funcional do SGP+.

O objetivo não é apenas explicar telas, mas registrar de forma rastreável:

- o que o sistema faz;
- em quais condições faz;
- quem pode executar;
- quais estados e pré-condições estão envolvidos;
- quais validações existem;
- quais mensagens podem ser exibidas;
- quais efeitos indiretos a ação provoca em outros módulos;
- o que fica registrado em histórico ou auditoria;
- quais diferenças existem entre Web, Produção Web e Kiosk;
- se a funcionalidade está corretamente documentada nos manuais atuais;
- onde existe divergência entre código, interface e documentação.

A análise considera a implementação observável na `develop`, privilegiando o fechamento do triângulo:

`Frontend → Backend → domínio/persistência`

Sempre que não for possível chegar a uma conclusão segura, o ponto é marcado como **PENDENTE DE VALIDAÇÃO** e consolidado somente no final do documento, na seção **Pontos sem consenso / decisões funcionais necessárias**.

## 1.1 Classificação da cobertura documental

> **Referente das classificações.** Toda avaliação de "Cobertura atual" neste documento — inclusive a coluna homônima da tabela 2.1 e a tabela da seção 37 — refere-se aos **HTML derivados já existentes** (`docs/manual/colaborador.html` e `docs/manual/gestor-esteira.html`), **não a este arquivo** nem ao novo `MANUAL_USUARIO_SGP.md`. Ler "AUSENTE" como se descrevesse a cobertura deste documento é um erro de leitura.

Cada funcionalidade recebe uma destas classificações:

| Classificação | Significado |
|---|---|
| OK | Documentação representa adequadamente o comportamento |
| PARCIAL | Funcionalidade aparece, mas faltam regras relevantes |
| SUPERFICIAL | Apenas caminho feliz ou descrição genérica |
| AUSENTE | Funcionalidade não aparece |
| INCORRETO | Manual contradiz a implementação |
| DIVERGENTE | Canais ou camadas do sistema se comportam de forma diferente |
| VALIDAR | Comportamento não permite conclusão segura sem decisão funcional |

## 1.2 Identificadores funcionais

As regras são agrupadas em códigos estáveis por domínio:

- `AUT-*` Autenticação e sessão
- `COL-*` Colaboradores
- `EQU-*` Equipes
- `MAT-*` Matrizes de Operação
- `CRT-*` Criação/importação de esteiras
- `EST-*` Estrutura da esteira
- `CIC-*` Ciclo de vida da esteira
- `ATI-*` Atividades
- `DES-*` Designações e responsáveis
- `POP-*` Plano Operacional da Esteira
- `PLS-*` Planejamento Semanal
- `AGS-*` Agenda da Semana
- `APO-*` Apontamentos
- `SEQ-*` Sequência operacional
- `KSK-*` Kiosk
- `PRD-*` Produção Web
- `FIL-*` Minha Fila
- `MIA-*` Minhas Atividades
- `JOR-*` Jornada
- `JOG-*` Jornada Gerencial
- `EVO-*` Evolução de Esteiras
- `DSH-*` Dashboard
- `SAU-*` Saúde Operacional
- `CFG-*` Configurações Operacionais
- `USR-*` Usuários
- `RBAC-*` Permissões
- `AUD-*` Auditoria
- `SUP-*` Chamados
- `SYS-*` Configurações Sistêmicas

## 1.3 Convenções de vocabulário

Convenções fixadas em 2026-10-03, válidas para este documento e obrigatórias no `MANUAL_USUARIO_SGP.md`.

| Conceito | Termo funcional **preferencial** | Termos técnicos/legados | Observação |
|---|---|---|---|
| Unidade executável de trabalho dentro de um setor | **atividade** | `STEP`, "etapa" | `STEP` é identificador técnico de implementação. Só pode aparecer em contexto declaradamente técnico (evidências, nomes de arquivo, taxonomia de eventos, citações literais de mensagem). **Nunca** como termo preferencial, e nunca no manual do usuário. |
| Canal operacional de apontamento do colaborador (totem e navegador) | **Modo Fábrica** | "Kiosk", "Produção Web" | "Modo Fábrica" é o nome exibido na interface. Kiosk e Produção Web passam a designar as **formas de acesso** ao Modo Fábrica, usadas aqui por precisão técnica. |
| Vínculo entre colaborador (ou equipe) e atividade | **alocação** | "assignee", `TEAM`, `COLLABORATOR` | O produto já adotou "alocação" na interface da Jornada. |
| Situação operacional de uma atividade | **situação da atividade** | `PENDING`, `COMPLETED`, `REOPENED`, `ABORTED` | Os códigos persistidos permanecem nesta matriz por rastreabilidade; não são vocabulário de usuário. |

**Regra de aplicação:** a substituição é semântica e contextual. Não se faz troca cega que quebre evidências, caminhos de arquivo, nomes de código, identificadores de regra ou citações literais de mensagens do sistema.

---

# 2. Mapa de Domínios Funcionais do SGP+

Esta seção oferece a visão macro do sistema. Ela deve ser usada como índice funcional e como ponto de entrada para entender dependências entre módulos.

## 2.1 Visão geral

> A coluna **Cobertura atual** avalia os HTML derivados (`colaborador.html`, `gestor-esteira.html`), não este documento.

| Domínio | Responsabilidade principal | Perfis principais | Dependências relevantes | Cobertura atual |
|---|---|---|---|---|
| Autenticação e sessão | Login, troca de senha, sessão e timeout | Todos | Usuários, Config. Sistêmicas | PARCIAL |
| Colaboradores | Cadastro operacional e vínculo com acesso | Gestor/Admin | Setores, Funções, Equipes, Produção | PARCIAL |
| Equipes | Agrupamento operacional de colaboradores | Gestor/Admin | Colaboradores, Designações | SUPERFICIAL |
| Matrizes de Operação | Estruturas reutilizáveis de trabalho | Gestor | Esteiras, Importação, Responsáveis | SUPERFICIAL |
| Criação de Esteira | Criar estrutura manual, matriz ou documento | Gestor | Matrizes, Colaboradores, Equipes | PARCIAL |
| Estrutura da Esteira | Tarefas, setores, atividades, tempos, quantidades | Gestor | Apontamentos, Planejamento, Histórico | SUPERFICIAL |
| Ciclo de Vida | Estados e transições da esteira | Gestor | Planejamento, Produção, Apontamentos | INCORRETO/PARCIAL |
| Atividades | Situação operacional de cada atividade | Gestor/Colaborador | Sequência, Apontamentos, Planejamento | SUPERFICIAL |
| Designações | Responsável, apoio, equipe | Gestor | Colaboradores, Equipes, Apontamentos | PARCIAL |
| Plano Operacional | Planejamento macro da esteira | Gestor | Estrutura, Planejamento Semanal | SUPERFICIAL |
| Planejamento Semanal | Distribuição da fábrica por semana | Gestor | Capacidade, Produção, Fila | EXTREMAMENTE INSUFICIENTE |
| Agenda da Semana | Visão e movimentação operacional semanal | Gestor | Planejamento Semanal | AUSENTE |
| Apontamentos | Registro de tempo e quantidade | Colaborador/Gestor | Sequência, Justificativas, Jornada | SUPERFICIAL |
| Sequência Operacional | Ordem recomendada de execução | Colaborador/Gestor | Estrutura, Atividades, Apontamentos | INCORRETO |
| Modo Fábrica — totem (Kiosk) | Produção touch-first por PIN | Colaborador | Produção, Credencial, Planejamento | PARCIAL/DIVERGENTE |
| Modo Fábrica — navegador (Produção Web) | Produção pelo navegador | Colaborador | Produção, Credencial, Planejamento | SUPERFICIAL |
| Minha Fila | Fila diária do colaborador | Colaborador | Planejamento publicado, Sequência | INCORRETO/PARCIAL |
| Minhas Atividades | Visão das atividades designadas | Colaborador | Designações, Esteiras | PARCIAL |
| Jornada | Histórico e leitura operacional individual | Colaborador | Apontamentos, Extras | SUPERFICIAL |
| Jornada Gerencial | Visão por colaborador e exportação | Gestor | Apontamentos, Colaboradores | AUSENTE |
| Evolução de Esteiras | Previsto x realizado e eficiência | Gestor | Estrutura, Quantidade, Apontamentos | INCORRETO/PARCIAL |
| Dashboard | KPIs operacionais/executivos | Gestor | Esteiras, Jornada, Capacidade | SUPERFICIAL |
| Saúde Operacional | Diagnóstico de carga/risco por colaborador | Gestor | Capacidade, Apontamentos, Designações | QUASE AUSENTE |
| Configurações Operacionais | Catálogos e parâmetros do domínio | Gestor/Admin | Quase todos os domínios | AUSENTE |
| Usuários | Gestão de acesso | Admin | Colaboradores, RBAC | AUSENTE |
| RBAC | Permissões por papel | Admin | Todas as áreas protegidas | AUSENTE |
| Auditoria | Rastreabilidade administrativa/operacional | Admin/Gestor | Usuários, Apontamentos, Esteiras | AUSENTE |
| Chamados | Apoio e registro de problemas | Usuários | Feature flag, contexto da aplicação | AUSENTE |
| Configurações Sistêmicas | Timeout e parâmetros globais | Admin | Sessão | AUSENTE |
| Meu Trabalho | Cockpit futuro | Colaborador | Ainda não implementado | NÃO DOCUMENTAR COMO ENTREGUE |

## 2.2 Dependências entre domínios

### Estrutura central

`Matriz / Documento / Manual`
→ `Criação de Esteira`
→ `Estrutura`
→ `Plano Operacional`
→ `Planejamento Semanal`
→ `Fila / Produção / Kiosk`
→ `Apontamentos`
→ `Jornada / Evolução / Dashboard / Saúde Operacional`

### Dependências transversais

`Colaboradores + Equipes`
→ `Designações`
→ `Planejamento`
→ `Elegibilidade de apontamento`

`Configurações Operacionais`
→ `Setores`
→ `Funções`
→ `Capacidade`
→ `Justificativas`
→ `Motivos de dispensa`
→ `Descrições de apontamentos extras`

`Usuários + RBAC`
→ controlam acesso e ações administrativas em todos os domínios.

## 2.3 Domínios que precisam de documentação prioritária

Prioridade alta:
- Ciclo de Vida
- Apontamentos
- Sequência
- Estrutura
- Plano Operacional
- Planejamento Semanal
- Modo Fábrica (Kiosk/Produção Web)
- Jornada
- Evolução
- Configurações Operacionais

Prioridade média:
- Equipes
- Matrizes
- Saúde Operacional
- Dashboard
- Administração/RBAC/Auditoria

Prioridade condicional:
- Chamados, somente se habilitado
- Meu Trabalho, somente quando deixar de ser placeholder

---

# 3. Ciclo de Vida da Esteira

## CIC-001 — Estados oficiais

Estados implementados:

1. `EM_ELABORACAO`
2. `AGUARDANDO_PLANEJAMENTO`
3. `EM_PLANEJAMENTO`
4. `A_INICIAR`
5. `EM_ANDAMENTO`
6. `FINALIZADA`
7. `CANCELADA`

### Interpretação funcional

| Estado | Significado funcional |
|---|---|
| EM_ELABORACAO | Estrutura ainda está sendo montada/editada |
| AGUARDANDO_PLANEJAMENTO | Estrutura pronta para entrar no processo de planejamento |
| EM_PLANEJAMENTO | Planejamento operacional em elaboração |
| A_INICIAR | Esteira já liberada para produção, aguardando início efetivo |
| EM_ANDAMENTO | Execução já iniciada |
| FINALIZADA | Execução encerrada com conclusão |
| CANCELADA | Encerrada por cancelamento |

### Cobertura atual
Manual Gestor: **INCORRETO/PARCIAL**

O texto atual para `A_INICIAR` sugere que a esteira ainda “aguarda liberação”. A implementação indica que a liberação ocorre na transição para `A_INICIAR`.

## CIC-002 — Transições normais

Fluxo nominal:

`EM_ELABORACAO → AGUARDANDO_PLANEJAMENTO → EM_PLANEJAMENTO → A_INICIAR`

O início efetivo ocorre no primeiro apontamento válido:

`A_INICIAR → EM_ANDAMENTO`

Depois:

`EM_ANDAMENTO → FINALIZADA`

Cancelamento pode levar a `CANCELADA` a partir dos estados permitidos pelo backend.

## CIC-003 — Primeiro apontamento inicia a esteira

**Pré-condição:** esteira em `A_INICIAR`.

**Ação:** registro de apontamento válido.

**Efeito:** backend altera automaticamente para `EM_ANDAMENTO`.

**Impactos:**
- muda a situação operacional exibida;
- afeta filtros e buckets;
- muda o contexto de planejamento/execução;
- passa a caracterizar trabalho efetivamente iniciado.

**Cobertura:** AUSENTE.

## CIC-004 — Voltar para backlog

Origens aceitas:
- `EM_PLANEJAMENTO`
- `A_INICIAR`
- `EM_ANDAMENTO`

Destino real:
- `AGUARDANDO_PLANEJAMENTO`

**Não significa voltar para `EM_ELABORACAO`.**

Exige motivo entre 3 e 500 caracteres.

**Cobertura:** INCORRETA.

## CIC-005 — Voltar para planejamento

Origens:
- `A_INICIAR`
- `EM_ANDAMENTO`

Destino:
- `EM_PLANEJAMENTO`

Exige motivo.

## CIC-006 — FINALIZADA

A implementação auditada não apresenta `FINALIZADA` como origem válida para retorno.

O FAQ atual afirma que uma esteira concluída pode ser reaberta por transição de retorno.

**Classificação:** INCORRETO.

---

# 4. Estados das Atividades

## ATI-001 — Estados

### Estados efetivamente persistidos pelo sistema

Revisão de 2026-10-03. Apenas quatro situações são realmente gravadas pelo backend:

| Código persistido | Situação funcional | Quem escreve |
|---|---|---|
| `PENDING` | Pendente | valor inicial da atividade (`server/migrations/0028_conveyor_nodes_step_operational.sql`) |
| `COMPLETED` | Concluída | `conveyor-step-operational.service.ts` (concluir atividade) |
| `REOPENED` | Reaberta | `conveyor-step-operational.service.ts` (reabrir) e `conveyor-step-abort.service.ts` (restaurar dispensa) |
| `ABORTED` | Dispensada | `conveyor-step-abort.service.ts` (dispensar atividade) |

Para a sequência operacional, `COMPLETED` e `ABORTED` são situações encerradas (`isStepClosedForSequence`).

### Códigos declarados sem caminho de escrita

`IN_PROGRESS` e `BLOCKED` existem no tipo `ConveyorNodeStepOperationalStatusDb` e na constraint da migration `0028`, mas **nenhum serviço do backend os grava**. A busca por `'IN_PROGRESS'` e `'BLOCKED'` em `server/src` retorna apenas declarações de tipo e comparações defensivas em `canTransitionStepStatus`.

**Consequência documental:** não apresentar "em andamento" nem "bloqueada" como situações de atividade que o sistema atribui. Ver VAL-006 e VAL-014.

### Rótulos derivados da camada de apresentação

A interface do detalhe da esteira exibe seis rótulos — Pendente, Pronta, Em execução, Pausada, Concluída, Bloqueada (`src/features/esteiras/EsteiraDetalhePage.tsx`) — que **não são tradução dos códigos persistidos**. "Pronta", "Pausada" e o contador "Apontáveis" são derivados em tela a partir de sequência, alocação e apontamentos.

**Não confundir rótulo derivado com situação persistida.** Ao documentar comportamento, usar a tabela de situações persistidas; ao documentar o que o usuário lê, usar os rótulos da tela e explicar a regra que os produz.

## ATI-002 — Concluir atividade

A conclusão é um evento operacional independente do consumo do tempo previsto.

**Regra central:** atingir o tempo previsto não conclui automaticamente a atividade.

## ATI-003 — Reabrir atividade concluída

Revisão de 2026-10-03.

**Duas ações distintas levam à mesma situação `REOPENED`**, cada uma com sua própria pré-condição e sua própria mensagem de bloqueio. Não são sinônimos e não devem ser descritas como uma só.

| Ação do usuário | Pré-condição | Destino | Serviço |
|---|---|---|---|
| **Reabrir atividade** (ATI-003) | situação `COMPLETED` | `REOPENED` | `conveyor-step-operational.service.ts` |
| **Restaurar atividade dispensada** (ATI-005) | situação `ABORTED` | `REOPENED` | `conveyor-step-abort.service.ts` |

A máquina de estados (`canTransitionStepStatus`) aceita `→ REOPENED` a partir de `COMPLETED` **ou** `ABORTED`; são as duas rotas de API que restringem cada ação a uma única origem.

### Reabrir atividade

Pré-condição: situação `COMPLETED`. Atividade dispensada **não** é reaberta por esta ação — usa-se ATI-005.

Destino:
`REOPENED`

Permissão observada:
`conveyors.create`

Mensagem backend quando a origem não é `COMPLETED`:
“A etapa só pode ser reaberta quando estiver concluída.”

A tela oferece campo de observação ao reabrir.

## ATI-004 — Dispensar atividade

Destino:
`ABORTED`

A dispensa:
- exige motivo de catálogo;
- pode exigir complemento;
- preserva auditoria;
- bloqueia novos apontamentos;
- conta como encerrada para sequência;
- pode cancelar itens vinculados no planejamento.

## ATI-005 — Restaurar dispensa

`ABORTED → REOPENED`

Ação distinta de ATI-003. Pré-condição: situação `ABORTED`.

A restauração limpa os campos de aborto da atividade.

Mensagens backend observadas:
“A atividade só pode ser restaurada quando estiver dispensada.”
“Não é possível restaurar atividades em esteira finalizada ou cancelada.”

**Efeito importante:** itens de planejamento anteriormente cancelados não são reativados automaticamente.

Mensagem de confirmação observada:
“Restaurar esta atividade dispensada? O planejamento cancelado não será reativado.”

---

# 5. Sequência Operacional

## SEQ-001 — Ordem recomendada

A sequência considera hierarquia e ordenação das atividades.

Atividades encerradas (`COMPLETED` ou `ABORTED`) deixam de impedir a sequência seguinte.

## SEQ-002 — Atividade anterior pendente

A existência de atividade anterior pendente não significa bloqueio absoluto.

O sistema pode permitir execução mediante justificativa.

Produção Web informa:
“Apontamento permitido com justificativa.”

Kiosk informa que existem etapas anteriores pendentes e solicita motivo.

## SEQ-003 — Contradição documental

Manual atual:
“você não pode apontar até que a atividade anterior esteja concluída.”

Implementação:
permite apontamento fora da sequência mediante justificativa operacional.

**Classificação:** INCORRETO.

## SEQ-004 — Registro da exceção

Apontamento fora de sequência pode registrar:
- flag de fora de sequência;
- justificativa;
- categoria padronizada;
- complemento;
- metadados de auditoria.

---

# 6. Apontamentos

## APO-001 — Condição da esteira

Apontamento normal é aceito somente com esteira em:
- `A_INICIAR`
- `EM_ANDAMENTO`

Mensagens de bloqueio:

| Estado | Mensagem |
|---|---|
| EM_ELABORACAO | Esta esteira ainda não foi liberada para produção. |
| AGUARDANDO_PLANEJAMENTO | Esta esteira está em planejamento e ainda não permite apontamento. |
| EM_PLANEJAMENTO | Esta esteira está em planejamento e ainda não permite apontamento. |
| FINALIZADA | Esta esteira está finalizada e não permite novos apontamentos. |
| CANCELADA | Esta esteira está cancelada e não permite novos apontamentos. |

## APO-002 — Minutos

Regra predominante:
- inteiro;
- maior que zero.

## APO-003 — Quantidade executada

- inteiro;
- valor mínimo 0;
- 0 representa trabalho realizado sem unidade concluída.

## APO-004 — Data de realização

- padrão: data operacional atual;
- permite retroatividade;
- não permite data futura.

Mensagem:
“A data de realização não pode ser futura.”

## APO-005 — Atividade concluída

Atividade `COMPLETED` não deve receber novo apontamento normal.

## APO-006 — Atividade dispensada

Atividade `ABORTED` bloqueia novos apontamentos.

## APO-007 — Fora de sequência

Permite apontamento com justificativa quando a sequência anterior ainda está aberta.

## APO-008 — Somente atividade planejada (TASK `apontamento-somente-planejado`, 08/10/2026)

Só recebe apontamento a atividade com **item planejado válido**: `operational_work_plan_items` não excluído, `status = PLANNED`, no plano **publicado vigente** da sua semana (o mais recente publicado daquela semana), em **qualquer semana**. Alocação estrutural (`conveyor_node_assignees`, direta ou via time) **não** é mais fonte de apontamento.

| Situação | Lista padrão | Pesquisa de outras atividades (≥ 2 caracteres) | Gravação |
|---|---|---|---|
| planejada para o colaborador | aparece | aparece | `ASSIGNED`, sem justificativa de exceção; reutiliza ou cria alocação de apoio (`is_primary = false`) |
| planejada só para outro colaborador | não aparece | aparece | `UNASSIGNED_EXCEPTION`, justificativa obrigatória; não cria alocação |
| não planejada para ninguém | não aparece | não aparece | recusada: `TIME_ENTRY_NOT_PLANNED` (422), em todos os caminhos, inclusive o lançamento do gestor em nome de outro |

Mensagem da recusa:
“Esta atividade não está planejada. Fale com o gestor para incluí-la no planejamento.”

Restrição do banco: `uq_operational_work_plan_items_plan_activity_active` permite **um item ativo por atividade em cada plano semanal** — dentro de uma semana a atividade tem um colaborador e um dia. Atividade "em vários dias" só ocorre entre semanas diferentes.

Evidência: `server/src/modules/operational-planning/planned-activity.repository.ts`, `planned-activity.service.ts`; `conveyorAssignments.service.ts` (web e on-behalf); `production-time-entries.service.ts` e `production-unassigned-time-entries.service.ts` (Kiosk); `my-activities.repository.ts` (`listPlannedTimeEntryCandidates`).

Histórico: apontamentos já gravados como `UNASSIGNED_EXCEPTION` sob a regra anterior (sem alocação) continuam exibidos como estão.

## APO-008A — Excesso de tempo previsto

Vale para atividade **planejada para o colaborador**, na web e no Kiosk (fila e Outra atividade).

- Previsto: soma de `planned_minutes` de todos os itens planejados válidos do colaborador na atividade.
- Realizado: soma dos apontamentos do **próprio** colaborador na atividade.
- Exige justificativa quando realizado + novo apontamento > previsto. Sem previsto, não exige.
- Atividade planejada só para outro colaborador: não exige (a justificativa de exceção basta).
- Justificativa de fora de sequência já informada dispensa a de excesso.

Código: `TIME_ENTRY_EXCEEDED_PLANNED_REQUIRES_JUSTIFICATION`. Na web a justificativa vai em `justificationId`; no Outra atividade, em `justificationId` do corpo.

## APO-009 — Primeiro apontamento

Se a esteira está `A_INICIAR`, o apontamento válido também inicia a esteira.

## APO-010 — Excesso de tempo

Fluxos de Produção/Kiosk podem exigir justificativa quando o novo apontamento ultrapassa o tempo planejado.

## APO-011 — Múltiplos apontamentos

A mesma atividade pode receber vários apontamentos em sessões/dias diferentes enquanto continuar elegível.

## APO-012 — Observação

Campo opcional para contextualização do apontamento.

---

# 7. Justificativas Operacionais

## CFG-JUS-001 — Categorias

Categorias implementadas:

| Código | Rótulo |
|---|---|
| SUBSTITUTION | Substituição |
| SEQUENCE | Sequência |
| PLANNING | Planejamento |
| REWORK | Retrabalho |
| PRIORITY | Prioridade |
| EMERGENCY | Emergência |
| OTHER | Outro |

## CFG-JUS-002 — Estrutura do catálogo

Cada motivo pode possuir:
- rótulo;
- descrição;
- categoria;
- complemento obrigatório ou opcional;
- escopo;
- ordem;
- ativo/inativo.

## CFG-JUS-003 — Uso

Justificativas podem aparecer em diferentes contextos:
- fora de sequência;
- sem alocação;
- excesso de tempo;
- planejamento;
- prioridade;
- retrabalho;
- emergência.

O manual deve explicar a causa e não somente o campo “Justificativa”.

---

# 8. Mensagens como Referência de Suporte

A matriz de mensagens deve ser consultável de forma independente do domínio.

| Código | Condição | Mensagem/efeito | Causa | Ação recomendada |
|---|---|---|---|---|
| MSG-001 | Esteira em elaboração | “Esta esteira ainda não foi liberada para produção.” | status não permite apontar | gestor deve avançar o fluxo |
| MSG-002 | Esteira em planejamento | “Esta esteira está em planejamento e ainda não permite apontamento.” | planejamento ainda não concluído | concluir/liberar planejamento |
| MSG-003 | Esteira finalizada | “Esta esteira está finalizada e não permite novos apontamentos.” | estado terminal | validar processo com gestor |
| MSG-004 | Esteira cancelada | “Esta esteira está cancelada e não permite novos apontamentos.” | estado terminal | validar processo com gestor |
| MSG-005 | Data futura | “A data de realização não pode ser futura.” | regra temporal | usar hoje ou data anterior |
| MSG-006 | Fora de sequência | “Existem etapas anteriores pendentes...” | predecessor aberto | justificar exceção |
| MSG-007 | Tempo excedido | “Tempo acima do previsto — confirme o apontamento.” | consumo ultrapassa planejado | informar justificativa |
| MSG-008 | Atividade concluída | “Esta atividade já foi concluída operacionalmente.” | `COMPLETED` | reabrir se retrabalho for necessário |
| MSG-009 | Conta sem colaborador | “Sua conta não está vinculada a um colaborador operacional...” | vínculo ausente | administrador deve associar |
| MSG-010 | Conflito de edição | “O apontamento foi alterado por outro usuário...” | concorrência | atualizar tela e refazer |
| MSG-011 | Planejamento salvo | “Rascunho salvo.” | DRAFT salvo | ainda não atualiza fila |
| MSG-012 | Revisão salva | “Revisão salva. A fila dos colaboradores continua usando a última versão publicada.” | revisão não publicada | publicar para refletir |
| MSG-013 | Plano publicado | “Plano publicado. A fila dos colaboradores foi atualizada.” | publicação | colaboradores recebem nova versão |
| MSG-014 | Inclusão tardia | “Novo item incluído. As novas atividades estão disponíveis no Backlog do Planejamento Semanal.” | nova atividade após criação | gestor deve planejar |
| MSG-015 | Estrutura sintética | “A estrutura contém uma etapa sintética de Matriz...” | diagnóstico de importação | remover agregado inválido |

Observação: esta seção deve crescer conforme o levantamento completo de toasts, erros e confirmações.

---


## 8.1 Catálogo ampliado de mensagens e situações

A tabela abaixo funciona como índice de suporte. A mensagem literal pode sofrer pequenas variações de pontuação ou de canal, mas a condição funcional registrada deve permanecer alinhada à implementação.

| Código | Domínio | Condição | Mensagem observada | Significado / ação |
|---|---|---|---|---|
| MSG-AUT-001 | Login | credencial ausente/incorreta | “E-mail ou senha inválidos.” | revisar credenciais |
| MSG-AUT-002 | Login | lockout temporário | “Não foi possível entrar agora. Tente novamente mais tarde.” | aguardar fim do bloqueio |
| MSG-AUT-003 | Login | usuário inativo | “Sua conta está inativa. Contacte o administrador.” | administração deve revisar o usuário |
| MSG-AUT-004 | Senha | senha atual incorreta | “Senha atual incorreta.” | informar senha vigente |
| MSG-AUT-005 | Senha | nova senha igual à atual | “A nova senha deve ser diferente da senha atual.” | escolher nova senha |
| MSG-AUT-006 | Senha | tamanho mínimo | “A nova senha deve ter pelo menos 8 caracteres.” | aumentar a senha |
| MSG-AUT-007 | Senha | confirmação diferente | “A confirmação não coincide com a nova senha.” | repetir a nova senha corretamente |
| MSG-ATI-001 | Atividade | reabertura sem permissão | “Sem permissão para reabrir esta atividade.” | requer `conveyors.create` |
| MSG-ATI-002 | Atividade | usuário sem colaborador vinculado | “Conta sem colaborador operacional vinculado. Contacte o administrador.” | vincular usuário e colaborador |
| MSG-ATI-003 | Atividade | conclusão fora de produção | “Esta esteira não está liberada para conclusão operacional de atividades.” | avançar/liberar a esteira |
| MSG-ATI-004 | Atividade | colaborador sem alocação tentando concluir diretamente | “Para concluir esta atividade, informe uma justificativa ao registrar o apontamento.” | usar fluxo de apontamento por exceção |
| MSG-ATI-005 | Atividade | **ação Reabrir** aplicada a situação diferente de concluída | “A etapa só pode ser reaberta quando estiver concluída.” | a ação Reabrir exige situação concluída; atividade **dispensada** usa a ação Restaurar (ATI-005), com mensagem própria — ver MSG-ATI-006 |
| MSG-ATI-006 | Atividade | **ação Restaurar** aplicada a situação diferente de dispensada | “A atividade só pode ser restaurada quando estiver dispensada.” | restaurar exige atividade dispensada |
| MSG-ATI-007 | Atividade | restaurar dispensa em esteira encerrada | “Não é possível restaurar atividades em esteira finalizada ou cancelada.” | encerrar a esteira impede restauração |
| MSG-APO-001 | Apontamento | atividade concluída | “Esta atividade já foi concluída operacionalmente.” | reabrir antes, quando aplicável |
| MSG-APO-002 | Apontamento | atividade dispensada | apontamento não permitido em atividade dispensada | restaurar a dispensa quando aplicável |
| MSG-APO-003 | Apontamento | data futura | “A data de realização não pode ser futura.” | usar data atual ou retroativa |
| MSG-APO-004 | Apontamento | conflito de edição | “O apontamento foi alterado por outro usuário. Atualize a tela e tente novamente.” | recarregar antes de corrigir |
| MSG-APO-005 | Apontamento | conta sem colaborador operacional | “Sua conta não está vinculada a um colaborador operacional. Peça ao administrador para associar seu usuário a um colaborador.” | corrigir vínculo administrativo |
| MSG-SEQ-001 | Sequência | predecessor pendente | “Etapa anterior pendente...” | ação pode exigir justificativa |
| MSG-SEQ-002 | Sequência | exceção permitida | “Apontamento permitido com justificativa.” | selecionar/informar motivo |
| MSG-KSK-001 | Kiosk | tempo previsto atingido | “Tempo previsto atingido. Marque como concluída para liberar a próxima atividade.” | tempo não conclui STEP automaticamente |
| MSG-KSK-002 | PIN | formato Web inválido | “Digite um PIN de 4 a 8 dígitos.” | informar PIN numérico válido |
| MSG-KSK-003 | PIN | confirmação diferente | “A confirmação deve ser igual ao novo PIN.” | repetir PIN |
| MSG-KSK-004 | PIN | tentativa de manter PIN inicial | “Escolha um PIN diferente do PIN inicial padrão.” | cadastrar PIN definitivo |
| MSG-KSK-005 | PIN | credencial inválida/desabilitada | “PIN inválido ou acesso não habilitado.” | revisar PIN/habilitação |
| MSG-EST-001 | Edição | alteração fora da elaboração | “Esta esteira já saiu do Backlog. Informe o motivo da alteração para manter a rastreabilidade operacional.” | informar motivo de 3–500 caracteres |
| MSG-EST-002 | Exclusão | esteira com apontamentos | “Esta esteira já possui apontamentos e não pode ser excluída. Cancele ou finalize para preservar o histórico.” | usar encerramento normal |
| MSG-EST-003 | Exclusão | esteira com dependências | “Esta esteira já possui movimentações e não pode ser excluída.” | preservar vínculos/histórico |
| MSG-EST-004 | Inclusão tardia | novo item salvo | “Novo item incluído. As novas atividades estão disponíveis no Backlog do Planejamento Semanal.” | planejar as novas atividades |
| MSG-POP-001 | Plano Operacional | plano ativo já existe | “Já existe um plano operacional ativo para esta esteira.” | usar o plano existente |
| MSG-POP-002 | Plano Operacional | aprovação sem itens | “Adicione ao menos uma atividade ativa antes de aprovar o plano.” | incluir item |
| MSG-POP-003 | Plano Operacional | item exige revisão | “Existem itens que precisam revisão antes de aprovar o plano.” | resolver pendências |
| MSG-POP-004 | Plano Operacional | geração com itens existentes | “O plano já possui itens. Envie overwrite=true para substituir a geração atual.” | confirmar substituição |
| MSG-POP-005 | Plano Operacional | vínculo com fábrica | “Não é possível gerar ou regenerar itens: o plano possui vínculo com o Planejamento da Fábrica.” | preservar integração vigente |
| MSG-POP-006 | Plano Operacional | pronto para aprovação | “Plano pronto para aprovação. Revise o checklist antes de aprovar — a execução não inicia automaticamente.” | conferir antes da aprovação |
| MSG-POP-007 | Plano Operacional | aprovado | “Plano aprovado pelo gestor da esteira. Envie para o Planejamento da Fábrica quando estiver pronto — isso cria uma demanda de encaixe, sem iniciar execução.” | enviar quando pronto |
| MSG-PLS-001 | Planejamento | rascunho salvo | “Rascunho salvo.” | fila publicada permanece inalterada |
| MSG-PLS-002 | Planejamento | revisão salva | “Revisão salva. A fila dos colaboradores continua usando a última versão publicada.” | publicar para efetivar |
| MSG-PLS-003 | Planejamento | plano publicado | “Plano publicado. A fila dos colaboradores foi atualizada.” | nova versão operacional |
| MSG-PLS-004 | Planejamento | plano vazio | “Adicione ao menos uma atividade antes de publicar o plano.” | incluir atividade |
| MSG-PLS-005 | Planejamento | atividade duplicada no plano | “Cada Atividade só pode aparecer uma vez no plano.” | remover duplicidade |
| MSG-PLS-006 | Planejamento | atividade já em outra semana ativa | “Atividade já está planejada em outro plano semanal.” | revisar o outro plano |
| MSG-PLS-007 | Planejamento | data COP fora da semana | “A data do plano da esteira está fora da semana exibida. Replaneje manualmente em outra semana.” | trocar semana/data |
| MSG-XLS-001 | Exportação | semana sem plano | “Nenhum plano encontrado para esta semana.” | selecionar outra semana ou criar plano |
| MSG-XLS-002 | Exportação | plano sem itens | “Não há atividades planejadas nesta semana para exportar.” | planejar itens |
| MSG-MAT-001 | Matriz | hierarquia inválida | “Não é permitido criar [tipo] sob [tipo].” | respeitar ITEM→TASK→SECTOR→ACTIVITY |
| MSG-MAT-002 | Matriz | responsável inválido | “O colaborador responsável deve ser um colaborador ativo e membro ativo da equipe informada.” | ajustar equipe/responsável |
| MSG-MAT-003 | Matriz | duplicação sem responsável válido | “A atividade ... foi duplicada sem responsável porque o colaborador configurado não pertence mais à equipe ou está inativo.” | revisar atividade duplicada |
| MSG-DOC-001 | Documento | nome ausente | “Indique o nome da esteira antes de criar.” | preencher nome |
| MSG-DOC-002 | Documento | conteúdo proibido | “O draft contém conteúdo financeiro ou sensível removido por segurança. Reimporte ou revise o documento antes de criar a esteira.” | revisar/reimportar |
| MSG-DOC-003 | Documento | revisão humana pendente | “Revise e confirme os itens similares/novos antes de criar a esteira oficial.” | concluir decisões |
| MSG-DOC-004 | Documento | rollup sintético | “A estrutura contém uma etapa sintética de Matriz. Remova o item agregado e mantenha apenas as atividades reais.” | corrigir draft |
| MSG-DOC-005 | Documento | criação concluída | “Esteira criada a partir do documento revisto.” | fluxo concluído |
| MSG-SUP-001 | Chamados | módulo desligado | “Módulo de suporte está desativado.” | recurso não está habilitado no ambiente |
| MSG-SUP-002 | Chamados | ticket inexistente/não pertencente ao usuário | “Chamado não encontrado.” | verificar protocolo/usuário |
| MSG-SYS-001 | Sessão | timeout inválido | “Informe um timeout entre 5 e 480 minutos.” | informar valor permitido |
| MSG-SYS-002 | Sessão | aviso inválido | “Informe um aviso entre 1 e 30 minutos.” | informar valor permitido |
| MSG-SYS-003 | Sessão | aviso maior/igual ao timeout | “O aviso deve ser menor que o tempo total de inatividade.” | reduzir aviso ou aumentar timeout |
| MSG-ARG-001 | ARGOS Health | indisponível | “ARGOS está temporariamente indisponível. Tente mais tarde.” | repetir posteriormente |
| MSG-ARG-002 | ARGOS Health | timeout | “ARGOS demorou mais do que o esperado para responder. Tente novamente.” | repetir análise |
| MSG-ARG-003 | ARGOS Health | falha de comunicação | “Falha de comunicação com o serviço de análise. Tente novamente em instantes.” | repetir/acionar suporte |
| MSG-PRN-001 | Impressão | agente local ausente | “Agente de impressão local não encontrado. Usando impressão pelo navegador.” | fluxo segue por fallback |
| MSG-PRN-002 | Impressão | uso operacional | “Use os tickets como apoio físico na operação. O status oficial da atividade continua sendo controlado no SGP+.” | ticket não substitui o sistema |

## 8.2 Regra de manutenção da matriz de mensagens

Ao criar ou alterar uma mensagem funcionalmente relevante, o responsável pela mudança deve verificar:

1. qual condição dispara a mensagem;
2. qual domínio/regra ela referencia;
3. se é bloqueio, aviso, confirmação ou sucesso;
4. qual ação o usuário consegue executar a seguir;
5. se existe diferença entre canais;
6. se a mensagem precisa ser adicionada a este catálogo.

Mensagens puramente técnicas de log ou diagnóstico de desenvolvimento não precisam ser promovidas para o manual de usuário, mas podem ser mantidas na rastreabilidade técnica.


# 9. Correção Gerencial de Apontamentos

## APO-GES-001 — Editar apontamento

Requer permissão específica.

A edição gerencial exige motivo.

Campos observados:
- minutos;
- quantidade executada.

A operação é auditada.

## APO-GES-002 — Concorrência

O sistema usa versão temporal (`updatedAt`) para impedir sobrescrita silenciosa.

Conflitos orientam recarregar os dados.

## APO-GES-003 — Excluir apontamento

A exclusão é lógica/auditável.

O histórico administrativo deve registrar:
- ator;
- colaborador afetado;
- esteira;
- atividade;
- apontamento;
- motivo.

## APO-GES-004 — Apontamento em nome de terceiro

Requer permissão.

O colaborador alvo:
- precisa existir;
- precisa estar ativo;
- precisa ter vínculo operacional válido com a atividade no fluxo observado.

Exige motivo.

Desde a TASK `apontamento-somente-planejado` (08/10/2026), a atividade precisa estar planejada para alguém (APO-008); caso contrário, `TIME_ENTRY_NOT_PLANNED`. As demais regras deste fluxo permanecem como estavam, inclusive a exigência de alocação estrutural do colaborador alvo.

---

# 10. Minha Fila

## FIL-001 — Fonte principal

A fila depende do Planejamento Semanal publicado.

## FIL-002 — Filtros e data

Permite navegar por data de trabalho.

## FIL-003 — Sequência

Atividade com predecessor aberto deve ser apresentada como exceção, e não como bloqueio absoluto.

## FIL-003A — Cartões, movidos e totais (TASK `apontamento-somente-planejado`)

- Somente itens `PLANNED` do plano publicado vigente; itens `MOVED` e `CANCELLED` saem.
- **Um cartão por atividade**: entra se tiver ao menos um item no recorte; a data do cartão é a menor data entre todos os itens válidos do colaborador na atividade, **mesmo fora do recorte** (o grupo segue essa data).
- Cartão: `plannedMinutes` = soma de todos os itens do colaborador; `realizedMinutes` (novo) = apontado pelo próprio colaborador.
- Totais do recorte (`plannedMinutesToday`, capacidade, `plannedVsCapacity`) continuam somando **só os itens dentro do intervalo**.
- Atividade planejada para o colaborador não exige justificativa de exceção (`requiresUnassignedJustification = false`).
- Recorte inalterado: atrasadas só da semana exibida; futuras só no período; concluídas e dispensadas em **Concluídas**.

Evidência: `my-work-queue.service.ts`, `work-queue-consolidation.ts`, `my-work-queue.repository.ts`.

## FIL-004 — Planejamento

Quando não existe plano publicado aplicável, a fila pode estar vazia ou orientar contato com o gestor.

Produção Web possui mensagem:
“Nenhuma atividade planejada para você no momento.”
e:
“Confirme com o gestor se o planejamento da fábrica já foi publicado.”

---

# 11. Minhas Atividades

## MIA-001 — Propósito

Lista atividades relacionadas ao colaborador nas esteiras visíveis/ativas.

## MIA-002 — Informações

Pode apresentar:
- atividade;
- esteira;
- tarefa;
- setor;
- papel;
- previsto;
- status;
- prazo;
- classificação temporal.

## MIA-003 — Diferença para Minha Fila

Minhas Atividades é uma visão de responsabilidade/atribuição.

Minha Fila é orientada ao planejamento publicado e à data operacional.

O manual deve explicitar essa diferença.

---

# 12. Jornada

## JOR-001 — Períodos

Reconfirmação em 2026-10-03, na rodada `manual-usuario-sgp-cap11-minha-jornada`: os seletores oferecem **Últimos 7 dias**, **Últimos 15 dias**, **Últimos 30 dias**, **Mês atual (UTC)** e **Intervalo personalizado**. O padrão é 7 dias.

Não existem presets de Hoje ou Esta semana. Esses recortes exigem intervalo personalizado. Os últimos N dias são janelas móveis de N × 24 horas até agora; mês usa o início do mês civil de São Paulo, apesar do rótulo incorreto.

Evidências: `src/lib/operationalSemantics.ts:56-65`, `src/features/colaborador/JornadaPage.tsx:249-255,419-465`, `server/src/shared/operationalPeriod.ts:29-68`.

## JOR-002 — Informações

Não se limita ao histórico bruto.

Relaciona:
- previsto;
- realizado;
- atividades;
- status;
- esteiras;
- carga;
- apontamentos;
- exceções.

## JOR-003 — Apontamentos extras

O serviço compartilhado calcula Extra Esteira separadamente, mas **Minha Jornada não o exibe**: não há lista, bloco ou acréscimo aos totais de realizado. Também não participa da cobertura. A exibição do resumo pertence à **Jornada Gerencial**, que reutiliza o mesmo serviço.

Evidências: `operational-journey.service.ts:296-322,394-398`, `JornadaPage.tsx:383-656` e `JornadaColaboradorGestorPage.tsx:603-625`. Ver detalhes em 45.6.

---

# 13. Jornada Gerencial

## JOG-001 — Visão por colaborador

Tela gerencial de análise de jornada, em `/app/gestao/jornada-colaborador`, sob `collaborators_admin.view`.

## JOG-002 — Seleção de múltiplos colaboradores

Revisão de 2026-10-03: **entregue e em produção**, não mais uma evolução prevista. Entrou em `develop` depois da fotografia anterior desta matriz.

- A tela permite selecionar vários colaboradores ao mesmo tempo, com faixa de seleção por avatares.
- Um colaborador usa a consulta individual; dois ou mais usam a jornada consolidada, com totais somados.
- **Teto da consulta em tela: 20 colaboradores.** Mesmo teto no frontend e no backend.
- Duplicados são removidos preservando a ordem de entrada.
- No escopo consolidado, o previsto conta uma vez por alocação colaborador × atividade.

Mensagem de limite: “Selecione no máximo 20 colaboradores por consulta.”

## JOG-003 — Exportação XLSX

Existe exportação da visão.

**Teto da exportação: 50 colaboradores** — diferente do teto de 20 da consulta em tela. Os dois limites são independentes e não devem ser apresentados como um só.

Mensagem de limite: “Selecione no máximo 50 colaboradores por exportação.”

**Cobertura atual:** AUSENTE.

---

# 14. Modo Fábrica — totem (Kiosk)

> **Vocabulário.** A interface chama este canal de **Modo Fábrica**. "Kiosk" é a designação técnica da forma de acesso por totem, mantida aqui por precisão. No manual do usuário, usar sempre "Modo Fábrica". Ver 1.3.

## KSK-001 — Entrada

Fluxo:
colaborador → PIN → fila → atividade → apontamento → retorno.

## KSK-002 — Credenciais

Estados operacionais incluem conceitos equivalentes a:
- pronto;
- precisa criar PIN;
- bloqueado;
- desabilitado.

## KSK-003 — PIN

Há divergência entre Kiosk e Backend/Web.


## KSK-004 — Sequência

Fora de sequência:
- apresenta aviso;
- permite continuar com justificativa.

## KSK-004A — Fila (TASK `apontamento-somente-planejado`)

A fila do Kiosk lista as atividades planejadas para o colaborador em **qualquer semana** (atrasadas, hoje e futuras), em aberto, com esteira `A_INICIAR`/`EM_ANDAMENTO`, um cartão por atividade (menor data). Ordem: atrasadas, hoje, futuras. Atividade futura não é recomendada enquanto houver atrasada ou de hoje em aberto. O cartão mostra a data planejada e a faixa (Atrasada, Hoje, Futura). Previsto = soma dos itens do colaborador; realizado e pendente = do próprio colaborador.

Para o mesmo colaborador, a lista padrão do Apontar horas (web) e a fila do Kiosk trazem o mesmo conjunto de atividades. A fila do Kiosk deixa de ser equivalente à Minha fila (recortes diferentes).

Evidência: `production-work-queue.service.ts`; `my-work-queue.service.ts` (`allOpenPlanned`, `orderKioskQueueByDateBucket`).

## KSK-005 — Excesso de tempo

Exige justificativa quando o novo apontamento ultrapassa o planejado. Desde 08/10/2026 segue APO-008A: previsto e realizado do próprio colaborador, somando todos os dias.

## KSK-006 — Conclusão da atividade

Existe opção de concluir a atividade ao registrar apontamento.

Pode haver confirmação adicional quando o percentual informado para a sessão é baixo.

## KSK-007 — Outra atividade

Pesquisa (≥ 2 caracteres) e apontamento em atividade planejada para outro colaborador, com justificativa de exceção; segue APO-008 e APO-008A.

Permite localizar atividade fora da fila normal.

Não elimina validações de:
- alocação;
- sequência;
- justificativa;
- status.

## KSK-008 — Extra Esteira

Funcionalidade não documentada.

Permite registrar tempo sem relação com um STEP.

Utiliza catálogo de descrições.

---

# 15. Modo Fábrica — navegador (Produção Web)

> **Vocabulário.** Mesma observação da seção 14: o usuário lê "Modo Fábrica". "Produção Web" é a designação técnica do acesso pelo navegador.

## PRD-001 — Autenticação

Usa colaborador + PIN.

## PRD-002 — Fila

Baseada no planejamento publicado.

## PRD-003 — Apontamento

Formulário observado possui:
- data;
- minutos;
- quantidade executada;
- observação;
- justificativa quando aplicável.

## PRD-004 — Diferenças para Kiosk

Não assumir equivalência de campos.

Produção Web possui elementos que não aparecem no `KioskActivityCard` analisado.

---

# 16. Colaboradores e Credenciais de Produção

## COL-001 — Colaborador operacional

É entidade diferente de usuário de autenticação.

## COL-002 — Vínculo com usuário

Conta sem colaborador vinculado pode acessar a aplicação, mas determinadas operações são bloqueadas.

## COL-003 — Acesso de produção

Pode ser habilitado/desabilitado.

## COL-004 — Reset de PIN

Gestão pode resetar PIN de produção.

## COL-005 — Desbloqueio

Gestão pode tratar bloqueio após tentativas.

## COL-006 — Setor e função

Cadastro se relaciona a catálogos de setor e função operacional.

---

# 17. Equipes

## EQU-001 — Cadastro

Equipe possui:
- nome;
- descrição;
- ativo/inativo.

## EQU-002 — Membros

Somente colaboradores ativos podem ser adicionados.

## EQU-003 — Papel interno

Membro pode possuir papel textual opcional.

## EQU-004 — Referência

Pode existir membro marcado como referência.

Ao definir nova referência, a anterior é desmarcada.

## EQU-005 — Remoção

Remoção é semântica:
- membro fica inativo no vínculo;
- histórico é preservado.

## EQU-006 — Alocação em atividade

A atividade recebe uma alocação `TEAM`.

Os membros não são necessariamente transformados em várias alocações individuais.

Na operação, o backend verifica se o colaborador pertence ativamente ao time.

## EQU-007 — Responsável principal

Alocação `TEAM` não pode ser principal.

---

# 18. Matrizes de Operação

## MAT-001 — Propósito

Estrutura reutilizável para criação de esteiras.

## MAT-002 — Funcionalidades

Inclui:
- listagem;
- criação;
- edição;
- ativação/inativação;
- estrutura hierárquica;
- responsáveis;
- equipes;
- duplicação;
- prévia;
- exportação;
- reutilização.

## MAT-003 — Uso na criação

Matriz pode ser base para nova esteira.

A estrutura resultante torna-se editável no contexto da esteira.

---

# 19. Criação de Esteira

## CRT-001 — Manual

Permite montar:
- tarefa;
- setor;
- atividade;
- minutos por unidade;
- quantidade prevista;
- alocações.

## CRT-002 — Quantidade

Quantidade prevista:
- inteiro;
- mínimo 1.

Tempo total esperado:
`minutos por unidade × quantidade`.

## CRT-003 — Matriz

Pode reutilizar estrutura existente.

## CRT-004 — Documento

Importação passa por ingestão e revisão.

## CRT-005 — Decisões na revisão

Foram observados conceitos:
- aceitar sugestão;
- selecionar alternativa;
- criar novo;
- ignorar item.

## CRT-006 — Diagnóstico de estrutura sintética

O sistema pode bloquear criação quando detecta item agregado sintético que duplicaria a estrutura real.

## CRT-007 — Laboratório de Esteiras (implementado, não exposto)

Registrado em 2026-10-03.

Existe um quarto caminho de criação: compor uma esteira a partir de **múltiplas matrizes**, em `/app/gestao/esteiras/laboratorio`, sob `conveyors.create`.

Fluxo: catálogo de matrizes → configurar cada bloco aplicado → montar a estrutura → revisar → criar.

Fonte: `src/features/esteiras/laboratorio-esteiras/` (14 arquivos); rota em `src/routes/AppRoutes.tsx`; título em `src/lib/page-meta.ts`.

**Não exposto na navegação:** não há item de menu nem link de entrada em nenhuma tela. Ver VAL-015.

**Regra documental:** não apresentar no manual do usuário enquanto não houver ponto de entrada confirmado.

---

# 20. Estrutura da Esteira

## EST-001 — Hierarquia

`Tarefa → Setor → Atividade`

## EST-002 — Edição incremental

A estrutura pode ser editada incrementalmente em diferentes estados, respeitando permissões.

## EST-003 — Motivo fora da elaboração

Alterações fora de `EM_ELABORACAO` podem exigir justificativa/motivo de edição.

## EST-004 — Preservação de IDs

Nós existentes são preservados quando corretamente identificados no patch.

## EST-005 — Remoção sem dependências

Pode ocorrer exclusão física.

## EST-006 — Remoção com dependências

Se houver dependências como:
- apontamentos;
- planejamento;
- eventos;
- estados concluído/dispensado,

o sistema tende a preservar o histórico por desativação lógica.

## EST-007 — Inclusão tardia

Nova atividade incluída pode ser marcada para entrar no backlog do Planejamento Semanal.

## EST-008 — Quantidade prevista

Editável na estrutura.

Impacta carga prevista e métricas derivadas.


---

# 21. Designações

## DES-001 — Tipos

- colaborador;
- equipe.

## DES-002 — Principal

Colaborador pode ser principal.

Equipe não pode ser principal.

## DES-003 — Apoio

Alocações adicionais podem atuar como apoio.

## DES-004 — Duplicidade

Backend protege contra alocações inválidas/duplicadas e contra múltiplos principais incompatíveis.

---

# 22. Plano Operacional da Esteira

## POP-001 — Estados

Estados identificados:
- `DRAFT`
- `APPROVED`
- `WAITING_FACTORY_PLANNING`
- `PARTIALLY_PLANNED_IN_FACTORY`
- `FULLY_PLANNED_IN_FACTORY`
- `IN_EXECUTION`
- `COMPLETED`
- `CANCELLED`

## POP-002 — Edição

Alterações normais são permitidas principalmente em `DRAFT`.

## POP-003 — Aprovação

Aprovação possui checklist/validações.

## POP-004 — Relação com fábrica

Aprovação e envio não significam que toda a semana já foi planejada.

## POP-005 — Regeneração

Regenerar plano pode substituir itens do rascunho/plano.

## POP-006 — Vínculos com Planejamento Semanal

Há verificações defensivas para impedir ações que quebrem itens já vinculados à fábrica.

---

# 23. Planejamento Semanal

## PLS-001 — Estados

- `DRAFT`
- `PUBLISHED`

## PLS-002 — Rascunho

Salvar rascunho não atualiza a fila dos colaboradores.

## PLS-003 — Revisão

Quando já existe versão publicada, alterações podem constituir revisão.

A última publicação continua alimentando a operação até nova publicação.

## PLS-004 — Publicação

Publicação atualiza a fila operacional.

## PLS-005 — Capacidade

Pode detectar sobrecarga.

Sobrecarga é alerta e pode ser aceita pelo gestor.

## PLS-006 — Sincronização

Estados:
- `PENDING`
- `SYNCED`
- `DIVERGED`

## PLS-007 — Causas de divergência

Incluem diferenças de:
- presença do item;
- data;
- minutos;
- colaborador;
- equipe;
- cancelamento;
- necessidade de revisão.

## PLS-008 — Execução fora do plano

Existe painel/diagnóstico para execução que não coincide com plano vigente.

## PLS-009 — Histórico

Mudanças e versões possuem histórico.

## PLS-010 — Exportação

Existe exportação XLSX do planejamento semanal.

---

# 24. Agenda da Semana

## AGS-001 — Propósito

Visão operacional semanal complementar ao planejamento.

## AGS-002 — Interações

Inclui recursos como:
- drag-and-drop;
- mudança de dia;
- mudança de colaborador;
- backlog lateral;
- ações sobre itens;
- apontamento;
- conclusão;
- impressão;
- capacidade.

## AGS-003 — Relação com revisão/publicação

Alterações devem respeitar a mesma noção de versão publicada/revisão do planejamento.

**Cobertura:** AUSENTE.

---

# 25. Capacidade Operacional

## CFG-CAP-001 — Padrão global

Existe capacidade diária padrão.

## CFG-CAP-002 — Override individual

Pode ser criado para colaborador.

Pode ter:
- início de vigência;
- fim de vigência;
- ativo/inativo.

## CFG-CAP-003 — Resolução

Ordem:
`override → default → fallback`

## CFG-CAP-004 — Reflexos

Capacidade influencia:
- planejamento;
- alertas de sobrecarga;
- saúde operacional;
- indicadores gerenciais.

---

# 26. Evolução de Esteiras

## EVO-001 — Previsto

Tempo previsto da atividade considera:
`plannedMinutes × plannedQuantity`

## EVO-002 — Realizado

Soma dos apontamentos.

## EVO-003 — Excedido

`max(realizado - previsto, 0)`

## EVO-004 — Progresso temporal

`realizado / previsto × 100`

## EVO-005 — Eficiência temporal

Código auditado:
`previsto / realizado × 100`

O manual atual apresenta fórmula inversa para eficiência.

## EVO-006 — Classificações

- Sem tempo previsto
- Não iniciada
- Concluída sem apontamento
- Mais rápido que previsto
- Dentro do previsto
- Leve desvio
- Atenção
- Crítico

## EVO-007 — Faixas de desvio

- até 10% acima: Leve desvio
- acima de 10% até 30%: Atenção
- acima de 30%: Crítico

## EVO-008 — Atividade dispensada

`ABORTED` é excluída do previsto agregado efetivo.

---

# 27. Dashboard

## DSH-001 — Visões

Existem visões com escopos/permissões distintos.

## DSH-002 — Operacional

Pode considerar:
- esteiras ativas;
- atraso;
- apontamentos;
- carga;
- capacidade;
- buckets;
- previsto/realizado;
- saúde/ARGOS.

## DSH-003 — Executiva

Pode apresentar:
- janela temporal;
- concluídas;
- ativas;
- pressão de atraso;
- previsto x realizado;
- tendências e agregados.

## DSH-004 — Janela temporal

Nem todas as métricas têm necessariamente o mesmo recorte temporal.

O manual deve informar explicitamente o universo de cada KPI.

---

# 28. Saúde Operacional

## SAU-001 — Base de cálculo

Considera:
- capacidade resolvida;
- trabalho aberto;
- pendência estimada;
- apontamentos recentes;
- estado do colaborador;
- qualidade dos dados.

## SAU-002 — Estados

- `healthy`
- `attention`
- `critical`
- `unknown`

## SAU-003 — Sobrecarga

Pendência > 100% da capacidade da janela: sobrecarga.

Pendência > 200%: sobrecarga crítica.

## SAU-004 — Atenção

Pendência acima de aproximadamente 75% da capacidade pode levar a atenção.

## SAU-005 — Sem apontamento recente

Trabalho aberto sem apontamento recente gera sinal.

## SAU-006 — Fallback de capacidade

Uso de fallback gera warning e reduz a pontuação.

## SAU-007 — Baixa ocupação

Existe sinal de ocupação recente baixa quando há trabalho aberto mas o realizado é inferior a uma fração da capacidade.

---

# 29. Configurações Operacionais

## CFG-001 — Setores

- criar;
- editar;
- ativar/inativar;
- excluir.

A exclusão pode deixar referências de colaboradores sem setor.

## CFG-002 — Funções operacionais

Separadas de RBAC.

Podem ser:
- criadas;
- editadas;
- ativadas/inativadas;
- excluídas quando não existirem vínculos impeditivos.

## CFG-003 — Capacidade

Padrão e ajustes individuais.

## CFG-004 — Descrições de apontamentos extras

Catálogo usado em Extra Esteira.

Possui:
- descrição;
- observação interna;
- ordem;
- ativo/inativo.

## CFG-005 — Justificativas

Catálogo transversal de exceções.

## CFG-006 — Motivos de dispensa

Catálogo usado para `ABORTED`.

Possui:
- código;
- rótulo;
- descrição;
- complemento obrigatório;
- ordem;
- ativo/inativo.

---

# 30. Administração, Usuários e RBAC

## USR-001 — Usuários

Área administrativa separada do cadastro operacional de colaborador.

## USR-002 — Operações administrativas

Incluem conceitos como:
- criar usuário;
- editar;
- ativar/inativar;
- vincular colaborador;
- resetar acesso;
- forçar troca de senha.

## RBAC-001 — Permissões

Permissões são separadas de “função operacional”.

Exemplo:
`conveyors.create`
não é a mesma coisa que uma função operacional de colaborador.

## RBAC-002 — Princípio documental

Toda ação administrativa deve informar:
- permissão necessária;
- efeito quando ausente;
- alternativa operacional.

---

# 31. Auditoria

## AUD-001 — Eventos administrativos

Alterações críticas podem gerar trilha administrativa.

## AUD-002 — Eventos operacionais

Esteira e atividade mantêm eventos como:
- mudança de estado;
- conclusão;
- reabertura;
- dispensa;
- restauração;
- edição estrutural;
- retorno de ciclo de vida.

## AUD-003 — Correções gerenciais

Editar/remover apontamentos deve preservar ator, alvo e motivo.

---

# 32. Configurações Sistêmicas

## SYS-001 — Timeout de inatividade

Faixa:
5 a 480 minutos.

Fallback:
30 minutos.

## SYS-002 — Aviso

Faixa:
1 a 30 minutos.

Fallback:
5 minutos.

O aviso precisa ser menor que o timeout total.

## SYS-003 — Timeout absoluto

Valor padrão de backend:
8 horas.

---

# 33. Chamados

## SUP-001 — Tipos

Categorias observadas incluem:
- dúvida;
- erro;
- bloqueio operacional;
- solicitação de apoio;
- acesso/permissão.

## SUP-002 — Bloqueio

Usuário pode indicar que o problema o impede de continuar.

## SUP-003 — Disponibilidade

Funcionalidade depende de ativação/configuração do ambiente.

---

# 34. Funcionalidade em Construção — Meu Trabalho

A rota existe.

A implementação auditada declara explicitamente que a área está em construção.

Blocos atuais:
- Hoje
- Em curso
- Bloqueios

Não há serviços/dados próprios consolidados.

**Regra documental:** não apresentar como funcionalidade pronta.

---

# 35. Cadeias de Impacto

## 35.1 Alterar quantidade prevista

`Quantidade`
→ altera tempo previsto total
→ altera carga agregada
→ altera comparação previsto x realizado
→ pode alterar eficiência
→ pode alterar planejamento
→ pode alterar capacidade/sobrecarga
→ pode refletir em dashboard e saúde operacional

## 35.2 Dispensar atividade

`Atividade → ABORTED`
→ bloqueia apontamentos
→ encerra sequência
→ cancela itens vinculados
→ reduz previsto agregado efetivo
→ preserva motivo/histórico
→ pode alterar evolução
→ pode alterar planejamento
→ restauração não reativa automaticamente itens cancelados

## 35.3 Incluir atividade tardiamente

`Estrutura`
→ nova atividade
→ marca inclusão tardia
→ atividade fica disponível para backlog semanal
→ planejamento precisa incorporar o novo trabalho
→ produção somente deve consumi-la quando aplicável ao plano/status

## 35.4 Publicar planejamento

`DRAFT/revisão`
→ `PUBLISHED`
→ fila dos colaboradores é atualizada
→ Produção Web/Kiosk passam a refletir a nova versão
→ execução passa a ser comparada contra essa publicação

## 35.5 Alterar equipe

`Equipe`
→ muda membros ativos
→ pode mudar elegibilidade operacional de atividades alocadas ao time
→ afeta quem pode apontar por vínculo de equipe
→ pode refletir em carga e saúde operacional

---

# 36. Cobertura dos Manuais Atuais

## Manual do Colaborador

| Seção | Avaliação |
|---|---|
| Introdução | OK como guia |
| Primeiro acesso | PARCIAL |
| Minhas Atividades | PARCIAL |
| Fazer Apontamento | SUPERFICIAL |
| Minha Fila | INCORRETO/PARCIAL |
| Jornada | SUPERFICIAL |
| Kiosk | PARCIAL/DIVERGENTE |
| Produção Web | SUPERFICIAL |
| FAQ | PARCIAL |

## Manual do Gestor

| Seção | Avaliação |
|---|---|
| Responsabilidades | OK como introdução |
| Navegação | PARCIAL |
| Backlog | SUPERFICIAL |
| Criar Esteira | PARCIAL |
| Estrutura | SUPERFICIAL |
| Designações | PARCIAL |
| Progresso | PARCIAL |
| Ciclo de Vida | INCORRETO/PARCIAL |
| Plano Operacional | SUPERFICIAL |
| Evolução | INCORRETO/PARCIAL |
| Planejamento Semanal | EXTREMAMENTE INSUFICIENTE |
| Dashboard | SUPERFICIAL |
| Produção/Gestor | PARCIAL |
| Equipes | SUPERFICIAL |
| FAQ | CONTÉM CONTRADIÇÕES |

---

# 37. Funcionalidades não mapeadas ou praticamente não mapeadas

> Esta tabela avalia os **HTML derivados** (`colaborador.html`, `gestor-esteira.html`). Vários dos itens abaixo **estão** cobertos neste documento (por exemplo, Agenda da Semana na seção 43.13 e Planejamento Semanal na seção 43).

| Funcionalidade | Situação |
|---|---|
| Agenda da Semana | AUSENTE |
| Extra Esteira | AUSENTE |
| Outra Atividade | AUSENTE |
| Configurações Operacionais | AUSENTE |
| Catálogo de Justificativas | AUSENTE |
| Catálogo de Motivos de Dispensa | AUSENTE |
| Catálogo de Apontamentos Extras | AUSENTE |
| Capacidade global/override | AUSENTE |
| Jornada Gerencial | AUSENTE |
| Exportação XLSX da jornada | AUSENTE |
| Revisões do planejamento | AUSENTE |
| Sincronização/divergências | AUSENTE |
| Execução fora do plano | AUSENTE |
| Histórico de planejamento | AUSENTE |
| Inclusão tardia → backlog | AUSENTE |
| Usuários | AUSENTE |
| Permissões por papel | AUSENTE |
| Trilha administrativa | AUSENTE |
| Configurações sistêmicas | AUSENTE |
| Chamados | AUSENTE |
| Gestão completa de Matrizes | QUASE AUSENTE |
| Saúde Operacional | QUASE AUSENTE |
| Estados do Plano Operacional | AUSENTE |
| Correção gerencial detalhada | SUPERFICIAL |
| Auditoria das operações | SUPERFICIAL |

---

# 38. Estrutura recomendada para os documentos derivados

## Guia do Colaborador

Objetivo:
uso diário com orientação visual e prints.

Deve abordar:
- Minhas Atividades;
- Minha Fila;
- apontamento;
- Jornada;
- Produção Web;
- Kiosk;
- Outra Atividade;
- Extra Esteira;
- mensagens mais frequentes.

## Guia do Gestor

Objetivo:
operação da fábrica.

Deve abordar:
- criação;
- estrutura;
- designações;
- ciclo de vida;
- plano operacional;
- planejamento;
- agenda;
- correções;
- evolução;
- dashboard;
- saúde;
- equipes.

## Manual Funcional

Objetivo:
fonte de verdade.

Formato:
`estado + ação + perfil + condição → comportamento + mensagem + consequência`.

## Manual de Administração e Governança

Objetivo:
- usuários;
- RBAC;
- configurações;
- catálogos;
- auditoria;
- sessão.

---

# 39. Roteiro futuro de evidências visuais

Os prints devem ser produzidos a partir da matriz funcional.

Cada print deve estar ligado a uma regra.

Exemplo:

`SEQ-002`
- print da atividade com predecessor pendente;
- print da mensagem;
- print do seletor de justificativa;
- print do registro efetuado.

`PLS-003`
- planejamento já publicado;
- edição abrindo revisão;
- mensagem de revisão salva;
- fila antes da publicação;
- fila depois da nova publicação.

Isso evita gerar prints apenas decorativos.

---


# 40. Matriz de Acesso, Perfis e Permissões

Esta seção consolida a diferença entre **perfil de segurança (RBAC)**, **função operacional do colaborador** e **elegibilidade operacional decorrente de alocação**.

Esses três conceitos são diferentes no SGP+ e não devem ser tratados como sinônimos nos manuais.

## 40.1 Papéis de segurança observados

Papéis sistêmicos encontrados nas migrations:

- `ADMIN`
- `GESTOR`
- `COLABORADOR`
- `SUPER_ADMIN` (introduzido posteriormente para configurações sensíveis)

### Regra conceitual

`Papel RBAC`
→ determina quais rotas e operações sistêmicas o usuário pode executar.

`Função operacional`
→ caracteriza a função do colaborador na operação e é administrada em Configurações Operacionais.

`Alocação`
→ determina a relação operacional com uma atividade/STEP e pode decorrer de vínculo direto, equipe ou planejamento.

## 40.2 Principais rotas e gates observados

| Área | Permissão/gate principal |
|---|---|
| Backlog/Painel de Esteiras | usuário autenticado |
| Nova Esteira | `conveyors.create` |
| Alterar Esteira | `conveyors.create` |
| Detalhe de Esteira | usuário autenticado |
| Nova Esteira por Documento | `conveyors.create` |
| Dashboard Operacional | `dashboard.view_operational` |
| Dashboard Gerencial | `dashboard.view_executive` |
| Planejamento Semanal | `conveyors.create` |
| Agenda da Semana | `conveyors.create` |
| Evolução de Esteiras | `conveyors.create` |
| Saúde Operacional | `collaborators_admin.view` |
| Colaboradores | `collaborators_admin.view` |
| Configurações Operacionais | `operational_settings.manage` |
| Configurações Sistêmicas | `system_settings.view` |
| Equipes | `teams.view` |
| Criar Equipe | `teams.create` |
| Jornada Gerencial | `collaborators_admin.view` |
| Usuários | `users.view` |
| Permissões por Papel | `rbac.manage_role_permissions` |
| Trilha Administrativa | `audit.view` |
| Matrizes | `operation_matrix.view` |
| Nova/Alterar Matriz | `operation_matrix.manage` |
| Minha Fila / Jornada / Apontamento próprio | usuário autenticado + regras operacionais |
| Apontamento gerencial | permissões de apontamento gerencial |

## 40.3 Permissões base de ADMIN e GESTOR

A migration base de RBAC atribui ao `ADMIN` o conjunto administrativo inicial.

O `GESTOR` recebe um recorte operacional, incluindo conceitos como:

- administração de colaboradores;
- criação/alteração de esteiras;
- mudança de status;
- gestão de designações;
- Matrizes;
- Dashboard Operacional.

Migrations posteriores acrescentam:

- gestão de equipes;
- Configurações Operacionais;
- edição/exclusão gerencial de apontamentos.

## 40.4 SUPER_ADMIN e Configurações Sistêmicas

`system_settings.view` e `system_settings.manage` foram introduzidas para `SUPER_ADMIN`.

Uma migration posterior revoga explicitamente essas permissões de:

- `ADMIN`;
- `GESTOR`;
- `COLABORADOR`.

Portanto, o manual administrativo deve diferenciar **Administração Operacional** de **Administração Sistêmica Sensível**.

## 40.5 Concluir atividade

A rota de conclusão não possui apenas uma regra visual.

Para `COMPLETE`:

### Gestor

Se o usuário possui `conveyors.create`, pode concluir diretamente, respeitando:

- estado da atividade;
- sequência;
- justificativa quando fora de sequência.

### Colaborador comum

Precisa:

- possuir usuário vinculado a colaborador operacional;
- operar em esteira liberada para produção;
- possuir elegibilidade/alocação na atividade.

Se não houver alocação, a conclusão direta é recusada e o sistema orienta utilizar o fluxo de apontamento com justificativa.

### Reabrir

`REOPEN` exige `conveyors.create`.

Mensagem quando usuário sem permissão tenta reabrir:

> “Sem permissão para reabrir esta atividade.”

## 40.6 Exclusão de apontamento

A rota de exclusão possui autorização dentro do serviço, mesmo não sendo protegida diretamente por `requirePermission` na rota.

### Próprio apontamento

O colaborador pode excluir seu próprio apontamento.

### Apontamento de terceiro

Exige `time_entries.delete_any`.

Também exige motivo e gera evento na trilha administrativa.

### Regra de identificação

O sistema compara:

`app_user → collaborator_id → collaborator_id do apontamento`.

Isso evita que simples autenticação seja interpretada como direito de remoção global.

---


## 40.7 Login e bloqueio temporário

O login do SGP+ utiliza e-mail e senha.

O backend evita diferenciar usuário inexistente de senha incorreta e retorna mensagem genérica:

> “E-mail ou senha inválidos.”

Após falhas sucessivas, o usuário pode entrar em lockout temporário.

A quantidade máxima de tentativas e a duração do bloqueio são parâmetros de ambiente, portanto não devem ser documentadas como constantes imutáveis no guia de usuário.

## 40.8 Usuário inativo

Usuário inativo não pode autenticar. Uma sessão que já estava aberta não é encerrada automaticamente apenas pela inativação.

Mensagem:

> “Sua conta está inativa. Contacte o administrador.”

## 40.9 Troca de senha

Regras confirmadas:

- senha atual obrigatória;
- nova senha com mínimo de 8 caracteres;
- confirmação obrigatória;
- confirmação precisa coincidir;
- nova senha precisa ser diferente da atual.

Uma troca bem-sucedida atualiza o marcador de alteração da senha, que também participa da validação das sessões.

## 40.10 Sessão Web

A sessão principal possui dois conceitos independentes:

**timeout por inatividade**
→ configurável em Configurações Sistêmicas.

**limite absoluto da sessão**
→ controlado por configuração de ambiente.

Fallbacks da aplicação analisada:

- inatividade: 30 minutos;
- aviso de expiração: 5 minutos;
- limite absoluto: 8 horas.

Os dois primeiros podem ser alterados no módulo de Configurações Sistêmicas dentro das faixas permitidas.

Esses valores são padrões/fallbacks, não garantias permanentes de todos os ambientes.


# 41. Estrutura, Edição e Preservação Histórica

## 41.1 Política atual de edição

A política atual não bloqueia a edição de estrutura apenas porque a esteira saiu de `EM_ELABORACAO`.

O próprio código marca a antiga política de bloqueio por status como obsoleta.

### Regra atual

A estrutura pode ser alterada em status operacionais conhecidos, desde que:

- o usuário possua permissão;
- a estrutura seja válida;
- seja fornecido motivo quando a esteira já saiu de `EM_ELABORACAO`.

Texto de UX observado:

> “Esta esteira já saiu do Backlog. Informe o motivo da alteração para manter a rastreabilidade operacional.”

Motivo:

- mínimo: 3 caracteres;
- máximo: 500 caracteres.

## 41.2 Alteração de dados e estrutura no mesmo salvamento

Quando dados básicos e estrutura são modificados juntos fora de `EM_ELABORACAO`, o mesmo motivo pode ser propagado para ambas as alterações.

O motivo não é gravado como um campo comum da esteira.

Ele é usado para rastreabilidade operacional/eventos.

## 41.3 Preservação de identidade dos nós

O PATCH incremental preserva IDs de nós existentes quando o payload mantém seus IDs.

Isso é essencial para preservar relações com:

- apontamentos;
- planejamento;
- eventos;
- alocações;
- estados operacionais.

## 41.4 Remoção híbrida

Ao remover parte da estrutura, o sistema analisa dependências.

### Sem dependências relevantes

Pode ocorrer remoção física.

### Com dependências

Se a subárvore possuir dependências como:

- apontamentos;
- vínculos de planejamento;
- eventos operacionais;
- STEP concluído;
- STEP dispensado,

o sistema faz **desativação lógica**, preservando o histórico.

Essa regra deve ser explicada no manual funcional para evitar a falsa expectativa de que “remover da estrutura” sempre apaga o registro do banco e de todos os históricos.

## 41.5 Evento de atualização estrutural

A alteração incremental gera evento `CONVEYOR_STRUCTURE_UPDATED`.

O evento pode registrar:

- IDs atualizados;
- IDs inseridos;
- IDs desativados logicamente;
- IDs removidos fisicamente;
- indicação de inclusão tardia;
- motivo informado.

## 41.6 Alteração de dados fora da elaboração

Alterações em dados básicos fora de `EM_ELABORACAO` podem gerar evento `MANUAL_NOTE`, contendo:

- campos modificados;
- motivo;
- ator;
- data/hora.

## 41.7 Exclusão da esteira

A exclusão da esteira é física somente quando não existem dependências bloqueantes.

### Com apontamentos

Mensagem:

> “Esta esteira já possui apontamentos e não pode ser excluída. Cancele ou finalize para preservar o histórico.”

### Com movimentações/vínculos operacionais

Exemplo: itens de planejamento ou Plano Operacional.

Mensagem:

> “Esta esteira já possui movimentações e não pode ser excluída.”

Portanto:

**Cancelar/finalizar ≠ excluir.**

Exclusão deve ser tratada como ação estrutural excepcional, não como mecanismo normal de encerramento.

---

# 42. Plano Operacional da Esteira — Regras Detalhadas

## 42.1 Quando pode ser criado

Plano Operacional pode ser criado para esteira em:

- `EM_PLANEJAMENTO`;
- `A_INICIAR`;
- `EM_ANDAMENTO`.

Não pode existir mais de um Plano Operacional ativo para a mesma esteira.

Mensagem em duplicidade:

> “Já existe um plano operacional ativo para esta esteira.”

Todas as rotas desse módulo estão atualmente protegidas por `conveyors.create`.

## 42.2 Estados do plano

| Código | Rótulo |
|---|---|
| DRAFT | Rascunho |
| APPROVED | Aprovado |
| WAITING_FACTORY_PLANNING | Aguardando encaixe na fábrica |
| PARTIALLY_PLANNED_IN_FACTORY | Parcialmente planejado na fábrica |
| FULLY_PLANNED_IN_FACTORY | Planejado na fábrica |
| IN_EXECUTION | Em execução |
| COMPLETED | Concluído |
| CANCELLED | Cancelado |

## 42.3 Estados de sincronização com a fábrica

| Código | Rótulo |
|---|---|
| NOT_SCHEDULED | Não agendado |
| PARTIALLY_SCHEDULED | Parcialmente agendado |
| FULLY_SCHEDULED | Agendado |
| DIVERGED | Divergente |
| REVIEW_REQUIRED | Requer revisão |

## 42.4 Estados dos itens

- `PLANNED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `NEEDS_REVIEW`

## 42.5 Origens dos itens

- `GENERATED`
- `MANUAL`
- `IMPORTED`

Itens gerados podem receber o indicador visual **“Ajustado manualmente”** quando alterados após a geração.

## 42.6 Geração automática

A geração segue a ordem estrutural:

`tarefa → setor → atividade`.

A distribuição ocorre em dias úteis, de segunda a sexta-feira.

A carga utiliza a capacidade diária configurada.

Uma atividade é mantida inteira em um único dia; ela não é fracionada automaticamente entre dias.

Se o tempo da atividade for maior que a capacidade diária:

- a atividade continua alocada a um dia;
- o item é marcado para revisão.

## 42.7 Resolução automática do responsável

Ordem observada:

1. responsável padrão da atividade;
2. exatamente um colaborador alocado;
3. exatamente uma equipe alocada.

Situações que geram revisão:

- múltiplos colaboradores sem decisão;
- múltiplas equipes sem decisão;
- nenhum colaborador/equipe.

## 42.8 Motivos de revisão

- `MISSING_PLANNED_MINUTES`
- `ZERO_PLANNED_MINUTES`
- `OVER_DAILY_CAPACITY`
- `MULTIPLE_TEAMS`
- `MISSING_ASSIGNEE`
- `MISSING_PLANNED_DATE`

## 42.9 Prévia de regeneração

Antes de substituir a geração, o sistema consegue apresentar avisos como:

- itens existentes serão substituídos;
- itens manuais serão removidos;
- itens já revisados serão removidos;
- nova geração criará itens que precisam revisão;
- nenhuma atividade ativa encontrada;
- data inicial ajustada para próximo dia útil.

## 42.10 Regeneração

Se já existem itens e `overwrite` não foi informado, o backend bloqueia a substituição e devolve dados de prévia.

Mensagem:

> “O plano já possui itens. Envie overwrite=true para substituir a geração atual.”

Se existem itens vinculados ao Planejamento da Fábrica, regeneração é bloqueada:

> “Não é possível gerar ou regenerar itens: o plano possui vínculo com o Planejamento da Fábrica.”

## 42.11 Aprovação

Somente plano `DRAFT` pode ser aprovado.

Bloqueios efetivos do backend incluem:

- nenhum item ativo;
- qualquer item que ainda precise revisão.

Mensagem sem itens:

> “Adicione ao menos uma atividade ativa antes de aprovar o plano.”

Mensagem com revisão:

> “Existem itens que precisam revisão antes de aprovar o plano.”

## 42.12 Aprovação não inicia execução

Mensagem funcional existente:

> “Plano pronto para aprovação. Revise o checklist antes de aprovar — a execução não inicia automaticamente.”

Após aprovação:

> “Plano aprovado pelo gestor da esteira. Envie para o Planejamento da Fábrica quando estiver pronto — isso cria uma demanda de encaixe, sem iniciar execução.”

## 42.13 Envio para fábrica

Somente `APPROVED` pode ser enviado.

Destino:

`WAITING_FACTORY_PLANNING`

O envio cria demanda de encaixe; não significa que a atividade já está programada em um dia/colaborador da fábrica.

---

# 43. Planejamento Semanal e Agenda — Regras Detalhadas

## 43.1 Semana operacional

O backend exige:

- início: segunda-feira;
- fim: sexta-feira da mesma semana;
- fim exatamente quatro dias depois do início.

## 43.2 Unicidade de atividade

Cada atividade pode aparecer apenas uma vez no plano semanal em edição.

Mensagem:

> “Cada Atividade só pode aparecer uma vez no plano.”

Quando vinculada ao Plano Operacional:

> “Cada item do plano da esteira só pode ser encaixado uma vez na semana.”

## 43.3 Elegibilidade da atividade

Para novo planejamento:

- deve existir;
- deve ser um `STEP`;
- deve estar ativa;
- não pode ser atividade já concluída;
- não pode pertencer a uma esteira finalizada para novo encaixe.

Uma atividade concluída ou pertencente a esteira finalizada pode permanecer no payload quando já existia no plano e continua inalterada. Isso preserva o histórico sem permitir novo planejamento.

## 43.4 Impedir planejamento duplicado

O backend impede que a mesma atividade seja planejada em outro plano semanal ativo.

Mensagem:

> “Atividade já está planejada em outro plano semanal.”

## 43.5 Integração com Plano Operacional

Para um novo encaixe originado do Plano Operacional:

- item deve corresponder à mesma esteira/atividade;
- plano da esteira deve estar `WAITING_FACTORY_PLANNING`;
- item não pode estar `CANCELLED` nem `COMPLETED`;
- item não pode estar vinculado a outro planejamento.

## 43.6 Backlog legado e fluxo novo

O backlog comum exclui esteiras:

- `FINALIZADA`;
- `CANCELADA`;
- `EM_ELABORACAO`;
- `AGUARDANDO_PLANEJAMENTO`.

Também exclui atividades já presentes:

- em Plano Operacional ativo;
- em plano semanal `DRAFT` ou `PUBLISHED`.

### Exceção de inclusão tardia

Esteira `EM_ANDAMENTO` com Plano Operacional ativo normalmente segue o fluxo novo de encaixe e não o backlog legado.

Entretanto, STEP incluído tardiamente com:

`lateAddToWeeklyBacklog = true`

pode entrar no backlog se estiver:

- ativo;
- não removido;
- não `COMPLETED`;
- não `ABORTED`.

## 43.7 Revisão de plano publicado

Quando a semana possui plano `PUBLISHED` e o gestor faz alterações:

- um novo `DRAFT` de revisão é criado/reutilizado;
- a revisão é iniciada a partir do plano publicado;
- a fila dos colaboradores continua lendo a publicação vigente.

Somente após nova publicação a revisão substitui a versão anterior para a execução.

## 43.8 Publicação

Plano sem atividade não pode ser publicado.

Mensagem:

> “Adicione ao menos uma atividade antes de publicar o plano.”

Ao publicar nova revisão:

- vínculos da versão publicada anterior são reconciliados;
- a publicação anterior é desativada logicamente;
- a nova versão passa a ser `PUBLISHED`;
- vínculos com Plano Operacional são atualizados.

## 43.9 Sincronização Plano da Esteira × Fábrica

Diferenças detectadas:

- item da fábrica ausente;
- data diferente;
- minutos diferentes;
- colaborador diferente;
- equipe diferente;
- item cancelado no Plano da Esteira;
- item do Plano da Esteira precisando revisão;
- item cancelado na fábrica.

Estado resultante:

- `PENDING`
- `SYNCED`
- `DIVERGED`

## 43.10 Aplicar dados do Plano da Esteira

A tela pode aplicar seletivamente:

- data;
- minutos;
- colaborador;
- equipe.

Não é permitido aplicar sincronização sobre:

- item semanal cancelado;
- atividade já concluída.

Se a data do Plano da Esteira estiver fora da semana:

> “A data do plano da esteira está fora da semana exibida. Replaneje manualmente em outra semana.”

## 43.11 Exportação Excel

A exportação:

- usa o `DRAFT` quando existe; caso contrário usa o `PUBLISHED`;
- ignora filtros puramente visuais da tela;
- possui duas abas;
- identifica situação como:
  - `RASCUNHO`;
  - `REVISAO_NAO_PUBLICADA`;
  - `PUBLICADO`.

Sem plano:

> “Nenhum plano encontrado para esta semana.”

Sem itens:

> “Não há atividades planejadas nesta semana para exportar.”

## 43.12 Classificação de capacidade no Excel

A exportação possui regra própria:

- capacidade ausente/inválida → `Capacidade não cadastrada`;
- planejado > capacidade → `Sobrecarregado`;
- planejado = capacidade → `No limite`;
- planejado < capacidade → `Disponível`.

Não há limiar de 90% nessa classificação da exportação.

## 43.13 Agenda da Semana

A Agenda não é apenas uma visualização.

Ela permite:

- arrastar do backlog para uma célula;
- mover itens entre colaboradores/dias;
- soltar em aba de dia para alterar data;
- atribuição em lote;
- remover do plano;
- salvar revisão;
- publicar;
- registrar apontamento rápido;
- concluir atividade;
- visualizar problemas de sincronização;
- visualizar execução fora do plano;
- imprimir tickets.

Em dispositivos touch existe comportamento próprio de drag com atraso de ativação para evitar toques acidentais.

## 43.14 Conclusão pela Agenda

Para concluir atividade pela Agenda:

- usuário precisa da capacidade operacional correspondente (`conveyors.create` no frontend);
- se estiver fora de sequência, a tela solicita justificativa;
- há confirmação antes de concluir.

---


## 43.15 Tickets operacionais de atividade

O SGP+ possui impressão de tickets físicos de atividade.

Esses tickets são **apoio operacional**.

Texto explícito da interface:

> “Use os tickets como apoio físico na operação. O status oficial da atividade continua sendo controlado no SGP+.”

Portanto:

**ticket impresso ≠ fonte oficial de estado.**

## 43.16 Impressão por esteira

No contexto de uma esteira, é possível imprimir atividades com agrupamento por:

- estrutura da esteira;
- tarefa.

Atividades concluídas são ocultadas por padrão, com opção de incluí-las.

## 43.17 Impressão da semana planejada

No Planejamento/Agenda, é possível imprimir lote de tickets da semana.

Agrupamentos:

- responsável;
- tarefa / esteira.

Atividades concluídas também são ocultadas por padrão.

## 43.18 Agente local de impressão

A aplicação verifica periodicamente a disponibilidade do SGP Print Agent local.

Estados visuais:

- verificando;
- disponível;
- indisponível.

Quando disponível, o sistema tenta enviar o lote diretamente ao agente.

## 43.19 Fallback de impressão

Quando o agente:

- não é encontrado;
- falha;
- ou falha apenas em parte do lote,

o sistema pode recorrer à impressão do navegador.

Mensagem padrão:

> “Agente de impressão local não encontrado. Usando impressão pelo navegador.”

Em falha parcial, apenas as folhas que falharam podem ser reenviadas ao navegador.

## 43.20 Teste e progresso

A interface suporta:

- testar a impressora térmica;
- acompanhar progresso do lote;
- cancelar sequência de impressão;
- impressão em várias folhas.

A disponibilidade de impressão silenciosa depende da configuração da estação/navegador ou do agente local; não é uma garantia do navegador padrão.


# 44. Fila e Modo Fábrica — Diferenças por Forma de Acesso

> As duas formas de acesso ao Modo Fábrica (totem/Kiosk e navegador/Produção Web) compartilham fila e credencial, mas não os mesmos campos de tela. Ver 1.3.

## 44.1 Fonte da fila

A fila operacional do colaborador depende de plano semanal `PUBLISHED`.

Sem plano publicado para a semana, o backend devolve fila vazia.

## 44.2 Agrupamento

Itens são agrupados em:

1. atrasados;
2. hoje;
3. concluídos.

`ABORTED` é tratado como encerrado para agrupamento da fila.

## 44.3 Ordenação

Dentro da fila, a prioridade considera:

1. grupo;
2. itens sem predecessor pendente antes dos itens com predecessor;
3. data planejada;
4. esteira;
5. posição estrutural;
6. item do planejamento.

A indicação de **próxima atividade recomendada** é uma regra separada da simples ordenação visual.

## 44.4 Capacidade diária da fila

A resposta inclui:

- capacidade resolvida do colaborador para o dia;
- minutos planejados;
- indicador de sobrecarga quando planejado > capacidade.

## 44.5 Mensagens de indisponibilidade

Exemplos:

> “Esta atividade já foi concluída.”

> “Este item do plano foi cancelado.”

> “A esteira está finalizada.”

> “A esteira está cancelada.”

> “Apontamento indisponível: a esteira ainda não está liberada para produção.”

## 44.6 Produção Web — PIN

Aceita PIN numérico de 4 a 8 dígitos.

No primeiro acesso pode exigir troca.

PIN padrão inicial:

`1234`

Não é permitido mantê-lo como PIN definitivo.

## 44.7 Kiosk — PIN

O teclado atual do Kiosk trabalha com exatamente 4 dígitos e dispara autenticação ao completar os quatro.

A tela de troca de PIN do Kiosk também trabalha com quatro dígitos.

## 44.8 Bloqueio de credencial

Status:

- `READY`
- `NEEDS_INITIAL_PIN`
- `LOCKED`
- `DISABLED`

Mensagens genéricas evitam revelar detalhes excessivos de credencial.

## 44.9 Tentativas e bloqueio temporário

Padrões observados em configuração:

- máximo de tentativas inválidas: 5;
- bloqueio padrão: 15 minutos.

Esses valores são configuráveis por ambiente e não devem ser apresentados como imutáveis em manual de usuário.

## 44.10 Sessão de Produção

Padrões observados:

- inatividade: 30 minutos;
- duração absoluta: 12 horas.

Também configuráveis por ambiente.

## 44.11 Cobertura de tempo no Kiosk

O percentual calculado a partir de tempo é:

`minutos realizados ÷ minutos previstos`

limitado visualmente a 100%.

Esse percentual não representa necessariamente percentual físico da peça concluída.

## 44.12 Tempo previsto atingido

Mensagem:

> “Tempo previsto atingido. Marque como concluída para liberar a próxima atividade.”

Isso reforça que:

**consumir o tempo previsto não conclui automaticamente a atividade.**

## 44.13 Justificativa no Kiosk

É exigida quando aplicável a:

- fora de sequência;
- extrapolação do tempo previsto.

A lista evita rotular preventivamente o item como “Fora de sequência”; usa linguagem como “Atenção à sequência” ou informa predecessor pendente.

A expressão “Fora de sequência” é usada no contexto da ação/confirmação.

---

# 45. Jornada e Dashboard — Semântica das Métricas

## 45.1 Jornada — período padrão

Presets backend:

- 7 dias;
- 15 dias;
- 30 dias;
- mês;
- customizado.

Sem parâmetro, o padrão é 7 dias.

## 45.2 Intervalo customizado

Quando o usuário informa somente datas (`YYYY-MM-DD`):

- `from` corresponde ao início do dia civil de São Paulo;
- `to` corresponde ao fim do dia civil de São Paulo.

Não deve ser interpretado como meia-noite UTC.

## 45.3 Limite da tela x universo dos totais

Minha Jornada solicita e mostra no máximo **20** apontamentos, ordenados por `entry_at DESC, created_at DESC`, sem paginação ou controle para carregar mais. A Jornada Gerencial também solicita 20 no conjunto consultado. O contrato de consulta aceita `limit` de 1 a 100, mas essas telas fixam 20.

Os totais do período usam todos os apontamentos de esteira válidos no período, sem esse limite. Acumulado usa todas as datas. A lista e ambos os totais excluem apontamento, esteira ou atividade com `deleted_at` preenchido; não exigem alocação atual nem atividade ativa.

A exportação Excel **da Jornada Gerencial** traz todos os apontamentos do período, sem limite de linhas, e Extra Esteira em separado. Minha Jornada não oferece exportação.

Evidências: `JornadaPage.tsx:272-281,596-600`, `JornadaColaboradorGestorPage.tsx:289`, `operational-journey.schemas.ts:3-12`, `operational-journey.repository.ts:32-40,347-434`, `operational-journey.service.ts:427-453`.

## 45.4 Jornada — previsto estrutural

Reconfirmação em 2026-10-03, na rodada do capítulo 11. A fonte é `listActivitiesRawForCollaborator`: alocações diretas ativas em `conveyor_node_assignees`, com atividade, setor e tarefa ativos e não removidos, e esteira não removida. A consulta não expande equipe e não lê os itens do planejamento semanal. Também não filtra o status de conclusão/dispensa da atividade nem o período.

O serviço soma o previsto **uma vez por alocação colaborador × atividade**. No escopo de duas pessoas alocadas à mesma atividade, cada pessoa contribui com seu previsto; não há rateio. Republicar ou remover um item do plano semanal não remove por si só a alocação estrutural.

**Defeito confirmado no caminho real de dados:** o helper usa `minutos por unidade × quantidade prevista` (ou `plannedTotalMinutes` quando disponível), porém o SELECT de `listActivitiesRawForCollaborator` **não retorna `step.planned_quantity`**. O mapeamento recebe quantidade ausente, assume 1 e calcula o total com essa quantidade. Portanto, nas consultas atuais de ambas as jornadas, o previsto efetivo usa **uma unidade**, mesmo quando a atividade tem quantidade maior. O teste unitário do helper não verifica essa omissão do SELECT.

Exemplo determinado por esse código, sem execução de banco: atividade de 30 min/unidade e quantidade 4 contribui com 30 min por alocação, não 120 min. Nenhuma correção de código foi realizada.

Minha Jornada mostra "Previsto" no resumo e tempo unitário no cartão. A expressão "Previsto estrutural (soma das alocações)" é da Jornada Gerencial.

Evidências: `my-activities.repository.ts:25-82`, `my-activities.service.ts:71-85,141-150`, `activityOperationalQuantity.ts:18-25,56-62`, `operational-journey.service.ts:43-71,275-294`, `JornadaPage.tsx:125,154-157,387-402`, `server/src/tests/operational-journey-structural-planned.test.ts` (somente lido, não executado).

## 45.5 Cobertura de tempo

Fórmula:

`realizado acumulado nas alocações do escopo ÷ previsto estrutural do mesmo conjunto de alocações`

Se o previsto do escopo for ≤ 0, a cobertura não é aplicável (`ratio = null`); realizado maior que zero não muda essa regra. Não há teto de 100% nem arredondamento no cálculo. A apresentação gerencial arredonda para uma casa decimal (`Math.round(ratio * 1000) / 10`) e admite valores acima de 100%.

O numerador soma o realizado acumulado **do próprio colaborador** em cada atividade atualmente alocada, não o realizado no período nem o acumulado global. Extra Esteira fica fora. A omissão de quantidade descrita em 45.4 afeta o denominador.

**Minha Jornada não renderiza cobertura** nem saldo/diferença. O serviço devolve o cálculo, mas a exibição e o texto a seguir pertencem à **Jornada Gerencial**: "Numerador: soma dos apontamentos nas alocações do escopo. Denominador: previsto estrutural no mesmo conjunto de alocações."

Evidências: `operational-journey.service.ts:78-82,290-294,384-389`, `server/src/shared/coberturaTempo.ts:14-28`, `src/lib/operationalSemantics.ts:67-70`, `JornadaColaboradorGestorPage.tsx:629-643`, `JornadaPage.tsx:383-656`.

## 45.6 Extra Esteira

O serviço compartilhado das jornadas agrega separadamente:

- total de minutos extras;
- número de lançamentos;
- até três descrições com maior soma de minutos (desempates por quantidade de lançamentos e descrição).

Considera a data civil de realização em São Paulo (`entry_date`), o colaborador consultado, registro não removido e descrição não removida. Quando há filtro de esteira, Extra Esteira continua independente desse filtro.

**Exibição:** o resumo é renderizado na Jornada Gerencial; Minha Jornada não consome esses campos na apresentação. Não soma ao realizado de esteira nem à cobertura em nenhuma das jornadas.

Evidências: `operational-journey.repository.ts:438-517`, `operational-journey.service.ts:296-322,390-399`, `JornadaColaboradorGestorPage.tsx:603-625`, `JornadaPage.tsx:383-656`.

## 45.7 Sinais de pendência

Atividade aberta entra em pendência temporal quando:

`previsto estrutural > realizado acumulado`.

O serviço retorna a contagem completa e até **48** itens, ordenados pela maior diferença, sem filtro de período. "Aberta" aqui exclui esteira finalizada/cancelada, não atividade individual concluída/dispensada.

Esse sinal de diferença é apresentado somente na **Jornada Gerencial**. Minha Jornada não renderiza `signals.pendenciaTempo`: seu "Pendente (em aberto)" conta cartões das colunas Pendentes e Em andamento.

Além disso, o serviço exclui os buckets finalizadas/canceladas de `assignmentsOpen` e `assignmentsAtRisk`; a Minha Jornada usa apenas essas duas listas para construir as três colunas. Assim, a coluna **Concluídas permanece vazia**, embora os totais possam incluir essas alocações. Os cartões e o botão Apontar seguem o bucket da **esteira**, não o status individual da atividade.

Evidências: `operational-journey.service.ts:140-171,325-331`, `JornadaPage.tsx:128-130,313-360,561-590`, `JornadaColaboradorGestorPage.tsx:723-748`.

## 45.8 Jornada Gerencial — múltiplos colaboradores

**Dois tetos distintos** (revisão de 2026-10-03):

| Operação | Mínimo | Máximo |
|---|---|---|
| Consulta na tela (jornada consolidada) | 1 | **20** |
| Exportação XLSX | 1 | **50** |

A exportação aceita de 1 a 50 colaboradores.

Para cada colaborador pode incluir:

- identificadores;
- alocações;
- previsto;
- realizado no período;
- realizado acumulado;
- cobertura;
- Extra Esteira;
- atraso;
- pendências;
- apontamentos detalhados;
- quantidade executada;
- origem do apontamento;
- fora de sequência;
- justificativas.

## 45.9 Dashboard Operacional

Principais conceitos:

- total de esteiras por bucket;
- pressão de atraso;
- quantidade de alocações;
- principal x apoio;
- previsto estrutural;
- realizado acumulado;
- realizado em período opcional;
- carga por colaborador;
- apontamentos recentes.

## 45.10 Realizado em período

Presets observados:

- 7 dias;
- 15 dias;
- 30 dias;
- mês.

É separado do acumulado global.

## 45.11 Previsto estrutural x total da OS

O backend mantém duas métricas distintas:

**Previsto estrutural**
→ soma de minutos unitários × quantidade dos STEPs ativos.

**Total por esteira/OS**
→ coluna agregada da esteira, mantida como informação de apoio.

A própria implementação reconhece que elas podem divergir se a coluna agregada não tiver sido recalculada.

## 45.12 Dashboard Gerencial

A métrica “Esteiras ativas” é snapshot atual e não recebe filtro de data.

“Concluídas (Nd)” usa a janela selecionada.

A participação de atraso é:

`esteiras em atraso ÷ esteiras ativas`

quando existem esteiras ativas.

Portanto, a janela do dashboard gerencial não deve ser interpretada como filtro uniforme aplicado a todos os KPIs.

---


## 45.13 Dois conceitos diferentes de “saúde”

O SGP+ possui duas funcionalidades distintas que não devem ser misturadas na documentação:

### Saúde Operacional do Colaborador

Cálculo determinístico do próprio SGP+ baseado em:

- capacidade;
- carga pendente;
- trabalho aberto;
- apontamentos recentes;
- qualidade de dados.

### ARGOS Health da Esteira

Análise externa da **esteira**, executada pelo serviço ARGOS a partir de snapshot operacional preparado pelo SGP+.

São produtos e fontes de cálculo diferentes.

## 45.14 Snapshot enviado ao ARGOS Health

Antes da análise, o SGP+ compõe snapshot com elementos como:

- dados da esteira;
- estrutura;
- carga;
- previsto e realizado;
- resumo de pessoas;
- resumo de equipes;
- atividade recente;
- qualidade dos dados.

O snapshot é validado antes da chamada externa.

## 45.15 Resultado persistido

Quando a análise é executada com persistência, ficam registrados:

- `analysisId`;
- `requestId`;
- rota utilizada;
- indicação de uso de LLM, quando informada;
- situação de saúde;
- score;
- nível de risco;
- análise completa;
- resumo do snapshot;
- autor da execução;
- data/hora.

## 45.16 Conteúdo apresentado na Esteira

O cartão ARGOS Health pode mostrar:

- situação geral;
- score;
- nível de risco;
- narrativa;
- achados;
- gargalos;
- ações recomendadas;
- metadados da execução.

## 45.17 Histórico e tendência

A tela carrega a análise mais recente e histórico.

A comparação entre análise atual e imediatamente anterior produz uma **heurística visual do SGP+** para tendência.

Essa comparação não é uma nova análise ARGOS.

Ela pode indicar:

- melhora;
- piora;
- estabilidade;
- impossibilidade de comparar.

## 45.18 Reflexos em Backlog e Dashboard

Quando a UI ARGOS está habilitada, resumos persistidos podem alimentar:

- contagens no Dashboard;
- destaque de riscos;
- filtros no Backlog;
- quantidade de esteiras com/sem análise.

Classificações de risco são normalizadas para buckets como:

- baixo;
- médio;
- alto;
- crítico;
- desconhecido.

Situações de saúde são normalizadas para:

- saudável;
- atenção;
- warning;
- crítico;
- desconhecido.


# 46. Matrizes e Importação por Documento — Detalhamento

## 46.1 Hierarquia da Matriz

Estrutura permitida:

`ITEM → TASK → SECTOR → ACTIVITY`

Não é permitido criar filhos fora dessa hierarquia.

## 46.2 Campos exclusivos de ACTIVITY

Somente atividade aceita conceitos como:

- minutos previstos;
- quantidade prevista;
- responsável padrão;
- equipe;
- obrigatoriedade.

## 46.3 Equipe padrão da atividade

A implementação normaliza para no máximo uma equipe padrão efetiva por atividade.

## 46.4 Responsável padrão

Responsável padrão precisa:

- existir;
- estar ativo;
- ser membro ativo da equipe informada.

Mensagem:

> “O colaborador responsável deve ser um colaborador ativo e membro ativo da equipe informada.”

## 46.5 Troca de equipe

Se a equipe muda e o responsável atual deixa de ser elegível, o responsável é limpo automaticamente.

## 46.6 Exclusão e restauração

A Matriz possui exclusão lógica em cascata e restauração em cascata.

Isso permite desfazer remoções e preservar estrutura histórica.

## 46.7 Duplicação

Uma Matriz/ITEM pode ser duplicada como nova raiz.

Os IDs são recriados.

Responsável padrão somente é copiado quando ainda é válido.

Caso contrário a duplicação pode concluir com aviso não bloqueante:

> “A atividade ... foi duplicada sem responsável porque o colaborador configurado não pertence mais à equipe ou está inativo. Revise a atividade e selecione um responsável válido.”

## 46.8 Exportação

Matriz possui exportação XLSX da árvore, incluindo informações de equipe.

## 46.9 Pré-visualização editável

A prévia não é apenas leitura.

Permite preparar alterações locais como:

- adicionar tarefa;
- adicionar setor;
- adicionar atividade;
- remover;
- renomear;
- reordenar;
- editar atividade;
- definir equipe/responsável.

Alterações precisam ser explicitamente salvas.

## 46.10 Importação por documento — fluxo

Fluxo funcional:

`PDF → ingestão → rascunho → revisão humana → decisões → validações → confirmação → criação oficial da esteira`

O upload aceita PDF.

A interface informa claramente que a criação é precedida por rascunho revisável.

## 46.11 Resultado da ingestão

Estados:

- `completed`
- `partial`
- `failed`

Resultado é considerado operacionalmente inválido quando:

- status é `failed`;
- existe issue fatal;
- não existe draft utilizável.

## 46.12 Categorias de issues

- `fatal_error`
- `revisable_warning`
- `missing_field`
- `low_confidence_field`

## 46.13 Estratégias de matching

Ações sugeridas pelo contrato:

- `REUSE_EXISTING`
- `REVIEW_SIMILAR`
- `CREATE_NEW`
- `IGNORE`

A revisão humana pode resultar em decisões como:

- manter correspondência;
- selecionar alternativa;
- confirmar novo;
- ignorar.

## 46.14 Criação oficial

Antes do POST final, a tela:

- aplica decisões humanas;
- valida conteúdo;
- constrói auditoria segura da revisão;
- confirma com o usuário;
- executa diagnósticos estruturais;
- só então cria a esteira.

Mensagem de sucesso:

> “Esteira criada a partir do documento revisto.”

## 46.15 Proteções de conteúdo

O fluxo impede que conteúdo financeiro/sensível ou campos internos de debug sejam enviados como parte operacional da esteira.

Também impede rollup sintético inválido da Matriz.

---

# 47. Eventos, Auditoria e Histórico

## 47.1 Eventos operacionais reconhecidos pela UI

A taxonomia inclui, entre outros:

- entrada em atraso;
- saída de atraso;
- conclusão de atividade;
- reabertura;
- dispensa;
- restauração;
- item de estrutura incluído;
- estrutura atualizada;
- retorno ao backlog;
- retorno ao planejamento;
- anotação manual.

Existem ainda tipos previstos para:

- bloqueio/desbloqueio;
- pausa/retomada.

Os últimos devem ser tratados com cautela enquanto não houver fluxo de usuário confirmado.

## 47.2 Apontamento fora de sequência

Pode gerar evento:

`CONVEYOR_STEP_OUT_OF_SEQUENCE_TIME_ENTRY`

com informações como:

- atividade;
- apontamento;
- justificativa;
- gatilho;
- indicação de conclusão junto com apontamento.

## 47.3 Eventos administrativos de usuário

Exemplos:

- usuário criado;
- ativado;
- desativado;
- excluído logicamente;
- restaurado;
- colaborador vinculado;
- colaborador desvinculado;
- troca obrigatória de senha;
- reset de senha;
- usuário alterado.

## 47.4 Reset administrativo de senha

Administrador não pode executar reset de sua própria senha por esse fluxo administrativo.

O reset:

- gera senha temporária;
- limpa lockout;
- força troca no próximo acesso;
- gera auditoria.

## 47.5 Reset de PIN de Produção

Gestão pode redefinir credencial operacional.

O PIN volta ao valor inicial e o próximo acesso exige definição de novo PIN.

---


## 47.6 Chamados de suporte — fluxo confirmado

O módulo de Chamados possui frontend, backend e persistência na `develop`.

Ele é controlado por feature flag/configuração de ambiente.

Quando desabilitado, o backend responde como recurso indisponível:

> “Módulo de suporte está desativado.”

## 47.7 Criação do chamado

Campos:

- categoria;
- assunto;
- descrição;
- indicação “Isso está me impedindo de continuar”;
- módulo/tela inferido;
- rota;
- contexto;
- identificadores técnicos opcionais.

Limites backend:

- categoria: até 30 caracteres;
- assunto: até 160;
- descrição: até 10.000.

O ticket nasce com status:

`OPEN`

## 47.8 Categorias de abertura da interface

- Dúvida
- Erro
- Bloqueio operacional
- Solicitação de apoio
- Acesso/permissão

## 47.9 Severidade inicial

A severidade é derivada do indicador de bloqueio:

- `isBlocking = false` → `MEDIUM`;
- `isBlocking = true` → `HIGH`.

Embora o domínio comporte `LOW` e `CRITICAL`, a abertura manual atual não escolhe diretamente esses níveis.

## 47.10 Consulta dos próprios chamados

O backend filtra por `created_by_user_id`.

O usuário consulta somente chamados criados por sua própria conta nas rotas analisadas.

Filtros disponíveis:

- busca por protocolo/assunto;
- status;
- categoria;
- severidade;
- período.

Status aceitos:

- `OPEN`
- `IN_PROGRESS`
- `RESOLVED`
- `CLOSED`

Períodos:

- todos;
- hoje;
- 7 dias;
- 30 dias.

## 47.11 Notificações

Após a criação, o sistema constrói um plano de roteamento.

Para severidades altas/críticas, o roteamento pode prever:

- e-mail;
- WhatsApp.

Para severidades menores, o fluxo observado prioriza e-mail.

Resultado por canal:

- `SENT`
- `FAILED`
- `SKIPPED`
- `PENDING`

## 47.12 E-mail

E-mail depende de SMTP e destinatários configurados.

Se configuração obrigatória estiver ausente, o envio é marcado como `SKIPPED` em vez de impedir a criação do chamado.

## 47.13 WhatsApp

O contrato e o roteamento existem, porém o notifier analisado atualmente retorna:

> “WhatsApp provider indisponível neste ambiente.”

Portanto a documentação de usuário não deve prometer envio efetivo por WhatsApp em todos os ambientes.


# 48. Matriz de Rastreabilidade Técnica

A tabela abaixo não pretende listar todos os arquivos existentes, mas aponta as principais fontes usadas para comprovar as regras desta versão.

| Domínio | Fontes técnicas principais |
|---|---|
| Rotas e acesso | `src/routes/AppRoutes.tsx`, `ProductionRoutes.tsx`, `KioskRoutes.tsx`, `src/lib/shell/app-nav-config.ts` |
| RBAC | `server/migrations/0013_app_permissions.sql`, `0016_teams_and_permissions.sql`, `0019_operational_settings.sql`, `0036_super_admin_system_settings_permissions.sql`, `0047_revoke_system_settings_from_admin.sql`, `0053_time_entries_edit_delete_any_permissions.sql` |
| Ciclo de Vida | `server/src/modules/conveyors/conveyorOperationalStatus.ts`, `conveyor-lifecycle.service.ts`, `src/domain/conveyors/conveyorLifecycleActions.ts` |
| Estrutura | `server/src/modules/conveyors/conveyors.service.ts`, `conveyor-structure-diff.ts`, `src/features/esteiras/conveyorEditSavePolicy.ts` |
| Atividades | `server/src/modules/conveyors/conveyor-step-operational.service.ts`, `stepOperationalStatus.ts` |
| Apontamentos | `server/src/modules/conveyors/conveyorAssignments.service.ts`, `conveyorAssignments.repository.ts`, `conveyorAssignments.routes.ts` |
| Sequência | `server/src/modules/conveyors/conveyorActivitySequence.logic.ts`, `src/domain/production/kioskActivityCardLogic.ts` |
| Fila | `server/src/modules/my-work-queue/my-work-queue.service.ts`, `work-queue-prioritization.ts`, `work-queue-sequence-presentation.ts` |
| Kiosk/Produção | `server/src/modules/production/production-auth.service.ts`, `production-credential-status.ts`, `src/features/kiosk/*`, `src/features/production/*` |
| Plano Operacional | `server/src/modules/conveyor-operational-plan/*`, `src/domain/conveyor-operational-plan/*` |
| Planejamento Semanal | `server/src/modules/operational-planning/*`, `src/features/operational-planning/*` |
| Agenda | `src/features/weekly-agenda/WeeklyAgendaPage.tsx` e componentes relacionados |
| Jornada | `server/src/modules/operational-journey/*`, `src/features/colaborador/JornadaPage.tsx`, `src/features/gestor/JornadaColaboradorGestorPage.tsx` |
| Evolução | `server/src/modules/conveyor-progress/*`, `server/src/shared/conveyorProgressMetrics.ts` |
| Dashboard | `server/src/modules/dashboard/*`, `src/features/gestor/DashboardPage.tsx` |
| Saúde Operacional | `server/src/modules/collaborators/collaborator-operational-health*.ts`, `src/domain/collaborator-health/*` |
| Matrizes | `server/src/modules/operation-matrix/*`, `src/features/operation-matrix/*` |
| Documento | `server/src/modules/argos-integration/*`, `src/features/documentos/nova-esteira-documento/*` |
| Configurações Operacionais | `src/features/gestor/operational-settings/*`, módulos backend correspondentes |
| Usuários | `server/src/modules/admin-users/*` |
| Auditoria | `server/src/modules/admin-audit/*`, eventos operacionais de conveyors |
| Configurações Sistêmicas | `server/src/modules/system-settings/*`, `src/features/admin/system-settings/*` |
| Autenticação/Sessão | `server/src/modules/auth/*`, `src/lib/use-auth.ts` |
| Chamados | `server/src/modules/support/*`, `src/features/support/*` |
| Impressão Operacional | `src/features/operational-tickets/*`, serviço do Print Agent |
| ARGOS Health da Esteira | `server/src/modules/argos/*`, `server/src/modules/conveyors/health/*`, `src/features/esteiras/ConveyorHealthAnalysisCard.tsx` |
| Saúde técnica/API | `server/src/modules/health/*` — observabilidade técnica; não confundir com saúde operacional |
| Versão da aplicação | `server/src/modules/version/*` — metadado técnico da aplicação |


# 49. Pontos sem consenso / decisões funcionais necessárias

**Legenda de status (revisão de 2026-10-03):**

| Status | Significado |
|---|---|
| **aberto** | continua dependendo de decisão humana |
| **reconfirmado** | divergência verificada novamente contra o código atual; segue aberta |
| **resolvido para fins documentais** | o achado técnico foi fechado com evidência e a regra documental está definida; pode restar decisão técnica ou de produto |

Situação após esta revisão:

| VAL | Status |
|---|---|
| VAL-004 — Regra de PIN | reconfirmado / aberto |
| VAL-006 — Status BLOCKED | resolvido para fins documentais; limpeza técnica pendente |
| VAL-014 — Eventos BLOCKED/PAUSED | resolvido para fins documentais; limpeza técnica pendente |
| VAL-015 — Rotas sem ponto de entrada | achado resolvido; decisão de produto pendente |
| VAL-017 — Rótulo “Mês atual (UTC)” | reconfirmado e ampliado / aberto |
| VAL-013 — Modo Fábrica com 0 minutos | parcialmente resolvido; inconsistência de validação de tela em aberto |
| VAL-001 a VAL-003, VAL-005, VAL-007 a VAL-012, VAL-016 | abertos, sem alteração nesta revisão |

Esta seção concentra propositalmente todas as situações em que a análise não permite fechar uma regra definitiva.

## VAL-001 — Quantidade prevista após existirem apontamentos

### Encontrado
A edição incremental da estrutura permite atualizar `plannedQuantity`.

Não foi identificado bloqueio inequívoco baseado apenas na existência de apontamentos para simples alteração de quantidade.

Dependências são tratadas explicitamente em remoções.

### Dúvida
A regra desejada discutida operacionalmente é proteger atividades que já possuem histórico.

### Impactos
- histórico;
- previsto x realizado;
- eficiência;
- planejamento;
- capacidade;
- dashboard.

### Decisão necessária
Definir se:
1. quantidade deve ser bloqueada após primeiro apontamento;
2. deve ser permitida com auditoria;
3. deve criar uma revisão/replanejamento sem reescrever a base histórica.

---

## VAL-002 — Justificativa na página direta de apontamento

### Encontrado
O backend exige justificativa em determinadas exceções.

Produção/Kiosk possuem UI de justificativa.

`ApontamentoPage.tsx` auditado envia minutos, quantidade, data e observação, sem o mesmo mecanismo de seleção.

### Risco
Usuário pode abrir fluxo que exige justificativa sem ter campo adequado para informá-la.

### Decisão
Validar comportamento real no ambiente e definir se a tela precisa ser corrigida.

---

## VAL-003 — Quantidade executada no Kiosk

### Encontrado
Manual afirma que o Kiosk possui quantidade executada.

`KioskActivityCard.tsx` auditado não apresenta o campo.

Produção Web apresenta.

### Decisão
Confirmar:
- Kiosk deve passar a possuir quantidade; ou
- manual deve remover essa informação.

---

## VAL-004 — Regra de PIN

**Status:** divergência **reconfirmada** em 2026-10-03. Permanece **aberta** — depende de decisão humana.

### Encontrado
Backend e acesso por navegador aceitam 4 a 8 dígitos (`PIN_REGEX = /^\d{4,8}$/` em `server/src/modules/production/production.schemas.ts`).

O totem do Modo Fábrica trabalha com exatamente 4 dígitos, tanto no teclado de entrada quanto na tela de criação de PIN (`PIN_LENGTH = 4` em `src/features/kiosk/KioskPinPad.tsx` e `src/features/kiosk/KioskChangePin.tsx`).

**Efeito prático:** um PIN de 4 dígitos funciona em todos os acessos; um PIN de 5 a 8 dígitos é aceito pelo backend e pelo navegador, mas não é digitável no totem.

### Decisão
Padronizar a regra funcional ou documentar explicitamente a diferença entre as formas de acesso. Até a decisão, o manual do usuário deve orientar o uso de PIN de 4 dígitos.

---

## VAL-005 — Reabertura de esteira FINALIZADA

### Encontrado
Manual afirma que é possível.

Grafo auditado não apresenta retorno a partir de `FINALIZADA`.

### Decisão
Definir se:
- manual está antigo; ou
- produto precisa permitir retrabalho de esteira finalizada.

---

## VAL-006 — Status BLOCKED da atividade

**Status:** **resolvido** em 2026-10-03 para fins documentais. `BLOCKED` não tem caminho de escrita; não é situação funcional disponível. Mantida aqui a decisão técnica de limpeza do código, que segue pendente de decisão humana.

### Encontrado
O código `BLOCKED` existe no tipo `ConveyorNodeStepOperationalStatusDb` e na constraint da migration `0028`, mas **nenhum serviço do backend o grava**: a busca por `'BLOCKED'` em `server/src` retorna apenas declarações de tipo e comparações defensivas em `canTransitionStepStatus`.

A única interface que oferecia "Registrar bloqueio" / "Desbloquear atividade" é `src/features/esteiras/GestorAtividadeMenu.tsx`, renderizada exclusivamente por `EsteiraDetalheMockPage` — componente **não referenciado por nenhuma rota ou outro componente**. Além de inalcançável, ele gravava apenas em memória (`src/mocks/esteira-gestao-runtime.ts`), sem chamada de API.

### Decisão documental (aplicada)
Não documentar bloqueio de atividade como funcionalidade disponível, em nenhum artefato. Ver ATI-001.

### Decisão técnica pendente
Decidir se `BLOCKED` deve ser removido do tipo e da constraint, ou se há entrega futura prevista que o utilize.

---

## VAL-007 — Equipe e análise de sequência

### Encontrado
Elegibilidade de apontamento considera membros ativos de equipe.

Há comentário/TODO em parte da lógica planejada indicando cobertura incompleta de `assigned_team_id + team_members`.

### Risco
Pode haver diferença entre:
- quem é elegível para apontar;
- quem aparece como planejado/designado em determinadas análises.

### Decisão
Validar com cenário de equipe real.

---

## VAL-008 — Chamados

### Encontrado
Funcionalidade existe.

### Dúvida
Disponibilidade depende de feature flag/configuração.

### Decisão
Confirmar habilitação no ambiente Bravo antes de incluir no guia do usuário.

---

## VAL-009 — Meu Trabalho

### Encontrado
Rota existe, mas implementação declara “Em construção”.

### Decisão
Não documentar como entregue até evolução posterior.

---


## VAL-010 — Provisionamento de `rbac.manage_role_permissions`

### Encontrado
A aplicação e as rotas exigem `rbac.manage_role_permissions`.

O arquivo:

`server/migrations/0014_rbac_manage_role_permissions.sql`

existe na `develop`, porém possui tamanho **0 bytes**.

Não foi encontrado outro provisionamento dessa permissão na busca realizada sobre a `develop`.

### Impacto
A tela/rota pode existir no código sem que uma instalação limpa receba automaticamente a permissão necessária.

### Ação necessária
Confirmar o estado real do banco dos ambientes e corrigir migration/seed se necessário.

---

## VAL-011 — Provisionamento de `time_entries.create_on_behalf`

### Encontrado
A rota gerencial de apontamento em nome de outro colaborador exige:

`time_entries.create_on_behalf`.

O arquivo:

`server/migrations/0015_time_entries_manager_permissions.sql`

existe, porém possui **0 bytes**.

A busca realizada não encontrou seed alternativo dessa permissão.

### Impacto
Uma instalação reconstruída apenas pelas migrations pode não provisionar o direito usado pela funcionalidade.

### Ação necessária
Validar banco real e corrigir migration/seed antes de considerar a permissão plenamente governada.

---

## VAL-012 — Capacidade excedida no Plano Operacional: warning ou blocker?

### Encontrado
`OVER_DAILY_CAPACITY` faz `deriveConveyorPlanItemReview` retornar:

- `reviewRequired = true`;
- `status = NEEDS_REVIEW`.

O backend de aprovação bloqueia qualquer item que precise revisão.

Por outro lado, o checklist de aprovação possui código que tenta apresentar “Itens acima da capacidade diária” como `warning`.

### Consequência atual observável
Pela regra do backend, excesso de capacidade tende a bloquear aprovação enquanto o item continuar `NEEDS_REVIEW`.

### Decisão necessária
Definir se:
1. exceder capacidade deve realmente bloquear aprovação; ou
2. deve ser somente aviso aceito conscientemente pelo gestor.

---

## VAL-013 — Modo Fábrica com 0 minutos: conclusão sem novo tempo

**Status:** **parcialmente resolvido** em 2026-10-03. A aceitação de 0 minutos é **deliberada e documentada no código** para um caso específico; o que resta aberto é uma divergência entre a validação da tela e a do servidor.

### Encontrado — revisão de 2026-10-03

Correção da fotografia anterior, que tratava os dois casos como aceitos. **Apenas o primeiro é.**

| Combinação no totem | Validação da tela | Validação do servidor | Resultado real |
|---|---|---|---|
| 0 minutos **+ concluir atividade** | permite | permite | **aceito** — conclusão sem novo tempo trabalhado |
| 0 minutos **+ percentual de sessão ≠ 0**, sem concluir | **permite** enviar | **recusa**: “minutes deve ser maior que zero.” | **recusado** — a tela deixa tentar e o servidor nega |
| 0 minutos, sem concluir e sem percentual | bloqueia o botão | — | bloqueado antes do envio |

O caso aceito é intencional e está descrito no próprio código (`serviceCreateProductionTimeEntry`, em `server/src/modules/production/production-time-entries.service.ts`): representa conclusão quando o tempo já foi apontado antes. Nesse fluxo **não é inserida linha em `conveyor_time_entries`** — a constraint `chk_conveyor_time_entries_minutes_positive` exige `minutes > 0`. A rastreabilidade fica no status/timestamp de conclusão do nó e no evento `CONVEYOR_STEP_COMPLETED`; a resposta HTTP usa DTO sintético, sem registro persistido de apontamento.

A área autenticada continua exigindo minutos ≥ 1 em qualquer caso; lá a conclusão sem tempo é feita pela ação própria de concluir, não pelo formulário de apontamento.

### Pendência remanescente
A segunda linha da tabela é inconsistência real de produto: `canSubmitKioskProductionTimeEntry` (`src/domain/production/kioskActivityCardLogic.ts`) só bloqueia quando **minutos, percentual e conclusão** estão todos em zero/desligado. Como o percentual inicia no último valor registrado da atividade, um colaborador pode abrir o cartão, tocar em registrar sem escolher o tempo e receber erro do servidor em vez de botão desabilitado.

### Decisão necessária
Alinhar a validação da tela à do servidor, bloqueando o envio quando houver 0 minutos sem conclusão marcada. Não há decisão pendente sobre o fluxo de conclusão sem novo tempo — ele é deliberado.

---

## VAL-014 — Eventos BLOCKED/PAUSED sem produtor no backend

**Status:** **resolvido** em 2026-10-03 para fins documentais. Os eventos existem apenas na camada de apresentação, sem produtor algum. Não são funcionalidade entregue.

### Encontrado
A taxonomia de eventos possui:

- `CONVEYOR_STEP_BLOCKED`;
- `CONVEYOR_STEP_UNBLOCKED`;
- `CONVEYOR_STEP_PAUSED`;
- `CONVEYOR_STEP_RESUMED`.

Os quatro aparecem **somente** em `src/domain/conveyors/operationalEventTaxonomy.ts` e `src/domain/conveyors/formatConveyorOperationalEvent.ts` — ou seja, a linha do tempo da esteira sabe **renderizar** esses eventos.

A busca pelos quatro identificadores em `server/src` e em `server/migrations` retorna **zero ocorrências**: nenhum serviço, rota ou migration os produz ou persiste.

### Decisão documental (aplicada)
Não apresentar bloquear/desbloquear/pausar/retomar atividade como comandos disponíveis, em nenhum artefato.

### Decisão técnica pendente
Confirmar se é legado a remover ou entrega futura prevista.

---

## VAL-015 — Rotas sem ponto de entrada de navegação

**Status:** achado **resolvido** em 2026-10-03 — não existe ponto de entrada algum. A **decisão de produto** sobre o que fazer a respeito permanece aberta.

### Encontrado
Três rotas autenticadas existem e funcionam, mas **não possuem item de menu nem link a partir de qualquer tela**. São alcançáveis apenas digitando a URL.

| Rota | Tela | Situação |
|---|---|---|
| `/app/minhas-atividades` | Minhas Atividades | sem item de menu; há ícone definido em `src/components/AppSidebar.tsx` para uma rota que o menu não expõe |
| `/app/meu-trabalho` | Meu Trabalho | sem item de menu; é placeholder declarado (ver seção 34) |
| `/app/gestao/esteiras/laboratorio` | Laboratório de Esteiras | sem item de menu e **sem nenhum link de entrada**; busca por `esteiras/laboratorio` retorna apenas a própria feature, `AppRoutes.tsx` e `src/lib/page-meta.ts` |

`COLABORADOR_NAV_ITEMS` em `src/lib/shell/app-nav-config.ts` contém somente Minha fila, Chamados e Minha jornada.

### Decisão documental (aplicada)
O `MANUAL_USUARIO_SGP.md` **não** ensina o usuário a acessar essas telas por URL e não as apresenta como disponíveis. O Laboratório de Esteiras fica registrado nesta matriz como funcionalidade implementada e não exposta.

### Decisão de produto pendente
Para cada uma das três rotas: expor na navegação, remover, ou manter oculta deliberadamente. A presença de ícones em `AppSidebar.tsx` para rotas sem item de menu sugere intenção revertida ou pendente.

---



## VAL-016 — RBAC dedicado para ARGOS Health da Esteira

### Encontrado
As rotas de análise de saúde da esteira:

- resumo;
- última análise;
- histórico;
- executar nova análise,

estão protegidas somente por autenticação.

O próprio arquivo de rotas contém:

`TODO(RBAC): quando existir permissão dedicada, aplicar aqui`.

### Impacto
A capacidade efetiva de executar uma chamada externa e consultar análises persistidas depende hoje de autenticação e dos controles de UI/feature flag, não de permissão RBAC dedicada no backend.

### Decisão necessária
Definir uma permissão específica e quais papéis devem recebê-la.

---

## VAL-017 — Rótulo “Mês atual (UTC)” na Jornada e no Dashboard

**Status:** divergência **confirmada e ampliada** em 2026-10-03. Permanece aberta.

### Encontrado
A implementação atual de `resolveOperationalPeriod('month')` usa o início do mês civil em `America/Sao_Paulo` (`server/src/shared/operationalPeriod.ts` → `operationalMonthStart`; `OPERATIONAL_TIMEZONE = 'America/Sao_Paulo'` em `server/src/shared/operationalWorkDate.ts`).

O rótulo `Mês atual (UTC)` **não está apenas no arquivo exportado**. Ele aparece em três pontos:

| Onde | Arquivo |
|---|---|
| Arquivo de exportação da Jornada | `server/src/modules/operational-journey/operational-journey.export.ts` |
| **Seletor de período do Dashboard (em tela)** | `src/features/gestor/DashboardPage.tsx` |
| **Catálogo de rótulos usado pelos seletores de Minha Jornada e Jornada Gerencial (em tela)** | `src/lib/operationalSemantics.ts:56-65`; `JornadaPage.tsx:432-437`; `JornadaColaboradorGestorPage.tsx` |

### Impacto
Maior do que o registrado na fotografia anterior. A regra de cálculo está alinhada a São Paulo, mas o rótulo exibido **ao escolher o período** — e não só no arquivo baixado — induz interpretação incorreta do recorte temporal.

### Decisão necessária
Corrigir o rótulo nos três pontos para refletir a regra real, sem alterar o cálculo. Esta matriz apenas registra a divergência; nenhuma correção de produto foi aplicada.

---


# 50. Conclusão

A documentação futura do SGP+ não deve ser construída a partir de páginas isoladas.

A unidade mínima da documentação será a **regra funcional**.

Cada regra deve ser rastreada por:

`Domínio → funcionalidade → estado → pré-condição → perfil/permissão → ação → validação → mensagem → efeito direto → efeito sistêmico → auditoria → evidência técnica → cobertura documental`.

O mapa de domínios desta versão deve permanecer no início do documento e evoluir junto com o SGP+, funcionando como índice de arquitetura funcional do produto.

Os dois HTML atuais continuam úteis como guias rápidos, mas não devem ser tratados como fonte completa das regras do sistema.
