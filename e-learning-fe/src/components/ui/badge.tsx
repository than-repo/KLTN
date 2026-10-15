import type { HTMLAttributes } from "react";

type BadgeVariant = "neutral" | "action" | "dark";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "border border-border bg-surface-pearl text-ink-muted",
  action: "border border-primary/20 bg-primary/10 text-primary",
  dark: "border border-white/10 bg-white/10 text-white",
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
