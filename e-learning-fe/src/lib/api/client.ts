import { getApiBaseUrl } from "@/lib/config/env";
import type { ApiErrorPayload, ApiResponse } from "@/types/api";

type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> & {
  accessToken?: string | null;
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  details?: unknown;
  statusCode: number;

  constructor({ details, message, statusCode }: ApiErrorPayload) {
    super(message);
    this.name = "ApiError";
    this.details = details;
    this.statusCode = statusCode;
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(" ");
    }

    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return fallback;
}

function resolveUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    accessToken,
    body,
    headers: requestHeaders,

    signal: requestSignal,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    ...fetchOptions
  } = options;
  const headers = new Headers(requestHeaders);
  headers.set("ngrok-skip-browser-warning", "true");

  const controller = new AbortController();
  let didTimeout = false;
  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          didTimeout = true;
          controller.abort();
        }, timeoutMs)
      : null;
  const abortRequest = () => controller.abort();

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (requestSignal?.aborted) {
    controller.abort();
  } else {
    requestSignal?.addEventListener("abort", abortRequest, { once: true });
  }

  let response: Response;

  try {
    response = await fetch(resolveUrl(path), {
      ...fetchOptions,
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      credentials: "include",
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new ApiError({
        details: null,
        message: didTimeout
          ? "Request timed out. Please try again."
          : "Request was cancelled.",
        statusCode: 408,
      });
    }

    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    requestSignal?.removeEventListener("abort", abortRequest);
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | Record<string, unknown>
    | null;

  if (!response.ok) {
    throw new ApiError({
      details: payload,
      message: getErrorMessage(payload, "Request failed."),
      statusCode: response.status,
    });
  }

  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    const apiPayload = payload as ApiResponse<T>;

    if (apiPayload.data === null) {
      throw new ApiError({
        details: apiPayload,
        message: apiPayload.message ?? "Response data is empty.",
        statusCode: apiPayload.statusCode,
      });
    }

    return apiPayload.data;
  }

  return payload as T;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
