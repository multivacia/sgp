import { getApontamentosVersion, subscribeApontamentos } from './apontamentos-repository'
import {
  getColaboradoresVersion,
  subscribeColaboradores,
} from './colaboradores-operacionais-repository'
import { getGestaoVersion, subscribeGestao } from './esteira-gestao-runtime'

/** Uma assinatura para re-render quando gestão, apontamentos ou colaboradores mudam. */
export function subscribeOperacaoApontamentos(callback: () => void) {
  const u = subscribeGestao(callback)
  const v = subscribeApontamentos(callback)
  const w = subscribeColaboradores(callback)
  return () => {
    u()
    v()
    w()
  }
}

export function getOperacaoApontamentosVersion(): string {
  return `${getGestaoVersion()}-${getApontamentosVersion()}-c${getColaboradoresVersion()}`
}
