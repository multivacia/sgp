import { describe, expect, it } from 'vitest'
import { buildVisibleFactoryIntakeItems } from './buildVisibleFactoryIntakeItems'

type Intake = { conveyorOperationalPlanItemId: string; label: string }

function intake(id: string, label: string): Intake {
  return { conveyorOperationalPlanItemId: id, label }
}

describe('buildVisibleFactoryIntakeItems', () => {
  const items = [intake('cop-1', 'A'), intake('cop-2', 'B'), intake('cop-3', 'C')]

  it('oculta item já presente no rascunho', () => {
    expect(
      buildVisibleFactoryIntakeItems(items, [{ conveyorOperationalPlanItemId: 'cop-2' }]),
    ).toEqual([intake('cop-1', 'A'), intake('cop-3', 'C')])
  })

  it('rascunho vazio mantém todos', () => {
    expect(buildVisibleFactoryIntakeItems(items, [])).toEqual(items)
  })

  it('ignora rascunho sem vínculo ao plano da esteira', () => {
    expect(buildVisibleFactoryIntakeItems(items, [{ conveyorOperationalPlanItemId: null }])).toEqual(
      items,
    )
  })

  it('não muta os arrays de entrada', () => {
    const itemsCopy = [...items]
    const draftCopy = [{ conveyorOperationalPlanItemId: 'cop-1' }]
    buildVisibleFactoryIntakeItems(itemsCopy, draftCopy)
    expect(itemsCopy).toEqual(items)
    expect(draftCopy).toEqual([{ conveyorOperationalPlanItemId: 'cop-1' }])
  })
})
