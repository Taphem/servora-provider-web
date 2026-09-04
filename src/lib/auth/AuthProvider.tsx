"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getSession, logout as apiLogout } from "@/lib/auth/api";
import type { UserRole } from "@/types/domain";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  /** Re-checks the session against GET /api/v1/auth/session. */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    try {
      const session = await getSession();
      if (session.authenticated) {
        setUserState({
          userId: session.userId,
          email: session.email,
          role: session.role,
          emailVerified: session.emailVerified,
          phoneVerified: session.phoneVerified,
        });
        setStatus("authenticated");
      } else {
        setUserState(null);
        setStatus("unauthenticated");
      }
    } catch {
      // A failed session check (network, gateway down) isn't a confirmed
      // logout, but the UI has nothing better to show than "signed out" —
      // it must never be treated as "logged in".
      setUserState(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUserState(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(() => ({ user, status, refresh, signOut }), [user, status, refresh, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
