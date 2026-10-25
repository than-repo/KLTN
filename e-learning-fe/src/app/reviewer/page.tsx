import type { Metadata } from "next";
import Link from "next/link";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { reviewerNavLinks } from "@/features/reviewer/utils/reviewer-nav";

export const metadata: Metadata = {
  title: "Reviewer Dashboard | E-Learning System",
  description: "Review submitted courses and make review decisions.",
};

export default function ReviewerDashboardPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={reviewerNavLinks} />
      <RoleProtectedRoute allowedRoles={["REVIEWER"]} fallbackHref="/">
        <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Reviewer workspace
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
              Reviewer Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Review submitted courses carefully before making a decision. Use
              My Review Tasks to review claimed courses. Use Available Courses
              to claim new courses that match your authorized categories.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-semibold">My Review Tasks</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                View and manage courses assigned to you for review. Submit your
                review decision with a clear note.
              </p>
              <div className="mt-5">
                <ButtonLink href="/reviewer/courses" variant="secondary">
                  Open Review Tasks
                </ButtonLink>
              </div>
            </article>

            <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Available Courses</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Browse courses submitted for review that match your authorized
                categories and claim one to review.
              </p>
              <div className="mt-5">
                <ButtonLink
                  href="/reviewer/courses/available"
                  variant="secondary"
                >
                  Browse Available Courses
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
