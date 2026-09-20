/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Optional build-time origin override for staging/preview builds. */
  readonly PUBLIC_SITE_URL?: string;
  /** Optional Google Search Console verification token (URL-prefix property). */
  readonly PUBLIC_GOOGLE_SITE_VERIFICATION?: string;
  /** Optional Bing Webmaster Tools verification token. */
  readonly PUBLIC_BING_SITE_VERIFICATION?: string;
}
