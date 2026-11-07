"use client";

import Link from "next/link";
import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import {
  canUseNextImage,
  formatCourseDuration,
  formatCoursePrice,
  getCourseImageSource,
} from "@/features/courses/utils/course-data";
import { useWishlist } from "@/features/wishlist/hooks/use-wishlist";
import { WishlistToggleButton } from "@/features/wishlist/components/wishlist-toggle-button";
import type { PublicCourse } from "@/features/courses/types/course";
import type { WishlistItem } from "@/features/wishlist/types/wishlist";

const wishlistLevelLabels: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCE: "Advanced",
  ALL_LEVELS: "All levels",
};

type WishlistCourseCardProps = {
  course: PublicCourse;
  wishlistItem?: WishlistItem;
};

export function WishlistCourseCard({
  course,
  wishlistItem,
}: WishlistCourseCardProps) {
  const { loading, removeFromWishlist } = useWishlist();

  async function handleRemove() {
    await removeFromWishlist(course.id);
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-muted">
        {canUseNextImage(getCourseImageSource(course)) ? (
          <Image
            alt={course.title}
            className="object-cover h-full w-full"
            fill
            sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
            src={getCourseImageSource(course)}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={course.title}
            className="h-full w-full object-cover"
            loading="lazy"
            src={getCourseImageSource(course)}
          />
        )}
        <WishlistToggleButton
          course={course}
          size="sm"
          className="absolute top-2 right-2 z-10"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge>{wishlistLevelLabels[course.level ?? "ALL_LEVELS"]}</Badge>
          {course.certificateEnabled ? (
            <Badge variant="action">Certificate</Badge>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Link
            className="text-foreground transition-colors hover:text-primary"
            href={`/courses/${course.slug}`}
          >
            <h2 className="text-lg font-semibold leading-snug line-clamp-2">
              {course.title}
            </h2>
          </Link>
          {wishlistItem ? (
            <span className="text-xs text-muted-foreground">
              Saved{" "}
              <time dateTime={wishlistItem.createdAt}>
                {new Date(wishlistItem.createdAt).toLocaleDateString(
                  undefined,
                  {
                    month: "short",
                    day: "numeric",
                  },
                )}
              </time>
            </span>
          ) : null}
        </div>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {course.shortDescription}
        </p>

        <div className="mt-auto pt-4 border-t border-border grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <span>Duration</span>
            <span className="text-foreground">
              {formatCourseDuration(course.durationInMinutes)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Price</span>
            <span className="font-semibold text-foreground">
              {formatCoursePrice(course.price)}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleRemove}
          className="mt-4 w-full rounded-md border border-danger bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-wait disabled:opacity-60"
        >
          Remove from wishlist
        </button>
      </div>
    </article>
  );
}
