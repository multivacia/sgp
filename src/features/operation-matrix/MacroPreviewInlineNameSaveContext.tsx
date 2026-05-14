import { createContext, useContext, useEffect, type ReactNode } from 'react'
import type { InlineNameSaveHandler, InlineNameSaveRegistry } from './macroPreviewInlineNameSave'

const MacroPreviewInlineNameSaveContext = createContext<InlineNameSaveRegistry | null>(null)

export function MacroPreviewInlineNameSaveProvider({
  registry,
  children,
}: {
  registry: InlineNameSaveRegistry
  children: ReactNode
}) {
  return (
    <MacroPreviewInlineNameSaveContext.Provider value={registry}>
      {children}
    </MacroPreviewInlineNameSaveContext.Provider>
  )
}

export function useRegisterInlineNameSaveHandler(
  handler: InlineNameSaveHandler | null,
) {
  const registry = useContext(MacroPreviewInlineNameSaveContext)

  useEffect(() => {
    if (!registry || !handler) return
    return registry.register(handler)
  }, [handler, registry])
}
