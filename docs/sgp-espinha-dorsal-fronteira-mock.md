# SGP+ Web — Fronteira mock / agregação / futuro backend

Documento técnico curto para orientar a troca do protótipo mockado por API real, sem reabrir a arquitetura da espinha dorsal.

## Camadas

| Camada | Módulos típicos | Papel |
|--------|-------------------|--------|
| **Domínio / contrato** | `esteira-detalhe.ts`, `backlog.ts`, `nova-esteira-domain.ts`, `apontamentos-repository.ts` (tipos) | Estruturas estáveis que um backend deve respeitar ou mapear explicitamente. |
| **Runtime mock** | `apontamentos-repository.ts` (store), `runtime-esteiras.ts`, `esteira-materializada-registry.ts`, `esteira-gestao-runtime.ts` | Estado em memória da sessão; substituir por persistência + invalidação. |
| **Projeção operacional** | `esteira-operacional.ts` | Única leitura “executável” para carteira, apontamento e orquestração — hoje deriva de mocks; depois deriva de DTOs da API. |
| **Agregação** | `dashboard-operacional.ts`, `jornada-colaborador-operacional.ts` | Puros sobre listas já resolvidas; trocar fontes por fetch sem alterar assinaturas expostas à UI. |
| **Adaptação UI** | `apontamento-context.ts` | Mapeia projeção → telas; mantém regra fora do JSX. |

## Legado (não usar como fonte funcional)

- `legacy-dashboard-decorative.ts` — KPIs/charts decorativos; **não** reexportado pelo barrel `mocks/index.ts`.

## UI

Componentes em `src/features/**` e `src/pages/**` devem consumir apenas funções dos módulos acima, não inventar entidades paralelas.

## Identidade de colaborador

A jornada agrega por **texto do responsável na linha** da projeção. Id forte de pessoa é limitação consciente do mock; a API futura deve fornecer chave estável antes de prometer desambiguação de homônimos.
