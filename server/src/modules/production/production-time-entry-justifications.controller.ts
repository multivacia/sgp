import type { Request, Response } from 'express'
import { getActiveTimeEntryJustificationsForSelection } from '../operational-settings/time-entry-justifications.controller.js'

/** GET /api/v1/production/time-entry-justifications — catálogo ativo para apontamento (PIN/kiosk). */
export async function getProductionTimeEntryJustifications(
  req: Request,
  res: Response,
): Promise<void> {
  await getActiveTimeEntryJustificationsForSelection(req, res)
}
