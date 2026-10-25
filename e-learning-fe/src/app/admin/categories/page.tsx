import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { AdminCategoriesContent } from "@/features/admin/components/admin-categories-content";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { adminNavLinks } from "@/features/admin/utils/admin-nav";

export const metadata: Metadata = {
  title: "Course Categories | E-Learning System",
  description: "Create, organize, and manage course categories.",
};

export default function AdminCategoriesPage() {
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
              Course Categories
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Create categories, organize them under parent categories, and
              control which categories are visible to learners.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/admin" size="sm" variant="secondary">
                Back to Dashboard
              </ButtonLink>
            </div>
          </div>
          <AdminCategoriesContent />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
