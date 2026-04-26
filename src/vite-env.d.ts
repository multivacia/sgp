/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SUPPORT_TICKETS_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
