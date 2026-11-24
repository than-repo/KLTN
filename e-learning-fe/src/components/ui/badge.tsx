import type { HTMLAttributes } from "react";

type BadgeVariant = "neutral" | "action" | "dark" | "danger";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border border-border bg-surface-pearl text-ink-muted",
  action: "border border-primary/20 bg-primary/10 text-primary",
  dark: "border border-white/10 bg-white/10 text-white",
  danger: "border border-danger/20 bg-danger/10 text-danger",
};

export function Badge({
  children,
  className = "",
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-pill px-3 py-1 text-sm font-normal",
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </span>
  );
}
