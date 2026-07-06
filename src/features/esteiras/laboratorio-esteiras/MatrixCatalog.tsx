import type { MatrixNodeApi, MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { MatrixCard } from './MatrixCard'
import { countActivitiesInTree, sumMinutesInTree } from './laboratorioEsteirasState'

type Props = {
  matrices: MatrixNodeApi[]
  treeByMatrixId: Record<string, MatrixNodeTreeApi | undefined>
  loading: boolean
  error: string | null
  search: string
  onSearchChange: (value: string) => void
  onSelectMatrix: (matrixId: string) => void
}

export function MatrixCatalog({
  matrices,
  treeByMatrixId,
  loading,
  error,
  search,
  onSearchChange,
  onSelectMatrix,
}: Props) {
  const q = search.trim().toLowerCase()
  const filtered = q
    ? matrices.filter((m) => m.name.toLowerCase().includes(q))
    : matrices

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Buscar matriz</span>
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
        </span>
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar matriz..."
          className="sgp-input-app w-full py-3.5 pl-11 pr-4 text-base"
        />
      </label>

      {loading ? <p className="text-sm text-slate-500">Carregando matrizes…</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((m) => {
          const tree = treeByMatrixId[m.id]
          return (
            <MatrixCard
              key={m.id}
              name={m.name}
              activityCount={countActivitiesInTree(tree)}
              totalMinutes={sumMinutesInTree(tree)}
              onSelect={() => onSelectMatrix(m.id)}
            />
          )
        })}
      </div>

      {!loading && filtered.length === 0 ? (
        <p className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-6 text-center text-sm text-slate-500">
          Nenhuma matriz encontrada.
        </p>
      ) : null}
    </div>
  )
}
