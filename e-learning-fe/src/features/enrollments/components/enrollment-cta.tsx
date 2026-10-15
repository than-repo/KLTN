"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import type { PublicCourse } from "@/features/courses/types/course";
import { formatCoursePrice } from "@/features/courses/utils/course-data";
import { ApiError } from "@/lib/api/client";

import { getCourseEnrollmentStatus } from "../api/enrollment-api";
import type { EnrollmentStatusResult } from "../types/enrollment";

type EnrollmentCtaProps = {
  course: PublicCourse;
};

export function EnrollmentCta({ course }: EnrollmentCtaProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, status, user } = useAuth();
  const [enrollmentStatus, setEnrollmentStatus] =
    useState<EnrollmentStatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const paymentHref = `/courses/${course.slug}/payment`;
  const loginHref = `/login?next=${encodeURIComponent(paymentHref)}`;
  const shouldCheckEnrollment =
    status === "authenticated" && Boolean(accessToken) && user?.role === "LEARNER";
  const isChecking = shouldCheckEnrollment && !enrollmentStatus && !error;

  useEffect(() => {
    if (!shouldCheckEnrollment || !accessToken) {
      return;
    }

    let isMounted = true;

    getCourseEnrollmentStatus(course.id, accessToken)
      .then((result) => {
        if (isMounted) {
          setEnrollmentStatus(result);
        }
      })
      .catch((statusError) => {
        if (!isMounted) {
          return;
        }

        if (statusError instanceof ApiError && statusError.statusCode === 401) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        setError("Unable to check enrollment status.");
      })
      .finally(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [accessToken, course.id, pathname, router, shouldCheckEnrollment]);

  if (status === "loading" || isChecking) {
    return (
      <CtaShell
        course={course}
        eyebrow="Enrollment"
        message="Checking your enrollment..."
      />
    );
  }

  if (status === "guest") {
    return (
      <CtaShell
        course={course}
        eyebrow="Start learning"
        message="Sign in to enroll in this course."
      >
        <Link className={primaryButtonClasses} href={loginHref}>
          Enroll now
        </Link>
      </CtaShell>
    );
  }

  if (user?.role !== "LEARNER") {
    return (
      <CtaShell
        course={course}
        eyebrow="Unavailable"
        message="Only learner accounts can enroll in courses."
      />
    );
  }

  if (enrollmentStatus?.enrolled) {
    return (
      <CtaShell
        course={course}
        eyebrow="Enrolled"
        message="You are enrolled in this course."
      >
        <Link
          className={secondaryButtonClasses}
          href={`/courses/${course.slug}/learn`}
        >
          Continue learning
        </Link>
      </CtaShell>
    );
  }

  return (
    <CtaShell
      course={course}
      eyebrow="Enrollment"
      message={
        error ??
        "Continue to a simulated checkout. Your enrollment is created after payment succeeds."
      }
    >
      <Link className={primaryButtonClasses} href={paymentHref}>
        {course.price && course.price > 0 ? "Go to payment" : "Enroll for free"}
      </Link>
    </CtaShell>
  );
}

const primaryButtonClasses =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus";
const secondaryButtonClasses =
  "inline-flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-background px-6 text-base font-semibold text-foreground transition-colors hover:border-primary hover:text-primary";

function CtaShell({
  children,
  course,
  eyebrow,
  message,
}: {
  children?: React.ReactNode;
  course: PublicCourse;
  eyebrow: string;
  message: string;
}) {
  return (
    <section className="mt-5 border-t border-border pt-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        {eyebrow}
      </p>
      <p className="mt-2 text-3xl font-semibold">
        {formatCoursePrice(course.price)}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
