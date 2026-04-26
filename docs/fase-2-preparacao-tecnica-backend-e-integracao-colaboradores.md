# SGP — Fase 2: preparação técnica (backend `/server`) e integração Colaboradores

Documento de referência: arquitetura de pastas, stack, contrato de API, schema PostgreSQL, prompts oficiais para o Cursor, comandos de ambiente e prompt de integração do frontend.

---

## 1. Arquitetura de pastas recomendada para a API Node

Para reduzir atrito com o frontend atual, manter o web como está e criar o backend em uma **pasta irmã na raiz**:

```
/
├─ src/                        # frontend React atual
├─ public/
├─ server/                     # nova API Node
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ .env.example
│  ├─ migrations/
│  │  ├─ 0001_init_extensions.sql
│  │  ├─ 0002_auth_and_collaborators.sql
│  │  └─ 0003_matrices_base.sql
│  ├─ seeds/
│  │  └─ 0001_seed_admin.sql
│  └─ src/
│     ├─ server.ts
│     ├─ app.ts
│     ├─ config/
│     │  ├─ env.ts
│     │  └─ cors.ts
│     ├─ plugins/
│     │  ├─ db.ts
│     │  ├─ auth.ts
│     │  └─ logger.ts
│     ├─ shared/
│     │  ├─ errors/
│     │  │  ├─ AppError.ts
│     │  │  ├─ errorCodes.ts
│     │  │  └─ errorHandler.ts
│     │  ├─ http/
│     │  │  ├─ ok.ts
│     │  │  └─ pagination.ts
│     │  ├─ security/
│     │  │  ├─ hash.ts
│     │  │  └─ jwt.ts
│     │  └─ utils/
│     │     ├─ dates.ts
│     │     └─ strings.ts
│     ├─ modules/
│     │  ├─ health/
│     │  │  ├─ health.routes.ts
│     │  │  └─ health.controller.ts
│     │  ├─ auth/
│     │  │  ├─ auth.routes.ts
│     │  │  ├─ auth.controller.ts
│     │  │  ├─ auth.service.ts
│     │  │  ├─ auth.repository.ts
│     │  │  └─ auth.schemas.ts
│     │  ├─ users/
│     │  │  ├─ users.repository.ts
│     │  │  └─ users.schemas.ts
│     │  ├─ roles/
│     │  │  ├─ roles.routes.ts
│     │  │  └─ roles.repository.ts
│     │  ├─ sectors/
│     │  │  ├─ sectors.routes.ts
│     │  │  ├─ sectors.controller.ts
│     │  │  └─ sectors.repository.ts
│     │  ├─ collaborators/
│     │  │  ├─ collaborators.routes.ts
│     │  │  ├─ collaborators.controller.ts
│     │  │  ├─ collaborators.service.ts
│     │  │  ├─ collaborators.repository.ts
│     │  │  └─ collaborators.schemas.ts
│     │  └─ matrices/
│     │     ├─ matrices.routes.ts
│     │     ├─ matrices.controller.ts
│     │     ├─ matrices.service.ts
│     │     ├─ matrices.repository.ts
│     │     └─ matrices.schemas.ts
│     └─ tests/
│        ├─ auth.test.ts
│        ├─ collaborators.test.ts
│        └─ health.test.ts
├─ package.json
└─ README.md
```

### Stack sugerida

| Ferramenta | Uso |
|------------|-----|
| Node 20 | Runtime |
| TypeScript | Tipagem |
| Fastify | HTTP |
| `pg` | PostgreSQL |
| Zod | Validação |
| bcryptjs | Hash de senha |
| jsonwebtoken | JWT |
| pino | Log |
| vitest | Testes |

**Motivo:** base leve, rápida, boa para EC2 e sem ORM “mágico” cedo demais.

---

## 2. Contrato técnico inicial da API

### Convenção de rotas

**Base:** `/api/v1`

**Rotas iniciais:**

