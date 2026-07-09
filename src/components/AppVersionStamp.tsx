import { useEffect, useMemo, useState } from 'react'
import {
  buildVersionIdentityLabel,
  getAppEnvironmentLabel,
} from '../lib/api/env'
import {
  buildVersionStampTitle,
  fetchApiVersionMetadata,
  getFrontendVersionIdentity,
  isApiVersionMismatch,
  type ApiVersionMetadata,
} from '../lib/api/version'

type Props = {
  placement?: 'header' | 'footer'
  className?: string
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function AppVersionStamp({
  placement = 'footer',
  className,
}: Props) {
  const frontend = useMemo(() => getFrontendVersionIdentity(), [])
  const [apiVersion, setApiVersion] = useState<ApiVersionMetadata | null>(null)

  useEffect(() => {
    let mounted = true
    void fetchApiVersionMetadata().then((data) => {
      if (mounted) setApiVersion(data)
    })
    return () => {
      mounted = false
    }
  }, [])

  const mismatch = isApiVersionMismatch(frontend, apiVersion)
  const label = buildVersionIdentityLabel(frontend)
  const mismatchLabel = apiVersion
    ? `API v${apiVersion.version} · ${getAppEnvironmentLabel(apiVersion.environment)}`
    : null

  return (
    <div
      data-sgp-version-stamp=""
      data-sgp-version-placement={placement}
      title={buildVersionStampTitle(frontend, apiVersion)}
      className={joinClassNames(
        'inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium',
        className,
      )}
    >
      <span className="truncate">{label}</span>
      {mismatch && mismatchLabel ? (
        <span
          data-sgp-version-alert=""
          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
        >
          {mismatchLabel}
        </span>
      ) : null}
    </div>
  )
}
