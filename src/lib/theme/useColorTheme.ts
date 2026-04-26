import { useContext } from 'react'
import { ColorThemeContext } from './theme-context'

export function useColorTheme() {
  const ctx = useContext(ColorThemeContext)
  if (!ctx) {
    throw new Error('useColorTheme must be used within ColorThemeProvider')
  }
  return ctx
}