| Método | Rota |
|--------|------|
| GET | `/api/v1/health` |
| GET | `/api/v1/health/db` |
| POST | `/api/v1/auth/login` |
| POST | `/api/v1/auth/logout` |
| GET | `/api/v1/auth/me` |
| GET | `/api/v1/roles` |
| GET | `/api/v1/sectors` |
| GET | `/api/v1/collaborators` |
| GET | `/api/v1/collaborators/:id` |
| POST | `/api/v1/collaborators` |
| PATCH | `/api/v1/collaborators/:id` |
| POST | `/api/v1/collaborators/:id/activate` |
| POST | `/api/v1/collaborators/:id/inactivate` |
| GET | `/api/v1/matrices` |
| GET | `/api/v1/matrices/:id` |
| POST | `/api/v1/matrices` |
| PATCH | `/api/v1/matrices/:id` |

### Envelope de sucesso

```json
{
  "data": {},
  "meta": {}
}
```

### Envelope de erro

```json
{
  "error": {
    "code": "COLLABORATOR_NOT_FOUND",
    "message": "Colaborador não encontrado.",
    "details": {}
  }
}
```

### Regras HTTP

| Código | Uso |
|--------|-----|
| 200 | Leitura com sucesso |
| 201 | Criação |
| 204 | Ação sem corpo |
| 400 | Payload inválido |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 409 | Conflito |
| 422 | Regra de domínio |
| 500 | Erro interno |

---

## 3. Schema inicial PostgreSQL

Fundação real, não banco completo. Prepara **auth**, **colaboradores** e **base de matrizes**.

### 3.1 Extensão

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 3.2 Auth + perfis + permissões

```sql
CREATE TABLE app_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE app_role_permissions (
  role_id UUID NOT NULL REFERENCES app_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES app_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role_id UUID NOT NULL REFERENCES app_roles(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
  collaborator_id UUID NULL,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);
```

### 3.3 Setores, colaboradores e skills

```sql
CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  job_title TEXT,
  avatar_url TEXT,
  sector_id UUID REFERENCES sectors(id),
  role_id UUID REFERENCES app_roles(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

ALTER TABLE app_users
  ADD CONSTRAINT fk_app_users_collaborator
  FOREIGN KEY (collaborator_id) REFERENCES collaborators(id);

CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE collaborator_skills (
  collaborator_id UUID NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level SMALLINT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collaborator_id, skill_id)
);

CREATE INDEX idx_collaborators_sector_id ON collaborators(sector_id);
CREATE INDEX idx_collaborators_role_id ON collaborators(role_id);
CREATE INDEX idx_collaborators_status ON collaborators(status);
```

### 3.4 Base de matrizes

```sql
CREATE TABLE matrices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NULL REFERENCES app_users(id),
  updated_by UUID NULL REFERENCES app_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE matrix_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES matrices(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (matrix_id, name)
);

CREATE TABLE matrix_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES matrices(id) ON DELETE CASCADE,
  sector_id UUID NOT NULL REFERENCES sectors(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (matrix_id, sector_id)
);

CREATE TABLE matrix_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matrix_id UUID NOT NULL REFERENCES matrices(id) ON DELETE CASCADE,
  matrix_task_id UUID NOT NULL REFERENCES matrix_tasks(id) ON DELETE CASCADE,
  matrix_sector_id UUID NOT NULL REFERENCES matrix_sectors(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_matrix_tasks_matrix_id ON matrix_tasks(matrix_id);
CREATE INDEX idx_matrix_sectors_matrix_id ON matrix_sectors(matrix_id);
CREATE INDEX idx_matrix_activities_matrix_id ON matrix_activities(matrix_id);
CREATE INDEX idx_matrix_activities_task_id ON matrix_activities(matrix_task_id);
CREATE INDEX idx_matrix_activities_sector_id ON matrix_activities(matrix_sector_id);
```

### 3.5 Seed mínimo

O seed inicial deve criar:

- 1 role `ADMIN`, 1 `GESTOR`, 1 `COLABORADOR`
- permissões base
- usuário admin
- alguns setores básicos

Exemplo conceitual:

