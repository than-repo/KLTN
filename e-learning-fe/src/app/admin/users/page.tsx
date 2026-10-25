import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { AdminUsersContent } from "@/features/admin/components/admin-users-content";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { adminNavLinks } from "@/features/admin/utils/admin-nav";

export const metadata: Metadata = {
  title: "User Management | E-Learning System",
  description: "Create accounts, assign roles, and manage platform users.",
};

export default function AdminUsersPage() {
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
              User Management
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Create new accounts, update user information, assign roles, and
              control account status.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/admin" size="sm" variant="secondary">
                Back to Dashboard
              </ButtonLink>
            </div>
          </div>
          <AdminUsersContent />
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
