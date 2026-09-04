"use client";

import type { ReactNode } from "react";
import { LogIn, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
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
 * There is currently no way for a CUSTOMER to self-upgrade to
 * BUSINESS_OWNER anywhere in servora-auth (verified against that
 * service's source — no such endpoint exists), so that case is shown
 * honestly rather than papered over with a fake "become a provider" button.
 */
export function AccessBoundary({ children }: AccessBoundaryProps) {
  const { user, status } = useAuth();

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
    return (
      <div className="mx-auto max-w-lg py-16">
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-warning-100 text-warning-500">
            <ShieldAlert size={22} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-h4 text-ink-900">Provider access isn&apos;t self-serve yet</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Your account (<strong>{user.email}</strong>) is signed in as{" "}
              <strong>{formatRole(user.role)}</strong>. Servora&apos;s provider dashboard requires a
              provider (business owner) account, and there is currently no self-service way to switch
              an existing account into that role — this needs a future update to Servora&apos;s
              authentication service, which this dashboard doesn&apos;t modify.
            </p>
          </div>
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
