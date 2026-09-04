"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getMyProvider } from "@/lib/api/provider";
import type { Provider } from "@/types/domain";

export type ProviderQueryStatus = "loading" | "not-onboarded" | "ready" | "error";

interface UseProviderResult {
  provider: Provider | null;
  status: ProviderQueryStatus;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches the authenticated user's own provider record (GET /providers/me).
 * A 404 from that endpoint is not a failure — it's the normal, expected
 * shape of "this BUSINESS_OWNER hasn't started onboarding yet" — so it's
 * surfaced as its own "not-onboarded" status rather than "error".
 */
export function useProvider(enabled: boolean): UseProviderResult {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [status, setStatus] = useState<ProviderQueryStatus>("loading");
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled) return;
    setStatus("loading");
    setError(null);
    try {
      const result = await getMyProvider();
      setProvider(result);
      setStatus("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setProvider(null);
        setStatus("not-onboarded");
        return;
      }
      setProvider(null);
      setError(err instanceof ApiError ? err : null);
      setStatus("error");
    }
  }, [enabled]);

  useEffect(() => {
    queueMicrotask(() => void refetch());
  }, [refetch]);

  return { provider, status, error, refetch };
}
