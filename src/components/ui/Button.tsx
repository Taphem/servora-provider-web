import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/Spinner";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost" | "destructive" | "inverse";
type ButtonSize = "sm" | "md" | "lg";

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  /** Shows a spinner in place of the icon and blocks interaction, without changing the button's label. */
  loading?: boolean;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps & {
  href: string;
};

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-primary text-text-inverse hover:bg-primary-hover shadow-sm hover:shadow-md",
  secondary:
    "bg-surface-raised text-ink-900 border border-border-strong hover:border-ink-900 hover:bg-ink-50",
  tertiary: "bg-primary-soft text-text-brand hover:bg-brand-100",
  ghost: "text-ink-700 hover:bg-ink-50",
  destructive: "bg-error text-white hover:bg-danger-600 shadow-sm hover:shadow-md",
  inverse: "bg-surface-raised text-ink-900 hover:bg-brand-50 shadow-sm",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-[0.95rem] gap-2",
  lg: "h-[3.25rem] px-7 text-base gap-2.5",
};

const spinnerSize: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 17 };

const baseStyles =
  "inline-flex items-center justify-center rounded-full font-medium transition-all duration-[var(--duration-base)] ease-[var(--ease-out-premium)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    icon,
    iconPosition = "right",
    loading = false,
    className,
    children,
    ...rest
  } = props;

  const classes = cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
  const leadingIcon = loading ? <Spinner size={spinnerSize[size]} /> : icon;

  const content = (
    <>
      {leadingIcon && iconPosition === "left" ? leadingIcon : null}
      {children}
      {leadingIcon && iconPosition === "right" ? leadingIcon : null}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes} aria-disabled={loading || undefined}>
        {content}
      </Link>
    );
  }

  const { disabled, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonRest}
    >
      {content}
    </button>
  );
}
