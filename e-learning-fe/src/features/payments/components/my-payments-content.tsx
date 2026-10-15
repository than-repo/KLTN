"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/hooks/use-auth";
import type { PaginationMeta } from "@/features/courses/types/course";
import { ApiError } from "@/lib/api/client";

import { getMyPayments } from "../api/payment-api";
import type { GetPaymentsResponse, PaymentHistoryItem } from "../types/payment";

type PaymentStatusFilter = "ALL" | PaymentHistoryItem["status"];
type PaymentMethodFilter = "ALL" | PaymentHistoryItem["paymentMethod"];
type PaymentSortOption =
  | "CREATED_DESC"
  | "CREATED_ASC"
  | "PAID_DESC"
  | "AMOUNT_DESC"
  | "AMOUNT_ASC"
  | "COURSE_ASC";

const paymentStatusOptions: Array<{
  label: string;
  value: PaymentStatusFilter;
}> = [
  { label: "All statuses", value: "ALL" },
  { label: "Paid", value: "PAID" },
  { label: "Pending", value: "PENDING" },
  { label: "Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Expired", value: "EXPIRED" },
];

const paymentMethodOptions: Array<{
  label: string;
  value: PaymentMethodFilter;
}> = [
  { label: "All methods", value: "ALL" },
  { label: "VNPAY", value: "VNPAY" },
  { label: "Simulation", value: "SIMULATION" },
];

const paymentSortOptions: Array<{
  label: string;
  value: PaymentSortOption;
}> = [
  { label: "Newest created", value: "CREATED_DESC" },
  { label: "Oldest created", value: "CREATED_ASC" },
  { label: "Paid newest", value: "PAID_DESC" },
  { label: "Amount high-low", value: "AMOUNT_DESC" },
  { label: "Amount low-high", value: "AMOUNT_ASC" },
  { label: "Course A-Z", value: "COURSE_ASC" },
];

const defaultSortOption: PaymentSortOption = "CREATED_DESC";
const MY_PAYMENTS_PAGE_SIZE = 10;

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not paid yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPaymentStatusClass(status: PaymentHistoryItem["status"]) {
  switch (status) {
    case "PAID":
      return "bg-green-50 text-green-700 ring-green-600/20";
    case "PENDING":
      return "bg-yellow-50 text-yellow-700 ring-yellow-600/20";
    case "FAILED":
      return "bg-red-50 text-red-700 ring-red-600/20";
    case "CANCELLED":
      return "bg-gray-50 text-gray-700 ring-gray-600/20";
    case "EXPIRED":
      return "bg-orange-50 text-orange-700 ring-orange-600/20";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-600/20";
  }
}

