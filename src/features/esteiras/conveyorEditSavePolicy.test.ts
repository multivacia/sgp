import { describe, expect, it } from 'vitest'
import {
  canReplaceConveyorStructure,
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
          canReplaceStructure: false,
        }),
      ).toBe(true)
    })

    it('bloqueia salvar quando só há alteração de estrutura e estruturaOk=false', () => {
      expect(
        resolveCanSaveConveyorChanges({
          hasDadosChanges: false,
          hasStructureChanges: true,
          estruturaOk: false,
          canReplaceStructure: true,
        }),
      ).toBe(false)
    })

    it('bloqueia salvar quando não há alterações', () => {
      expect(
        resolveCanSaveConveyorChanges({
          hasDadosChanges: false,
          hasStructureChanges: false,
          estruturaOk: true,
          canReplaceStructure: true,
        }),
      ).toBe(false)
    })

    it('habilita salvar estrutura quando canReplaceStructure=true e estruturaOk=true', () => {
      expect(
        resolveCanSaveConveyorChanges({
          hasDadosChanges: false,
          hasStructureChanges: true,
          estruturaOk: true,
          canReplaceStructure: true,
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
    it('em EM_ANDAMENTO com só Dados principais chama apenas PATCH /conveyors/:id', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'edit',
          hasDadosChanges: true,
          hasStructureChanges: false,
          canReplaceStructure: true,
        }),
      ).toEqual({ patchDados: true, patchStructure: false })
    })

    it('não chama PATCH structure quando usuário alterou apenas Dados principais', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'edit',
          hasDadosChanges: true,
          hasStructureChanges: false,
          canReplaceStructure: true,
        }),
      ).toEqual({ patchDados: true, patchStructure: false })
    })

    it('chama PATCH structure em EM_ANDAMENTO quando há alteração estrutural', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'edit',
          hasDadosChanges: true,
          hasStructureChanges: true,
          canReplaceStructure: true,
        }),
      ).toEqual({ patchDados: true, patchStructure: true })
    })

    it('chama ambos quando há alterações e sync incremental é permitido', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'edit',
          hasDadosChanges: true,
          hasStructureChanges: true,
          canReplaceStructure: true,
        }),
      ).toEqual({ patchDados: true, patchStructure: true })
    })
  })

  describe('canReplaceConveyorStructure (sync incremental)', () => {
    it('permite edição estrutural em EM_ELABORACAO e AGUARDANDO_PLANEJAMENTO', () => {
      expect(canReplaceConveyorStructure('EM_ELABORACAO')).toBe(true)
      expect(canReplaceConveyorStructure('AGUARDANDO_PLANEJAMENTO')).toBe(true)
    })

    it('permite edição estrutural em EM_ANDAMENTO', () => {
      expect(canReplaceConveyorStructure('EM_ANDAMENTO')).toBe(true)
    })

    it('permite edição estrutural em FINALIZADA e CANCELADA', () => {
      expect(canReplaceConveyorStructure('FINALIZADA')).toBe(true)
      expect(canReplaceConveyorStructure('CANCELADA')).toBe(true)
    })

    it('permite edição estrutural em A_INICIAR e EM_PLANEJAMENTO', () => {
      expect(canReplaceConveyorStructure('A_INICIAR')).toBe(true)
      expect(canReplaceConveyorStructure('EM_PLANEJAMENTO')).toBe(true)
    })
  })

  describe('inclusão tardia de item (append-only)', () => {
    // A checagem de status para "Incluir novo item" foi removida da regra de
    // negócio (agora liberada em qualquer status). Não há mais uma função
    // dedicada em `conveyorEditSavePolicy.ts` para isso — a exibição do botão
    // é controlada diretamente em `ConveyorCreateEditPage.tsx`
    // (`showLateAppendAction = mode === 'edit' && canAlterConveyor`).
    //
    // Sync incremental também libera PATCH /structure em qualquer status;
    // o botão de inclusão tardia permanece como atalho UX.
    it('canReplaceConveyorStructure liberada em EM_ANDAMENTO e FINALIZADA', () => {
      expect(canReplaceConveyorStructure('EM_ANDAMENTO')).toBe(true)
      expect(canReplaceConveyorStructure('FINALIZADA')).toBe(true)
    })
  })
})
