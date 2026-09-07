"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 30,
};

function getInitials(name?: string | null): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, alt = "", fallback, size = "sm", className }: AvatarProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const initials = getInitials(fallback);
  const iconSize = ICON_SIZES[size];

  const showImage = Boolean(src) && !loadFailed;

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-border-default bg-ink-100 font-medium text-ink-700",
        SIZE_CLASSES[size],
        className,
      )}
      title={fallback ?? alt}
    >
      {showImage ? (
        /* eslint-disable-next-line @next/next/no-img-element -- user avatar loaded from Cloudinary URL or local blob preview */
        <img
          src={src!}
          alt={alt}
          onError={() => setLoadFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : initials ? (
        <span>{initials}</span>
      ) : (
        <UserRound size={iconSize} className="text-ink-400" aria-hidden />
      )}
    </div>
  );
}
