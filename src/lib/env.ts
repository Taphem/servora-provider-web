/**
 * Single place the app reads environment variables from, instead of
 * scattering `process.env.X` through components. Every value here has a
 * safe default so the app runs against real, already-deployed backends
 * with zero local configuration.
 *
 * Only NEXT_PUBLIC_-prefixed variables belong here — anything without that
 * prefix is server-only and must never be read from a Client Component.
 * See `.env.example` for the full documented list.
 */
export const env = {
  /**
   * The public Servora API Gateway origin. The browser talks ONLY to this —
   * never to servora-provider, servora-services, or any other downstream
   * service directly (see servora-api-gateway's proxy contract).
   */
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://api.servora.hemandu.com",

  /**
   * The primary Servora site origin. This app never implements its own
   * login — "sign in" links point back here, to the one real auth surface.
   */
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://servora.hemandu.com",

  /**
   * Path this app is mounted under in production (https://servora.hemandu.com/provider).
   * Used for building absolute links back into this app (e.g. from an email
   * or the main site) — Next.js's basePath already handles internal
   * `next/link` navigation on its own, this is only for the cases where a
   * full external URL is needed.
   */
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
} as const;
