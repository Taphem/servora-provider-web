"use client";

import { useEffect, useRef, useState, useId } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { cn } from "@/lib/utils";

export interface SelectedPlace {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  region: string;
  city: string;
  postalCode: string;
  placeId?: string;
}

interface PlaceAutocompleteProps {
  onSelectPlace: (place: SelectedPlace) => void;
  disabled?: boolean;
  placeholder?: string;
}

interface SuggestionItem {
  id: string;
  primaryText: string;
  secondaryText: string;
  raw: unknown;
}

interface PlacePredictionLike {
  placeId?: string;
  id?: string;
  mainText?: { text?: string };
  secondaryText?: { text?: string };
  text?: { text?: string };
  toPlace?: () => {
    fetchFields: (opts: { fields: string[] }) => Promise<void>;
    displayName?: string;
    formattedAddress?: string;
    location?: { lat: () => number; lng: () => number };
    addressComponents?: Array<{
      types?: string[];
      shortText?: string;
      longText?: string;
      short_name?: string;
      long_name?: string;
    }>;
    id?: string;
  };
}

export function PlaceAutocomplete({
  onSelectPlace,
  disabled = false,
  placeholder = "Search your city, area, or address…",
}: PlaceAutocompleteProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Google Maps and session token
  useEffect(() => {
    let active = true;
    async function init() {
      const g = await loadGoogleMaps();
      if (!active || !g) return;

      try {
        const placesLib = (await g.maps.importLibrary("places")) as google.maps.PlacesLibrary;
        if (placesLib?.AutocompleteSessionToken) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
        setMapsLoaded(true);
      } catch (err) {
        console.warn("Could not import Google Places library:", err);
      }
    }

    void init();
    return () => {
      active = false;
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    let active = true;
    const timeoutId = setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed || trimmed.length < 2 || !mapsLoaded) {
        if (active) {
          setSuggestions([]);
          setIsOpen(false);
        }
        return;
      }

      setLoading(true);
      try {
        const g = window.google;
        if (!g?.maps?.places) return;

        const placesLib = (await g.maps.importLibrary("places")) as unknown as {
          AutocompleteSuggestion?: {
            fetchAutocompleteSuggestions: (req: {
              input: string;
              sessionToken: google.maps.places.AutocompleteSessionToken | null;
            }) => Promise<{ suggestions?: Array<{ placePrediction?: PlacePredictionLike }> }>;
          };
        };

        // Modern Places API: AutocompleteSuggestion.fetchAutocompleteSuggestions
        if (placesLib.AutocompleteSuggestion?.fetchAutocompleteSuggestions) {
          const request = {
            input: trimmed,
            sessionToken: sessionTokenRef.current,
          };
          const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
          if (!active) return;

          const items: SuggestionItem[] = (response.suggestions || []).map((s, index: number) => {
            const pred = s.placePrediction;
            return {
              id: pred?.placeId || pred?.id || String(index),
              primaryText: pred?.mainText?.text || pred?.text?.text || trimmed,
              secondaryText: pred?.secondaryText?.text || "",
              raw: s,
            };
          });

          setSuggestions(items);
          setIsOpen(items.length > 0);
        } else if (g.maps.places.AutocompleteService) {
          // Fallback to legacy service if modern class unavailable
          const service = new g.maps.places.AutocompleteService();
          service.getPlacePredictions(
            { input: trimmed, sessionToken: sessionTokenRef.current ?? undefined },
            (preds, status) => {
              if (!active) return;
              if (status === g.maps.places.PlacesServiceStatus.OK && preds) {
                const items: SuggestionItem[] = preds.map((p) => ({
                  id: p.place_id,
                  primaryText: p.structured_formatting.main_text,
                  secondaryText: p.structured_formatting.secondary_text || "",
                  raw: p,
                }));
                setSuggestions(items);
                setIsOpen(items.length > 0);
              } else {
                setSuggestions([]);
                setIsOpen(false);
              }
            },
          );
        }
      } catch (err) {
        console.error("Error fetching place suggestions:", err);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [query, mapsLoaded]);

  async function handleSelect(item: SuggestionItem) {
    setIsOpen(false);
    setQuery(item.primaryText);
    setLoading(true);

    try {
      const g = window.google;
      let placeData: SelectedPlace | null = null;

      const rawPrediction = (item.raw as { placePrediction?: PlacePredictionLike })?.placePrediction;

      // 1. Try modern Place.fetchFields
      if (rawPrediction?.toPlace) {
        const place = rawPrediction.toPlace();
        await place.fetchFields({
          fields: ["displayName", "formattedAddress", "location", "addressComponents", "id"],
        });

        const lat = place.location?.lat();
        const lng = place.location?.lng();
        if (typeof lat === "number" && typeof lng === "number") {
          placeData = parsePlaceComponents({
            formattedAddress: place.formattedAddress || place.displayName || item.primaryText,
            lat,
            lng,
            components: place.addressComponents || [],
            placeId: place.id,
          });
        }
      }

      // 2. If not modern, try Geocoder
      if (!placeData && g?.maps?.Geocoder) {
        const geocoder = new g.maps.Geocoder();
        const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
          geocoder.geocode({ placeId: item.id }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results?.[0]) resolve(results[0]);
            else resolve(null);
          });
        });

        if (result?.geometry?.location) {
          placeData = parsePlaceComponents({
            formattedAddress: result.formatted_address || item.primaryText,
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
            components: result.address_components || [],
            placeId: item.id,
          });
        }
      }

      if (placeData) {
        onSelectPlace(placeData);
      }

      // Refresh session token for subsequent searches per Google billing requirements
      if (g?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
      }
    } catch (err) {
      console.error("Error resolving place details:", err);
    } finally {
      setLoading(false);
    }
  }

  // Fallback for manual submit when Google Maps is not available
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    onSelectPlace({
      formattedAddress: trimmed,
      latitude: 12.9716, // Default fallback
      longitude: 77.5946,
      countryCode: "IN",
      region: "",
      city: trimmed.split(",")[0].trim(),
      postalCode: "",
    });
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">
        Search location or service area
      </label>
      <form onSubmit={handleManualSubmit} className="relative flex items-center">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-400">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} aria-hidden />}
        </div>
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim().length < 2) {
              setSuggestions([]);
              setIsOpen(false);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full rounded-lg border border-border-default bg-surface-raised py-2.5 pl-9 pr-8 text-sm text-ink-900 shadow-xs transition-colors",
            "placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
            disabled && "cursor-not-allowed opacity-60",
          )}
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-600"
            aria-label="Clear search"
          >
            <X size={15} aria-hidden />
          </button>
        ) : null}
      </form>

      {/* Autocomplete Predictions dropdown */}
      {isOpen && suggestions.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-(--z-dropdown) mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border-default bg-surface-raised py-1 shadow-lg"
        >
          {suggestions.map((item) => (
            <li
              key={item.id}
              role="option"
              aria-selected={false}
              onClick={() => void handleSelect(item)}
              className="flex cursor-pointer items-start gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-ink-50"
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden />
              <div className="flex flex-col text-left">
                <span className="font-medium text-ink-900">{item.primaryText}</span>
                {item.secondaryText ? (
                  <span className="text-xs text-text-muted">{item.secondaryText}</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function parsePlaceComponents({
  formattedAddress,
  lat,
  lng,
  components,
  placeId,
}: {
  formattedAddress: string;
  lat: number;
  lng: number;
  components: Array<{
    types?: string[];
    shortText?: string;
    longText?: string;
    short_name?: string;
    long_name?: string;
  }>;
  placeId?: string;
}): SelectedPlace {
  let countryCode = "US";
  let region = "";
  let city = "";
  let postalCode = "";

  for (const comp of components) {
    const types: string[] = comp.types || [];
    const shortName: string = comp.shortText || comp.short_name || "";
    const longName: string = comp.longText || comp.long_name || "";

    if (types.includes("country")) {
      countryCode = shortName.toUpperCase().slice(0, 2);
    } else if (types.includes("administrative_area_level_1")) {
      region = longName;
    } else if (
      types.includes("locality") ||
      types.includes("sublocality") ||
      types.includes("sublocality_level_1") ||
      types.includes("postal_town")
    ) {
      if (!city) city = longName;
    } else if (types.includes("administrative_area_level_2") && !city) {
      city = longName;
    } else if (types.includes("postal_code")) {
      postalCode = shortName;
    }
  }

  if (!city) {
    city = formattedAddress.split(",")[0].trim() || "Area";
  }

  return {
    formattedAddress,
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    countryCode: countryCode.length === 2 ? countryCode : "US",
    region: region.slice(0, 150),
    city: city.slice(0, 150),
    postalCode: postalCode.slice(0, 20),
    placeId,
  };
}
