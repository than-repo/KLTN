"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { CourseImage } from "@/features/courses/components/course-image";
import type { PublicCourse } from "@/features/courses/types/course";
import {
  formatCourseDuration,
  formatCoursePrice,
} from "@/features/courses/utils/course-data";
import {
  enrollInCourse,
  getCourseEnrollmentStatus,
} from "@/features/enrollments/api/enrollment-api";
import { ApiError } from "@/lib/api/client";

import {
  confirmSimulationPayment,
  createSimulationPayment,
  createVnpayPaymentUrl,
  failSimulationPayment,
} from "../api/payment-api";
import type { SimulationPaymentResult } from "../types/payment";
import {
  clearPendingVnpayPayment,
  getPendingVnpayPayment,
  savePendingVnpayPayment,
  type PendingVnpayPayment,
} from "../utils/pending-vnpay-payment";

type VnpayCheckoutProps = {
  course: PublicCourse;
};

type CheckoutMethod = "simulation" | "vnpay";
type BusyAction =
  | "checking"
  | "free"
  | "simulation-create"
  | "simulation-confirm"
  | "simulation-fail"
  | "vnpay"
  | null;

export function VnpayCheckout({ course }: VnpayCheckoutProps) {
  return (
    <RoleProtectedRoute allowedRoles={["LEARNER"]} fallbackHref="/courses">
      <PaymentCheckoutContent course={course} />
    </RoleProtectedRoute>
  );
}