```sql
INSERT INTO app_roles (code, name) VALUES
('ADMIN', 'Administrador'),
('GESTOR', 'Gestor'),
('COLABORADOR', 'Colaborador')
ON CONFLICT (code) DO NOTHING;
```

(Ajustar conforme constraints reais da migration — ex.: `ON CONFLICT` só se houver unique em `code`.)

---

## 4. O que fica de fora agora

Para não contaminar a fundação:

- Esteiras reais  
- Atividades operacionais reais  
- Apontamentos  
- Jornada do colaborador  
- Dashboard real  
- ARGOS / IA  
- RBAC fino por tela  

**Objetivo:** nascer o esqueleto certo, não o produto inteiro.

---

## 5. Prompt oficial para o Cursor — Prompt 0: fundação real do backend

**Uso:** copiar e colar no Cursor como instrução principal para a primeira implementação de `/server`.

---

### Contexto

Estamos retomando o SGP+ Web após o fechamento da versão mockada. O frontend React + Vite + Tailwind já tem espinha dorsal consolidada, dashboard com cards e gráficos, módulo de colaboradores com identidade forte e tela oficial de manutenção. Agora iniciaremos a transição controlada do mock para backend real.

### Arquitetura oficial

- Frontend React fala apenas com a API principal em Node.js  
- API principal usa PostgreSQL como banco operacional  
- Serviço Python de análise/IA ficará para depois  
- Não implementar ARGOS agora  
- Não abrir nova macrofase funcional antes da fundação real  

### Objetivo deste prompt

Criar a fundação oficial do backend real em Node.js + TypeScript dentro de uma pasta `/server` na raiz do projeto atual, preservando o frontend existente.

### Stack obrigatória

- Node 20  
- TypeScript  
- Fastify  
- pg  
- zod  
- bcryptjs  
- jsonwebtoken  
- pino  
- vitest  

### Regras de execução

1. Antes de alterar qualquer arquivo, levantar impacto e gerar **Relatório de Impacto**.  
2. O relatório deve listar: arquivos a criar; arquivos a alterar; riscos; ordem de implementação; contratos iniciais da API; dependências novas.  
3. Após o relatório, parar e aguardar confirmação explícita com **«pode implementar»**.  
4. Só então implementar.  

### Escopo desta etapa

1. Criar a estrutura base da pasta `/server`  
2. Configurar TypeScript, scripts e `.env.example`  
3. Subir servidor Fastify com `/api/v1/health` e `/api/v1/health/db`  
4. Criar plugin de PostgreSQL com pool  
5. Criar validação de ambiente com zod  
6. Criar tratamento global de erro com envelope padrão  
7. Criar auth base: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`  
8. Criar migrations SQL iniciais com: `app_roles`, `app_permissions`, `app_role_permissions`, `app_users`, `sectors`, `collaborators`, `skills`, `collaborator_skills`, `matrices`, `matrix_tasks`, `matrix_sectors`, `matrix_activities`  
9. Criar seed mínimo: perfis ADMIN, GESTOR, COLABORADOR; usuário admin inicial; setores básicos  
10. Implementar módulo real de colaboradores (listagem, detalhe, POST, PATCH, activate, inactivate)  
11. Implementar `GET /api/v1/roles`  
12. Implementar `GET /api/v1/sectors`  
13. Criar testes mínimos: health; login inválido; login válido; rota protegida sem token; listagem de colaboradores autenticada  

### Estrutura de pastas esperada

`/server` → `migrations`, `seeds`, `src` com `config`, `plugins`, `shared` (`errors`, `http`, `security`, `utils`), `modules` (`health`, `auth`, `users`, `roles`, `sectors`, `collaborators`, `matrices`), `tests`.

### Padrão de resposta

**Sucesso:**

```json
{
  "data": null,
  "meta": {}
}
```

**Erro:**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensagem amigável",
    "details": {}
  }
}
```

### Regras de domínio iniciais