function getPaymentStatusLabel(status: PaymentHistoryItem["status"]) {
  switch (status) {
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}

function getPaymentMethodLabel(method: PaymentHistoryItem["paymentMethod"]) {
  switch (method) {
    case "VNPAY":
      return "VNPAY";
    case "SIMULATION":
      return "Simulation";
    default:
      return method;
  }
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getDateTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function comparePayments(
  firstPayment: PaymentHistoryItem,
  secondPayment: PaymentHistoryItem,
  sortOption: PaymentSortOption,
) {
  switch (sortOption) {
    case "CREATED_ASC":
      return (
        getDateTimestamp(firstPayment.createdAt) -
        getDateTimestamp(secondPayment.createdAt)
      );
    case "PAID_DESC":
      return (
        getDateTimestamp(secondPayment.paidAt) -
        getDateTimestamp(firstPayment.paidAt)
      );
    case "AMOUNT_DESC":
      return secondPayment.amount - firstPayment.amount;
    case "AMOUNT_ASC":
      return firstPayment.amount - secondPayment.amount;
    case "COURSE_ASC":
      return firstPayment.course.title.localeCompare(
        secondPayment.course.title,
        undefined,
        { sensitivity: "base" },
      );
    case "CREATED_DESC":
    default:
      return (
        getDateTimestamp(secondPayment.createdAt) -
        getDateTimestamp(firstPayment.createdAt)
      );
  }
}

function normalizePaymentsResponse(
  response: GetPaymentsResponse,
  query: { limit: number; page: number },
): GetPaymentsResponse {
  if (Array.isArray(response.data)) {
    return response;
  }

  const legacyPayments = (response as unknown as {
    payments?: PaymentHistoryItem[];
  }).payments;
  const data = Array.isArray(legacyPayments) ? legacyPayments : [];

  return {
    data,
    meta: {
      hasNextPage: false,
      hasPreviousPage: query.page > 1,
      limit: query.limit,
      page: query.page,
      total: data.length,
      totalPages: data.length > 0 ? 1 : 0,
    },
  };
}

export function MyPaymentsContent() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { accessToken, status } = useAuth();
  const [result, setResult] = useState<GetPaymentsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestedQuery, setRequestedQuery] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] =
    useState<PaymentMethodFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] =
    useState<PaymentSortOption>(defaultSortOption);
  const [statusFilter, setStatusFilter] =
    useState<PaymentStatusFilter>("ALL");

  const query = useMemo(
    () => parseMyPaymentsQuery(searchParams),
    [searchParams],
  );

  const queryKey = `${query.page}:${query.limit}`;
  const payments = result?.data ?? [];
  const isLoading = status !== "authenticated" || requestedQuery !== queryKey;

  const filteredPayments = useMemo(() => {
    const keyword = normalizeSearch(searchTerm);

    const nextPayments = payments.filter((payment) => {
      const searchText = normalizeSearch(
        `${payment.course.title} ${payment.id}`,
      );

      const matchesSearch = !keyword || searchText.includes(keyword);
      const matchesStatus =
        statusFilter === "ALL" || payment.status === statusFilter;
      const matchesMethod =
        methodFilter === "ALL" || payment.paymentMethod === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });

    return [...nextPayments].sort((firstPayment, secondPayment) =>
      comparePayments(firstPayment, secondPayment, sortOption),
    );
  }, [methodFilter, payments, searchTerm, sortOption, statusFilter]);

  function resetFilters() {
    setMethodFilter("ALL");
    setSearchTerm("");
    setSortOption(defaultSortOption);
    setStatusFilter("ALL");
  }

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    let isMounted = true;

    setErrorMessage(null);

    getMyPayments(query, accessToken)
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setResult(normalizePaymentsResponse(response, query));
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && error.statusCode === 401) {
          router.replace(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }

        setErrorMessage(
          "We could not load your payment history. Please try again.",
        );
      })
      .finally(() => {
        if (isMounted) {
          setRequestedQuery(queryKey);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accessToken, pathname, query, queryKey, router, status]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-14 text-center text-muted-foreground">
        Loading your payments...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (!result || payments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <h2 className="text-base font-semibold text-gray-950">
          No payments yet
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Once you purchase a course, your payment history will appear here.
        </p>
        <Link
          href="/courses"
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Explore courses
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_200px_auto] lg:items-end">
          <label className="text-sm font-semibold text-gray-950">
            Search payments
            <input
              className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-gray-950"
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Course title or payment id"
              type="search"
              value={searchTerm}
            />
          </label>

          <label className="text-sm font-semibold text-gray-950">
            Status
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-950 outline-none transition focus:border-gray-950"
              onChange={(event) =>
                setStatusFilter(event.target.value as PaymentStatusFilter)
              }
              value={statusFilter}
            >
              {paymentStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-950">
            Method
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-950 outline-none transition focus:border-gray-950"
              onChange={(event) =>
                setMethodFilter(event.target.value as PaymentMethodFilter)
              }
              value={methodFilter}
            >
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-950">
            Sort
            <select
              className="mt-2 min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-normal text-gray-950 outline-none transition focus:border-gray-950"
              onChange={(event) =>
                setSortOption(event.target.value as PaymentSortOption)
              }
              value={sortOption}
            >
              {paymentSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-950 transition hover:bg-gray-50"
            onClick={resetFilters}
            type="button"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          {filteredPayments.length} of {payments.length} payment
          {payments.length > 1 ? "s" : ""} shown on this page
        </p>

        <Link
          href="/courses"
          className="inline-flex w-fit items-center justify-center rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Browse courses
        </Link>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <h2 className="text-base font-semibold text-gray-950">
            No payments match your filters
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Try changing the search, status, method, or sort options.
          </p>
          <button
            className="mt-5 inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-950 transition hover:bg-gray-50"
            onClick={resetFilters}
            type="button"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Course
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Amount
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Method
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Paid at
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Created at
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/courses/${payment.course.slug}`}
                    className="font-medium text-gray-950 hover:underline"
                  >
                    {payment.course.title}
                  </Link>
                  <div className="mt-1 text-xs text-gray-500">
                    #{payment.id}
                  </div>
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-950">
                  {formatCurrency(payment.amount, payment.currency)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                  {getPaymentMethodLabel(payment.paymentMethod)}
                </td>

                <td className="whitespace-nowrap px-5 py-4">
                  <span
                    className={[
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                      getPaymentStatusClass(payment.status),
                    ].join(" ")}
                  >
                    {getPaymentStatusLabel(payment.status)}
                  </span>
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                  {formatDate(payment.paidAt)}
                </td>

                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                  {formatDate(payment.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {filteredPayments.map((payment) => (
          <article
            key={payment.id}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/courses/${payment.course.slug}`}
                  className="font-medium text-gray-950 hover:underline"
                >
                  {payment.course.title}
                </Link>
                <p className="mt-1 text-xs text-gray-500">#{payment.id}</p>
              </div>

              <span
                className={[
                  "inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                  getPaymentStatusClass(payment.status),
                ].join(" ")}
              >
                {getPaymentStatusLabel(payment.status)}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Amount</dt>
                <dd className="font-medium text-gray-950">
                  {formatCurrency(payment.amount, payment.currency)}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Method</dt>
                <dd className="text-gray-950">
                  {getPaymentMethodLabel(payment.paymentMethod)}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Paid at</dt>
                <dd className="text-right text-gray-950">
                  {formatDate(payment.paidAt)}
                </dd>
              </div>

              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Created at</dt>
                <dd className="text-right text-gray-950">
                  {formatDate(payment.createdAt)}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
        </>
      )}

      {result.meta ? <MyPaymentsPagination meta={result.meta} /> : null}
    </div>
  );
}

