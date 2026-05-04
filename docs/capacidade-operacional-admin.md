# Capacidade operacional (admin / UI)

## Objetivo

Expôr no SGP a gestão da capacidade operacional diária (padrão global e ajustes por colaborador) e tornar a capacidade efetiva visível nas áreas já existentes (colaboradores, dashboard operacional), sem novos dashboards nem migrações.

## Contratos usados (backend)

Base: `/api/v1`

| Operação | Método | Caminho |
|----------|--------|---------|
| Ler capacidade padrão global | GET | `/admin/operational-settings/capacity` |
| Atualizar capacidade padrão global | PUT | `/admin/operational-settings/capacity` |
| Ler capacidade resolvida + histórico de overrides | GET | `/admin/operational-settings/collaborators/:collaboratorId/capacity` |
| Criar/atualizar override | PUT | `/admin/operational-settings/collaborators/:collaboratorId/capacity` |
| Remover override (soft delete) | DELETE | `/admin/operational-settings/collaborators/:collaboratorId/capacity` |

Corpo JSON típico:

- Padrão global: `{ "defaultDailyMinutes": number }` (inteiro 1–1440).
- Override: `{ "dailyMinutes": number, "effectiveFrom"?: string|null, "effectiveTo"?: string|null, "isActive"?: boolean }` (datas `YYYY-MM-DD`).

Resposta de capacidade por colaborador inclui `resolvedDailyMinutes`, `source` (`override` | `default` | `fallback`) e `overrides[]`.

**Nota:** Não existe endpoint que liste todos os overrides numa única chamada. O separador “Capacidade operacional” obtém colaboradores via `GET /admin/collaborators` e resolve capacidade com uma chamada GET por colaborador na página atual.

## Permissões

Todas as rotas acima exigem **`operational_settings.manage`** (alinhado a `PERMISSION_OPERATIONAL_SETTINGS_MANAGE` no cliente).

Na lista/detalhe de **Colaboradores** e na tabela “Carga por colaborador” do **Dashboard operacional**, os dados de capacidade só são pedidos quando o utilizador tem esta permissão. Quem só tem `collaborators_admin.view` ou `dashboard.view_operational` continua a ver colaboradores/indicadores, mas não vê blocos que dependem das APIs de capacidade.

## Onde aparece na UI

1. **Configurações operacionais** (`/app/configuracoes-operacionais`), separador **Capacidade operacional**: padrão global e tabela de colaboradores ativos com filtros (nome, setor), edição e remoção de override.
2. **Colaboradores operacionais**: linha secundária “Capacidade: …” na lista (com permissão); cartão no modal **Editar colaborador** com resumo e link para Configurações operacionais.
3. **Dashboard — separador Operacional**: coluna opcional **Previsto vs capacidade diária** na tabela “Carga por colaborador” (com permissão), com percentagem e etiqueta de estado (dentro / atenção / acima).

## Como editar o padrão global

No separador Capacidade operacional, bloco **Capacidade padrão**, informar horas por dia (ex.: `8` ou `7,5`) e **Salvar padrão**. O valor enviado ao servidor é convertido para minutos inteiros na fronteira da UI.

## Como editar ou remover override por colaborador

Na mesma página, use **Editar** para definir horas/dia e, opcionalmente, vigência (datas). **Remover** ou **Restaurar padrão** no modal elimina o override e volta ao padrão global.

## Limitações

- Comparecer **N pedidos** HTTP por página na listagem de capacidades (uma por colaborador visível).
- Utilizadores sem `operational_settings.manage` não conseguem chamar as APIs de capacidade; a UI não mostra esses blocos.
- No dashboard, o **previsto em STEPs** é uma soma estrutural das atribuições; compará-la à **capacidade diária** é apenas um indicador — pode exceder “100%” com frequência quando há muita carga acumulada em várias esteiras.

## Próximos passos possíveis (fora deste escopo)

- Endpoint agregado de overrides ou capacidade efetiva em lista (reduzir chamadas).
- Permissão só de leitura para capacidade (se o produto o exigir).
