# SGP — Contexto do Projeto para Claude Code

Este arquivo é lido automaticamente pelo Claude Code a cada sessão.
Contém as decisões de produto, arquitetura e UX tomadas até junho/2026.
**Última atualização:** 2026-06-10 — inventário completo pós-merge de features externas (SGP+ Produção, Kiosk, Ciclo de Vida de Esteiras, Quantidade Operacional, Evolução de Esteiras).

---

## O que é o SGP

Sistema de Gestão de Produção (SGP) para o ecossistema **Multivacia / ARGOS**.
Empresa de **reforma de tapeçaria automotiva linha Premium**.
Substitui planilhas paralelas com um fluxo operacional onde colaboradores apontam atividades e gestores criam esteiras — gerando visibilidade gerencial como efeito natural.

**Princípio fundador** (`docs/sgp-principio-operacional-mandatorio.md`): **"operação primeiro, visão depois"**.

**Três perfis de usuário:**
- **Gestor da Fábrica** — visão geral de todas as esteiras
- **Gestor de Esteira** — cria, configura e acompanha esteiras individuais
- **Colaborador** — vê e aponta suas atividades designadas

---

## Stack completa

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7 |
| Backend | Node.js, Express 4, PostgreSQL (pg pool) |
| Auth | JWT em cookie httpOnly, Argon2/bcrypt |
| Validação | Zod (backend) |
| Gráficos | Recharts |
| Drag & Drop | @dnd-kit |
| Logging | Pino + pino-http |
| Testes | Vitest (frontend + backend), Supertest |
| Upload/parse | Multer, pdf-parse, ExcelJS |
| Email | Nodemailer |
| Deploy | EC2 + Nginx + systemd + GitHub Actions |
| Banco | PostgreSQL (RDS em produção, local em dev) |

---

## Modelo conceitual — Hierarquia operacional

```
Esteira (por veículo/OS)
└── Tarefa (macrobloco — ex: Desmontagem, Pintura)
    └── Setor (contexto operacional — ex: Funilaria, Elétrica)
        └── Atividade/Step (unidade executável e apontável)
```

**Regras importantes:**
- Uma Esteira é criada por veículo/OS (não é template reutilizável)
- Colaboradores são flexíveis — podem atuar em múltiplos setores
- Uma Tarefa pode conter atividades de setores diferentes (coesão lógica, não física)
- O Setor contextualiza, não é hierarquia rígida entre Tarefa e Atividade
- Anti-padrão a evitar: tarefa "linguição" que engloba a esteira inteira

---

## Organização de pastas

### Frontend (`src/`)
- `domain/` — tipos e contratos de negócio por domínio
- `features/` — páginas e componentes por feature (esteiras, gestor, admin, colaborador, produção...)
- `services/` — camada de API com padrão `apiService + mockService + serviceFactory`
- `routes/` — React Router com guards `RequireAuth` e `RequirePermission`
- `lib/` — hooks, contextos de auth/tema/erro, formatadores
- `components/` — componentes reutilizáveis (AppHeader, AppSidebar, ui/, dashboard/)
- `pages/` — páginas de nível raiz (LoginPage, BacklogPage, ChangePasswordPage)
- `mocks/` — dados mock para desenvolvimento sem backend

### Backend (`server/src/modules/`)
30 módulos no padrão **controller → routes → service → repository**:
```
auth, conveyors (+ health/ + operational-events/ + conveyor-lifecycle),
conveyor-operational-plan, conveyor-progress (novo),
operation-matrix, operational-planning, operational-journey,
operational-settings, my-activities, my-work-queue,
dashboard, collaborators, teams, sectors,
rbac, roles, admin-users, admin-collaborators,
admin-audit, argos, argos-integration (pipeline R6),
production (novo — SGP+ Produção com auth própria),
support, system-settings, permissions, health
```
`shared/` contém: DB pool, error handler, utils HTTP, crypto, password, `activityOperationalQuantity`, `conveyorProgressMetrics`.

---

## Ambientes

| Ambiente | Branch | Banco | URL | Deploy |
|----------|--------|-------|-----|--------|
| Local (dev) | qualquer | PostgreSQL local | localhost | manual |
| Homologação | `homol` | RDS `sgp-hml` | hml.suaempresa.com.br | automático |
| Produção | `main` | RDS `sgp-prod` | app.suaempresa.com.br | automático |

