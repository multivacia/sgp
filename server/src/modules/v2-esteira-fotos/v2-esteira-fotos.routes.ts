import { Router, type Request, type Response } from 'express'
import type pg from 'pg'
import { z } from 'zod'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import { detectarTipoImagem, validarImagem } from '../v2-etapa-imagens/v2-etapa-imagens.logic.js'
import { corpoImagem } from '../v2-etapa-imagens/v2-etapa-imagens.routes.js'

/**
 * SGP+ V2 — fotos do veículo na esteira (migration 0056). Módulo isolado; a V1 não usa.
 * Ver: qualquer usuário logado. Incluir/remover: `conveyors.create` (quem monta e altera esteira).
 */
export const V2_ESTEIRA_FOTOS_MAX = 10

const conveyorSchema = z.object({ id: z.string().uuid() })
const fotoSchema = z.object({ id: z.string().uuid(), fotoId: z.string().uuid() })
const gerir = [requireAuth(), requirePermission('conveyors.create')]

async function listar(req: Request, res: Response): Promise<void> {
  const { id } = conveyorSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const r = await pool.query<{ id: string; created_at: Date }>('SELECT id::text, created_at FROM v2_esteira_fotos WHERE conveyor_id = $1::uuid ORDER BY created_at', [id])
  res.json(ok(r.rows.map((f) => ({ id: f.id, criadaEm: f.created_at.toISOString() }))))
}

async function ler(req: Request, res: Response): Promise<void> {
  const { id, fotoId } = fotoSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const r = await pool.query<{ content_type: string; bytes: Buffer }>('SELECT content_type, bytes FROM v2_esteira_fotos WHERE id = $1::uuid AND conveyor_id = $2::uuid', [fotoId, id])
  const f = r.rows[0]
  if (!f) throw new AppError('Foto não encontrada.', 404, ErrorCodes.NOT_FOUND)
  res.setHeader('Content-Type', f.content_type)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // a foto nunca muda (trocar = remover e incluir outra)
  res.setHeader('Cache-Control', 'private, max-age=604800, immutable')
  res.send(f.bytes)
}

async function incluir(req: Request, res: Response): Promise<void> {
  const { id } = conveyorSchema.parse(req.params)
  const erro = validarImagem(req.body, req.headers['content-type'])
  if (erro) throw new AppError(erro, 422, ErrorCodes.VALIDATION_ERROR)
  const bytes = req.body as Buffer
  const pool = req.app.locals.pool as pg.Pool
  const cv = await pool.query<{ n: string }>(
    `SELECT (SELECT count(*) FROM v2_esteira_fotos WHERE conveyor_id = c.id)::text AS n FROM conveyors c WHERE c.id = $1::uuid AND c.deleted_at IS NULL`,
    [id],
  )
  if (!cv.rows[0]) throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  if (Number(cv.rows[0].n) >= V2_ESTEIRA_FOTOS_MAX) throw new AppError(`A esteira já tem ${V2_ESTEIRA_FOTOS_MAX} fotos. Remova uma para incluir outra.`, 422, ErrorCodes.VALIDATION_ERROR)
  const r = await pool.query<{ id: string; created_at: Date }>(
    'INSERT INTO v2_esteira_fotos (conveyor_id, content_type, bytes, created_by) VALUES ($1::uuid, $2, $3, $4::uuid) RETURNING id::text, created_at',
    [id, detectarTipoImagem(bytes), bytes, req.authUser?.id ?? null],
  )
  res.status(201).json(ok({ id: r.rows[0].id, criadaEm: r.rows[0].created_at.toISOString() }))
}

async function remover(req: Request, res: Response): Promise<void> {
  const { id, fotoId } = fotoSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  await pool.query('DELETE FROM v2_esteira_fotos WHERE id = $1::uuid AND conveyor_id = $2::uuid', [fotoId, id])
  res.status(204).end()
}

export function v2EsteiraFotosRouter(): Router {
  const r = Router()
  r.get('/v2/esteiras/:id/fotos', requireAuth(), asyncRoute(listar))
  r.get('/v2/esteiras/:id/fotos/:fotoId', requireAuth(), asyncRoute(ler))
  r.post('/v2/esteiras/:id/fotos', ...gerir, corpoImagem, asyncRoute(incluir))
  r.delete('/v2/esteiras/:id/fotos/:fotoId', ...gerir, asyncRoute(remover))
  return r
}
