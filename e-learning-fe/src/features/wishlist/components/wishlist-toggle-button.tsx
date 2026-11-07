"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import type { PublicCourse } from "@/features/courses/types/course";

type WishlistToggleButtonProps = {
  className?: string;
  course: PublicCourse;
  size?: "sm" | "md";
  showLabel?: boolean;
};

const filledHeartSvg = (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
      clipRule="evenodd"
    />
  </svg>
);

const outlineHeartSvg = (
  <svg
    aria-hidden="true"
    className="h-5 w-5"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
  </svg>
);

const sizeClasses: Record<"sm" | "md", string> = {
  sm: "size-8 min-h-[32px]",
  md: "size-10 min-h-[40px]",
};

export function WishlistToggleButton({
  className = "",
  course,
  size = "md",
  showLabel = false,
}: WishlistToggleButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuth();
  const { isWishlisted, loading, addToWishlist, removeFromWishlist } =
    useWishlist();

  const isLoggedIn = status === "authenticated" && Boolean(user);
  const wishlisted = isLoggedIn && isWishlisted(course.id);
  const isLoading = loading;

  const handleClick = useCallback(async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (wishlisted) {
      await removeFromWishlist(course.id);
    } else {
      await addToWishlist(course.id);
    }
  }, [
    addToWishlist,
    isLoggedIn,
    removeFromWishlist,
    router,
    wishlisted,
    course.id,
    pathname,
  ]);

  const variantClasses = wishlisted
    ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
    : "border-white/80 bg-white/95 text-slate-600 hover:bg-white hover:text-rose-500";

  return (
    <div
      className={[showLabel ? "block w-full" : "inline-flex", className].join(
        " ",
      )}
    >
      <span
        className={[
          "group relative",
          showLabel ? "block w-full" : "inline-flex",
        ].join(" ")}
      >
        <button
          type="button"
          aria-pressed={wishlisted}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          disabled={isLoading || status === "loading"}
          onClick={handleClick}
          className={[
            "inline-flex items-center justify-center gap-2 border shadow-sm transition-colors duration-200 active:scale-95 disabled:cursor-wait disabled:opacity-70",
            showLabel
              ? "min-h-11 w-full rounded-lg px-4 text-sm font-semibold"
              : ["rounded-full", sizeClasses[size]].join(" "),
            variantClasses,
          ].join(" ")}
        >
          {isLoading ? (
            <svg
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : wishlisted ? (
            filledHeartSvg
          ) : (
            outlineHeartSvg
          )}
          {showLabel ? (
            <span>{wishlisted ? "Saved to wishlist" : "Add to wishlist"}</span>
          ) : null}
        </button>
        {!isLoggedIn && size === "md" && (
          <span className="invisible absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-ink-muted opacity-0 shadow-md transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            Sign in to save
          </span>
        )}
      </span>
    </div>
  );
}
