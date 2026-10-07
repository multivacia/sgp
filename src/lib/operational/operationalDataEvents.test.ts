// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  notifyOperationalDataChanged,
  subscribeOperationalDataChanged,
} from './operationalDataEvents'

describe('operationalDataEvents', () => {
  it('entrega o motivo ao inscrito e para após cancelar', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeOperationalDataChanged(listener)
    notifyOperationalDataChanged('time_entry_created')
    expect(listener).toHaveBeenCalledWith({ reason: 'time_entry_created' })
    unsubscribe()
    notifyOperationalDataChanged('extra_time_entry_created')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
