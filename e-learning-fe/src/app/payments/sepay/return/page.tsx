import type { Metadata } from "next";
import { Suspense } from "react";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { SepayReturnContent } from "@/features/payments/components/sepay-return-content";

const navLinks = [{ href: "/courses", label: "Courses" }];

export const metadata: Metadata = {
  title: "SePay Return | E-Learning System",
  description: "Verify SePay payment result and continue learning.",
};

export default function SepayReturnPage() {
  return (
    <main className="min-h-screen bg-muted text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <section className="mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <Suspense fallback={<SepayReturnFallback />}>
          <SepayReturnContent />
        </Suspense>
      </section>
    </main>
  );
}

function SepayReturnFallback() {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-card p-5 sm:p-7">
      <p className="text-sm font-semibold text-primary">SePay return</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight">
        Loading payment result...
      </h1>
      <p className="mt-4 leading-7 text-muted-foreground">
        Preparing payment verification.
      </p>
    </section>
  );
}