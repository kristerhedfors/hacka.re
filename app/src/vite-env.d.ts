/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
  readonly VITE_OPENAI_API_BASE?: string;
  readonly VITE_OPENAI_API_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
