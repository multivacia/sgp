import { Router, type Request, type Response } from 'express'
import type pg from 'pg'
import { z } from 'zod'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import { softDeleteConveyorTimeEntry, updateConveyorTimeEntryMinutes } from '../conveyors/conveyorAssignments.repository.js'
import { requireProductionAuth, requireProductionPinChanged } from '../production/production-auth.middleware.js'
import { bloqueioCorrecao, diaNaFabrica, erroMinutos, erroMotivo } from './v2-producao-correcao.logic.js'

/**
 * SGP+ V2 — o colaborador corrige ou remove o próprio apontamento no tablet (sessão do Modo Produção da V1).
 * Regras em `v2-producao-correcao.logic.ts`; cada mudança fica em `v2_correcoes_apontamento` (migration 0055).
 */
const auth = [requireProductionAuth(), requireProductionPinChanged()]
const idSchema = z.object({ id: z.string().uuid() })
const patchSchema = z.object({ minutes: z.unknown(), reason: z.unknown(), expectedUpdatedAt: z.string().min(1) })
const deleteSchema = z.object({ reason: z.unknown() })

type Linha = {
  id: string
  conveyor_id: string
  conveyor_node_id: string
  collaborator_id: string
  minutes: number
  entry_at: Date
  created_at: Date
  updated_at: Date
  step_status: string | null
  step_name: string
  conveyor_name: string
}

const SELECT = `
  SELECT te.id::text, te.conveyor_id::text, te.conveyor_node_id::text, te.collaborator_id::text, te.minutes,
         te.entry_at, te.created_at, te.updated_at,
         step.operational_status AS step_status, step.name AS step_name, cv.name AS conveyor_name
    FROM conveyor_time_entries te
    INNER JOIN conveyor_nodes step ON step.id = te.conveyor_node_id
    INNER JOIN conveyors cv ON cv.id = te.conveyor_id
   WHERE te.deleted_at IS NULL`

function sessao(req: Request): string {
  const id = req.productionSession?.collaboratorId
  if (!id) throw new AppError('Entre com seu PIN.', 401, ErrorCodes.UNAUTHORIZED)
  return id
}

function paraApi(l: Linha, cid: string, agora: Date) {
  const bloqueio = bloqueioCorrecao({ collaboratorId: l.collaborator_id, createdAt: l.created_at, stepStatus: l.step_status }, cid, agora)
  return {
    id: l.id,
    conveyorId: l.conveyor_id,
    conveyorTitle: l.conveyor_name,
    stepNodeId: l.conveyor_node_id,
    activityTitle: l.step_name,
    minutes: l.minutes,
    entryAt: l.entry_at.toISOString(),
    createdAt: l.created_at.toISOString(),
    updatedAt: l.updated_at.toISOString(),
    podeCorrigir: bloqueio === null,
    bloqueio,
  }
}

/** O que o colaborador lançou hoje (o que dá para corrigir vem marcado). */
async function listar(req: Request, res: Response): Promise<void> {
  const cid = sessao(req)
  const pool = req.app.locals.pool as pg.Pool
  const agora = new Date()
  const r = await pool.query<Linha>(
    `${SELECT}
       AND te.collaborator_id = $1::uuid
       AND (te.created_at AT TIME ZONE 'America/Sao_Paulo')::date = $2::date
     ORDER BY te.created_at DESC`,
    [cid, diaNaFabrica(agora)],
  )
  res.json(ok(r.rows.map((l) => paraApi(l, cid, agora))))
}

async function comLancamento<T>(req: Request, fn: (c: pg.PoolClient, l: Linha, cid: string) => Promise<T>): Promise<T> {
  const cid = sessao(req)
  const { id } = idSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const r = await client.query<Linha>(`${SELECT} AND te.id = $1::uuid FOR UPDATE OF te`, [id])
    const l = r.rows[0]
    if (!l) throw new AppError('Lançamento não encontrado.', 404, ErrorCodes.NOT_FOUND)
    const bloqueio = bloqueioCorrecao({ collaboratorId: l.collaborator_id, createdAt: l.created_at, stepStatus: l.step_status }, cid, new Date())
    if (bloqueio) throw new AppError(bloqueio, l.collaborator_id === cid ? 422 : 403, l.collaborator_id === cid ? ErrorCodes.VALIDATION_ERROR : ErrorCodes.FORBIDDEN)
    const out = await fn(client, l, cid)
    await client.query('COMMIT')
    return out
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

async function corrigir(req: Request, res: Response): Promise<void> {
  const body = patchSchema.parse(req.body ?? {})
  const out = await comLancamento(req, async (c, l, cid) => {
    const erro = erroMotivo(body.reason) ?? erroMinutos(body.minutes, l.minutes)
    if (erro) throw new AppError(erro, 422, ErrorCodes.VALIDATION_ERROR)
    const esperado = new Date(body.expectedUpdatedAt)
    if (Number.isNaN(esperado.getTime())) throw new AppError('expectedUpdatedAt inválido.', 422, ErrorCodes.VALIDATION_ERROR)
    const novo = await updateConveyorTimeEntryMinutes(c, { id: l.id, conveyorId: l.conveyor_id, conveyorNodeId: l.conveyor_node_id, minutes: body.minutes as number, expectedUpdatedAt: esperado })
    if (!novo) throw new AppError('O lançamento mudou. Atualize a tela e tente de novo.', 409, ErrorCodes.CONFLICT)
    await c.query(
      `INSERT INTO v2_correcoes_apontamento (time_entry_id, collaborator_id, acao, minutos_antes, minutos_depois, motivo) VALUES ($1, $2, 'CORRIGIR', $3, $4, $5)`,
      [l.id, cid, l.minutes, body.minutes, (body.reason as string).trim()],
    )
    return { id: l.id, minutes: body.minutes as number }
  })
  res.json(ok(out))
}

async function remover(req: Request, res: Response): Promise<void> {
  const body = deleteSchema.parse(req.body ?? {})
  await comLancamento(req, async (c, l, cid) => {
    const erro = erroMotivo(body.reason)
    if (erro) throw new AppError(erro, 422, ErrorCodes.VALIDATION_ERROR)
    await softDeleteConveyorTimeEntry(c, { id: l.id, conveyorId: l.conveyor_id, conveyorNodeId: l.conveyor_node_id })
    await c.query(
      `INSERT INTO v2_correcoes_apontamento (time_entry_id, collaborator_id, acao, minutos_antes, minutos_depois, motivo) VALUES ($1, $2, 'REMOVER', $3, NULL, $4)`,
      [l.id, cid, l.minutes, (body.reason as string).trim()],
    )
  })
  res.status(204).end()
}

export function v2ProducaoCorrecaoRouter(): Router {
  const r = Router()
  r.get('/v2/producao/meus-lancamentos', ...auth, asyncRoute(listar))
  r.patch('/v2/producao/meus-lancamentos/:id', ...auth, asyncRoute(corrigir))
  r.delete('/v2/producao/meus-lancamentos/:id', ...auth, asyncRoute(remover))
  return r
}
