"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CourseImage } from "@/features/courses/components/course-image";
import type { PublicCourse } from "@/features/courses/types/course";
import {
  formatCourseDuration,
  formatCoursePrice,
} from "@/features/courses/utils/course-data";
import { ApiError } from "@/lib/api/client";

import {
  enrollInCourse,
  getCourseEnrollmentStatus,
} from "../api/enrollment-api";

type PaymentCheckoutProps = {
  course: PublicCourse;
};

export function PaymentCheckout({ course }: PaymentCheckoutProps) {
  return (
    <RoleProtectedRoute allowedRoles={["LEARNER"]} fallbackHref="/courses">
      <PaymentCheckoutContent course={course} />
    </RoleProtectedRoute>
  );
}

function PaymentCheckoutContent({ course }: PaymentCheckoutProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isFree = !course.price || course.price <= 0;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isMounted = true;

    getCourseEnrollmentStatus(course.id, accessToken)
      .then((result) => {
        if (isMounted && result.enrolled) {
          router.replace(`/courses/${course.slug}?enrolled=existing`);
        }
      })
      .catch((statusError) => {
        if (!isMounted) {
          return;
        }

        if (statusError instanceof ApiError && statusError.statusCode === 401) {
          router.replace(
            `/login?next=${encodeURIComponent(`/courses/${course.slug}/payment`)}`,
          );
          return;
        }

        setError("Unable to check your enrollment status.");
      })
      .finally(() => {
        if (isMounted) {
          setIsChecking(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, course.id, course.slug, router]);

  async function handlePayment() {
    if (!accessToken) {
      router.replace(
        `/login?next=${encodeURIComponent(`/courses/${course.slug}/payment`)}`,
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await enrollInCourse(course.id, accessToken);
      router.replace(`/courses/${course.slug}?enrolled=success`);
    } catch (paymentError) {
      if (paymentError instanceof ApiError && paymentError.statusCode === 401) {
        router.replace(
          `/login?next=${encodeURIComponent(`/courses/${course.slug}/payment`)}`,
        );
        return;
      }

      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Payment could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Simulated secure payment
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">
          Confirm your enrollment
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Review the course and confirm the mock payment. This flow behaves like
          a successful checkout without contacting an external provider.
        </p>

        <section className="mt-6 rounded-lg border border-border p-4">
          <h2 className="text-lg font-semibold">Payment method</h2>
          <div className="mt-4 rounded-md border border-primary bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">
                  {isFree ? "Free enrollment" : "VN_PAY"}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {isFree
                    ? "No payment is required for this course."
                    : "A simulated VN_PAY payment will be completed immediately."}
                </p>
              </div>
              <span className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground">
                Selected
              </span>
            </div>
          </div>
        </section>

        {error ? (
          <p className="mt-5 rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isChecking || isSubmitting}
          onClick={handlePayment}
          type="button"
        >
          {isSubmitting
            ? "Processing..."
            : isFree
              ? "Enroll for free"
              : "Pay and enroll"}
        </button>
      </div>

      <aside className="rounded-lg border border-border bg-card p-5 shadow-sm lg:sticky lg:top-20">
        <CourseImage course={course} />
        <h2 className="mt-4 text-xl font-semibold leading-tight">
          {course.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {course.shortDescription}
        </p>
        <div className="mt-5 grid gap-3 border-y border-border py-4">
          <PaymentRow
            label="Duration"
            value={formatCourseDuration(course.durationInMinutes)}
          />
          <PaymentRow label="Currency" value="VND" />
          <PaymentRow label="Provider" value="Mock gateway" />
          <PaymentRow label="Method" value={isFree ? "FREE" : "VN_PAY"} />
        </div>
        <div className="mt-5 flex items-end justify-between gap-4">
          <span className="text-sm font-semibold text-muted-foreground">
            Total
          </span>
          <span className="text-3xl font-semibold">
            {formatCoursePrice(course.price)}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Enrollment is created only after this confirmation succeeds.
        </p>
      </aside>
    </section>
  );
}

function PaymentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[220px] text-right font-semibold">{value}</span>
    </div>
  );
}
