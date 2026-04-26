import type { ConveyorStructure } from '../../../domain/conveyors/conveyor.types'
import type { CreateConveyorOptionInput } from '../../../domain/conveyors/conveyor.types'

export type StructurePathDiff = {
  kept: string[]
  removed: string[]
  added: string[]
}

export function flattenPersistedStructurePaths(
  structure: ConveyorStructure,
): string[] {
  const keys: string[] = []
  const opts = [...structure.options].sort((a, b) => a.orderIndex - b.orderIndex)
  for (const opt of opts) {
    for (const area of [...opt.areas].sort((a, b) => a.orderIndex - b.orderIndex)) {
      for (const st of [...area.steps].sort((a, b) => a.orderIndex - b.orderIndex)) {
        keys.push(`${opt.name} › ${area.name} › ${st.name}`)
      }
    }
  }
  return keys
}

export function flattenProposedOptionsPaths(
  options: CreateConveyorOptionInput[],
): string[] {
  const keys: string[] = []
  const opts = [...options].sort((a, b) => a.orderIndex - b.orderIndex)
  for (const opt of opts) {
    for (const area of [...opt.areas].sort((a, b) => a.orderIndex - b.orderIndex)) {
      for (const st of [...area.steps].sort((a, b) => a.orderIndex - b.orderIndex)) {
        keys.push(`${opt.titulo} › ${area.titulo} › ${st.titulo}`)
      }
    }
  }
  return keys
}

export function diffStructurePaths(before: string[], after: string[]): StructurePathDiff {
  const a = new Set(after)
  const b = new Set(before)
  const kept = before.filter((x) => a.has(x))
  const removed = before.filter((x) => !a.has(x))
  const added = after.filter((x) => !b.has(x))
  return { kept, removed, added }
}

export function totalRealizedMinutesFromWorkload(
  steps: { realizedMinutes: number }[],
): number {
  return steps.reduce((n, s) => n + (s.realizedMinutes ?? 0), 0)
}
