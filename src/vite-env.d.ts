/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SUPPORT_TICKETS_ENABLED?: string
  readonly VITE_APP_ENV?: string
  readonly VITE_APP_VERSION?: string
  readonly VITE_APP_RELEASE_NAME?: string
  readonly VITE_GIT_SHA?: string
  readonly VITE_BUILD_TIME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __SGP_APP_BASE_METADATA__: {
  readonly product: string
  readonly version: string
  readonly releaseName: string
}

declare global {
  interface GlobalThis {
    __SGP_APP_BASE_METADATA__?: {
      product: string
      version: string
      releaseName: string
    }
  }
}
