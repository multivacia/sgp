import type { ConveyorDraftV1 } from '../../../domain/argos/draft-v1.types'
import type {
  CreateConveyorDados,
  CreateConveyorInput,
} from '../../../domain/conveyors/conveyor.types'

type SuggestedPassthrough = ConveyorDraftV1['suggestedDados'] & {
  osNumber?: string
  [key: string]: unknown
}

function pickString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return undefined
}

function optionalUuid(v: string | undefined): string | null {
  if (!v?.trim()) return null
  const s = v.trim()
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    )
  ) {
    return s
  }
  return null
}

/**
 * Converte o draft v1 (após revisão no ecrã) no corpo oficial `POST /api/v1/conveyors`.
 * Origem sempre tratada como composição manual revista por humano.
 */
export function draftV1ToCreateConveyorInput(
  draft: ConveyorDraftV1,
): CreateConveyorInput {
  const s = draft.suggestedDados as SuggestedPassthrough
  const nomeRaw = pickString(s.title) ?? 'Esteira a partir de documento'
  const nome = nomeRaw.slice(0, 500)

  let observacoes = pickString(s.notes) ?? ''
  const osNum = pickString(s.osNumber)
  if (osNum && !observacoes.includes(osNum)) {
    observacoes = observacoes
      ? `${observacoes}\nReferência OS: ${osNum}`
      : `Referência OS: ${osNum}`
  }

  const dados: CreateConveyorDados = {
    nome,
    cliente: pickString(s.clientName) ?? '',
    veiculo: pickString(s.vehicleDescription) ?? '',
    modeloVersao: pickString(s.modelVersion) ?? '',
    placa: pickString(s.licensePlate) ?? '',
    observacoes,
    responsavel: '',
    prazoEstimado: pickString(s.estimatedDeadline) ?? '',
    prioridade: s.priorityHint ?? 'media',
    colaboradorId: optionalUuid(pickString(s.suggestedResponsibleCollaboratorId)),
  }

  const options = mapOptionsOrPlaceholder(draft.options)

  return {
    dados,
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId: null,
    options,
  }
}

function mapOptionsOrPlaceholder(
  options: ConveyorDraftV1['options'],
): CreateConveyorInput['options'] {
  const src = options ?? []
  if (src.length === 0) {
    return [
      {
        titulo: 'Opção 1',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Serviço',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Defina as etapas do serviço',
                orderIndex: 1,
                plannedMinutes: 0,
                sourceOrigin: 'manual',
                required: true,
                assignees: [],
              },
            ],
          },
        ],
      },
    ]
  }

  return src.map((o) => ({
    titulo: o.title.trim(),
    orderIndex: o.orderIndex,
    sourceOrigin: 'manual' as const,
    areas: o.areas.map((a) => ({
      titulo: a.title.trim(),
      orderIndex: a.orderIndex,
      sourceOrigin: 'manual' as const,
      steps: a.steps.map((st) => ({
        titulo: st.title.trim(),
        orderIndex: st.orderIndex,
        plannedMinutes: Math.max(0, Math.floor(st.plannedMinutes ?? 0)),
        sourceOrigin: 'manual' as const,
        required: true,
        assignees: [],
      })),
    })),
  }))
}

/** Validação leve antes do POST — mensagens para o utilizador. */
export function validateDraftForCreate(draft: ConveyorDraftV1): string | null {
  const s = draft.suggestedDados as SuggestedPassthrough
  if (!pickString(s.title)) {
    return 'Indique o nome da esteira antes de criar.'
  }
  const opts = draft.options ?? []
  if (opts.length === 0) return null
  for (const o of opts) {
    if (!o.title?.trim()) return 'Cada opção precisa de um título.'
    for (const a of o.areas ?? []) {
      if (!a.title?.trim()) return 'Cada área precisa de um título.'
      for (const st of a.steps ?? []) {
        if (!st.title?.trim()) return 'Cada etapa precisa de um título.'
      }
    }
  }
  return null
}