function PaymentCheckoutContent({ course }: VnpayCheckoutProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pendingVnpayPayment, setPendingVnpayPayment] =
    useState<PendingVnpayPayment | null>(null);
  const [method, setMethod] = useState<CheckoutMethod>("simulation");
  const [busyAction, setBusyAction] = useState<BusyAction>("checking");
  const [simulationPayment, setSimulationPayment] =
    useState<SimulationPaymentResult | null>(null);
  const isFree = !course.price || course.price <= 0;
  const paymentHref = `/courses/${course.slug}/payment`;
  const isBusy = busyAction !== "checking" && busyAction !== null;
  const isChecking = busyAction === "checking";
  const isSimulationPending = simulationPayment?.status === "pending";
  const qrCells = useMemo(
    () =>
      buildQrCells(
        `${simulationPayment?.payment.id ?? course.id}:${simulationPayment?.payment.txnRef ?? course.slug}`,
      ),
    [course.id, course.slug, simulationPayment?.payment.id, simulationPayment?.payment.txnRef],
  );

  useEffect(() => {
    const restorePendingVnpayPayment = () => {
      const pendingPayment = getMatchingPendingVnpayPayment(course.id);

      setPendingVnpayPayment(pendingPayment);

      if (pendingPayment) {
        setMethod("vnpay");
      }
    };

    restorePendingVnpayPayment();
    window.addEventListener("pageshow", restorePendingVnpayPayment);

    return () => {
      window.removeEventListener("pageshow", restorePendingVnpayPayment);
    };
  }, [course.id]);

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
          router.replace(`/login?next=${encodeURIComponent(paymentHref)}`);
          return;
        }

        setError("Unable to check your enrollment status.");
      })
      .finally(() => {
        if (isMounted) {
          setBusyAction(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, course.id, course.slug, paymentHref, router]);

  async function handlePrimaryAction() {
    if (!accessToken) {
      router.replace(`/login?next=${encodeURIComponent(paymentHref)}`);
      return;
    }

    setError(null);

    try {
      if (isFree) {
        setBusyAction("free");
        await enrollInCourse(course.id, accessToken);
        router.replace(`/courses/${course.slug}?enrolled=success`);
        return;
      }

      if (method === "simulation") {
        setBusyAction("simulation-create");
        const payment = await createSimulationPayment(
          { courseId: course.id },
          accessToken,
        );

        setSimulationPayment(payment);
        return;
      }

      if (method === "vnpay" && pendingVnpayPayment?.paymentUrl) {
        setBusyAction("vnpay");
        window.location.assign(pendingVnpayPayment.paymentUrl);
        return;
      }

      setBusyAction("vnpay");
      const payment = await createVnpayPaymentUrl(
        {
          courseId: course.id,
          locale: "vn",
        },
        accessToken,
      );
      const pendingPayment = {
        courseId: course.id,
        courseSlug: course.slug,
        courseTitle: course.title,
        paymentUrl: payment.paymentUrl,
        txnRef: payment.txnRef,
      };

      savePendingVnpayPayment(pendingPayment);
      setPendingVnpayPayment(pendingPayment);

      window.location.assign(payment.paymentUrl);
    } catch (paymentError) {
      handleCheckoutError(paymentError);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSimulationConfirm() {
    if (!accessToken || !simulationPayment) {
      return;
    }

    setBusyAction("simulation-confirm");
    setError(null);

    try {
      const result = await confirmSimulationPayment(
        simulationPayment.payment.id,
        accessToken,
      );

      setSimulationPayment(result);
      router.replace(`/courses/${course.slug}?enrolled=success`);
    } catch (paymentError) {
      handleCheckoutError(paymentError);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSimulationFail() {
    if (!accessToken || !simulationPayment) {
      return;
    }

    setBusyAction("simulation-fail");
    setError(null);

    try {
      const result = await failSimulationPayment(
        simulationPayment.payment.id,
        accessToken,
      );

      setSimulationPayment(result);
      setError("Simulated payment failed. You can start a new simulation.");
    } catch (paymentError) {
      handleCheckoutError(paymentError);
    } finally {
      setBusyAction(null);
    }
  }

  function handleCheckoutError(paymentError: unknown) {
    if (paymentError instanceof ApiError && paymentError.statusCode === 401) {
      router.replace(`/login?next=${encodeURIComponent(paymentHref)}`);
      return;
    }

    setError(
      paymentError instanceof Error
        ? paymentError.message
        : "Payment could not be processed.",
    );
  }

  function resetSimulation() {
    setSimulationPayment(null);
    setError(null);
  }

  function resetPendingVnpayPayment() {
    clearPendingVnpayPayment();
    setPendingVnpayPayment(null);
    setError(null);
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {isFree ? "Free enrollment" : "Course payment"}
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight">
          Confirm your enrollment
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Choose a test payment method, review the payment details, then finish
          checkout to unlock the course.
        </p>

        {!isFree ? (
          <section className="mt-6">
            <h2 className="text-lg font-semibold">Payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PaymentMethodButton
                description="Use a local gateway screen, visual QR, and database settlement."
                disabled={isChecking || isBusy || isSimulationPending}
                isSelected={method === "simulation"}
                label="Simulation"
                onClick={() => setMethod("simulation")}
              />
              <PaymentMethodButton
                description="Redirect to VNPay sandbox after credentials and callbacks are ready."
                disabled={isChecking || isBusy || isSimulationPending}
                isSelected={method === "vnpay"}
                label="VNPay Test"
                onClick={() => setMethod("vnpay")}
              />
            </div>
          </section>
        ) : null}

        {method === "vnpay" && pendingVnpayPayment ? (
          <PendingVnpayPanel
            onStartNew={resetPendingVnpayPayment}
            pendingPayment={pendingVnpayPayment}
          />
        ) : null}

        {simulationPayment ? (
          <SimulationGateway
            busyAction={busyAction}
            courseTitle={course.title}
            onConfirm={handleSimulationConfirm}
            onFail={handleSimulationFail}
            onRetry={resetSimulation}
            qrCells={qrCells}
            result={simulationPayment}
          />
        ) : null}

        {error ? (
          <p className="mt-5 rounded-md border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {!simulationPayment || simulationPayment.status === "failed" ? (
          <button
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={isChecking || isBusy}
            onClick={handlePrimaryAction}
            type="button"
          >
            {getPrimaryLabel({
              busyAction,
              isFree,
              method,
              hasFailedSimulation: simulationPayment?.status === "failed",
              hasPendingVnpayPayment:
                method === "vnpay" && Boolean(pendingVnpayPayment?.paymentUrl),
            })}
          </button>
        ) : null}
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
          <PaymentRow
            label="Provider"
            value={
              isFree
                ? "Free enrollment"
                : method === "simulation"
                  ? "Simulation"
                  : "VNPay Sandbox"
            }
          />
          <PaymentRow
            label="Method"
            value={isFree ? "FREE" : method === "simulation" ? "SIMULATION" : "VNPAY"}
          />
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
          Paid enrollment is activated after the selected payment flow confirms.
        </p>
      </aside>
    </section>
  );
}

function PendingVnpayPanel({
  onStartNew,
  pendingPayment,
}: {
  onStartNew: () => void;
  pendingPayment: PendingVnpayPayment;
}) {
  return (
    <section className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-primary">
        VNPay session ready
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        You started a VNPay payment for {pendingPayment.courseTitle}. If you
        came back from the VNPay sandbox, you can continue that payment session.
      </p>
      <dl className="mt-4 grid gap-2 text-sm">
        <PaymentRow label="Course" value={pendingPayment.courseTitle} />
        <PaymentRow
          label="Transaction"
          value={pendingPayment.txnRef ?? "Pending"}
        />
      </dl>
      <button
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-primary bg-transparent px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        onClick={onStartNew}
        type="button"
      >
        Start new VNPay session
      </button>
    </section>
  );
}

function PaymentMethodButton({
  description,
  disabled,
  isSelected,
  label,
  onClick,
}: {
  description: string;
  disabled: boolean;
  isSelected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "min-h-28 rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-primary/50",
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className="block font-semibold">{label}</span>
      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
        {description}
      </span>
    </button>
  );
}

function SimulationGateway({
  busyAction,
  courseTitle,
  onConfirm,
  onFail,
  onRetry,
  qrCells,
  result,
}: {
  busyAction: BusyAction;
  courseTitle: string;
  onConfirm: () => void;
  onFail: () => void;
  onRetry: () => void;
  qrCells: boolean[];
  result: SimulationPaymentResult;
}) {
  const isPending = result.status === "pending";
  const isFailed = result.status === "failed";
  const isProcessing =
    busyAction === "simulation-confirm" || busyAction === "simulation-fail";

  return (
    <section className="mt-6 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-5 lg:flex-row">
        <div
          aria-label="Simulated QR payment code"
          className="grid h-44 w-44 shrink-0 grid-cols-11 grid-rows-11 gap-0.5 rounded-md border border-border bg-white p-3"
        >
          {qrCells.map((isFilled, index) => (
            <span
              className={isFilled ? "bg-foreground" : "bg-white"}
              key={`${result.payment.id}-${index}`}
            />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-primary">
            Simulated gateway
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-tight">
            {courseTitle}
          </h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <PaymentRow
              label="Amount"
              value={`${result.payment.amount.toLocaleString("vi-VN")} ${result.payment.currency}`}
            />
            <PaymentRow label="Status" value={result.payment.status} />
            <PaymentRow label="Payment ID" value={result.payment.id} />
            <PaymentRow
              label="Transaction"
              value={result.payment.txnRef ?? "N/A"}
            />
          </dl>
        </div>
      </div>

      {isPending ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isProcessing}
            onClick={onConfirm}
            type="button"
          >
            {busyAction === "simulation-confirm" ? "Confirming..." : "I have paid"}
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-transparent px-6 text-base font-semibold text-danger transition-colors hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isProcessing}
            onClick={onFail}
            type="button"
          >
            {busyAction === "simulation-fail"
              ? "Failing..."
              : "Simulate failed payment"}
          </button>
        </div>
      ) : null}

      {isFailed ? (
        <button
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-transparent px-6 text-base font-semibold text-primary transition-colors hover:bg-primary/5"
          onClick={onRetry}
          type="button"
        >
          Reset simulation
        </button>
      ) : null}
    </section>
  );
}

function PaymentRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[220px] break-words text-right font-semibold">
        {value}
      </span>
    </div>
  );
}

function getPrimaryLabel(input: {
  busyAction: BusyAction;
  hasFailedSimulation: boolean;
  hasPendingVnpayPayment: boolean;
  isFree: boolean;
  method: CheckoutMethod;
}) {
  if (input.busyAction === "free") {
    return "Enrolling...";
  }

  if (input.busyAction === "simulation-create") {
    return "Creating payment...";
  }

  if (input.busyAction === "vnpay") {
    return "Opening VNPay...";
  }

  if (input.isFree) {
    return "Enroll for free";
  }

  if (input.method === "simulation") {
    return input.hasFailedSimulation
      ? "Start new simulation"
      : "Start simulation payment";
  }

  if (input.hasPendingVnpayPayment) {
    return "Resume VNPay payment";
  }

  return "Pay with VNPay Test";
}

function getMatchingPendingVnpayPayment(
  courseId: string,
): PendingVnpayPayment | null {
  const pendingPayment = getPendingVnpayPayment();

  if (pendingPayment?.courseId !== courseId) {
    return null;
  }

  return pendingPayment;
}

function buildQrCells(seed: string) {
  const size = 11;
  const cells: boolean[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      cells.push(isFinderCell(row, col, size) || hashCell(seed, row, col));
    }
  }

  return cells;
}

function isFinderCell(row: number, col: number, size: number) {
  const inTopLeft = row < 4 && col < 4;
  const inTopRight = row < 4 && col >= size - 4;
  const inBottomLeft = row >= size - 4 && col < 4;

  if (!inTopLeft && !inTopRight && !inBottomLeft) {
    return false;
  }

  const localRow = row < 4 ? row : row - (size - 4);
  const localCol = col < 4 ? col : col - (size - 4);

  return (
    localRow === 0 ||
    localRow === 3 ||
    localCol === 0 ||
    localCol === 3 ||
    (localRow === 1 && localCol === 1) ||
    (localRow === 2 && localCol === 2)
  );
}

function hashCell(seed: string, row: number, col: number) {
  let hash = 0;
  const input = `${seed}:${row}:${col}`;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) % 9973;
  }

  return hash % 3 === 0 || hash % 7 === 0;
}
