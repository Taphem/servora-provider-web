import { apiRequest } from "@/lib/api/client";
import type { UserRole } from "@/types/domain";

/** GET /api/v1/auth/session — always 200, this is the discriminant. Contract verified against servora-auth's actual session.ts route. */
export type SessionResponse =
  | { authenticated: false }
  | {
      authenticated: true;
      userId: string;
      email: string;
      role: UserRole;
      emailVerified: boolean;
      phoneVerified: boolean;
    };

export function getSession(): Promise<SessionResponse> {
  return apiRequest<SessionResponse>("/api/v1/auth/session");
}

/**
 * POST /api/v1/auth/become-provider. The Auth service resolves both the
 * account and target role from the opaque session; this body must remain
 * exactly `{}`. In particular, do not add a role or user id here.
 */
export function becomeProvider(): Promise<void> {
  return apiRequest<void>("/api/v1/auth/become-provider", { method: "POST", body: {} });
}

export function logout(): Promise<void> {
  return apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
}
