"use client";

import { PublicNavbar } from "@/components/layout/public-navbar/public-navbar";
import { DashboardWelcomeHeader } from "@/components/layout/dashboard-welcome-header";
import { ButtonLink } from "@/components/ui/button-link";
import { RoleProtectedRoute } from "@/features/auth/components/role-protected-route";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { PublicNavLink } from "@/components/layout/public-navbar/nav-link";

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

type AdminDashboardClientProps = {
  navLinks: PublicNavLink[];
};

export function AdminDashboardClient({ navLinks }: AdminDashboardClientProps) {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-surface-pearl text-foreground">
      <PublicNavbar brandLabel="E-Learning System" links={navLinks} />
      <RoleProtectedRoute allowedRoles={["ADMIN"]} fallbackHref="/">
        <section className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <DashboardWelcomeHeader
            role="ADMIN"
            userName={user?.fullName}
            userRole="ADMIN"
          />

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