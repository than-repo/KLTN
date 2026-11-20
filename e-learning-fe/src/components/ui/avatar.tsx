import Image from "next/image";

type AvatarProps = {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

type AvatarSize = NonNullable<AvatarProps["size"]>;

const sizeClasses: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
};

const borderSizeClasses: Record<AvatarSize, string> = {
  sm: "border-2",
  md: "border-2",
  lg: "border-3",
  xl: "border-4",
};

export function Avatar({
  src,
  alt = "User avatar",
  fallback = "U",
  size = "md",
  className = "",
}: AvatarProps) {
  const initial = fallback.trim().charAt(0).toUpperCase() || "U";
  const resolvedSize: AvatarSize = size ?? "md";

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <Image
          alt={alt}
          className={`rounded-full border bg-muted object-cover ${sizeClasses[resolvedSize]} ${borderSizeClasses[resolvedSize]}`}
          fill
          sizes={resolvedSize === "sm" ? "32px" : resolvedSize === "md" ? "40px" : resolvedSize === "lg" ? "48px" : "64px"}
          src={src}
          style={{ width: "100%", height: "100%" }}
          unoptimized
        />
      ) : (
        <div
          aria-label={alt}
          className={`grid place-items-center rounded-full border bg-primary text-primary-foreground font-semibold ${sizeClasses[resolvedSize]} ${borderSizeClasses[resolvedSize]}`}
          role="img"
        >
          {initial}
        </div>
      )}
    </div>
  );
}