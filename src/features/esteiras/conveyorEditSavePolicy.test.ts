import { describe, expect, it } from 'vitest'
import {
  canReplaceConveyorStructure,
  requiresEditReason,
  resolveCanSaveConveyorChanges,
  resolveConveyorEditSubmitPlan,
  shouldPromptEditReason,
  shouldValidateStructureOnSubmit,
  validateConveyorEditReason,
  withSharedEditReason,
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

  describe('requiresEditReason / modal gate', () => {
    it('não exige motivo em create', () => {
      expect(requiresEditReason({ mode: 'create', status: 'EM_ANDAMENTO' })).toBe(false)
    })

    it('não exige motivo em EM_ELABORACAO (backlog)', () => {
      expect(requiresEditReason({ mode: 'edit', status: 'EM_ELABORACAO' })).toBe(false)
    })

    it('não exige motivo com status null', () => {
      expect(requiresEditReason({ mode: 'edit', status: null })).toBe(false)
    })

    it('exige motivo fora do backlog', () => {
      expect(requiresEditReason({ mode: 'edit', status: 'AGUARDANDO_PLANEJAMENTO' })).toBe(
        true,
      )
      expect(requiresEditReason({ mode: 'edit', status: 'EM_PLANEJAMENTO' })).toBe(true)
      expect(requiresEditReason({ mode: 'edit', status: 'A_INICIAR' })).toBe(true)
      expect(requiresEditReason({ mode: 'edit', status: 'EM_ANDAMENTO' })).toBe(true)
      expect(requiresEditReason({ mode: 'edit', status: 'FINALIZADA' })).toBe(true)
      expect(requiresEditReason({ mode: 'edit', status: 'CANCELADA' })).toBe(true)
    })

    it('modal só abre com alteração real', () => {
      expect(
        shouldPromptEditReason({
          mode: 'edit',
          status: 'EM_ANDAMENTO',
          patchDados: false,
          patchStructure: false,
        }),
      ).toBe(false)
      expect(
        shouldPromptEditReason({
          mode: 'edit',
          status: 'EM_ANDAMENTO',
          patchDados: true,
          patchStructure: false,
        }),
      ).toBe(true)
      expect(
        shouldPromptEditReason({
          mode: 'edit',
          status: 'EM_ELABORACAO',
          patchDados: true,
          patchStructure: true,
        }),
      ).toBe(false)
    })

    it('valida motivo 3..500', () => {
      expect(validateConveyorEditReason('ab')).toBe(
        'Motivo deve ter entre 3 e 500 caracteres.',
      )
      expect(validateConveyorEditReason('   ')).toBe(
        'Motivo deve ter entre 3 e 500 caracteres.',
      )
      expect(validateConveyorEditReason('ok.')).toBeNull()
      expect(validateConveyorEditReason('x'.repeat(501))).toBe(
        'Motivo deve ter entre 3 e 500 caracteres.',
      )
    })

    it('mesmo reason nos dois patches quando ambos dirty', () => {
      const reason = 'Ajuste solicitado pelo gestor de esteira'
      const dados = withSharedEditReason({ nome: 'Novo' }, reason)
      const structure = withSharedEditReason({ originType: 'MANUAL' as const }, reason)
      expect(dados.reason).toBe(reason)
      expect(structure.reason).toBe(reason)
      expect(dados.reason).toBe(structure.reason)
    })

    it('cancel/sucesso: withSharedEditReason sem texto não anexa reason', () => {
      expect(withSharedEditReason({ nome: 'A' }, undefined).reason).toBeUndefined()
      expect(withSharedEditReason({ nome: 'A' }, '').reason).toBeUndefined()
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
    it('canReplaceConveyorStructure liberada em EM_ANDAMENTO e FINALIZADA', () => {
      expect(canReplaceConveyorStructure('EM_ANDAMENTO')).toBe(true)
      expect(canReplaceConveyorStructure('FINALIZADA')).toBe(true)
    })
  })
})
