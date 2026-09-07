"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import { getMyProvider } from "@/lib/api/provider";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Provider } from "@/types/domain";

export type ProviderQueryStatus = "loading" | "not-onboarded" | "ready" | "error";

export interface ProviderContextValue {
  provider: Provider | null;
  status: ProviderQueryStatus;
  error: ApiError | null;
  refetch: () => Promise<void>;
  setProvider: (provider: Provider | null) => void;
  updateLocalProvider: (patch: Partial<Provider>) => void;
}

export const ProviderContext = createContext<ProviderContextValue | null>(null);

export function useProviderProfile(): ProviderContextValue {
  const ctx = useContext(ProviderContext);
  if (!ctx) {
    throw new Error("useProviderProfile must be used within ProviderProfileProvider");
  }
  return ctx;
}

export function ProviderProfileProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuth();
  const [provider, setProviderState] = useState<Provider | null>(null);
  const [status, setStatus] = useState<ProviderQueryStatus>("loading");
  const [error, setError] = useState<ApiError | null>(null);

  const refetch = useCallback(async () => {
    if (authStatus !== "authenticated") {
      setProviderState(null);
      setStatus(authStatus === "loading" ? "loading" : "not-onboarded");
      setError(null);
      return;
    }

    setStatus("loading");
    setError(null);
    try {
      const result = await getMyProvider();
      setProviderState(result);
      setStatus("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setProviderState(null);
        setStatus("not-onboarded");
        return;
      }
      setProviderState(null);
      setError(err instanceof ApiError ? err : null);
      setStatus("error");
    }
  }, [authStatus]);

  useEffect(() => {
    queueMicrotask(() => void refetch());
  }, [refetch]);

  const setProvider = useCallback((next: Provider | null) => {
    setProviderState(next);
    if (next) {
      setStatus("ready");
    }
  }, []);

  const updateLocalProvider = useCallback((patch: Partial<Provider>) => {
    setProviderState((prev) => {
      if (!prev) return null;
      return { ...prev, ...patch };
    });
  }, []);

  const value = useMemo(
    () => ({
      provider,
      status,
      error,
      refetch,
      setProvider,
      updateLocalProvider,
    }),
    [provider, status, error, refetch, setProvider, updateLocalProvider],
  );

  return <ProviderContext.Provider value={value}>{children}</ProviderContext.Provider>;
}
