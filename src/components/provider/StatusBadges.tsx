import { Badge } from "@/components/ui/Badge";
import type { ProviderStatus, VerificationStatus } from "@/types/domain";

const statusTone: Record<ProviderStatus, "neutral" | "success" | "warning" | "danger"> = {
  PENDING_ONBOARDING: "neutral",
  ACTIVE: "success",
  PAUSED: "warning",
  DISABLED: "danger",
};

const statusLabel: Record<ProviderStatus, string> = {
  PENDING_ONBOARDING: "Pending onboarding",
  ACTIVE: "Active",
  PAUSED: "Paused",
  DISABLED: "Disabled",
};

export function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>;
}

const verificationTone: Record<VerificationStatus, "neutral" | "success" | "warning" | "danger"> = {
  UNVERIFIED: "neutral",
  PENDING_REVIEW: "warning",
  VERIFIED: "success",
  REJECTED: "danger",
};

const verificationLabel: Record<VerificationStatus, string> = {
  UNVERIFIED: "Not verified",
  PENDING_REVIEW: "Verification pending",
  VERIFIED: "Verified",
  REJECTED: "Verification rejected",
};

export function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  return <Badge tone={verificationTone[status]}>{verificationLabel[status]}</Badge>;
}
