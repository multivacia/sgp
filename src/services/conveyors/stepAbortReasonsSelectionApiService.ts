import type { StepAbortReasonOption } from '../../domain/conveyors/stepAbortReasons'
import { requestJsonEnvelope } from '../../lib/api/client'

const PATH = '/api/v1/conveyors/step-abort-reasons'

/** Lista motivos ativos para o seletor de dispensa (requer conveyors.create). */
export async function listActiveStepAbortReasonsForSelection(): Promise<
  StepAbortReasonOption[]
> {
  const { data } = await requestJsonEnvelope<StepAbortReasonOption[]>('GET', PATH)
  return Array.isArray(data) ? data : []
}
