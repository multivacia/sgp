import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyColorThemeToDocument,
  COLOR_THEME_STORAGE_KEY,
  readStoredColorTheme,
  type ColorThemeId,
} from './theme-constants'
import { ColorThemeContext } from './theme-context'

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ColorThemeId>(() =>
    readStoredColorTheme(),
  )

  useEffect(() => {
    applyColorThemeToDocument(themeId)
  }, [themeId])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, themeId)
    } catch {
      /* quota / private mode */
    }
  }, [themeId])

  const setThemeId = useCallback((id: ColorThemeId) => {
    setThemeIdState(id)
    applyColorThemeToDocument(id)
  }, [])

  const value = useMemo(
    () => ({ themeId, setThemeId }),
    [themeId, setThemeId],
  )

  return (
    <ColorThemeContext.Provider value={value}>
      {children}
    </ColorThemeContext.Provider>
  )
}
