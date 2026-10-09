import type { ProductionWorkQueueItem } from './production.types'

/**
 * Pesquisa da fila do Kiosk ("Buscar atividade…") com o mesmo critério do apontamento
 * (Apontar horas → `GET /me/time-entry-candidates`), espelhando no cliente:
 * - `server/src/shared/accentInsensitiveSearch.ts` (`foldSearchText`, `parseConveyorActivitySearch`);
 * - `server/src/modules/my-activities/my-activities.repository.ts` (`scopedCandidateSearchSql`
 *   e a pesquisa livre `q`).
 *
 * Com `&`: esquerda = esteira/OS (nome, código, cliente, veículo, placa), direita = nome da
 * atividade; parcial, sem diferenciar maiúsculas/acentos; lados vazios são ignorados.
 * Sem `&`: pesquisa livre (maiúsculas/minúsculas indiferentes) na atividade, setor e tarefa —
 * como antes no Kiosk — e também na esteira/OS, cliente, veículo e placa, como na referência.
 */

/** Igual a `foldSearchText` do backend: minúsculas, sem acentos, espaços colapsados. */
function foldSearchTerm(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Coluna dobrada como no SQL (`translate(lower(...))`): minúsculas e sem acentos. */
function foldField(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/** Igual a `parseConveyorActivitySearch` do backend. Sem `&` → `null`. */
export function parseKioskConveyorActivitySearch(
  raw: string,
): { conveyorTerm: string | null; activityTerm: string | null } | null {
  if (!raw || !raw.includes('&')) return null
  const idx = raw.indexOf('&')
  const left = foldSearchTerm(raw.slice(0, idx))
  const right = foldSearchTerm(raw.slice(idx + 1).replace(/&/g, ' '))
  return { conveyorTerm: left || null, activityTerm: right || null }
}

function conveyorFields(item: ProductionWorkQueueItem): Array<string | null | undefined> {
  return [
    item.conveyorTitle,
    item.conveyorCode,
    item.clientName,
    item.vehicleDescription,
    item.licensePlate,
  ]
}

export function filterKioskWorkQueueBySearch(
  items: ProductionWorkQueueItem[],
  search: string,
): ProductionWorkQueueItem[] {
  const pair = parseKioskConveyorActivitySearch(search)
  if (pair) {
    const { conveyorTerm, activityTerm } = pair
    return items.filter(
      (i) =>
        (conveyorTerm === null ||
          conveyorFields(i).some((f) => foldField(f).includes(conveyorTerm))) &&
        (activityTerm === null || foldField(i.activityTitle).includes(activityTerm)),
    )
  }

  const q = search.toLowerCase().trim()
  if (!q) return items
  return items.filter((i) =>
    [i.activityTitle, i.sectorTitle, i.taskTitle, ...conveyorFields(i)].some(
      (f) => f?.toLowerCase().includes(q) ?? false,
    ),
  )
}