**Regra absoluta:** `server/.env` local nunca aponta para banco de PRD ou HML.

### Secrets GitHub
- PRD: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`, `EC2_APP_DIR`
- HML: `HML_EC2_HOST`, `HML_EC2_USER`, `HML_EC2_SSH_KEY`, `HML_EC2_APP_DIR`

---

## Features implementadas (produção)

| Área | O que está pronto |
|------|------------------|
| **Auth** | Login, logout, troca de senha, lockout por tentativas, **modo kiosk com PIN** |
| **Esteiras** | CRUD completo, assignments de equipe, workload por nó, saúde operacional, plano operacional |
| **Ingestão de documento** | Pipeline R6: PDF → parsing Bravo → matching hierárquico → draft de esteira |
| **Matriz de operações** | CRUD com import via Excel |
| **Backlog** | Tela de backlog operacional com filtros e KPIs |
| **Planejamento semanal** | Tela de operational planning |
| **Apontamento** | Minhas Atividades, Minha Fila, Jornada do Colaborador |
| **Dashboard** | Indicadores gerenciais operacional e executivo (Recharts) |
| **RBAC** | Roles, permissões, guards de rota |
| **Admin** | Gestão de usuários, colaboradores, auditoria, system settings |
| **Equipes** | Cadastro e vínculo com esteiras |
| **Suporte** | Tickets (feature flag via env) |
| **Temas** | 3 temas: argos-dark, slate-dark, light-executive |
| **SGP+ Produção (Modo Fábrica)** | Sistema completo isolado: PIN Argon2id, fila de atividades, apontamentos com quantidade/conclusão/% progresso, bloqueio fora-de-sequência, auditoria de eventos, força troca de PIN no 1º login. Rota: `/app/producao` |
| **Kiosk / Totem** | Interface touch-first para tablet fixo: grade de avatares → PIN → cards de atividade. Rota: `/app/kiosk` (pública, token de dispositivo no header) |
| **Ciclo de Vida de Esteiras** | Retorno com auditoria: EM_ANDAMENTO → EM_PLANEJAMENTO → EM_ELABORACAO. Status: EM_ELABORACAO / AGUARDANDO_PLANEJAMENTO / EM_PLANEJAMENTO / A_INICIAR / EM_ANDAMENTO / FINALIZADA / CANCELADA |
| **Quantidade Operacional** | `planned_quantity` por step (multiplicador de tempo); `executed_quantity` por apontamento; cálculos: unitMinutes × qty, progresso % |
| **Evolução de Esteiras** | Relatório hierárquico Conveyor → Task → Sector → Activity com previsto vs. realizado vs. excedido. Rota: `/gestao/evolucao-esteiras` |
| **Aba Estrutura — Avatar Strip** | Designação de colaborador/time em 2 cliques via avatares inline + popover com busca |
| **Admin de Colaboradores** | Gestão de PINs de produção (reset, seed), soft delete, ativação/inativação, status de credencial embutido |

---

## Features em desenvolvimento / backlog prioritário

### 1. Workflow de Homologação — PENDENTE

Criar `.github/workflows/deploy-hml.yml`.
Branch `homol` → deploy automático para EC2 HML + RDS `sgp-hml` separado.
Template completo documentado em `docs/` (gerado na sessão de planejamento).

**Isolamento garantido por:** banco diferente, JWT_SECRET diferente, cookie name diferente (`sgp_hml_session`), porta diferente (3335), diretório diferente (`/opt/sgp-hml`), systemd service diferente (`sgp-api-hml`).

---

## Pendente de deploy

| Item | Ambiente | Observação |
|------|----------|------------|
| Migrations `0040` a `0046` | HML → PRD | 7 migrations: credenciais produção, auth events, ciclo de vida, quantidade planejada/executada, must_change_pin, campos kiosk |
| Seed de PINs de produção | HML → PRD | `server/src/scripts/seed-production-pins.ts` — inicializa PIN Argon2id com `must_change_pin = true` para todos os colaboradores ativos |
| Testar `/app/producao` end-to-end | HML | Validar login por PIN, troca obrigatória, fila, apontamento, bloqueio fora-de-sequência |
| Testar `/app/kiosk` em dispositivo touch real | HML | Validar swipe, PIN pad e apontamento antes de liberar para PRD |

---

## Backlog P0 (governança — fazer antes de expandir produto)

- Aplicar migrations `0040–0046` em HML e PRD + executar seed de PINs
- Reset administrativo de senha + UX de troca voluntária melhorada
- Aplicar migration `0011` em todos os ambientes + resolver `collaborator_id` ambíguos
- Auditoria admin: log de criação/edição de usuário, ativação, vínculo usuário ↔ colaborador
- Endurecer endpoints ainda públicos (`GET /roles`, integrações antigas)
- Remoção gerencial de apontamento
- Redefinição de PIN pelo próprio colaborador (regra de verificação de identidade ainda não definida — ver memory `project-pin-self-service-debt`)

---

## Métricas de produtividade

| Métrica | Campo/Fórmula | Onde está |
|---------|--------------|-----------|
| Progresso da atividade | `session_completion_pct` (0-100%) | `conveyor_time_entries` |
| Tempo previsto | `planned_minutes × planned_quantity` | `conveyor_nodes` |
| Tempo executado | `SUM(minutes)` por step | `conveyor_time_entries` |
| Unidades executadas | `SUM(executed_quantity)` | `conveyor_time_entries` |
| Excedido | `realized - planned` (quando > 0) | `conveyor-progress` module |
| Eficiência de tempo | `tempo_real / tempo_planejado × 100` | calculado no frontend |
| Velocidade de conclusão | `pct_atual / tempo_real` (%/min) | — |
| Detecção de retrabalho | atividades com muitas sessões vs. esperado | — |

---

## Design System

| Token | Valor |
|-------|-------|
| `--gold` | `#c9a227` |
| `--navy` | `#101824` |
| `--void` | `#050a12` |
| `--blue-bright` | `#3e7baa` |
| `--emerald` | `#34d399` |
| Font display | Montserrat |
| Font body | Open Sans |