- `collaborator.status`: `ACTIVE` ou `INACTIVE`  
- `app_user.status`: `ACTIVE`, `INACTIVE` ou `BLOCKED`  
- `matrix.status`: `DRAFT`, `PUBLISHED` ou `ARCHIVED`  
- soft delete com `deleted_at` quando fizer sentido  
- timestamps: `created_at` e `updated_at`  
- UUID com `gen_random_uuid()`  

### Regras de implementação

- Não mexer na UI do frontend nesta etapa, exceto se estritamente necessário para preparar integração futura  
- Não integrar ainda matrizes no frontend  
- Não implementar Esteiras, Apontamentos, Dashboard real  
- Não introduzir ORM nesta etapa  
- SQL claro, repositórios explícitos, código legível  

### Entregáveis esperados no fim da implementação

1. API subindo localmente  
2. Health check OK  
3. Banco migrando corretamente  
4. Seed funcionando  
5. Login funcional  
6. Auth/me funcional  
7. CRUD base de colaboradores funcional  
8. Rotas de apoio de roles e sectors funcionais  
9. Testes mínimos passando  
10. README de backend com comandos de setup, migrate, seed e run  

### Formato da resposta

- **Fase 1:** Relatório de Impacto completo → parar e aguardar «pode implementar».  
- **Fase 2:** após aprovação, implementar tudo → resumo por arquivo criado/alterado, rotas disponíveis, env necessário, checklist de validação.  

---

## 6. Comandos de ambiente previstos

### `server/package.json` (scripts)

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run",
    "migrate": "node ./scripts/run-migrations.js",
    "seed": "node ./scripts/run-seeds.js"
  }
}
```

### `.env.example`

```env
NODE_ENV=development
PORT=3334
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sgp
JWT_SECRET=change-me
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@sgp.local
ADMIN_PASSWORD=ChangeMe123!
```

---

## 7. Ordem real de execução recomendada

1. Subir `/server`  
2. Health  
3. Conexão com PostgreSQL  
4. Migrations  
5. Seed  
6. Auth  
7. Roles + sectors  
8. Colaboradores  
9. Só depois preparar a ponte do frontend  

---

## 8. Prompt oficial para o Cursor — Integração Colaboradores (frontend)

**Uso:** segunda fase, quando a API base estiver disponível; copiar e colar no Cursor.

---

### Contexto

Transição controlada do SGP+ Web do mock para backend real.

### Estado atual

- Frontend React + Vite + Tailwind com espinha dorsal consolidada  
- Módulo de Colaboradores mockado, com identidade visual forte  
- Backend real em Node + PostgreSQL em `/server` (em criação ou pronto)  
- Nesta etapa: integrar **apenas** Colaboradores com a API real, preservando UX aprovada  

### Objetivo desta etapa

Fazer a tela de Colaboradores deixar de depender diretamente do mock e passar a consumir a API real, com **convivência controlada** entre modos mock e real.

### Diretriz principal

Não refatorar o sistema inteiro. Não mexer em módulos fora de Colaboradores, exceto no estritamente necessário para infra compartilhada de acesso a dados.

### Regras obrigatórias

1. Antes de alterar qualquer arquivo: **Relatório de Impacto** com: arquivos a criar/alterar; riscos; estratégia mock + real; contrato frontend/API; pontos de rollback.  
2. Parar e aguardar **«pode implementar»**.  
3. Só então implementar.  

### Objetivo funcional

Integrar com a API real: listagem, detalhe, criação, edição, ativação/inativação, filtros básicos por status e setor.

### Importante

A tela deve continuar funcional se a API não estiver disponível, com **fallback controlado** para mock quando o modo configurado permitir.

### Arquitetura esperada no frontend

Camada de serviços com contrato único para Colaboradores:

- domínio / contratos  
- adapter mock  
- adapter api  
- seletor de modo  

**Modelo esperado:** `collaboratorsService` (interface única), `collaboratorsMockService`, `collaboratorsApiService`, `collaboratorsServiceFactory` ou equivalente.

### Modo de dados

Variável de ambiente, por exemplo:

- `VITE_DATA_MODE=mock`  
- `VITE_DATA_MODE=real`  
- `VITE_DATA_MODE=auto`  

**Regras:**

- **mock:** só mock  
- **real:** só API; erro se falhar  
- **auto:** tenta API; em falha de rede/indisponibilidade, pode cair para mock apenas se tratado e logado em DEV  

### Escopo técnico desta etapa

1. Contratos/types do domínio Colaboradores  
2. Cliente HTTP base para API real  
3. Tratamento padronizado de erros HTTP no frontend  
4. Service layer Colaboradores  
5. Listagem via service layer  
6. Detalhe / edição / criação / ativação / inativação via service layer  
7. Loading / empty / error corretos  
8. Preservar identidade visual  
9. Não alterar UX sem necessidade real  
10. Não integrar Matrizes, Esteiras, Dashboard ou Apontamentos  

### Contrato esperado da API

- `GET /api/v1/collaborators`, `GET /api/v1/collaborators/:id`, `POST`, `PATCH`, `POST .../activate`, `POST .../inactivate`  
- `GET /api/v1/sectors`, `GET /api/v1/roles`  
- Envelopes `data` + `meta` e `error` como na seção 2  

### Formato alvo do domínio no frontend

Campos de referência: `id`, `code`, `fullName`, `email`, `phone`, `jobTitle`, `avatarUrl`, `sectorId`, `sectorName`, `roleId`, `roleName`, `status`, `notes`, `createdAt`, `updatedAt`.

**Mapeamento:** se a API usar nomes diferentes do mock, mapeadores explícitos no adapter da API — não espalhar transformação na UI.

### Estrutura sugerida de arquivos

```
src/
  lib/
    api/
      client.ts
      apiErrors.ts
      env.ts
  domain/
    collaborators/
      collaborator.types.ts
      collaborator.mappers.ts
      collaborator.service.ts
  services/
    collaborators/
      collaboratorsApiService.ts
      collaboratorsMockService.ts
      collaboratorsServiceFactory.ts
