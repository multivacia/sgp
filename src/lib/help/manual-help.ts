import type { ColorThemeId } from '../theme/theme-constants'
import {
  MANUAL_PUBLIC_DIR,
  PRACTICAL_GUIDE_FILES,
  type PracticalGuideId,
} from './manual-paths'

/**
 * Release `tati-kiosk` (main): subconjunto de `src/lib/help/manual-help.ts` da `develop`
 * restrito aos Guias Práticos (sem ajuda contextual nem Manual do Usuário integrado).
 */

export type ManualTheme = 'claro' | 'escuro'

/** Os guias só têm dois temas: Light Executive é claro; os demais são escuros. */
export function manualThemeFor(themeId: ColorThemeId): ManualTheme {
  return themeId === 'light-executive' ? 'claro' : 'escuro'
}

export type PracticalGuide = {
  id: PracticalGuideId
  label: string
  /** Quando presente, o guia só aparece para quem tem uma dessas permissões. */
  anyOfPermissions?: readonly string[]
}

/** Guias Práticos oferecidos no menu "? Ajuda", na ordem de exibição. */
export const PRACTICAL_GUIDES: readonly PracticalGuide[] = [
  { id: 'colaborador', label: 'Guia prático do colaborador' },
  {
    id: 'gestor',
    label: 'Guia prático do gestor',
    // Mesmas permissões das telas de gestão descritas no guia (perfil COLABORADOR não tem nenhuma).
    anyOfPermissions: [
      'conveyors.create',
      'conveyors.edit_status',
      'conveyors.manage_assignments',
      'collaborators_admin.view',
      'teams.view',
    ],
  },
]

/** Guias visíveis para o usuário atual (RBAC efetivo). */
export function visiblePracticalGuides(
  canAny: (permissionCodes: string[]) => boolean,
): PracticalGuide[] {
  return PRACTICAL_GUIDES.filter(
    (g) => !g.anyOfPermissions || canAny([...g.anyOfPermissions]),
  )
}

/**
 * URL de um Guia Prático aberto a partir do SGP+ (mesma aba, mesmo domínio).
 * Só leva o tema e o modo integrado; nunca dados de sessão ou de usuário.
 */
export function buildGuideUrl(options: {
  guide: PracticalGuideId
  theme: ManualTheme
}): string {
  const file = PRACTICAL_GUIDE_FILES[options.guide]
  const query = new URLSearchParams({ integrado: '1', tema: options.theme }).toString()
  return `${MANUAL_PUBLIC_DIR}/${file}?${query}`
}