**Temas disponíveis:** `argos-dark` (padrão), `slate-dark`, `light-executive`
**Classes utilitárias:** `sgp-cta-primary`, `sgp-cta-secondary`, `sgp-input-app`, `sgp-page-title`, `sgp-header-card`

---

## Arquivos-chave por feature

### SGP+ Produção (Modo Fábrica)
- `src/features/production/` ← todas as páginas (select collaborator, PIN, change-pin, work queue, time entry dialog)
- `src/layouts/ProductionShellLayout.tsx` ← shell sem sidebar, touch-safe
- `src/routes/ProductionRoutes.tsx` ← rotas isoladas com `ProductionAuthProvider`
- `src/lib/production-auth-context.tsx` ← contexto de auth separado do app principal
- `src/lib/production/productionApiClient.ts` ← HTTP client isolado (não dispara logout do app)
- `src/domain/production/` ← tipos, helpers, lógica de display
- `server/src/modules/production/` ← auth (PIN Argon2id), work queue, time entries, regras de sequência
- `server/src/scripts/seed-production-pins.ts` ← seed de PINs inicial

### Kiosk / Totem
- `src/features/kiosk/KioskPage.tsx` ← orquestrador de telas
- `src/features/kiosk/KioskCollaboratorGrid.tsx`
- `src/features/kiosk/KioskPinPad.tsx`
- `src/features/kiosk/KioskActivityCard.tsx` + `KioskActivityCards.tsx`
- `src/routes/KioskRoutes.tsx` ← rota pública `/app/kiosk/*`

### Apontamento (colaborador web)
- `src/features/colaborador/ApontamentoPage.tsx`
- `src/features/colaborador/MinhasAtividadesPage.tsx`
- `src/features/my-work-queue/MyWorkQueuePage.tsx`
- `src/features/shell/QuickTimeEntryDrawer.tsx`
- `src/domain/my-activities/my-activities.types.ts`
- `server/src/modules/conveyors/conveyorAssignments.*` ← endpoints de apontamento e conclusão de step

