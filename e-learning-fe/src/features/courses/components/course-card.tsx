import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import type { PublicCourse } from "../types/course";
import {
  formatCourseDuration,
  formatCourseLevel,
  formatCoursePrice,
} from "../utils/course-data";
import { CourseImage } from "./course-image";

type CourseCardProps = {
  course: PublicCourse;
};

export function CourseCard({ course }: CourseCardProps) {
  const visibleCategories = course.categories?.slice(0, 2) ?? [];
  const remainingCategoryCount =
    (course.categories?.length ?? 0) - visibleCategories.length;
  const primaryInstructor = course.instructors?.[0]?.fullName;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <CourseImage course={course} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{formatCourseLevel(course.level)}</Badge>
          {course.certificateEnabled ? (
            <Badge variant="action">Certificate</Badge>
          ) : null}
        </div>

        <h2 className="mt-4 text-lg font-semibold leading-snug">
          <Link
            className="transition-colors hover:text-primary"
            href={`/courses/${course.slug}`}
          >
            {course.title}
          </Link>
        </h2>

        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {course.shortDescription}
        </p>

        {visibleCategories.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleCategories.map((category) => (
              <span
                className="rounded-md bg-muted px-2.5 py-1 text-xs text-ink-muted"
                key={category.id}
              >
                {category.name}
              </span>
            ))}
            {remainingCategoryCount > 0 ? (
              <span className="rounded-md bg-muted px-2.5 py-1 text-xs text-ink-muted">
                +{remainingCategoryCount}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 grid gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
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
          {primaryInstructor ? (
            <div className="flex items-center justify-between gap-3">
              <span>Instructor</span>
              <span className="text-right text-foreground">
                {primaryInstructor}
              </span>
            </div>
          ) : null}
        </div>

        <Link
          className="mt-auto pt-5 text-sm font-semibold text-primary transition-colors hover:text-primary-focus"
          href={`/courses/${course.slug}`}
        >
          View course details
        </Link>
      </div>
    </article>
  );
}
