/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
  readonly VITE_WS_URL: string | undefined;
  readonly PROD: boolean;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
