import { createContext } from 'react'
import type { ColorThemeId } from './theme-constants'

export type ColorThemeContextValue = {
  themeId: ColorThemeId
  setThemeId: (id: ColorThemeId) => void
}

export const ColorThemeContext = createContext<ColorThemeContextValue | null>(
  null,
)
