import type {
  ConveyorOperationalPlanPayload,
  CreateConveyorOperationalPlanInput,
  CreateConveyorOperationalPlanItemInput,
  GenerateConveyorOperationalPlanItemsInput,
  ConveyorOperationalPlanGenerationPreview,
  PatchConveyorOperationalPlanItemInput,
  PreviewConveyorOperationalPlanGenerationInput,
} from '../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import { requestJson, requestJsonEnvelope } from '../../lib/api/client'

const base = (conveyorId: string) =>
  `/api/v1/conveyors/${encodeURIComponent(conveyorId)}/operational-plan`

export async function getConveyorOperationalPlan(
  conveyorId: string,
): Promise<{ data: ConveyorOperationalPlanPayload | null; hasPlan: boolean }> {
  const { data, meta } = await requestJsonEnvelope<ConveyorOperationalPlanPayload | null>(
    'GET',
    base(conveyorId),
  )
  const hasPlan =
    typeof meta.hasPlan === 'boolean' ? meta.hasPlan : data !== null
  return { data, hasPlan }
}

export async function createConveyorOperationalPlan(
  conveyorId: string,
  input: CreateConveyorOperationalPlanInput = {},
): Promise<ConveyorOperationalPlanPayload> {
  return requestJson<ConveyorOperationalPlanPayload>('POST', base(conveyorId), {
    body: input,
  })
}

export async function createConveyorOperationalPlanItem(
  conveyorId: string,
  planId: string,
  input: CreateConveyorOperationalPlanItemInput,
): Promise<ConveyorOperationalPlanPayload> {
  return requestJson<ConveyorOperationalPlanPayload>(
    'POST',
    `${base(conveyorId)}/${encodeURIComponent(planId)}/items`,
    { body: input },
  )
}

export async function updateConveyorOperationalPlanItem(
  conveyorId: string,
  planId: string,
  itemId: string,
  input: PatchConveyorOperationalPlanItemInput,
): Promise<ConveyorOperationalPlanPayload> {
  return requestJson<ConveyorOperationalPlanPayload>(
    'PATCH',
    `${base(conveyorId)}/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}`,
    { body: input },
  )
}

export async function previewConveyorOperationalPlanGeneratedItems(
  conveyorId: string,
  planId: string,
  input: PreviewConveyorOperationalPlanGenerationInput,
): Promise<ConveyorOperationalPlanGenerationPreview> {
  return requestJson<ConveyorOperationalPlanGenerationPreview>(
    'POST',
    `${base(conveyorId)}/${encodeURIComponent(planId)}/generate-items/preview`,
    { body: input },
  )
}

export async function generateConveyorOperationalPlanItems(
  conveyorId: string,
  planId: string,
  input: GenerateConveyorOperationalPlanItemsInput,
): Promise<ConveyorOperationalPlanPayload> {
  return requestJson<ConveyorOperationalPlanPayload>(
    'POST',
    `${base(conveyorId)}/${encodeURIComponent(planId)}/generate-items`,
    { body: input },
  )
}

export async function approveConveyorOperationalPlan(
  conveyorId: string,
  planId: string,
): Promise<ConveyorOperationalPlanPayload> {
  return requestJson<ConveyorOperationalPlanPayload>(
    'POST',
    `${base(conveyorId)}/${encodeURIComponent(planId)}/approve`,
    {},
  )
}

export async function sendConveyorOperationalPlanToFactory(
  conveyorId: string,
  planId: string,
): Promise<ConveyorOperationalPlanPayload> {
  return requestJson<ConveyorOperationalPlanPayload>(
    'POST',
    `${base(conveyorId)}/${encodeURIComponent(planId)}/send-to-factory`,
    {},
  )
}
