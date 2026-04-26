export const COLOR_THEME_STORAGE_KEY = 'sgp.colorTheme'

export type ColorThemeId = 'argos-dark' | 'slate-dark' | 'light-executive'

export const DEFAULT_COLOR_THEME: ColorThemeId = 'argos-dark'

export const COLOR_THEME_IDS: ColorThemeId[] = [
  'argos-dark',
  'slate-dark',
  'light-executive',
]

export const COLOR_THEME_LABELS: Record<ColorThemeId, string> = {
  'argos-dark': 'Argos Dark',
  'slate-dark': 'Slate Dark',
  'light-executive': 'Light Executive',
}

export function isColorThemeId(v: string | null | undefined): v is ColorThemeId {
  return (
    v === 'argos-dark' || v === 'slate-dark' || v === 'light-executive'
  )
}

export function readStoredColorTheme(): ColorThemeId {
  if (typeof window === 'undefined') return DEFAULT_COLOR_THEME
  try {
    const raw = window.localStorage.getItem(COLOR_THEME_STORAGE_KEY)
    return isColorThemeId(raw) ? raw : DEFAULT_COLOR_THEME
  } catch {
    return DEFAULT_COLOR_THEME
  }
}

export function applyColorThemeToDocument(themeId: ColorThemeId): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', themeId)
}
