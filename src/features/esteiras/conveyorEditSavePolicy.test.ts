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

    it('bloqueia salvar de estrutura em produção mesmo com estruturaOk=true', () => {
      expect(
        resolveCanSaveConveyorChanges({
          hasDadosChanges: false,
          hasStructureChanges: true,
          estruturaOk: true,
          canReplaceStructure: false,
        }),
      ).toBe(false)
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
          canReplaceStructure: false,
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

    it('não chama PATCH structure em produção mesmo com hasStructureChanges=true', () => {
      expect(
        resolveConveyorEditSubmitPlan({
          mode: 'edit',
          hasDadosChanges: true,
          hasStructureChanges: true,
          canReplaceStructure: false,
        }),
      ).toEqual({ patchDados: true, patchStructure: false })
    })

    it('chama ambos quando há alterações e substituição é permitida', () => {
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

  describe('canReplaceConveyorStructure', () => {
    it('permite substituição em EM_ELABORACAO e AGUARDANDO_PLANEJAMENTO', () => {
      expect(canReplaceConveyorStructure('EM_ELABORACAO')).toBe(true)
      expect(canReplaceConveyorStructure('AGUARDANDO_PLANEJAMENTO')).toBe(true)
    })

    it('bloqueia substituição em EM_ANDAMENTO', () => {
      expect(canReplaceConveyorStructure('EM_ANDAMENTO')).toBe(false)
    })
  })

  describe('inclusão tardia de item (append-only)', () => {
    // A checagem de status para "Incluir novo item" foi removida da regra de
    // negócio (agora liberada em qualquer status). Não há mais uma função
    // dedicada em `conveyorEditSavePolicy.ts` para isso — a exibição do botão
    // é controlada diretamente em `ConveyorCreateEditPage.tsx`
    // (`showLateAppendAction = mode === 'edit' && canAlterConveyor`).
    //
    // Este bloco reforça que a liberação da inclusão tardia em qualquer
    // status NÃO libera, por efeito colateral, a substituição completa da
    // estrutura via PATCH /structure (`canReplaceConveyorStructure`), que
    // continua restrita a EM_ELABORACAO/AGUARDANDO_PLANEJAMENTO.
    it('canReplaceConveyorStructure continua bloqueada em EM_ANDAMENTO', () => {
      expect(canReplaceConveyorStructure('EM_ANDAMENTO')).toBe(false)
    })

    it('canReplaceConveyorStructure continua bloqueada em FINALIZADA', () => {
      expect(canReplaceConveyorStructure('FINALIZADA')).toBe(false)
    })
  })
})
