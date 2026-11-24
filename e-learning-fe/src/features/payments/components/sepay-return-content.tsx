"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import { getCourseEnrollmentStatus } from "@/features/enrollments/api/enrollment-api";

import { verifySepayReturn } from "../api/payment-api";
import type { SepayReturnResult } from "../types/payment";

type ReturnState =
  | { status: "loading" }
  | { queryString: string; result: SepayReturnResult; status: "verified" }
  | { message: string; queryString: string; status: "error" };

type EnrollmentAccessState = "idle" | "checking" | "ready" | "processing";

export function SepayReturnContent() {
  const searchParams = useSearchParams();
  const queryString = useMemo(() => searchParams.toString(), [searchParams]);
  const { accessToken, status: authStatus } = useAuth();
  const [returnState, setReturnState] = useState<ReturnState>({
    status: "loading",
  });
  const [accessState, setAccessState] = useState<EnrollmentAccessState>("idle");

  useEffect(() => {
    let isMounted = true;

    if (!queryString) {
      return;
    }

    verifySepayReturn(queryString)
      .then((result) => {
        if (isMounted) {
          setReturnState({ queryString, result, status: "verified" });
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setReturnState({
          message:
            error instanceof Error
              ? error.message
              : "Payment verification failed.",
          queryString,
          status: "error",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [queryString]);

  const isCurrentReturnState =
    returnState.status !== "loading" && returnState.queryString === queryString;
  const verifiedResult =
    isCurrentReturnState && returnState.status === "verified"
      ? returnState.result
      : null;
  const isPaidResult =
    verifiedResult?.status === "success" ||
    verifiedResult?.status === "already_paid";

  useEffect(() => {
    if (!isPaidResult || !verifiedResult) {
      return;
    }

    if (authStatus !== "authenticated" || !accessToken) {
      return;
    }

    let isMounted = true;
    let attempts = 0;
    let timeoutId: number | null = null;

    const pollEnrollment = async () => {
      attempts += 1;
      setAccessState("checking");

      try {
        const result = await getCourseEnrollmentStatus(
          verifiedResult.payment.courseId,
          accessToken,
        );

        if (!isMounted) {
          return;
        }

        if (result.enrolled) {
          setAccessState("ready");
          return;
        }
      } catch {
        if (!isMounted) {
          return;
        }
      }

      if (!isMounted) {
        return;
      }

      if (attempts >= 5) {
        setAccessState("processing");
        return;
      }

      timeoutId = window.setTimeout(pollEnrollment, 2000);
    };

    timeoutId = window.setTimeout(pollEnrollment, 0);

    return () => {
      isMounted = false;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [accessToken, authStatus, isPaidResult, verifiedResult]);

  if (!queryString) {
    return (
      <ReturnShell
        eyebrow="Verification error"
        title="Payment could not be verified"
      >
        <p className="leading-7 text-muted-foreground">
          SePay did not return payment information.
        </p>
        <ReturnActions>
          <ActionLink href="/courses">Back to courses</ActionLink>
        </ReturnActions>
      </ReturnShell>
    );
  }

  if (!isCurrentReturnState) {
    return (
      <ReturnShell eyebrow="SePay return" title="Verifying your payment...">
        <p className="leading-7 text-muted-foreground">
          Please keep this page open while we confirm the payment details.
        </p>
      </ReturnShell>
    );
  }

  if (returnState.status === "error") {
    return (
      <ReturnShell
        eyebrow="Verification error"
        title="Payment could not be verified"
      >
        <p className="leading-7 text-muted-foreground">{returnState.message}</p>
        <ReturnActions>
          <ActionLink href="/payments/sepay/return" variant="secondary">
            Retry
          </ActionLink>
          <ActionLink href="/courses">Back to courses</ActionLink>
        </ReturnActions>
      </ReturnShell>
    );
  }

  const result = returnState.result;

  if (
    result.status === "failed" ||
    result.status === "cancelled" ||
    result.status === "expired" ||
    result.status === "unknown"
  ) {
    return (
      <ReturnShell
        eyebrow="Payment not completed"
        title="SePay did not confirm payment"
      >
        <p className="leading-7 text-muted-foreground">
          No course access was granted. Return to checkout to try again. If a
          SePay order is still pending, cancel it there before creating a
          replacement.
        </p>
        <PaymentSummary result={result} />
        <ReturnActions>
          <ActionLink href={`/courses/${result.payment.courseId}/payment`}>
            Try again
          </ActionLink>
          <ActionLink
            href={`/courses/${result.payment.courseId}`}
            variant="secondary"
          >
            Back to course
          </ActionLink>
        </ReturnActions>
      </ReturnShell>
    );
  }

  if (result.status === "pending") {
    return (
      <ReturnShell eyebrow="Payment pending" title="Payment is being verified">
        <p className="leading-7 text-muted-foreground">
          Your payment is not confirmed yet. Course access is granted only after
          the backend verifies the transaction through SePay&apos;s IPN
          callback. If you did not complete payment, return to checkout and
          cancel the pending order before creating a replacement.
        </p>
        <p className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          Course: {result.payment.courseId}
        </p>
        <PaymentSummary result={result} />
        <ReturnActions>
          <ActionLink
            href={`/courses/${result.payment.courseId}/payment`}
            variant="secondary"
          >
            Back to checkout
          </ActionLink>
          <ActionLink href="/my-courses">Go to My Courses</ActionLink>
        </ReturnActions>
      </ReturnShell>
    );
  }

  if (result.status === "already_paid") {
    return (
      <ReturnShell
        eyebrow="Already paid"
        title={
          accessState === "ready"
            ? "You can continue learning now"
            : "Payment received, access is processing"
        }
      >
        <p className="leading-7 text-muted-foreground">
          This course was already purchased. Course access is granted after the
          backend receives and settles the SePay IPN callback.
        </p>
        <p className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          Course: {result.payment.courseId}
        </p>
        {accessState === "checking" ? (
          <p className="mt-3 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            Checking whether your course access is active...
          </p>
        ) : null}
        <PaymentSummary result={result} />
        <ReturnActions>
          {accessState === "ready" ? (
            <ActionLink href={`/courses/${result.payment.courseId}/learn`}>
              Continue learning
            </ActionLink>
          ) : (
            <ActionLink href="/my-courses">Go to My Courses</ActionLink>
          )}
          <ActionLink
            href={`/courses/${result.payment.courseId}`}
            variant="secondary"
          >
            View course
          </ActionLink>
        </ReturnActions>
      </ReturnShell>
    );
  }

  // Default success case
  return (
    <ReturnShell
      eyebrow="Payment received"
      title={
        accessState === "ready"
          ? "You can continue learning now"
          : "Payment received, access is processing"
      }
    >
      <p className="leading-7 text-muted-foreground">
        SePay confirmed this payment. Course access is granted after the backend
        receives and settles the SePay IPN callback.
      </p>
      <p className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
        Course: {result.payment.courseId}
      </p>
      {accessState === "checking" ? (
        <p className="mt-3 rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          Checking whether your course access is active...
        </p>
      ) : null}
      <PaymentSummary result={result} />
      <ReturnActions>
        {accessState === "ready" ? (
          <ActionLink href={`/courses/${result.payment.courseId}/learn`}>
            Continue learning
          </ActionLink>
        ) : (
          <ActionLink href="/my-courses">Go to My Courses</ActionLink>
        )}
        <ActionLink
          href={`/courses/${result.payment.courseId}`}
          variant="secondary"
        >
          View course
        </ActionLink>
      </ReturnActions>
    </ReturnShell>
  );
}

function PaymentSummary({ result }: { result: SepayReturnResult }) {
  return (
    <dl className="mt-6 grid gap-3 border-y border-border py-4 text-sm">
      <SummaryRow label="Status" value={result.payment.status} />
      <SummaryRow
        label="Amount"
        value={`${result.payment.amount.toLocaleString("vi-VN")} ${result.payment.currency}`}
      />
      <SummaryRow label="Transaction" value={result.payment.txnRef ?? "N/A"} />
      <SummaryRow label="Provider" value={result.payment.provider} />
      <SummaryRow label="Method" value={result.payment.paymentMethod} />
    </dl>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[240px] text-right font-semibold">{value}</dd>
    </div>
  );
}

function ReturnShell({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-card p-5 shadow-[0_18px_60px_rgb(0_0_0_/_8%)] sm:p-7">
      <p className="text-sm font-semibold text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight">{title}</h1>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ReturnActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap gap-3">{children}</div>;
}

function ActionLink({
  children,
  href,
  variant = "primary",
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary";
}) {
  const variantClass =
    variant === "primary"
      ? "border-primary bg-primary text-primary-foreground"
      : "border-primary bg-transparent text-primary";

  return (
    <Link
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-pill border px-6 text-base font-normal transition-transform active:scale-95",
        variantClass,
      ].join(" ")}
      href={href}
    >
      {children}
    </Link>
  );
}
