import type {
  EsteiraDetalheMock,
  EsteiraTarefaMock,
} from './esteira-detalhe-types'

function flattenAtividades(e: EsteiraDetalheMock) {
  return e.tarefas.flatMap((t) => t.atividades)
}

export function computeResumoEsteira(e: EsteiraDetalheMock) {
  const ats = flattenAtividades(e)
  const estimativaTotalMin = ats.reduce((s, a) => s + a.estimativaMin, 0)
  const realizadoTotalMin = ats.reduce((s, a) => s + a.realizadoMin, 0)
  const progressoPct =
    estimativaTotalMin > 0
      ? Math.round((realizadoTotalMin / estimativaTotalMin) * 1000) / 10
      : 0

  const concluidas = ats.filter((a) => a.status === 'concluida').length
  const emExec = ats.filter((a) => a.status === 'em_execucao').length
  const pausadas = ats.filter((a) => a.status === 'pausada').length
  const pendentes = ats.filter((a) => a.status === 'pendente').length
  const prontas = ats.filter((a) => a.status === 'pronta').length
  const bloqueadas = ats.filter((a) => a.status === 'bloqueada').length

  return {
    totalTarefas: e.tarefas.length,
    totalAtividades: ats.length,
    concluidas,
    emExecucao: emExec,
    pausadas,
    pendentes,
    prontas,
    bloqueadas,
    estimativaTotalMin,
    realizadoTotalMin,
    progressoPct,
  }
}

export function computeTarefaResumo(t: EsteiraTarefaMock) {
  const estimativa = t.atividades.reduce((s, a) => s + a.estimativaMin, 0)
  const realizado = t.atividades.reduce((s, a) => s + a.realizadoMin, 0)
  const done = t.atividades.filter((a) => a.status === 'concluida').length
  const pct =
    estimativa > 0 ? Math.round((realizado / estimativa) * 1000) / 10 : 0
  return { estimativa, realizado, done, total: t.atividades.length, pct }
}
