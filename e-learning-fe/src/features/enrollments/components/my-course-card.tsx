import Image from "next/image";
import Link from "next/link";

import { canUseNextImage } from "@/features/courses/utils/course-data";

import type { Enrollment, EnrollmentCourseSummary } from "../types/enrollment";

type MyCourseCardProps = {
  enrollment: Enrollment;
};

export function MyCourseCard({ enrollment }: MyCourseCardProps) {
  const course = enrollment.course;

  if (!course) {
    return null;
  }

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <EnrollmentCourseImage course={course} />

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {formatEnrollmentStatus(enrollment.status)}
          </span>
          {enrollment.payment ? (
            <span className="rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">
              {enrollment.payment.status}
            </span>
          ) : null}
        </div>

        <h2 className="mt-4 text-lg font-semibold leading-snug">
          {course.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {course.shortDescription}
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold">
              {Math.round(enrollment.progressPercentage)}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-md bg-muted">
            <div
              className="h-full rounded-md bg-primary"
              style={{
                width: `${Math.min(Math.max(enrollment.progressPercentage, 0), 100)}%`,
              }}
            />
          </div>
        </div>

        <dl className="mt-5 grid gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <CardRow
            label="Enrolled"
            value={formatDate(enrollment.enrolledAt ?? enrollment.createdAt)}
          />
          <CardRow label="Level" value={course.level} />
        </dl>

        <div className="mt-auto pt-5">
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
            href={`/courses/${course.slug}/learn`}
          >
            Continue learning
          </Link>
        </div>
      </div>
    </article>
  );
}

function EnrollmentCourseImage({ course }: { course: EnrollmentCourseSummary }) {
  const imageSource = getEnrollmentCourseImageSource(course);

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md bg-muted">
      {canUseNextImage(imageSource) ? (
        <Image
          alt={course.title}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 100vw"
          src={imageSource}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={course.title}
          className="h-full w-full object-cover"
          loading="lazy"
          src={imageSource}
        />
      )}
    </div>
  );
}

function getEnrollmentCourseImageSource(course: EnrollmentCourseSummary) {
  if (course.thumbnailUrl) {
    return course.thumbnailUrl;
  }

  const searchableText = `${course.title} ${course.shortDescription}`.toLowerCase();

  if (
    searchableText.includes("nestjs") ||
    searchableText.includes("backend") ||
    searchableText.includes("api")
  ) {
    return "/images/nestjs.png";
  }

  if (
    searchableText.includes("nextjs") ||
    searchableText.includes("frontend") ||
    searchableText.includes("react")
  ) {
    return "/images/nextjs.png";
  }

  return "/images/AI.png";
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}

function formatEnrollmentStatus(status: Enrollment["status"]) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
