import { loadEnv } from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { hashProductionPin } from '../modules/production/production-pin.crypto.js'
import { PRODUCTION_DEFAULT_INITIAL_PIN } from '../modules/production/production.schemas.js'
import {
  findProductionCredentialExists,
  insertProductionCredentialInitial,
  listActiveCollaboratorsForProductionPinSeed,
} from '../modules/production/production-collaborators.repository.js'

async function main() {
  const args = process.argv.slice(2)
  const resetAll = args.includes('--reset-all')
  if (resetAll) {
    console.warn(
      'AVISO: --reset-all sobrescreverá credenciais existentes com PIN inicial padrão.',
    )
  }

  const env = loadEnv()
  const pool = getPool(env)

  try {
    const collaborators = await listActiveCollaboratorsForProductionPinSeed(pool)
    let created = 0
    let skipped = 0
    let reset = 0

    const pinHash = await hashProductionPin(PRODUCTION_DEFAULT_INITIAL_PIN)

    for (const collaborator of collaborators) {
      const exists = await findProductionCredentialExists(pool, collaborator.id)
      if (exists && !resetAll) {
        console.log(`[skip] ${collaborator.full_name} — credencial já configurada`)
        skipped += 1
        continue
      }

      if (exists && resetAll) {
        await pool.query(
          `
          UPDATE collaborator_production_credentials
          SET pin_hash = $2,
              enabled = true,
              must_change_pin = true,
              failed_attempts = 0,
              locked_until = NULL,
              updated_at = now()
          WHERE collaborator_id = $1::uuid
          `,
          [collaborator.id, pinHash],
        )
        console.log(`[reset] ${collaborator.full_name} — credencial redefinida`)
        reset += 1
        continue
      }

      await insertProductionCredentialInitial(pool, {
        collaboratorId: collaborator.id,
        pinHash,
        mustChangePin: true,
      })
      console.log(`[create] ${collaborator.full_name} — credencial habilitada`)
      created += 1
    }

    console.log('')
    console.log(
      `Concluído: ${created} criada(s), ${skipped} já configurada(s), ${reset} redefinida(s).`,
    )
    console.log(
      'PIN inicial padrão configurado conforme ambiente (não exibido por segurança).',
    )
  } finally {
    await closePool()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
