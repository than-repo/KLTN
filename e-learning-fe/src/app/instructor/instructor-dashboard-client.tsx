"use client";

import Link from "next/link";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { DashboardWelcomeHeader } from "@/components/layout/dashboard-welcome-header";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { PublicNavLink } from "@/components/layout/public-navbar/nav-link";

type InstructorDashboardClientProps = {
  navLinks: PublicNavLink[];
};

export function InstructorDashboardClient({ navLinks }: InstructorDashboardClientProps) {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <RoleProtectedRoute allowedRoles={["INSTRUCTOR"]} fallbackHref="/">
        <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <DashboardWelcomeHeader
            role="INSTRUCTOR"
            userName={user?.fullName}
            userRole="INSTRUCTOR"
            actions={
              <ButtonLink href="/instructor/courses/new">
                Create Course
              </ButtonLink>
            }
          />

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