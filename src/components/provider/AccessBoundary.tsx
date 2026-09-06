"use client";

import { useState, type ReactNode } from "react";
import { LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { becomeProvider } from "@/lib/auth/api";
import { ApiError } from "@/lib/api/client";
import { isProviderRole } from "@/types/domain";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

interface AccessBoundaryProps {
  children: ReactNode;
}

/**
 * Every /provider/* page needs the same three checks before it can show
 * anything real: is the visitor signed in, and does their account carry
 * the BUSINESS_OWNER role servora-provider requires for self-service?
 * A verified CUSTOMER can transition their own account through Auth's
 * session-bound endpoint, then refresh this context without changing the
 * opaque-cookie authentication model.
 */
export function AccessBoundary({ children }: AccessBoundaryProps) {
  const { user, status, refresh } = useAuth();
  const [transitionPending, setTransitionPending] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  async function handleBecomeProvider() {
    setTransitionError(null);
    setTransitionPending(true);
    try {
      await becomeProvider();
      await refresh();
    } catch (err) {
      setTransitionError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setTransitionPending(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size={28} className="text-ink-400" />
      </div>
    );
  }

  if (status === "unauthenticated" || !user) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <LogIn size={22} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-h4 text-ink-900">Sign in to continue</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              The provider dashboard uses your existing Servora account — there&apos;s no separate
              login here. Sign in on the main site, then come back to this page.
            </p>
          </div>
          <Button href={env.siteUrl} variant="primary">
            Go to Servora to sign in
          </Button>
          <p className="text-xs text-text-muted">
            Running locally? A session from servora-web won&apos;t carry over across different ports
            in development — this only works seamlessly once both apps share one production domain.
          </p>
        </Card>
      </div>
    );
  }

  if (!isProviderRole(user.role)) {
    const canBecomeProvider = user.role === "CUSTOMER" && user.emailVerified;

    return (
      <div className="mx-auto max-w-lg py-16">
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-100 text-warning-500">
            <ShieldAlert size={22} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-h4 text-ink-900">
              {canBecomeProvider ? "Become a provider" : "Provider access unavailable"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Your account (<strong>{user.email}</strong>) is signed in as{" "}
              <strong>{formatRole(user.role)}</strong>. {canBecomeProvider
                ? "Create your provider account to set up your business profile, services, and availability."
                : user.role === "CUSTOMER"
                  ? "Verify your email on the main Servora site before becoming a provider."
                  : "Servora's provider dashboard is available to business owner accounts."}
            </p>
          </div>
          {canBecomeProvider ? (
            <Button variant="primary" loading={transitionPending} onClick={() => void handleBecomeProvider()}>
              Become a provider
            </Button>
          ) : null}
          {transitionError ? (
            <p role="alert" className="text-sm text-error">
              {transitionError}
            </p>
          ) : null}
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}