function parseMyPaymentsQuery(searchParams: URLSearchParams) {
  return {
    limit: MY_PAYMENTS_PAGE_SIZE,
    page: clampNumber(searchParams.get("page"), 1, 1),
  };
}

function clampNumber(
  value: string | null,
  fallback: number,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function MyPaymentsPagination({ meta }: { meta: PaginationMeta }) {
  const pages = getVisiblePages(meta.page, meta.totalPages);

  return (
    <nav
      aria-label="My payments pagination"
      className="relative z-10 mt-5 flex w-full flex-col items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row"
    >
      <p className="text-sm text-gray-600">
        Page {meta.page} of {Math.max(meta.totalPages, 1)}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PaymentPaginationLink
          disabled={!meta.hasPreviousPage}
          href={buildMyPaymentsHref(meta.page - 1)}
          label="Previous"
        />
        <div className="flex items-center gap-2">
          {pages.map((page) => (
            <Link
              aria-current={page === meta.page ? "page" : undefined}
              className={[
                "inline-flex size-9 items-center justify-center rounded-md border text-sm",
                page === meta.page
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-gray-200 text-gray-950 hover:border-gray-950",
              ].join(" ")}
              href={buildMyPaymentsHref(page)}
              key={page}
            >
              {page}
            </Link>
          ))}
        </div>
        <PaymentPaginationLink
          disabled={!meta.hasNextPage}
          href={buildMyPaymentsHref(meta.page + 1)}
          label="Next"
        />
      </div>
    </nav>
  );
}

function PaymentPaginationLink({
  disabled,
  href,
  label,
}: {
  disabled: boolean;
  href: string;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="inline-flex min-h-9 items-center justify-center rounded-md border border-gray-200 px-4 text-sm text-gray-500 opacity-60">
        {label}
      </span>
    );
  }

  return (
    <Link
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-gray-200 px-4 text-sm font-semibold text-gray-950 transition hover:border-gray-950"
      href={href}
    >
      {label}
    </Link>
  );
}

function buildMyPaymentsHref(page: number) {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/my-payments?${queryString}` : "/my-payments";
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  const pages: number[] = [];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}
