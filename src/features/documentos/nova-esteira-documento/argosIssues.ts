import type { ArgosIssue } from '../../../domain/argos/warnings-taxonomy.types'

export function partitionArgosIssues(warnings: ArgosIssue[]): {
  fatal: ArgosIssue[]
  nonFatal: ArgosIssue[]
} {
  const fatal: ArgosIssue[] = []
  const nonFatal: ArgosIssue[] = []
  for (const w of warnings) {
    if (w.category === 'fatal_error') fatal.push(w)
    else nonFatal.push(w)
  }
  return { fatal, nonFatal }
}

/** Indica se o resultado ARGOS impede tratamento como rascunho utilizável para criar esteira. */
export function isArgosResultOperationallyFailed(params: {
  status: 'completed' | 'partial' | 'failed'
  draft: unknown
  fatalIssues: ArgosIssue[]
}): boolean {
  if (params.status === 'failed') return true
  if (params.fatalIssues.length > 0) return true
  if (!params.draft || typeof params.draft !== 'object') return true
  return false
}