### Ciclo de Vida de Esteiras
- `server/src/modules/conveyors/conveyor-lifecycle.service.ts`
- `server/src/modules/conveyors/conveyor-lifecycle.controller.ts`
- `src/domain/conveyors/conveyorLifecycleActions.ts`
- `src/domain/conveyors/conveyorOperationalStatus.ts` ← labels e transições de status
- `src/features/esteiras/ConveyorLifecycleReturnPanel.tsx`

### Evolução de Esteiras (ConveyorProgress)
- `server/src/modules/conveyor-progress/` ← endpoint + cálculos hierárquicos
- `src/features/conveyor-progress/` ← página de relatório
- `src/domain/conveyor-progress/` ← tipos e métricas

### Estrutura da Esteira
- `src/features/esteiras/nova-esteira/NovaEsteiraComposicaoManual.tsx`
- `src/features/esteiras/ConveyorCreateEditPage.tsx`
- `src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.ts`

### Rotas e permissões
- `src/routes/AppRoutes.tsx`
- `src/lib/permissions/permissionCodes.ts`

### Deploy
- `.github/workflows/deploy-ec2.yml` ← PRD, não alterar sem revisão
- `scripts/deploy/ec2-remote-deploy.sh`
- `deploy/nginx/sgp.conf.example`
- `deploy/systemd/sgp-api.service.example`

### Backend
- `server/src/modules/` — 30 módulos
- `server/migrations/` — migrations SQL em ordem numérica (última: `0046`)
- `server/seeds/` — dados iniciais
- `server/src/shared/` — DB pool, errors, crypto, password

---

## Convenções do projeto

- Português para labels, mensagens e comentários de produto
- Inglês para nomes de variáveis, funções e tipos TypeScript
- Componentes com sufixo `Page` são rotas; sem sufixo são componentes reutilizáveis
- Services em `src/services/` — sempre com factory pattern e separação mock/real
- Erros tratados via `reportClientError` + `useSgpErrorSurface`
- Validação de entrada no backend via **Zod**
- Logging via **Pino**
- Nunca fazer push direto em `main` — sempre via PR
- Migrations numeradas sequencialmente em `server/migrations/`

---

## Contexto de negócio

- Empresa de tapeçaria automotiva linha **Premium**
- Colaboradores são especialistas no trabalho físico — UX deve exigir zero raciocínio extra
- **Regra de ouro de UX:** se o colaborador precisar pensar, o design falhou
- Gestor precisa de visão rápida sem navegar em múltiplas telas
- Tablet fixo na fábrica = touch-first, botões grandes, sem dependência de hover states
- Foco atual do produto: **governança de acesso primeiro, expansão de features depois**

---

## Camada neutra de IA — SGP+ Web

Este projeto usa uma camada neutra de instruções operacionais de IA em:

`docs/ai/`

Ela não pertence ao Claude, Codex, Cursor ou qualquer ferramenta específica.

### Estrutura

- `docs/ai/agents/`: papéis especializados;
- `docs/ai/skills/`: conhecimento por domínio;
- `docs/ai/playbooks/`: fluxos de trabalho;
- `docs/ai/templates/`: formatos de saída.

### Regra principal

Somente o agente implementador pode alterar código, e apenas com escopo fechado.

Agentes de contexto, impacto, especificação e teste não devem alterar arquivos, salvo instrução explícita.

### Fluxo recomendado

Para demandas médias ou grandes:

1. Ler contexto.
2. Analisar impacto.
3. Gerar especificação curta.
4. Implementar com escopo fechado.
5. Revisar testes e regressão.
6. Entregar relatório.

### Subagente inicial

O subagente inicial do Claude fica em:

`.claude/agents/sgp-impact-analyst.md`

Use antes de mudanças que envolvam esteiras, matrizes, planejamento semanal, produção/kiosk, apontamentos, permissões ou impressão térmica.

# Trecho opcional para adicionar ao CLAUDE.md existente

Este projeto usa agentes em `.claude/agents/` e documentação neutra em `docs/ai/`.

Regra soberana: somente `sgp-implementer` altera código.

Fluxo para demandas médias/grandes:

1. `sgp-context-reader`
2. `sgp-impact-analyst`
3. `sgp-feature-spec-writer`
4. `sgp-implementer`
5. `sgp-test-reviewer`

Antes de agir, leia também `AGENTS.md`.
