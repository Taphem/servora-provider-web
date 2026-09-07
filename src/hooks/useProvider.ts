import { useCallback, useContext, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getMyProvider } from "@/lib/api/provider";
import { ProviderContext } from "@/lib/providers/ProviderContext";
import type { Provider } from "@/types/domain";

export type ProviderQueryStatus = "loading" | "not-onboarded" | "ready" | "error";

export interface UseProviderResult {
  provider: Provider | null;
  status: ProviderQueryStatus;
  error: ApiError | null;
  refetch: () => Promise<void>;
  updateLocalProvider?: (patch: Partial<Provider>) => void;
  setProvider?: (provider: Provider | null) => void;
}

/**
 * Fetches the authenticated user's own provider record (GET /providers/me).
 * Consumes ProviderContext when rendered inside ProviderProfileProvider,
 * or runs standalone if rendered outside (such as in isolated unit tests).
 */
export function useProvider(enabled: boolean): UseProviderResult {
  const context = useContext(ProviderContext);

  const [localProvider, setLocalProvider] = useState<Provider | null>(null);
  const [localStatus, setLocalStatus] = useState<ProviderQueryStatus>("loading");
  const [localError, setLocalError] = useState<ApiError | null>(null);

  const standaloneRefetch = useCallback(async () => {
    if (!enabled) return;
    setLocalStatus("loading");
    setLocalError(null);
    try {
      const result = await getMyProvider();
      setLocalProvider(result);
      setLocalStatus("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setLocalProvider(null);
        setLocalStatus("not-onboarded");
        return;
      }
      setLocalProvider(null);
      setLocalError(err instanceof ApiError ? err : null);
      setLocalStatus("error");
    }
  }, [enabled]);

  useEffect(() => {
    if (!context && enabled) {
      queueMicrotask(() => void standaloneRefetch());
    }
  }, [context, enabled, standaloneRefetch]);

  if (context) {
    return {
      provider: context.provider,
      status: context.status,
      error: context.error,
      refetch: context.refetch,
      updateLocalProvider: context.updateLocalProvider,
      setProvider: context.setProvider,
    };
  }

  return {
    provider: localProvider,
    status: localStatus,
    error: localError,
    refetch: standaloneRefetch,
  };
}
