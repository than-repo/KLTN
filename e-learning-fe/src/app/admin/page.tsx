import type { Metadata } from "next";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { adminNavLinks } from "@/features/admin/utils/admin-nav";

export const metadata: Metadata = {
  title: "Admin Dashboard | E-Learning System",
  description: "Manage users, categories, and reviewer authorizations.",
};

const cards = [
  {
    description:
      "Create accounts, assign roles, activate or deactivate users, and verify emails.",
    href: "/admin/users",
    linkLabel: "Manage Users",
    title: "User Management",
  },
  {
    description:
      "Create course categories, organize parent categories, and control visibility.",
    href: "/admin/categories",
    linkLabel: "Manage Categories",
    title: "Course Categories",
  },
  {
    description:
      "Assign the course categories each reviewer is allowed to review.",
    href: "/admin/reviewer-categories",
    linkLabel: "Manage Reviewers",
    title: "Reviewer Authorizations",
  },
];

export default function AdminDashboardPage() {
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
              Admin Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Manage platform users, organize course categories, and control
              which categories each reviewer can review.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {cards.map((card) => (
              <article
                className="rounded-lg border border-border bg-card p-6 shadow-sm"
                key={card.href}
              >
                <h2 className="text-xl font-semibold">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
                <div className="mt-5">
                  <ButtonLink href={card.href} variant="secondary">
                    {card.linkLabel}
                  </ButtonLink>
                </div>
              </article>
            ))}
          </div>
        </section>
      </RoleProtectedRoute>
    </main>
  );
}
