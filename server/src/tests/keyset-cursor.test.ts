import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  decodeKeysetCursor,
  encodeKeysetCursor,
  INVALID_PAGINATION_CURSOR_MESSAGE,
} from '../shared/pagination/keysetCursor.js'
import { AppError } from '../shared/errors/AppError.js'

const schema = z.tuple([z.string(), z.number().int(), z.string().uuid()])
const ID = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

function expect400(fn: () => unknown) {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(AppError)
    expect((e as AppError).statusCode).toBe(400)
    expect((e as AppError).message).toBe(INVALID_PAGINATION_CURSOR_MESSAGE)
    return
  }
  throw new Error('esperava erro 400')
}

describe('keysetCursor', () => {
  it('ida e volta preserva a chave (inclui texto com acento e espaço)', () => {
    const c = encodeKeysetCursor('scope-a', ['OS 7467 · Tampão', 3, ID])
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeKeysetCursor(c, 'scope-a', schema)).toEqual(['OS 7467 · Tampão', 3, ID])
  })

  it('ausente ou vazio = primeira página', () => {
    expect(decodeKeysetCursor(undefined, 'scope-a', schema)).toBeNull()
    expect(decodeKeysetCursor(null, 'scope-a', schema)).toBeNull()
    expect(decodeKeysetCursor('', 'scope-a', schema)).toBeNull()
  })

  it('malformado, adulterado ou de outro escopo → 400', () => {
    expect400(() => decodeKeysetCursor('!!!', 'scope-a', schema))
    expect400(() => decodeKeysetCursor(Buffer.from('xyz').toString('base64url'), 'scope-a', schema))
    expect400(() => decodeKeysetCursor(encodeKeysetCursor('scope-b', ['a', 1, ID]), 'scope-a', schema))
    expect400(() => decodeKeysetCursor(encodeKeysetCursor('scope-a', ['a', 'um', ID]), 'scope-a', schema))
    expect400(() => decodeKeysetCursor(encodeKeysetCursor('scope-a', ['a', 1, 'não-uuid']), 'scope-a', schema))
    expect400(() => decodeKeysetCursor('a'.repeat(3000), 'scope-a', schema))
  })
})
