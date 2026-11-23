import { apiRequest } from "@/lib/api/client";
import { getSpringApiBaseUrl } from "@/lib/config/env";

import type {
  CreateSepayPaymentInput,
  CreateSepayPaymentResult,
  CreateSimulationPaymentInput,
  SimulationPaymentResult,
  SepayReturnResult,
  GetPaymentsResponse,
  MyPaymentsQuery,
} from "../types/payment";

const paymentDevHeaders: HeadersInit = { "ngrok-skip-browser-warning": "true" };

function springPaymentUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSpringApiBaseUrl()}/api/payments${normalizedPath}`;
}

export function createSepayPayment(
  input: CreateSepayPaymentInput,
  accessToken: string,
) {
  return apiRequest<CreateSepayPaymentResult>(
    springPaymentUrl("/sepay/create-payment"),
    {
      accessToken,
      body: input,
      method: "POST",
      headers: paymentDevHeaders,
    },
  );
}

export function verifySepayReturn(queryString: string) {
  const suffix = queryString ? `?${queryString}` : "";

  return apiRequest<SepayReturnResult>(
    springPaymentUrl(`/sepay/return${suffix}`),
    {
      method: "GET",
      headers: paymentDevHeaders,
    },
  );
}

export function createSimulationPayment(
  input: CreateSimulationPaymentInput,
  accessToken: string,
) {
  return apiRequest<SimulationPaymentResult>(
    springPaymentUrl("/simulation/create-payment"),
    {
      accessToken,
      body: input,
      method: "POST",
      headers: paymentDevHeaders,
    },
  );
}

export function confirmSimulationPayment(
  paymentId: string,
  accessToken: string,
) {
  return apiRequest<SimulationPaymentResult>(
    springPaymentUrl(`/simulation/${encodeURIComponent(paymentId)}/confirm`),
    {
      accessToken,
      method: "POST",
      headers: paymentDevHeaders,
    },
  );
}

export function failSimulationPayment(paymentId: string, accessToken: string) {
  return apiRequest<SimulationPaymentResult>(
    springPaymentUrl(`/simulation/${encodeURIComponent(paymentId)}/fail`),
    {
      accessToken,
      method: "POST",
      headers: paymentDevHeaders,
    },
  );
}

export function getMyPayments(query: MyPaymentsQuery, accessToken: string) {
  return apiRequest<GetPaymentsResponse>(
    springPaymentUrl(`/me${buildMyPaymentsQueryString(query)}`),
    {
      method: "GET",
      accessToken,
    },
  );
}

function buildMyPaymentsQueryString(query: MyPaymentsQuery) {
  const params = new URLSearchParams();

  if (query.page !== undefined && query.page !== null) {
    params.set("page", String(query.page));
  }

  if (query.limit !== undefined && query.limit !== null) {
    params.set("limit", String(query.limit));
  }

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}