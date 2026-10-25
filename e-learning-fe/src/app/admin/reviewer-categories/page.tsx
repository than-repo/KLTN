import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { AdminReviewerCategoriesContent } from "@/features/admin/components/admin-reviewer-categories-content";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { adminNavLinks } from "@/features/admin/utils/admin-nav";

export const metadata: Metadata = {
  title: "Reviewer Authorizations | E-Learning System",
  description: "Assign course categories each reviewer is allowed to review.",
};

export default function AdminReviewerCategoriesPage() {
  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={adminNavLinks} />
      <RoleProtectedRoute allowedRoles={["ADMIN"]} fallbackHref="/">
        <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mb-6 rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              Admin workspace
            </p>
            <h1 className="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
              Reviewer Authorizations
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Choose a reviewer, then assign the course categories they are
              allowed to review.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/admin" size="sm" variant="secondary">
                Back to Dashboard
              </ButtonLink>
            </div>
          </div>
          <AdminReviewerCategoriesContent />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
