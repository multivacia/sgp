import { describe, expect, it } from 'vitest'
import {
  resolveCanSaveConveyorChanges,
  resolveConveyorEditSubmitPlan,
  shouldValidateStructureOnSubmit,
} from './conveyorEditSavePolicy'

describe('conveyorEditSavePolicy', () => {
  describe('resolveCanSaveConveyorChanges', () => {
    it('habilita salvar quando só há alterações em Dados principais, mesmo com estruturaOk=false', () => {
      expect(
        resolveCanSaveConveyorChanges({
          hasDadosChanges: true,
          hasStructureChanges: false,
          estruturaOk: false,
        }),
      ).toBe(true)
    })

    it('bloqueia salvar quando só há alteração de estrutura e estruturaOk=false', () => {
      expect(
        resolveCanSaveConveyorChanges({
          hasDadosChanges: false,
          hasStructureChanges: true,
          estruturaOk: false,
        }),
      ).toBe(false)
    })

    it('bloqueia salvar quando não há alterações', () => {
      expect(
        resolveCanSaveConveyorChanges({
          hasDadosChanges: false,
          hasStructureChanges: false,
          estruturaOk: true,
        }),
      ).toBe(false)
    })

    it('habilita salvar estrutura em qualquer status quando estruturaOk=true', () => {
      expect(
        resolveCanSaveConveyorChanges({
          hasDadosChanges: false,
          hasStructureChanges: true,
          estruturaOk: true,
        }),
      ).toBe(true)
    })
  })

  describe('shouldValidateStructureOnSubmit', () => {
    it('não valida estrutura no edit quando não há alteração estrutural', () => {
      expect(
        shouldValidateStructureOnSubmit({ mode: 'edit', hasStructureChanges: false }),
      ).toBe(false)
    })

    it('valida estrutura no edit quando há alteração estrutural', () => {
      expect(
        shouldValidateStructureOnSubmit({ mode: 'edit', hasStructureChanges: true }),
      ).toBe(true)
    })

    it('sempre valida estrutura na criação', () => {
      expect(
        shouldValidateStructureOnSubmit({ mode: 'create', hasStructureChanges: false }),
      ).toBe(true)
    })
  })

  describe('resolveConveyorEditSubmitPlan', () => {
    it('com só Dados principais chama apenas PATCH /conveyors/:id', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'edit',
          hasDadosChanges: true,
          hasStructureChanges: false,
        }),
      ).toEqual({ patchDados: true, patchStructure: false })
    })

    it('não chama PATCH structure quando usuário alterou apenas Dados principais', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'edit',
          hasDadosChanges: true,
          hasStructureChanges: false,
        }),
      ).toEqual({ patchDados: true, patchStructure: false })
    })

    it('chama PATCH structure em qualquer status quando há alteração estrutural (diff incremental)', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'edit',
          hasDadosChanges: true,
          hasStructureChanges: true,
        }),
      ).toEqual({ patchDados: true, patchStructure: true })
    })

    it('modo create nunca chama PATCH', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'create',
          hasDadosChanges: true,
          hasStructureChanges: true,
        }),
      ).toEqual({ patchDados: false, patchStructure: false })
    })
  })
})
