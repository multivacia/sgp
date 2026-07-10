import type { Env } from '../../config/env.js'
import {
  resolveAppVersionMetadata,
  type AppVersionMetadata,
} from '../../config/env.js'

export function getVersionMetadata(env: Pick<Env, 'nodeEnv'>): AppVersionMetadata {
  return resolveAppVersionMetadata(process.env, env.nodeEnv)
}
