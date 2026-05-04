import type {
  CollaboratorHealthSummaryStatusFilter,
  CollaboratorOperationalHealthSummaryRow,
} from './collaboratorOperationalHealth.types'

export type CollaboratorHealthSummaryLocalFilters = {
  search: string
  status: CollaboratorHealthSummaryStatusFilter
}

function normalizeSearch(s: string): string {
  return s.trim().toLowerCase()
}

export function filterCollaboratorHealthSummaryRows(
  rows: CollaboratorOperationalHealthSummaryRow[],
  filters: CollaboratorHealthSummaryLocalFilters,
): CollaboratorOperationalHealthSummaryRow[] {
  const q = normalizeSearch(filters.search)
  return rows.filter((row) => {
    const st = row.deterministicStatus.status
    if (filters.status !== 'all' && st !== filters.status) return false
    if (!q) return true
    const name = (row.collaborator.fullName ?? '').toLowerCase()
    const code = (row.collaborator.code ?? '').toLowerCase()
    return name.includes(q) || code.includes(q)
  })
}
