import type { Request, Response } from 'express'
import type pg from 'pg'
import type { Env } from '../../config/env.js'
import { ok } from '../../shared/http/ok.js'
import {
  createSupportTicketBodySchema,
  listMySupportTicketsQuerySchema,
  supportTicketIdParamSchema,
} from './support.schemas.js'
import { createSupportTicket, getMySupportTicketById, listMySupportTickets } from './support.service.js'

function queryString(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  if (Array.isArray(v)) return queryString(v[0])
  if (typeof v !== 'string') return undefined
  const s = v.trim()
  return s.length ? s : undefined
}

export async function postSupportTicket(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = req.app.locals.env as Env
  const body = createSupportTicketBodySchema.parse(req.body)
  const data = await createSupportTicket(pool, env, req.authUser!.id, body)
  res.status(201).json(ok(data))
}

export async function getSupportTicketById(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = req.app.locals.env as Env
  const id = supportTicketIdParamSchema.parse(req.params.id)
  const data = await getMySupportTicketById(pool, env, req.authUser!.id, id)
  res.json(ok(data))
}

export async function getMySupportTickets(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = req.app.locals.env as Env
  const data = await listMySupportTickets(pool, env, req.authUser!.id)
  res.json(ok(data, { total: data.length }))
}

export async function getSupportTickets(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const env = req.app.locals.env as Env
  const query = listMySupportTicketsQuerySchema.parse({
    q: queryString(req.query.q),
    status: queryString(req.query.status),
    category: queryString(req.query.category),
    severity: queryString(req.query.severity),
    period: queryString(req.query.period),
  })
  const items = await listMySupportTickets(pool, env, req.authUser!.id, query)
  res.json(ok({ items, total: items.length }))
}
