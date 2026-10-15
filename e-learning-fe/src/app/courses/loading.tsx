// src/app/my-payments/loading.tsx

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";

const navLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/my-courses", label: "My Courses" },
  { href: "/my-payments", label: "My Payments" },
];

export default function MyPaymentsLoadingPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />

      <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />

          <div className="mt-4 h-11 w-full max-w-sm animate-pulse rounded bg-muted sm:h-14" />

          <div className="mt-5 space-y-3">
            <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded bg-muted" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          <div className="border-b border-border p-5">
            <div className="h-5 w-44 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-4 w-72 animate-pulse rounded bg-muted" />
          </div>

          <div className="hidden md:block">
            <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-4 border-b border-border px-5 py-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-4 animate-pulse rounded bg-muted"
                />
              ))}
            </div>

            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, index) => (
                <PaymentTableSkeletonRow key={index} />
              ))}
            </div>
          </div>

          <div className="space-y-4 p-4 md:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <PaymentCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function PaymentTableSkeletonRow() {
  return (
    <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-4 px-5 py-5">
      <div>
        <div className="h-5 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
      </div>

      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
    </div>
  );
}

function PaymentCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
        </div>

        <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
      </div>

      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="flex justify-between gap-4" key={index}>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
