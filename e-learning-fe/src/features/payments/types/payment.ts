import type { PaginationMeta } from "@/features/courses/types/course";

export type VnpayLocale = "vn" | "en";

export type CreateVnpayPaymentUrlInput = {
  bankCode?: string;
  courseId: string;
  locale?: VnpayLocale;
};

export type CreateVnpayPaymentUrlResult = {
  amount: number;
  paymentId: string;
  paymentUrl: string;
  txnRef: string | null;
};

export type CreateSimulationPaymentInput = {
  courseId: string;
};

export type PaymentMethod = "VNPAY" | "SIMULATION";

export type PaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";

export type PaymentResponse = {
  amount: number;
  createdAt: string;
  courseId: string;
  currency: string;
  id: string;
  paidAt: string | null;
  paymentMethod: PaymentMethod;
  provider: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  txnRef: string | null;
  updatedAt: string;
  userId: string;
};

export type VnpayReturnStatus = "success" | "failed" | "already_paid";

export type VnpayReturnResult = {
  payment: PaymentResponse;
  status: VnpayReturnStatus;
};

export type SimulationPaymentStatus =
  | "pending"
  | "success"
  | "failed"
  | "already_paid";

export type SimulationPaymentResult = {
  payment: PaymentResponse;
  status: SimulationPaymentStatus;
};

export interface PaymentHistoryCourse {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  course: PaymentHistoryCourse;
}

export type MyPaymentsQuery = {
  limit?: number;
  page?: number;
};

export interface GetPaymentsResponse {
  data: PaymentHistoryItem[];
  meta: PaginationMeta;
}
