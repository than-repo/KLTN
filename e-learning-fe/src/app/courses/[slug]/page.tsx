import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { CourseDetail } from "@/features/courses/components/course-detail";
import { getPublicCourseBySlug } from "@/features/courses/api/course-api";
import { EnrollmentCta } from "@/features/enrollments/components/enrollment-cta";
import { ApiError } from "@/lib/api/client";
import { FooterSection } from "@/app/_components/sections/footer-section";
import { footerContent } from "@/app/_components/home-content";

type CourseDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const navLinks = [{ href: "/courses", label: "Courses" }];

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const course = await getPublicCourseBySlug(slug);

    return {
      title: `${course.title} | E-Learning System`,
      description: course.shortDescription,
    };
  } catch {
    return {
      title: "Course not found | E-Learning System",
    };
  }
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: CourseDetailPageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const course = await getCourseOrNotFound(slug);
  const enrolledState = getFirstParam(resolvedSearchParams.enrolled);

  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {enrolledState === "success" ? (
          <p className="mb-5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
            Payment successful. You are now enrolled in this course.
          </p>
        ) : null}
        {enrolledState === "existing" ? (
          <p className="mb-5 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            You are already enrolled in this course.
          </p>
        ) : null}
        <CourseDetail
          course={course}
          enrollmentPanel={<EnrollmentCta course={course} />}
        />
      </section>
      <FooterSection
        brand={footerContent.brand}
        demoNote={footerContent.demoNote}
        groups={footerContent.groups}
        notice={footerContent.notice}
      />
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

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
