import Link from "next/link";
import type { ComponentProps } from "react";

type ButtonLinkVariant = "primary" | "secondary" | "ghost" | "ghostOnDark";
type ButtonLinkSize = "sm" | "md";

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
  className?: string;
};

const variantClasses: Record<ButtonLinkVariant, string> = {
  primary: "border border-primary bg-primary text-primary-foreground",
  secondary: "border border-primary bg-transparent text-primary",
  ghost: "text-primary",
  ghostOnDark: "text-primary-on-dark",
};

const sizeClasses: Record<ButtonLinkSize, string> = {
  sm: "min-h-9 px-4 text-sm",
  md: "min-h-11 px-6 text-base",
};

export function ButtonLink({
  children,
  className = "",
  size = "md",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={[
        "inline-flex items-center justify-center rounded-pill font-normal transition-transform active:scale-95",
        sizeClasses[size],
        variantClasses[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </Link>
  );
}
