import { useState, useCallback } from 'react'
import type {
  ProductionCollaboratorSummary,
  ProductionWorkQueueItem,
} from '../../domain/production/production.types'
import {
  logoutProduction,
  getProductionWorkQueue,
} from '../../services/production/productionApiService'
import { KioskCollaboratorGrid } from './KioskCollaboratorGrid'
import { KioskPinPad } from './KioskPinPad'
import { KioskChangePin } from './KioskChangePin'
import { KioskActivityCards } from './KioskActivityCards'

type KioskScreen =
  | { view: 'grid' }
  | { view: 'pin'; collaborator: ProductionCollaboratorSummary }
  | { view: 'change-pin'; collaborator: ProductionCollaboratorSummary }
  | {
      view: 'activities'
      collaborator: ProductionCollaboratorSummary
      items: ProductionWorkQueueItem[]
    }

export function KioskPage() {
  const [screen, setScreen] = useState<KioskScreen>({ view: 'grid' })

  const handleCollaboratorSelect = useCallback(
    (collaborator: ProductionCollaboratorSummary) => {
      setScreen({ view: 'pin', collaborator })
    },
    [],
  )

  const handlePinSuccess = useCallback(
    async (collaborator: ProductionCollaboratorSummary) => {
      try {
        const queue = await getProductionWorkQueue()
        setScreen({ view: 'activities', collaborator, items: queue.items })
      } catch {
        setScreen({ view: 'activities', collaborator, items: [] })
      }
    },
    [],
  )

  const handleExit = useCallback(async () => {
    try {
      await logoutProduction()
    } catch {
      // ignora falha de logout — volta para o grid de qualquer forma
    }
    setScreen({ view: 'grid' })
  }, [])

  const handleMustChangePin = useCallback(
    (collaborator: ProductionCollaboratorSummary) => {
      setScreen({ view: 'change-pin', collaborator })
    },
    [],
  )

  const handlePinBack = useCallback(() => {
    setScreen({ view: 'grid' })
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-sgp-void select-none touch-manipulation">
      {screen.view === 'grid' && (
        <KioskCollaboratorGrid onSelect={handleCollaboratorSelect} />
      )}

      {screen.view === 'pin' && (
        <KioskPinPad
          collaborator={screen.collaborator}
          onSuccess={() => void handlePinSuccess(screen.collaborator)}
          onMustChangePin={() => handleMustChangePin(screen.collaborator)}
          onBack={handlePinBack}
        />
      )}

      {screen.view === 'change-pin' && (
        <KioskChangePin
          collaborator={screen.collaborator}
          onSuccess={() => void handlePinSuccess(screen.collaborator)}
          onBack={handlePinBack}
        />
      )}

      {screen.view === 'activities' && (
        <KioskActivityCards
          collaborator={screen.collaborator}
          initialItems={screen.items}
          onExit={() => void handleExit()}
        />
      )}
    </div>
  )
}
