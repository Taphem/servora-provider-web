"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, Compass } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapLocationUpdate {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  postalCode?: string;
}

interface GoogleMapProps {
  center: LatLng;
  zoom?: number;
  markerTitle?: string;
  onLocationClick?: (location: MapLocationUpdate) => void;
  className?: string;
}

export function GoogleMap({
  center,
  zoom = 13,
  markerTitle = "Selected service location",
  onLocationClick,
  className,
}: GoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerInstanceRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const markerTitleRef = useRef(markerTitle);
  const onLocationClickRef = useRef(onLocationClick);

  useEffect(() => {
    onLocationClickRef.current = onLocationClick;
    markerTitleRef.current = markerTitle;
  }, [onLocationClick, markerTitle]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize Map
  useEffect(() => {
    let active = true;

    async function initMap() {
      setLoading(true);
      setLoadError(null);

      const g = await loadGoogleMaps();
      if (!active) return;

      if (!g || !mapContainerRef.current) {
        setLoading(false);
        setLoadError("Interactive Google Map is unavailable (API key not configured or offline).");
        return;
      }

      try {
        const mapsLib = (await g.maps.importLibrary("maps")) as google.maps.MapsLibrary;
        const markerLib = (await g.maps.importLibrary("marker")) as google.maps.MarkerLibrary;

        if (!active || !mapContainerRef.current) return;

        const map = new mapsLib.Map(mapContainerRef.current, {
          center: initialCenterRef.current,
          zoom: initialZoomRef.current,
          mapId: env.googleMapsMapId || "servora_provider_map",
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });
        mapInstanceRef.current = map;

        // Initialize AdvancedMarkerElement
        if (markerLib?.AdvancedMarkerElement) {
          const marker = new markerLib.AdvancedMarkerElement({
            map,
            position: initialCenterRef.current,
            title: markerTitleRef.current,
          });
          markerInstanceRef.current = marker;
        }

        // Listen for map click to reposition marker and reverse geocode
        map.addListener("click", async (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          // Reposition marker
          if (markerInstanceRef.current) {
            markerInstanceRef.current.position = { lat, lng };
          }

          // Reverse geocode clicked location
          let formattedAddress: string | undefined;
          let countryCode = "US";
          let region = "";
          let city = "";
          let postalCode = "";

          try {
            const geocodingLib = (await g.maps.importLibrary("geocoding")) as google.maps.GeocodingLibrary;
            if (geocodingLib?.Geocoder) {
              const geocoder = new geocodingLib.Geocoder();
              const response = await geocoder.geocode({ location: { lat, lng } });
              if (response?.results?.[0]) {
                const res = response.results[0];
                formattedAddress = res.formatted_address;
                for (const comp of res.address_components || []) {
                  const types: string[] = comp.types || [];
                  if (types.includes("country")) countryCode = comp.short_name;
                  else if (types.includes("administrative_area_level_1")) region = comp.long_name;
                  else if (types.includes("locality") || types.includes("sublocality")) {
                    if (!city) city = comp.long_name;
                  } else if (types.includes("postal_code")) postalCode = comp.short_name;
                }
              }
            }
          } catch (err) {
            console.warn("Reverse geocode failed:", err);
          }

          onLocationClickRef.current?.({
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            formattedAddress,
            countryCode,
            region,
            city: city || "Selected area",
            postalCode,
          });
        });

        setLoading(false);
      } catch (err) {
        console.error("Error creating Google Map:", err);
        if (active) {
          setLoading(false);
          setLoadError("Couldn't initialize Google Map.");
        }
      }
    }

    void initMap();

    return () => {
      active = false;
      mapInstanceRef.current = null;
      markerInstanceRef.current = null;
    };
  }, []);

  // Update map center and marker when center prop changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.panTo(center);

    if (markerInstanceRef.current) {
      markerInstanceRef.current.position = center;
    }
  }, [center]);

  return (
    <div
      className={cn(
        "relative flex min-h-[380px] w-full flex-col overflow-hidden rounded-xl border border-border-default bg-surface-raised shadow-xs",
        className,
      )}
    >
      {/* Map DOM container */}
      <div ref={mapContainerRef} className="h-full min-h-[380px] w-full flex-1" />

      {/* Loading overlay */}
      {loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-sunken/80 backdrop-blur-xs">
          <Loader2 size={28} className="animate-spin text-brand-600" />
          <p className="text-sm font-medium text-ink-700">Loading interactive map…</p>
        </div>
      ) : null}

      {/* Offline / No API key Fallback state */}
      {loadError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-surface-sunken">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Compass size={24} aria-hidden />
          </span>
          <p className="text-sm font-semibold text-ink-900">Map Preview</p>
          <p className="mt-1 max-w-xs text-xs text-text-muted">
            {loadError} You can still search for places or confirm coordinates below.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-border-default bg-surface-raised px-3.5 py-1.5 text-xs text-ink-700">
            <MapPin size={14} className="text-brand-600" />
            <span>
              {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
