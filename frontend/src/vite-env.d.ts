/// <reference types="vite/client" />
/// <reference types="leaflet.markercluster" />
interface ImportMetaEnv {
  /** Optional "report a problem" URL; `{id}` is replaced with the court id. */
  readonly VITE_REPORT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
