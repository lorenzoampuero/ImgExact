/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Optional build-time override for the production origin (deploy without editing code). */
  readonly PUBLIC_SITE_URL?: string;
}
