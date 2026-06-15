import type pg from 'pg'

export type ConveyorProductionStatus = 'A_INICIAR' | 'EM_ANDAMENTO'

/** Esteiras novas nascem em EM_ELABORACAO; apontamentos exigem A_INICIAR ou EM_ANDAMENTO. */
export async function setConveyorProductionStatusForIntegration(
  pool: pg.Pool,
  conveyorId: string,
  status: ConveyorProductionStatus = 'EM_ANDAMENTO',
): Promise<void> {
  await pool.query(
    `UPDATE conveyors SET operational_status = $2 WHERE id = $1::uuid`,
    [conveyorId, status],
  )
}