```

Manter ou adaptar a estrutura atual apenas no necessário; evitar reorganização grande só por estética.

### Comportamento esperado da UI

- Mesma cara visual na listagem  
- Filtros funcionando  
- Loading / empty / error claros  
- Ativar/inativar com feedback  
- Criação/edição com persistência real em modo real  
- Sem mensagem técnica crua para o usuário  

### Tratamento de erro

- 401: compatível com auth futura/atual  
- 403: permissão amigável  
- 404: colaborador não encontrado  
- 409/422: negócio ou validação  
- 500: mensagem genérica amigável  

### Regras de implementação

- Não remover o mock; encapsular  
- Não usar `fetch` direto em componentes de tela  
- Não acoplar componente ao payload bruto da API  
- Não espalhar lógica de ambiente  
- Preservar testes existentes do módulo quando possível  

### Testes mínimos esperados

1. Modo mock funciona  
2. Modo real usa API  
3. Fallback auto conforme definido  
4. Listagem renderiza dados do service layer  
5. Erro da API gera estado amigável  
6. Criação/edição disparam fluxo correto  
7. Ativação/inativação atualiza a UI  

### Entregáveis no fim

1. Service layer implantado  
2. `VITE_DATA_MODE` suportado  
3. Listagem integrada à API  
4. Detalhe/edição/criação integrados  
5. Fallback controlado quando aplicável  
6. Testes mínimos passando  
7. Resumo por arquivo  
8. Checklist de validação manual  

### Formato da resposta

- **Fase 1:** Relatório de Impacto → aguardar «pode implementar».  
- **Fase 2:** após aprovação, implementar → arquivos criados/alterados; variáveis de ambiente; fluxo validado; pendências conhecidas.  

---

## Referência cruzada

| Documento | Conteúdo |
|-----------|----------|
| [fase-transicao-mock-backend-real.md](./fase-transicao-mock-backend-real.md) | Macrofase, princípios, ordem de módulos, critérios de pronto |
| Este documento | Pastas `/server`, SQL, contrato HTTP, Prompt 0 backend, integração Colaboradores |
