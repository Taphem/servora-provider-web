import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { env } from "@/lib/env";

let configured = false;

export function configureGoogleMaps(): boolean {
  if (typeof window === "undefined") return false;
  if (!env.googleMapsApiKey) return false;

  if (!configured) {
    setOptions({
      key: env.googleMapsApiKey,
      v: "weekly",
    });
    configured = true;
  }
  return true;
}

export async function loadGoogleMaps(): Promise<typeof google | null> {
  if (!configureGoogleMaps()) return null;

  try {
    await importLibrary("maps");
    return window.google ?? null;
  } catch (err) {
    console.error("Failed to load Google Maps JavaScript API:", err);
    return null;
  }
}
