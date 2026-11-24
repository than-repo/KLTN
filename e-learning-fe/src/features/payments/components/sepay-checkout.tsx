"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  createSepayPayment,
  createSimulationPayment,
  failSimulationPayment,
  getPendingSepayPayment,
  replaceSepayPayment,
} from "../api/payment-api";
import type {
  CreateSepayPaymentResult,
  SepayPendingPayment,
  SimulationPaymentResult,
} from "../types/payment";

type SepayCheckoutProps = {
  course: PublicCourse;
};

type CheckoutMethod = "simulation" | "sepay";
type BusyAction =
  | "checking"
  | "free"
  | "simulation-create"
  | "simulation-confirm"
  | "simulation-fail"
  | "sepay"
  | "sepay-replace"
  | null;

export function SepayCheckout({ course }: SepayCheckoutProps) {
  return (
    <RoleProtectedRoute allowedRoles={["LEARNER"]} fallbackHref="/courses">
      <PaymentCheckoutContent course={course} />
    </RoleProtectedRoute>
  );
}

function PaymentCheckoutContent({ course }: SepayCheckoutProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<CheckoutMethod>("simulation");
  const [busyAction, setBusyAction] = useState<BusyAction>("checking");
  const [simulationPayment, setSimulationPayment] =
    useState<SimulationPaymentResult | null>(null);
  const [sepayPayment, setSepayPayment] =
    useState<CreateSepayPaymentResult | null>(null);
  const [pendingSepayPayment, setPendingSepayPayment] =
    useState<SepayPendingPayment | null>(null);
  const [pendingSepayDialogOpen, setPendingSepayDialogOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
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
    [
      course.id,
      course.slug,
      simulationPayment?.payment.id,
      simulationPayment?.payment.txnRef,
    ],
  );

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

      if (method === "sepay") {
        setBusyAction("sepay");
        const pending = await getPendingSepayPayment(course.id, accessToken);
        if (pending) {
          setPendingSepayPayment(pending);
          setPendingSepayDialogOpen(true);
          return;
        }

        let payment: CreateSepayPaymentResult;
        try {
          payment = await createSepayPayment(
            { courseId: course.id },
            accessToken,
          );
        } catch (paymentError) {
          if (
            paymentError instanceof ApiError &&
            paymentError.statusCode === 409
          ) {
            const latestPending = await getPendingSepayPayment(
              course.id,
              accessToken,
            );
            if (latestPending) {
              setPendingSepayPayment(latestPending);
              setPendingSepayDialogOpen(true);
              return;
            }
          }
          throw paymentError;
        }
        openSepayCheckout(payment);
        return;
      }
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

  async function handleReplacePendingSepayPayment() {
    if (!accessToken || !pendingSepayPayment) {
      return;
    }

    setBusyAction("sepay-replace");
    setError(null);

    try {
      const replacement = await replaceSepayPayment(
        pendingSepayPayment.paymentId,
        accessToken,
      );
      setPendingSepayPayment(null);
      setPendingSepayDialogOpen(false);
      openSepayCheckout(replacement);
    } catch (paymentError) {
      handleCheckoutError(paymentError);
    } finally {
      setBusyAction(null);
    }
  }

  function openSepayCheckout(payment: CreateSepayPaymentResult) {
    setSepayPayment(payment);

    if (!formRef.current) {
      setError("The SePay checkout form could not be prepared.");
      return;
    }

    formRef.current.action = payment.checkoutForm.actionUrl;
    formRef.current.method = payment.checkoutForm.method;

    const fieldsContainer = formRef.current.querySelector("#sepay-fields");
    if (!fieldsContainer) {
      setError("The SePay checkout form could not be prepared.");
      return;
    }

    fieldsContainer.innerHTML = "";
    Object.entries(payment.checkoutForm.fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      fieldsContainer.appendChild(input);
    });

    formRef.current.submit();
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

  function resetSepayPayment() {
    setSepayPayment(null);
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
                description="Redirect to SePay sandbox via secure form POST."
                disabled={isChecking || isBusy || isSimulationPending}
                isSelected={method === "sepay"}
                label="SePay Test"
                onClick={() => setMethod("sepay")}
              />
            </div>
          </section>
        ) : null}

        {method === "sepay" && sepayPayment ? (
          <PendingSepayPanel
            onStartNew={resetSepayPayment}
            sepayPayment={sepayPayment}
          />
        ) : null}

        {pendingSepayPayment ? (
          pendingSepayDialogOpen ? (
            <PendingSepayDialog
              busy={busyAction === "sepay-replace"}
              onContinue={() => setPendingSepayDialogOpen(false)}
              onReplace={handleReplacePendingSepayPayment}
              payment={pendingSepayPayment}
            />
          ) : (
            <PendingSepayNotice
              busy={busyAction === "sepay-replace"}
              onReplace={handleReplacePendingSepayPayment}
              payment={pendingSepayPayment}
            />
          )
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

        {(!simulationPayment || simulationPayment.status === "failed") &&
        !pendingSepayPayment ? (
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
            })}
          </button>
        ) : null}

        {/* Hidden form for SePay checkout */}
        <form
          ref={formRef}
          id="sepay-checkout-form"
          style={{ display: "none" }}
          target="_blank"
        >
          <div id="sepay-fields" />
        </form>
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
                  : "SePay Sandbox"
            }
          />
          <PaymentRow
            label="Method"
            value={
              isFree ? "FREE" : method === "simulation" ? "SIMULATION" : "SEPAY"
            }
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

