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

export function logout(): Promise<void> {
  return apiRequest<void>("/api/v1/auth/logout", { method: "POST" });
}
