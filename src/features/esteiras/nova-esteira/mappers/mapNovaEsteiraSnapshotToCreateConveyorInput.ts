import { normalizeBacklogPriority } from '../../../../mocks/backlog'
import type {
  NovaEsteiraRegisterArea,
  NovaEsteiraRegisterOption,
  NovaEsteiraRegisterSnapshot,
  NovaEsteiraRegisterStep,
} from '../../../../mocks/nova-esteira-register-snapshot'
import type {
  CreateConveyorAreaInput,
  CreateConveyorInput,
  CreateConveyorOptionInput,
  CreateConveyorStepInput,
  ConveyorSourceOrigin,
} from '../../../../domain/conveyors/conveyor.types'
import { isUuidV4Like } from '../../../../mocks/nova-esteira-dados-validacao'

const SOURCE_ORIGINS = new Set<ConveyorSourceOrigin>([
  'manual',
  'reaproveitada',
  'base',
])

function toSourceOrigin(value: string): ConveyorSourceOrigin {
  if (SOURCE_ORIGINS.has(value as ConveyorSourceOrigin)) {
    return value as ConveyorSourceOrigin
  }
  return 'manual'
}

function mapStep(s: NovaEsteiraRegisterStep): CreateConveyorStepInput {
  return {
    titulo: s.titulo.trim(),
    orderIndex: s.orderIndex,
    plannedMinutes: s.plannedMinutes,
    sourceOrigin: toSourceOrigin(s.sourceOrigin),
    required: s.required,
  }
}

function mapArea(a: NovaEsteiraRegisterArea): CreateConveyorAreaInput {
  return {
    titulo: a.titulo.trim(),
    orderIndex: a.orderIndex,
    sourceOrigin: toSourceOrigin(a.sourceOrigin),
    steps: a.steps.map(mapStep),
  }
}

function mapOption(o: NovaEsteiraRegisterOption): CreateConveyorOptionInput {
  return {
    titulo: o.titulo.trim(),
    orderIndex: o.orderIndex,
    sourceOrigin: toSourceOrigin(o.sourceOrigin),
    areas: o.areas.map(mapArea),
  }
}

/** O schema Zod do servidor exige UUID; IDs mock (ex.: colab-*) são omitidos. */
function normalizeColaboradorIdParaApi(
  id: string | undefined | null,
): string | null {
  if (id == null) return null
  const t = String(id).trim()
  if (t.length === 0) return null
  return isUuidV4Like(t) ? t : null
}

/**
 * Monta o corpo do POST /api/v1/conveyors a partir do snapshot oficial.
 * Não inclui campos só de auditoria/debug do snapshot (totals, reviewStatus, …).
 */
export function mapNovaEsteiraSnapshotToCreateConveyorInput(
  snapshot: NovaEsteiraRegisterSnapshot,
): CreateConveyorInput {
  const d = snapshot.dados
  const prioridade = normalizeBacklogPriority(d.prioridade)

  return {
    dados: {
      nome: d.nome.trim(),
      cliente: d.cliente ?? '',
      veiculo: d.veiculo ?? '',
      modeloVersao: d.modeloVersao ?? '',
      placa: d.placa ?? '',
      observacoes: d.observacoes ?? '',
      responsavel: d.responsavel ?? '',
      prazoEstimado: d.prazoEstimado ?? '',
      prioridade,
      colaboradorId: normalizeColaboradorIdParaApi(d.colaboradorId),
    },
    originType: snapshot.originType,
    baseId: snapshot.baseId ?? null,
    baseCode: snapshot.baseCode ?? null,
    baseName: snapshot.baseName ?? null,
    baseVersion: snapshot.baseVersion ?? null,
    options: snapshot.options.map(mapOption),
  }
}
