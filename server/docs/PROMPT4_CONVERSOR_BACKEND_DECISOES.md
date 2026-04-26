# Prompt 4 — Backend Esteira (conveyor) — Decisões fechadas

Documento para implementação da API e persistência, sem dispersar escopo. **Atualizado com ajustes finos aprovados.**

---

## 1. Escopo HTTP: POST nesta fase; GET explícito fora

| Entrega nesta fase | Pendência explícita |
|--------------------|---------------------|
| **POST** `/api/v1/conveyors` (ou rota equivalente ao padrão do router) para registrar esteira a partir do snapshot | **GET** `/api/v1/conveyors/:id` — **não implementar** nesta fase; fica registrado como próximo passo quando existir tela/consumo. |

Motivo: manter foco em registro transacional; evitar decisões de leitura/detalhe sem consumidor.

---

## 2. Semântica de `priority` (reuso do projeto)

**Padrão já consolidado no frontend** (`src/mocks/backlog.ts`):

```ts
export type BacklogPriority = 'alta' | 'media' | 'baixa'
```

- Normalização existente: `normalizeBacklogPriority` — string vazia → `'media'`.
- **No backend:** usar **exatamente** o mesmo vocabulário: `alta`, `media`, `baixa` (minúsculas, sem acentos nas chaves).
- **DDL sugerido:** `VARCHAR(16)` com `CHECK (priority IN ('alta', 'media', 'baixa'))` **ou** tipo ENUM PostgreSQL com os mesmos rótulos — não inventar sinónimos (`high`/`low`) nesta fase.

Se no futuro o produto internacionalizar, aí sim introduzir camada de mapeamento; até lá, **1:1 com `BacklogPriority`**.

---

## 3. Origem dos nós (`source_origin` / `origem`)

**Frontend oficial** (`src/mocks/nova-esteira-jornada-draft.ts`):

```ts
export type NovaEsteiraNoOrigem = 'manual' | 'reaproveitada' | 'base'
```

Os nós (opção, área, etapa) usam o campo **`origem`** com estes **três literais em minúsculas**.

**Alinhamento backend:**

- Coluna recomendada: `source_origin` (ou `origem`, se preferir português no DDL) com valores **`manual`**, **`reaproveitada`**, **`base`** — **não** usar `MANUAL` / `BASE` / `REAPROVEITADA` em maiúsculas no contrato persistido, para evitar adaptador desnecessário entre API e draft.
- Se a API pública expuser maiúsculas por convenção REST, o **service** faz o mapeamento uma vez; a **base de dados** reflete o mesmo domínio do TypeScript.

---

## 4. Código humano da esteira (`code`)

- **Nesta fase:** `code` **pode ser `NULL`** no cabeçalho da esteira persistida.
- **Geração automática de código humano** (sequências, prefixos, etc.) — **fora de escopo**; não bloquear o POST por ausência de `code`.

---

## 5. Filosofia já aprovada (referência)

- Esteira real = **cabeçalho + árvore única** (OPTION → AREA → STEP), espelhando Base/Matriz, sem tabelas por nível.
- Servidor **recalcula totais** e **revalida estrutura** a partir do payload (não confiar cegamente no cliente).
- Transação: inserir cabeçalho, depois nós em ordem segura; **rollback total** se falhar qualquer passo.
- Rastreabilidade da Base: **referência histórica** (`base_id`, versão, etc.), **nunca** FK “viva” que altere a esteira quando a base mudar.

---

## 6. Checklist antes de “pode implementar” backend

- [ ] POST implementado; GET por id **não** incluído (apenas mencionado em backlog/README se útil).
- [ ] `priority` = `alta` | `media` | `baixa` alinhado a `BacklogPriority`.
- [ ] `source_origin` dos nós = `manual` | `reaproveitada` | `base` alinhado a `NovaEsteiraNoOrigem`.
- [ ] `code` nullable; sem gerador de código nesta entrega.
