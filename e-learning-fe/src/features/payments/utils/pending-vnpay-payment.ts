const pendingVnpayPaymentKey = "pending_vnpay_payment";

export type PendingVnpayPayment = {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  paymentUrl?: string;
  txnRef: string | null;
};

export function savePendingVnpayPayment(payment: PendingVnpayPayment): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(
    pendingVnpayPaymentKey,
    JSON.stringify(payment),
  );
}

export function getPendingVnpayPayment(): PendingVnpayPayment | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(pendingVnpayPaymentKey);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PendingVnpayPayment>;

    if (
      typeof parsed.courseId !== "string" ||
      typeof parsed.courseSlug !== "string" ||
      typeof parsed.courseTitle !== "string" ||
      (parsed.paymentUrl !== undefined &&
        typeof parsed.paymentUrl !== "string") ||
      (parsed.txnRef !== null && typeof parsed.txnRef !== "string")
    ) {
      return null;
    }

    return {
      courseId: parsed.courseId,
      courseSlug: parsed.courseSlug,
      courseTitle: parsed.courseTitle,
      paymentUrl: parsed.paymentUrl,
      txnRef: parsed.txnRef ?? null,
    };
  } catch {
    return null;
  }
}

export function clearPendingVnpayPayment(): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(pendingVnpayPaymentKey);
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && "sessionStorage" in window;
}
