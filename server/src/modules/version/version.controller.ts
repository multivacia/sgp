import type { Request, Response } from 'express'
import type { Env } from '../../config/env.js'
import { ok } from '../../shared/http/ok.js'
import { getVersionMetadata } from './version.service.js'

export async function getVersion(_req: Request, res: Response): Promise<void> {
  const env = res.app.locals.env as Env
  res.json(ok(getVersionMetadata(env), { public: true }))
}
