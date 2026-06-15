# SGP-ARGOS — Inventário do Projeto

> Gerado em 2026-06-08 a partir de leitura completa do repositório.

---

## O que é

Sistema de Gestão de Produção (SGP) para o ecossistema **Multivacia / ARGOS**. Substitui planilhas paralelas com um fluxo operacional onde colaboradores apontam atividades e gestores criam esteiras — gerando visibilidade gerencial como efeito natural. O princípio fundador está documentado em `docs/sgp-principio-operacional-mandatorio.md`: **"operação primeiro, visão depois"**.

---

## Stack

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

---

## Organização de Pastas

### Frontend (`src/`)

Separação domínio/feature:

- `domain/` — tipos e contratos de negócio por domínio
- `features/` — páginas e componentes organizados por feature (esteiras, gestor, admin, produção...)
- `services/` — camada de API com padrão `apiService + mockService + serviceFactory`
- `routes/` — React Router com guards `RequireAuth` e `RequirePermission`
- `lib/` — hooks, contextos de auth/tema/erro, formatadores
- `components/` — componentes reutilizáveis (AppHeader, AppSidebar, ui/, dashboard/, etc.)
- `pages/` — páginas de nível raiz (LoginPage, BacklogPage, ChangePasswordPage)
- `mocks/` — dados mock para desenvolvimento sem backend

### Backend (`server/src/`)

26 módulos no padrão **controller → routes → service → repository**:

```
modules/
├── auth/
├── conveyors/          (health/, operational-events/)
├── conveyor-operational-plan/
├── operation-matrix/
├── operational-planning/
├── operational-journey/
├── operational-settings/
├── my-activities/
├── my-work-queue/
├── dashboard/
├── collaborators/
├── teams/
├── sectors/
├── rbac/
├── roles/
├── admin-users/
├── admin-collaborators/
├── admin-audit/
├── argos/
├── argos-integration/  (pipeline R6 com local/remote/stub adapters)
├── production/
├── support/
├── system-settings/
├── permissions/
└── health/
```

`shared/` contém: DB pool, error handler, utils HTTP, crypto, password.

---

## Features Implementadas

| Área | O que está pronto |
|------|------------------|
| **Auth** | Login, logout, troca de senha, lockout por tentativas, modo kiosk com PIN |
| **Esteiras (Conveyors)** | CRUD completo, assignments de equipe, workload por nó, saúde operacional (health), plano operacional gerado |
| **Ingestão de documento** | Pipeline R6: PDF → parsing Bravo → matching hierárquico → draft de esteira (adaptadores local/remote/stub) |
| **Matriz de operações** | CRUD com import via Excel |
| **Backlog** | Tela de backlog operacional |
| **Planejamento semanal** | Tela de operational planning |
| **Apontamento** | Minhas Atividades, Minha Fila, Jornada do Colaborador |
| **Dashboard** | Indicadores gerenciais com Recharts |
| **RBAC** | Roles, permissões, guards de rota |
| **Admin** | Gestão de usuários, colaboradores, auditoria, settings do sistema |
| **Equipes** | Cadastro e vínculo com esteiras |
| **Suporte** | Tickets (feature flag controlada via env) |
| **Modo Produção** | Kiosk isolado com JWT/PIN próprios e timeout de sessão |
| **Temas** | 3 temas: argos-dark, slate-dark, light-executive |

---

## Backlog Pendente

### P0 — curto prazo (maior valor)

- Reset administrativo de senha + UX de troca voluntária melhorada
- Aplicar migration `0011` em todos os ambientes + resolver `collaborator_id` ambíguos
- Auditoria admin: log de criação/edição de usuário, ativação, vínculo usuário ↔ colaborador
- Endurecer endpoints ainda públicos (`GET /roles`, integrações antigas, etc.)
- Apontamento em nome de outro colaborador (perfil gestor/admin)
- Remoção gerencial de apontamento

### P1 — próximo bloco

- RBAC mais fino (permissões por ação: ver/criar/editar/ativar/deletar/restaurar/resetar)
- Paginação real + filtros compostos + persistência de filtros nas telas admin
- Processo de migrations incremental mais seguro (DEV/HML/PRD)
- Deep-links dashboard → backlog → step crítico
- Jornada gerencial: visão por colaborador, histórico, leitura de carga/risco

### P2 — acabamento e inteligência

- Dashboards: E2E drill-down, tooltips ricos, filtros gerenciais adicionais
- Semântica avançada de indicadores (eficiência, gargalos por área/step, recortes temporais)
- Segurança evolutiva: reset por token/e-mail, revogação de sessão, rechecagem no middleware
- Integrações externas: revisar consumidores de rotas endurecidas, documentar novo contrato

### Backlog técnico transversal

- **Testes:** integração para rotas admin, auth/governança, E2E dos fluxos críticos
- **Performance:** revisar queries grandes, índices/materializações, virtualização nas telas admin
- **UX:** loading/empty/error states mais completos, mensagens consistentes, navegação fluida entre módulos

---

## Sprints sugeridas (do backlog)

1. Reset/troca de senha + migration `0011` + revisar endpoints endurecidos
2. Auditoria admin básica + paginação Utilizadores/Colaboradores + hardening sessão/JWT
3. RBAC mais fino + ações gerenciais no apontamento + refinamento de navegação/esteiras

---

> O projeto está estruturado e funcional. O foco mais urgente é **governança de acesso** (reset de senha, auditoria, endurecimento de endpoints) antes de qualquer expansão de produto.