function PendingSepayDialog({
  busy,
  onContinue,
  onReplace,
  payment,
}: {
  busy: boolean;
  onContinue: () => void;
  onReplace: () => void;
  payment: SepayPendingPayment;
}) {
  return (
    <div
      aria-describedby="pending-sepay-description"
      aria-labelledby="pending-sepay-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
    >
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <p className="text-sm font-semibold text-primary">
          Pending SePay order
        </p>
        <h2 className="mt-2 text-xl font-semibold" id="pending-sepay-title">
          You already have a pending payment
        </h2>
        <p
          className="mt-3 text-sm leading-6 text-muted-foreground"
          id="pending-sepay-description"
        >
          Continue the payment in the SePay page you previously opened, or
          cancel that order before creating a replacement. A new order will not
          be created unless SePay confirms the old one is cancelled.
        </p>
        <dl className="mt-4 grid gap-2 text-sm">
          <PaymentRow label="Transaction" value={payment.txnRef} />
          <PaymentRow
            label="Amount"
            value={`${payment.amount.toLocaleString("vi-VN")} VND`}
          />
        </dl>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-transparent px-5 text-sm font-semibold text-danger transition-colors hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={onReplace}
            type="button"
          >
            {busy ? "Cancelling old order..." : "Cancel and create new payment"}
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={onContinue}
            type="button"
          >
            Continue existing payment
          </button>
        </div>
      </section>
    </div>
  );
}

function PendingSepayNotice({
  busy,
  onReplace,
  payment,
}: {
  busy: boolean;
  onReplace: () => void;
  payment: SepayPendingPayment;
}) {
  return (
    <section className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-primary">
        Existing payment kept
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Finish transaction {payment.txnRef} in the SePay page you already
        opened. If that page is no longer available, cancel the pending order
        before creating another one.
      </p>
      <button
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-danger bg-transparent px-5 text-sm font-semibold text-danger transition-colors hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        onClick={onReplace}
        type="button"
      >
        {busy ? "Cancelling old order..." : "Cancel and create new payment"}
      </button>
    </section>
  );
}

function PendingSepayPanel({
  onStartNew,
  sepayPayment,
}: {
  onStartNew: () => void;
  sepayPayment: CreateSepayPaymentResult;
}) {
  return (
    <section className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-primary">SePay session ready</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        You started a SePay payment. Click the button below to proceed to the
        SePay payment page.
      </p>
      <dl className="mt-4 grid gap-2 text-sm">
        <PaymentRow label="Transaction" value={sepayPayment.txnRef} />
        <PaymentRow
          label="Amount"
          value={`${sepayPayment.amount.toLocaleString("vi-VN")} VND`}
        />
      </dl>
      <button
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-primary bg-transparent px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
        onClick={onStartNew}
        type="button"
      >
        Start new SePay session
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
            {busyAction === "simulation-confirm"
              ? "Confirming..."
              : "I have paid"}
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
  isFree: boolean;
  method: CheckoutMethod;
}) {
  if (input.busyAction === "free") {
    return "Enrolling...";
  }

  if (input.busyAction === "simulation-create") {
    return "Creating payment...";
  }

  if (input.busyAction === "sepay") {
    return "Opening SePay...";
  }

  if (input.isFree) {
    return "Enroll for free";
  }

  if (input.method === "simulation") {
    return input.hasFailedSimulation
      ? "Start new simulation"
      : "Start simulation payment";
  }

  return "Pay with SePay Test";
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
