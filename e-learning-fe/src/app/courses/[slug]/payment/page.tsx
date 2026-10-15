import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { getPublicCourseBySlug } from "@/features/courses/api/course-api";
import { VnpayCheckout } from "@/features/payments/components/vnpay-checkout";
import { ApiError } from "@/lib/api/client";

type CoursePaymentPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const navLinks = [{ href: "/courses", label: "Courses" }];

export const metadata: Metadata = {
  title: "Payment | E-Learning System",
  description: "Review a course and continue to VNPay payment.",
};

export default async function CoursePaymentPage({
  params,
}: CoursePaymentPageProps) {
  const { slug } = await params;
  const course = await getCourseOrNotFound(slug);

  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <VnpayCheckout course={course} />
      </section>
    </main>
  );
}

async function getCourseOrNotFound(slug: string) {
  try {
    return await getPublicCourseBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      notFound();
    }

    throw error;
  }
}
