import express, { Router, type NextFunction, type Request, type Response } from 'express'
import type pg from 'pg'
import { z } from 'zod'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import { detectarTipoImagem, V2_ETAPA_IMAGEM_MAX_BYTES, V2_ETAPA_IMAGEM_TIPOS, validarImagem } from './v2-etapa-imagens.logic.js'

/**
 * SGP+ V2 — fotos das etapas da matriz. Módulo isolado: só a V2 usa estas rotas e a tabela `v2_etapa_imagens`.
 * Ler: qualquer usuário logado. Trocar/remover: `operation_matrix.manage` (quem cuida da matriz).
 */
const paramsSchema = z.object({ id: z.string().uuid() })
const manage = [requireAuth(), requirePermission('operation_matrix.manage')]

async function listar(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const r = await pool.query<{ matrix_node_id: string; name: string; updated_at: Date }>(
    `SELECT i.matrix_node_id::text, n.name, i.updated_at
       FROM v2_etapa_imagens i
       INNER JOIN matrix_nodes n ON n.id = i.matrix_node_id AND n.deleted_at IS NULL
      ORDER BY n.name`,
  )
  res.json(ok(r.rows.map((x) => ({ matrixNodeId: x.matrix_node_id, nome: x.name, atualizadaEm: x.updated_at.toISOString() }))))
}

async function ler(req: Request, res: Response): Promise<void> {
  const { id } = paramsSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  const r = await pool.query<{ content_type: string; bytes: Buffer; updated_at: Date }>(
    'SELECT content_type, bytes, updated_at FROM v2_etapa_imagens WHERE matrix_node_id = $1::uuid',
    [id],
  )
  const row = r.rows[0]
  if (!row) throw new AppError('Esta etapa não tem foto.', 404, ErrorCodes.NOT_FOUND)
  res.setHeader('Content-Type', row.content_type)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // a V2 pede com ?v=<atualizadaEm>; trocar a foto muda o endereço
  res.setHeader('Cache-Control', 'private, max-age=86400')
  res.setHeader('Last-Modified', row.updated_at.toUTCString())
  res.send(row.bytes)
}

async function gravar(req: Request, res: Response): Promise<void> {
  const { id } = paramsSchema.parse(req.params)
  const erro = validarImagem(req.body, req.headers['content-type'])
  if (erro) throw new AppError(erro, 422, ErrorCodes.VALIDATION_ERROR)
  const bytes = req.body as Buffer
  const pool = req.app.locals.pool as pg.Pool
  const node = await pool.query<{ node_type: string }>('SELECT node_type FROM matrix_nodes WHERE id = $1::uuid AND deleted_at IS NULL', [id])
  if (!node.rows[0]) throw new AppError('Etapa não encontrada na matriz.', 404, ErrorCodes.NOT_FOUND)
  if (node.rows[0].node_type !== 'TASK') throw new AppError('Só etapas da matriz têm foto.', 422, ErrorCodes.VALIDATION_ERROR)
  const r = await pool.query<{ updated_at: Date }>(
    `INSERT INTO v2_etapa_imagens (matrix_node_id, content_type, bytes, updated_by)
     VALUES ($1::uuid, $2, $3, $4::uuid)
     ON CONFLICT (matrix_node_id) DO UPDATE
       SET content_type = EXCLUDED.content_type, bytes = EXCLUDED.bytes, updated_by = EXCLUDED.updated_by, updated_at = now()
     RETURNING updated_at`,
    [id, detectarTipoImagem(bytes), bytes, req.authUser?.id ?? null],
  )
  res.json(ok({ matrixNodeId: id, atualizadaEm: r.rows[0].updated_at.toISOString() }))
}

async function remover(req: Request, res: Response): Promise<void> {
  const { id } = paramsSchema.parse(req.params)
  const pool = req.app.locals.pool as pg.Pool
  await pool.query('DELETE FROM v2_etapa_imagens WHERE matrix_node_id = $1::uuid', [id])
  res.status(204).end()
}

const lerCorpo = express.raw({ type: [...V2_ETAPA_IMAGEM_TIPOS], limit: V2_ETAPA_IMAGEM_MAX_BYTES })

/** Corpo binário da imagem; acima do limite responde 413 com mensagem clara (sem cair no 500 genérico). */
function corpoImagem(req: Request, res: Response, next: NextFunction): void {
  lerCorpo(req, res, (err?: unknown) => {
    if (err && (err as { type?: string }).type === 'entity.too.large') return next(new AppError('A imagem passa de 1 MB.', 413, ErrorCodes.VALIDATION_ERROR))
    next(err)
  })
}

export function v2EtapaImagensRouter(): Router {
  const r = Router()
  r.get('/v2/etapa-imagens', requireAuth(), asyncRoute(listar))
  r.get('/v2/etapa-imagens/:id', requireAuth(), asyncRoute(ler))
  r.put(
    '/v2/etapa-imagens/:id',
    ...manage,
    corpoImagem,
    asyncRoute(gravar),
  )
  r.delete('/v2/etapa-imagens/:id', ...manage, asyncRoute(remover))
  return r
}
