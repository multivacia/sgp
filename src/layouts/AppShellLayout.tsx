import { useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AppSidebar } from '../components/AppSidebar'
import { FunctionSwitchConfirmDialog } from '../components/shell/FunctionSwitchConfirmDialog'
import { FineGridOverlay } from '../components/shell/FineGridOverlay'
import { ShellNavigationFlash } from '../components/shell/ShellNavigationFlash'
import { SgpErrorShellBanner } from '../lib/errors/SgpErrorPresentation'
import { ShellFunctionProvider } from '../lib/shell/shell-function-context'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sgp.shell.sidebarCollapsed'

function readSidebarCollapsedPreference(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function AppShellLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsedPreference)
  const mainScrollRef = useRef<HTMLElement>(null)

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        sidebarCollapsed ? '1' : '0',
      )
    } catch {
      /* ignore quota / private mode */
    }
  }, [sidebarCollapsed])

  return (
    <div className="relative flex h-dvh max-h-dvh min-h-0 overflow-hidden bg-sgp-void text-slate-200">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0"
          style={{ background: 'var(--semantic-shell-bg-layers)' }}
        />
        <FineGridOverlay />
      </div>
      <ShellFunctionProvider
        mainScrollRef={mainScrollRef}
        confirmDialog={({ open, target, onConfirm, onCancel }) => (
          <FunctionSwitchConfirmDialog
            open={open}
            target={target}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        )}
      >
        <AppSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <AppHeader onMenuClick={() => setSidebarOpen(true)} />
          <ShellNavigationFlash />
          <main
            ref={mainScrollRef}
            className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
          >
            <div className="mx-auto w-full max-w-[min(1440px,100%)]">
              <SgpErrorShellBanner />
              <Outlet />
            </div>
          </main>
        </div>
      </ShellFunctionProvider>
    </div>
  )
}
