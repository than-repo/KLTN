import type { Metadata } from "next";
import Link from "next/link";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { instructorNavLinks } from "@/features/instructor/utils/instructor-nav";

export const metadata: Metadata = {
  title: "Instructor Dashboard | E-Learning System",
  description: "Manage your courses and build learning content.",
};

export default function InstructorDashboardPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={instructorNavLinks} />
      <RoleProtectedRoute allowedRoles={["INSTRUCTOR"]} fallbackHref="/">
        <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Instructor workspace
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
              Instructor Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Manage your courses, build curriculum content, and prepare
              assessments for review.
            </p>
            <div className="mt-6">
              <ButtonLink href="/instructor/courses/new">
                Create Course
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-semibold">My Courses</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                View, edit and manage all courses you created. Track review
                status and continue building draft courses.
              </p>
              <div className="mt-5">
                <ButtonLink href="/instructor/courses" variant="secondary">
                  Manage Courses
                </ButtonLink>
              </div>
            </article>

            <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Course Builder</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create sections, lessons and assessments for your draft courses,
                then preview everything before submitting for review.
              </p>
              <div className="mt-5">
                <ButtonLink href="/instructor/courses" variant="secondary">
                  Open Course Builder
                </ButtonLink>
              </div>
            </article>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Back to Home{" "}
            <Link className="font-semibold text-primary" href="/">
              Click here
            </Link>
          </p>
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
