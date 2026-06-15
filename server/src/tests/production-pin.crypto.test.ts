import { describe, expect, it } from 'vitest'
import {
  hashProductionPin,
  verifyProductionPin,
} from '../modules/production/production-pin.crypto.js'

describe('production-pin.crypto', () => {
  it('hash e verify aceitam PIN numérico', async () => {
    const hash = await hashProductionPin('1234')
    expect(hash.startsWith('$argon2')).toBe(true)
    expect(await verifyProductionPin('1234', hash)).toBe(true)
    expect(await verifyProductionPin('9999', hash)).toBe(false)
  })
})
