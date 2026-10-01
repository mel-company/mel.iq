/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_KEY: string;
  /** DNS/TLS provisioning gate — off until next version; set `"true"` to enable. */
  readonly VITE_FEATURE_DASHBOARD_READY?: string;
  readonly VITE_FEATURE_SOCIAL_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

